from __future__ import annotations

import os
import uuid
from dataclasses import asdict, dataclass
from typing import Any, Literal

import requests
from fastmcp import FastMCP
from openenv.core import Action, MCPEnvironment, Observation, State
from openenv.core.env_server.interfaces import Environment

TripType = Literal["one-way", "round-trip"]
Leg = Literal["departing", "returning"]


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
        self.evaluation: dict[str, Any] | None = None
        self._reference_prices: dict[str, int | None] | None = None
        self._reward_reported = False

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
            self._require_active_episode()
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
            self._require_active_episode()
            self.selected_departing = self._select_option("departing", option_id)
            self.status = "outbound-selected"
            self.last_error = None
            return {
                "selected_departing": self.selected_departing,
                "selected_returning": self.selected_returning,
            }

        @self.mcp.tool
        def select_returning_flight(option_id: int) -> dict[str, Any]:
            self._require_active_episode()
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
            """Submit the selected flights. This ends the episode; the submission is final."""
            self._require_active_episode()
            self._evaluate_completion()
            return {
                "done": self.done,
                "reward": self.reward,
                "status": self.status,
                "message": "Booking submitted. The episode has ended.",
            }

        @self.mcp.tool
        def abandon_episode(reason: str = "agent_abandoned") -> dict[str, Any]:
            self._require_active_episode()
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
        self.evaluation = None
        self._reference_prices = None
        self._reward_reported = False
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
            evaluation=self.evaluation,
        )

    def step(
        self,
        action: Action,
        timeout_s: float | None = None,
        **kwargs: Any,
    ) -> Observation:
        observation = super().step(action, timeout_s=timeout_s, **kwargs)
        return self._finish_step(observation)

    if MCPEnvironment.step_async is not Environment.step_async:
        # openenv-core 0.3+ serves WebSocket steps through step_async, which no
        # longer goes through step(), so both paths report done and reward.
        async def step_async(
            self,
            action: Action,
            timeout_s: float | None = None,
            **kwargs: Any,
        ) -> Observation:
            observation = await super().step_async(action, timeout_s=timeout_s, **kwargs)
            return self._finish_step(observation)

    def _finish_step(self, observation: Observation) -> Observation:
        """Report the episode state on the step observation.

        Tool calls return MCP observations whose done/reward default to
        False/None, so the episode outcome is copied here. The episode reward
        is reported once, on the step that ends the episode; every other step
        reports 0.0, so summing step rewards gives the episode reward.
        """
        self.step_count += 1
        observation.done = self.done
        if self.done and not self._reward_reported:
            observation.reward = self.reward
            self._reward_reported = True
        else:
            observation.reward = 0.0
        return observation

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

    def _require_active_episode(self) -> None:
        if self.done:
            raise RuntimeError("The episode has ended. Call reset to start a new episode.")

    def _evaluate_completion(self) -> None:
        """Grade the submission and end the episode.

        The result is final, and the expected flights are never returned to
        the agent; failure reasons are kept in the environment state only.
        """
        if not self.task:
            raise RuntimeError("reset must be called before complete_booking")
        failures = self._submission_failures()
        self.done = True
        self.reward = 0.0 if failures else 1.0
        self.status = "failed" if failures else "completed"
        self.last_error = "; ".join(failures) or None
        self.evaluation = {"passed": not failures, "failures": failures}

    def _submission_failures(self) -> list[str]:
        assert self.task is not None
        if not self.last_search_request:
            return ["no search was run"]

        mismatches = self._search_mismatches()
        if mismatches:
            return [f"search does not match the task ({', '.join(mismatches)})"]

        legs: list[Leg] = ["departing"]
        if self.task.trip_type == "round-trip":
            legs.append("returning")

        cheapest = self._reference_cheapest_prices()
        failures: list[str] = []
        for leg in legs:
            selected = self.selected_departing if leg == "departing" else self.selected_returning
            if not selected:
                failures.append(f"no {leg} flight selected")
            elif cheapest[leg] is None or selected["price_usd"] != cheapest[leg]:
                failures.append(f"{leg} flight is not the cheapest available option")
        return failures

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

    def _reference_cheapest_prices(self) -> dict[str, int | None]:
        """Cheapest price per leg from a full search with the task's own parameters.

        Grading uses this search rather than the agent's last one, so a narrowed
        search (for example with exclude_layovers) cannot change which option
        counts as the cheapest. Any option at the cheapest price is accepted.
        """
        if self._reference_prices is None:
            assert self.task is not None
            params: dict[str, Any] = {
                "tripType": self.task.trip_type,
                "origin": self.task.origin,
                "destination": self.task.destination,
                "departureDate": self.task.departure_date,
                "travelClass": self.task.travel_class,
                "excludeLayovers": "false",
            }
            if self.task.return_date:
                params["returnDate"] = self.task.return_date
            payload = self._get_json("/api/flights", params)
            self._reference_prices = {
                "departing": self._lowest_price(payload.get("departingFlights", [])),
                "returning": self._lowest_price(payload.get("returningFlights", [])),
            }
        return self._reference_prices

    @staticmethod
    def _lowest_price(flights: list[dict[str, Any]]) -> int | None:
        prices = [flight["priceUsd"] for flight in flights if flight.get("priceUsd") is not None]
        return min(prices) if prices else None

    def _select_option(self, leg: Leg, option_id: int) -> dict[str, Any]:
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
