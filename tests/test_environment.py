"""Tests for the Noodle Flights OpenEnv wrapper's episode and reward handling.

The simulator API is replaced with a small fixed flight list that behaves like the real
one for what the wrapper uses: it resolves airport codes and city names, and labels each
flight with its airports and departure date. Every tool call goes through ``step`` (or
``step_async``) exactly as it does on the OpenEnv server.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
import requests
from openenv.core import CallToolAction

from noodle_flights.server import environment as environment_module
from noodle_flights.server.environment import NoodleFlightsEnvironment

ONE_WAY_FLIGHTS = [
    {"flightNumber": "AA108/AA985", "priceUsd": 247, "segments": [{}, {}]},
    {"flightNumber": "UA835/WS935", "priceUsd": 268, "segments": [{}, {}]},
    {"flightNumber": "UA389", "priceUsd": 284},
    {"flightNumber": "DL565", "priceUsd": 284},
]
OUTBOUND_FLIGHTS = [
    {"flightNumber": "AA258/AC224", "priceUsd": 225, "segments": [{}, {}]},
    {"flightNumber": "B6123", "priceUsd": 225},
    {"flightNumber": "DL400", "priceUsd": 260},
]
RETURN_FLIGHTS = [
    {"flightNumber": "AA198/AC116", "priceUsd": 216, "segments": [{}, {}]},
    {"flightNumber": "B6124", "priceUsd": 240},
]
CITY_AIRPORTS = {"SAN FRANCISCO": "SFO", "NEW YORK": "JFK", "LOS ANGELES": "LAX", "BOSTON": "BOS"}


def airport(location: str) -> str:
    key = location.strip().upper()
    return CITY_AIRPORTS.get(key, key)


def on_leg(flights: list[dict[str, Any]], origin: str, destination: str, date: str) -> list[dict[str, Any]]:
    return [
        {**flight, "originAirport": origin, "destinationAirport": destination, "depart": f"{date}T08:00:00-07:00"}
        for flight in flights
    ]


def fake_simulator(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    params = params or {}
    if path == "/api/version":
        return {"simVersion": "test", "rngSeed": 1, "dataSnapshotHash": None}
    if path == "/api/airports":
        return {"query": params.get("q", ""), "total": 1, "results": [{"iata": "SFO"}]}
    if path != "/api/flights":
        raise AssertionError(f"unexpected simulator path {path}")
    origin, destination = airport(params["origin"]), airport(params["destination"])
    if params["tripType"] == "round-trip":
        departing = on_leg(OUTBOUND_FLIGHTS, origin, destination, params["departureDate"])
        returning = on_leg(RETURN_FLIGHTS, destination, origin, params["returnDate"])
    else:
        departing, returning = on_leg(ONE_WAY_FLIGHTS, origin, destination, params["departureDate"]), []
    if params.get("excludeLayovers") == "true":
        departing = [flight for flight in departing if not flight.get("segments")]
        returning = [flight for flight in returning if not flight.get("segments")]
    return {"departingFlights": departing, "returningFlights": returning}


@pytest.fixture
def env() -> NoodleFlightsEnvironment:
    environment = NoodleFlightsEnvironment()
    environment._get_json = fake_simulator
    return environment


def call(env: NoodleFlightsEnvironment, tool: str, **arguments: Any):
    return env.step(CallToolAction(tool_name=tool, arguments=arguments))


def payload(observation) -> dict[str, Any]:
    assert observation.error is None, observation.error
    data = getattr(observation.result, "data", None)
    if data is None:
        data = getattr(observation.result, "structured_content", None)
    return data


def search_one_way(env: NoodleFlightsEnvironment, **overrides: Any) -> dict[str, Any]:
    arguments = dict(
        origin="SFO", destination="JFK", departure_date="2030-06-12", travel_class="economy", trip_type="one-way"
    )
    arguments.update(overrides)
    return payload(call(env, "search_flights", **arguments))


def search_round_trip(env: NoodleFlightsEnvironment) -> dict[str, Any]:
    return payload(
        call(
            env,
            "search_flights",
            origin="LAX",
            destination="BOS",
            departure_date="2030-09-10",
            return_date="2030-09-17",
            travel_class="economy",
            trip_type="round-trip",
        )
    )


def test_wrong_pick_ends_episode_without_revealing_the_answer(env):
    env.reset(seed=0)
    search_one_way(env)
    call(env, "select_departing_flight", option_id=2)

    observation = call(env, "complete_booking")
    result = payload(observation)

    assert observation.done is True
    assert observation.reward == 0.0
    assert result["done"] is True
    assert result["reward"] == 0.0
    assert result["status"] == "failed"
    assert "expected_departing" not in result
    assert "AA108" not in str(result)

    retry = call(env, "select_departing_flight", option_id=1)
    assert retry.error is not None
    assert "episode has ended" in retry.error.message
    assert call(env, "complete_booking").error is not None
    assert env.state.reward == 0.0


def test_cheapest_pick_reports_the_reward_once(env):
    env.reset(seed=0)
    search_one_way(env)
    call(env, "select_departing_flight", option_id=1)

    rewards = []
    finish = call(env, "complete_booking")
    rewards.append(finish.reward)
    assert finish.done is True
    assert finish.reward == 1.0
    assert payload(finish)["status"] == "completed"

    after = call(env, "get_selection")
    rewards.append(after.reward)
    assert after.done is True
    assert after.reward == 0.0
    assert sum(rewards) == 1.0
    assert env.state.evaluation == {"passed": True, "failures": []}


def test_steps_before_the_end_report_zero_reward(env):
    env.reset(seed=0)
    observation = call(env, "search_flights", origin="SFO", destination="JFK", departure_date="2030-06-12")
    assert observation.done is False
    assert observation.reward == 0.0
    assert env.state.step_count == 1


def test_any_option_at_the_cheapest_price_is_accepted(env):
    env.reset(seed=1)
    search_round_trip(env)
    call(env, "select_departing_flight", option_id=2)  # B6123, tied with option 1 at $225
    call(env, "select_returning_flight", option_id=1)

    finish = call(env, "complete_booking")
    assert finish.reward == 1.0


def test_round_trip_needs_the_cheapest_return_leg_too(env):
    env.reset(seed=1)
    search_round_trip(env)
    call(env, "select_departing_flight", option_id=1)
    call(env, "select_returning_flight", option_id=2)

    finish = call(env, "complete_booking")
    assert finish.done is True
    assert finish.reward == 0.0
    assert env.state.evaluation["failures"] == ["returning flight is not the cheapest available option"]


def test_narrowed_search_does_not_change_the_cheapest_option(env):
    env.reset(seed=0)
    result = search_one_way(env, exclude_layovers=True)
    assert result["departing_options"][0]["flight_number"] == "UA389"
    call(env, "select_departing_flight", option_id=1)

    finish = call(env, "complete_booking")
    assert finish.reward == 0.0
    assert env.state.evaluation["failures"] == ["departing flight is not the cheapest available option"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"origin": "sfo", "destination": " jfk "},
        {"travel_class": "Economy"},
        {"origin": "San Francisco", "destination": "New York"},
    ],
)
def test_search_spelling_does_not_change_the_grade(env, overrides):
    env.reset(seed=0)
    search_one_way(env, **overrides)
    call(env, "select_departing_flight", option_id=1)
    assert call(env, "complete_booking").reward == 1.0


def test_search_for_the_wrong_route_fails_and_ends_the_episode(env):
    env.reset(seed=0)
    search_one_way(env, destination="EWR")
    call(env, "select_departing_flight", option_id=1)

    finish = call(env, "complete_booking")
    assert finish.done is True
    assert finish.reward == 0.0
    assert "expected" not in str(payload(finish))
    assert env.state.evaluation["failures"] == ["departing flight is not on the task's route and date"]


def test_search_in_another_travel_class_fails(env):
    env.reset(seed=0)
    search_one_way(env, travel_class="business")
    call(env, "select_departing_flight", option_id=1)

    assert call(env, "complete_booking").reward == 0.0
    assert env.state.evaluation["failures"] == ["search used a different travel class"]


def test_completing_without_a_selection_ends_the_episode(env):
    env.reset(seed=0)
    search_one_way(env)

    finish = call(env, "complete_booking")
    assert finish.done is True
    assert finish.reward == 0.0
    assert env.state.evaluation["failures"] == ["no departing flight selected"]


def test_complete_booking_before_reset_is_refused(env):
    observation = call(env, "complete_booking")
    assert observation.error is not None
    assert "reset" in observation.error.message
    assert observation.done is False
    assert observation.reward == 0.0


def test_abandon_episode_ends_with_zero_and_refuses_tools(env):
    env.reset(seed=0)
    search_one_way(env)

    abandon = call(env, "abandon_episode")
    assert abandon.done is True
    assert abandon.reward == 0.0
    assert payload(abandon)["status"] == "abandoned"
    assert call(env, "complete_booking").error is not None
    assert env.state.reward == 0.0


@pytest.mark.parametrize(
    ("tool", "arguments"),
    [
        ("search_flights", {"origin": "SFO", "destination": "JFK", "departure_date": "2030-06-12"}),
        ("search_airports", {"query": "San Francisco"}),
        ("select_departing_flight", {"option_id": 1}),
        ("complete_booking", {}),
        ("abandon_episode", {}),
    ],
)
def test_tools_are_refused_after_the_episode_ends(env, tool, arguments):
    env.reset(seed=0)
    search_one_way(env)
    call(env, "select_departing_flight", option_id=1)
    call(env, "complete_booking")

    observation = call(env, tool, **arguments)
    assert observation.error is not None
    assert "episode has ended" in observation.error.message
    assert observation.done is True
    assert observation.reward == 0.0
    assert payload(call(env, "get_selection"))["reward"] == 1.0


def test_empty_reference_result_gives_zero(env):
    calls = {"flights": 0}

    def simulator(path, params=None):
        result = fake_simulator(path, params)
        if path == "/api/flights":
            calls["flights"] += 1
            if calls["flights"] > 1:  # the grading search
                result = {"departingFlights": [], "returningFlights": []}
        return result

    env._get_json = simulator
    env.reset(seed=0)
    search_one_way(env)
    call(env, "select_departing_flight", option_id=1)

    finish = call(env, "complete_booking")
    assert finish.done is True
    assert finish.reward == 0.0
    assert env.state.evaluation["failures"] == ["departing flight is not the cheapest available option"]


class FakeResponse:
    def __init__(self, url: str, status_code: int, body: dict[str, Any] | None = None):
        self.url = url
        self.status_code = status_code
        self._body = body or {}

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} Server Error for url: {self.url}", response=self)

    def json(self) -> dict[str, Any]:
        return self._body


def test_grading_search_failure_keeps_the_episode_open_and_hides_the_url(monkeypatch):
    state = {"flights": 0, "down": True}

    def fake_get(url, params=None, timeout=None):
        path = url.split("127.0.0.1:3000", 1)[-1]
        if path == "/api/flights":
            state["flights"] += 1
            if state["flights"] > 1 and state["down"]:  # the grading search
                return FakeResponse(url, 500)
        return FakeResponse(url, 200, fake_simulator(path, params))

    monkeypatch.setattr(environment_module.requests, "get", fake_get)
    monkeypatch.setenv("NOODLE_FLIGHTS_APP_URL", "http://127.0.0.1:3000")
    env = NoodleFlightsEnvironment()
    env.reset(seed=0)
    search_one_way(env)
    call(env, "select_departing_flight", option_id=1)

    failed = call(env, "complete_booking")
    assert failed.error is not None
    assert "unavailable (HTTP 500)" in failed.error.message
    assert not any(part in failed.error.message for part in ("http://", "127.0.0.1", "/api/flights"))
    assert failed.done is False
    assert env.state.grading_errors == 1
    assert "grading search failed" in env.state.last_error

    state["down"] = False
    retried = call(env, "complete_booking")
    assert retried.done is True
    assert retried.reward == 1.0


def test_search_failure_hides_the_url(monkeypatch):
    monkeypatch.setattr(
        environment_module.requests, "get", lambda url, params=None, timeout=None: FakeResponse(url, 503)
    )
    env = NoodleFlightsEnvironment()
    env.reset(seed=0)
    observation = call(env, "search_flights", origin="SFO", destination="JFK", departure_date="2030-06-12")
    assert observation.error is not None
    assert "unavailable (HTTP 503)" in observation.error.message
    assert not any(part in observation.error.message for part in ("http://", "127.0.0.1", "/api/flights"))


def test_reset_starts_a_fresh_episode(env):
    env.reset(seed=0)
    search_one_way(env)
    call(env, "complete_booking")

    env.reset(seed=0)
    assert env.state.done is False
    assert env.state.evaluation is None
    search_one_way(env)
    call(env, "select_departing_flight", option_id=1)
    assert call(env, "complete_booking").reward == 1.0


def test_async_steps_report_the_reward_once(env):
    env.reset(seed=0)
    search_one_way(env)
    call(env, "select_departing_flight", option_id=1)

    async def finish_and_read():
        finish = await env.step_async(CallToolAction(tool_name="complete_booking", arguments={}))
        after = await env.step_async(CallToolAction(tool_name="get_selection", arguments={}))
        return finish, after

    finish, after = asyncio.run(finish_and_read())
    assert (finish.done, finish.reward) == (True, 1.0)
    assert (after.done, after.reward) == (True, 0.0)
