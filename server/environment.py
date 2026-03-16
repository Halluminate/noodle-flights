from __future__ import annotations

import os
import uuid
from dataclasses import asdict, dataclass
from typing import Any, Literal

import requests
from fastmcp import FastMCP
from openenv.core import Action, MCPEnvironment, Observation, State

TripType = Literal["one-way", "round-trip"]


@dataclass(frozen=True)
class TaskSpec:
    id: str
    trip_type: TripType
    origin: str
    destination: str
    departure_date: str
    return_date: str | None
    travel_class: str
    objective: str


TASK_LIBRARY: tuple[TaskSpec, ...] = (
    TaskSpec(
        id="one-way-cheapest-sfo-jfk",
        trip_type="one-way",
        origin="SFO",
        destination="JFK",
        departure_date="2030-06-12",
        return_date=None,
        travel_class="economy",
        objective="Search for flights and select the cheapest available departing option.",
    ),
    TaskSpec(
        id="round-trip-cheapest-lax-bos",
        trip_type="round-trip",
        origin="LAX",
        destination="BOS",
        departure_date="2030-09-10",
        return_date="2030-09-17",
        travel_class="economy",
        objective=(
            "Search for flights and select the cheapest outbound option plus the cheapest "
            "return option."
        ),
    ),
)


class NoodleFlightsEnvironment(MCPEnvironment):
    def __init__(self) -> None:
        self.mcp = FastMCP(name="noodle-flights")
        self._register_tools()
        super().__init__(mcp_server=self.mcp)

        self.app_base_url = os.getenv("NOODLE_FLIGHTS_APP_URL", "http://127.0.0.1:3000").rstrip("/")
        self.http_timeout = float(os.getenv("NOODLE_FLIGHTS_REQUEST_TIMEOUT", "20"))

        self.episode_id = str(uuid.uuid4())
        self.step_count = 0
        self.task: TaskSpec | None = None
        self.sim_metadata: dict[str, Any] | None = None
        self.done = False
        self.reward = 0.0
        self.status = "idle"
        self.last_error: str | None = None
        self.last_search_request: dict[str, Any] | None = None
        self.last_search_results: dict[str, list[dict[str, Any]]] = {"departing": [], "returning": []}
        self.selected_departing: dict[str, Any] | None = None
        self.selected_returning: dict[str, Any] | None = None

    def _register_tools(self) -> None:
        @self.mcp.tool
        def search_airports(query: str = "", limit: int = 10) -> dict[str, Any]:
            payload = self._get_json("/api/airports", {"q": query, "limit": limit})
            return {
                "query": payload.get("query", query),
                "total": payload.get("total", 0),
                "results": payload.get("results", []),
            }

        @self.mcp.tool
        def search_flights(
            origin: str,
            destination: str,
            departure_date: str,
            return_date: str | None = None,
            travel_class: str = "economy",
            trip_type: TripType = "one-way",
            exclude_layovers: bool = False,
            limit: int = 10,
        ) -> dict[str, Any]:
            if trip_type == "round-trip" and not return_date:
                raise ValueError("return_date is required for round-trip searches")

            params: dict[str, Any] = {
                "tripType": trip_type,
                "origin": origin,
                "destination": destination,
                "departureDate": departure_date,
                "travelClass": travel_class,
                "excludeLayovers": str(exclude_layovers).lower(),
            }
            if return_date:
                params["returnDate"] = return_date

            payload = self._get_json("/api/flights", params)
            departing_all = self._normalize_options(payload.get("departingFlights", []))
            returning_all = self._normalize_options(payload.get("returningFlights", []))

            self.last_search_request = {
                "origin": origin,
                "destination": destination,
                "departure_date": departure_date,
                "return_date": return_date,
                "travel_class": travel_class,
                "trip_type": trip_type,
                "exclude_layovers": exclude_layovers,
            }
            self.last_search_results = {
                "departing": departing_all,
                "returning": returning_all,
            }
            self.selected_departing = None
            self.selected_returning = None
            self.status = "searched"
            self.last_error = None

            return {
                "search": self.last_search_request,
                "departing_count": len(departing_all),
                "returning_count": len(returning_all),
                "departing_options": departing_all[:limit],
                "returning_options": returning_all[:limit],
            }

        @self.mcp.tool
        def select_departing_flight(option_id: int) -> dict[str, Any]:
            self.selected_departing = self._select_option("departing", option_id)
            self.status = "outbound-selected"
            self.last_error = None
            return {
                "selected_departing": self.selected_departing,
                "selected_returning": self.selected_returning,
            }

        @self.mcp.tool
        def select_returning_flight(option_id: int) -> dict[str, Any]:
            self.selected_returning = self._select_option("returning", option_id)
            self.status = "return-selected"
            self.last_error = None
            return {
                "selected_departing": self.selected_departing,
                "selected_returning": self.selected_returning,
            }

        @self.mcp.tool
        def get_selection() -> dict[str, Any]:
            return {
                "selected_departing": self.selected_departing,
                "selected_returning": self.selected_returning,
                "done": self.done,
                "reward": self.reward,
                "status": self.status,
            }

        @self.mcp.tool
        def complete_booking() -> dict[str, Any]:
            result = self._evaluate_completion()
            return {
                "done": self.done,
                "reward": self.reward,
                "status": self.status,
                "result": result,
            }

        @self.mcp.tool
        def abandon_episode(reason: str = "agent_abandoned") -> dict[str, Any]:
            self.done = True
            self.reward = 0.0
            self.status = "abandoned"
            self.last_error = reason
            return {
                "done": self.done,
                "reward": self.reward,
                "status": self.status,
                "reason": reason,
            }

    def reset(self, seed: int | None = None, episode_id: str | None = None) -> State:
        index = (seed or 0) % len(TASK_LIBRARY)
        self.task = TASK_LIBRARY[index]
        self.episode_id = episode_id or str(uuid.uuid4())
        self.step_count = 0
        self.done = False
        self.reward = 0.0
        self.status = "ready"
        self.last_error = None
        self.last_search_request = None
        self.last_search_results = {"departing": [], "returning": []}
        self.selected_departing = None
        self.selected_returning = None
        self.sim_metadata = self._fetch_sim_metadata()
        return self.state

    @property
    def state(self) -> State:
        return State(
            episode_id=self.episode_id,
            step_count=self.step_count,
            status=self.status,
            done=self.done,
            reward=self.reward,
            last_error=self.last_error,
            app_base_url=self.app_base_url,
            task=asdict(self.task) if self.task else None,
            sim_metadata=self.sim_metadata,
            last_search_request=self.last_search_request,
            last_search_result_counts={
                "departing": len(self.last_search_results["departing"]),
                "returning": len(self.last_search_results["returning"]),
            },
            selected_departing=self.selected_departing,
            selected_returning=self.selected_returning,
        )

    def close(self) -> None:
        super().close()
        self.last_search_results = {"departing": [], "returning": []}
        self.selected_departing = None
        self.selected_returning = None
        self.status = "closed"

    def _step_impl(
        self,
        action: Action,
        timeout_s: float | None = None,
        **kwargs: Any,
    ) -> Observation:
        return Observation(
            done=self.done,
            reward=self.reward,
            metadata={
                "status": self.status,
                "unsupported_action_type": type(action).__name__,
                "message": "This environment expects MCP tool actions.",
            },
        )

    def _evaluate_completion(self) -> dict[str, Any]:
        if not self.task:
            raise RuntimeError("reset must be called before complete_booking")
        if not self.last_search_request:
            self.last_error = "Run search_flights before complete_booking."
            return {"ok": False, "message": self.last_error}

        mismatches = self._search_mismatches()
        if mismatches:
            self.last_error = (
                "The current search does not match the active task. "
                f"Fix these fields first: {', '.join(mismatches)}."
            )
            return {"ok": False, "message": self.last_error, "mismatches": mismatches}

        if not self.selected_departing:
            self.last_error = "Select a departing flight before completing the booking."
            return {"ok": False, "message": self.last_error}

        if self.task.trip_type == "round-trip" and not self.selected_returning:
            self.last_error = "Select a return flight before completing the booking."
            return {"ok": False, "message": self.last_error}

        expected_departing = self._cheapest_option("departing")
        expected_returning = self._cheapest_option("returning")

        departing_matches = self._matches_expected(self.selected_departing, expected_departing)
        returning_matches = True
        if self.task.trip_type == "round-trip":
            returning_matches = self._matches_expected(self.selected_returning, expected_returning)

        if departing_matches and returning_matches:
            self.done = True
            self.reward = 1.0
            self.status = "completed"
            self.last_error = None
            return {
                "ok": True,
                "message": "Booking completed successfully.",
                "expected_departing": expected_departing,
                "expected_returning": expected_returning,
            }

        self.last_error = "The selected itinerary does not satisfy the MVP task rubric."
        return {
            "ok": False,
            "message": self.last_error,
            "expected_departing": expected_departing,
            "expected_returning": expected_returning,
        }

    def _search_mismatches(self) -> list[str]:
        assert self.task is not None
        assert self.last_search_request is not None

        mismatches: list[str] = []
        expected = {
            "origin": self.task.origin,
            "destination": self.task.destination,
            "departure_date": self.task.departure_date,
            "return_date": self.task.return_date,
            "travel_class": self.task.travel_class,
            "trip_type": self.task.trip_type,
        }
        for key, value in expected.items():
            if self.last_search_request.get(key) != value:
                mismatches.append(key)
        return mismatches

    def _cheapest_option(self, leg: Literal["departing", "returning"]) -> dict[str, Any] | None:
        options = self.last_search_results[leg]
        if not options:
            return None
        return min(options, key=lambda option: (option["price_usd"], option["option_id"]))

    @staticmethod
    def _matches_expected(
        actual: dict[str, Any] | None,
        expected: dict[str, Any] | None,
    ) -> bool:
        if not actual or not expected:
            return False
        return actual["option_id"] == expected["option_id"]

    def _select_option(self, leg: Literal["departing", "returning"], option_id: int) -> dict[str, Any]:
        for option in self.last_search_results[leg]:
            if option["option_id"] == option_id:
                return option
        raise ValueError(f"Unknown {leg} option_id: {option_id}")

    def _normalize_options(self, flights: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            self._normalize_flight(flight, index + 1)
            for index, flight in enumerate(flights)
        ]

    def _normalize_flight(self, flight: dict[str, Any], option_id: int) -> dict[str, Any]:
        segments = flight.get("segments") or []
        duration_min = flight.get("totalDurationMin", flight.get("durationMin"))
        return {
            "option_id": option_id,
            "flight_number": flight.get("flightNumber"),
            "airline": flight.get("airline"),
            "airline_name": flight.get("airlineName"),
            "origin_airport": flight.get("originAirport"),
            "destination_airport": flight.get("destinationAirport"),
            "depart_iso": flight.get("depart"),
            "arrive_iso": flight.get("arrive"),
            "duration_min": duration_min,
            "stops": max(len(segments) - 1, 0),
            "price_usd": flight.get("priceUsd"),
            "emissions_kg": flight.get("emissions"),
        }

    def _fetch_sim_metadata(self) -> dict[str, Any] | None:
        try:
            return self._get_json("/api/version")
        except Exception as exc:  # pragma: no cover - best effort metadata fetch
            self.last_error = f"Could not reach noodle-flights metadata endpoint: {exc}"
            return None

    def _get_json(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.app_base_url}{path}"
        response = requests.get(url, params=params, timeout=self.http_timeout)
        response.raise_for_status()
        return response.json()
