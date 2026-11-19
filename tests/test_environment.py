"""Tests for the Noodle Flights OpenEnv wrapper's episode and reward handling.

The simulator API is replaced with a small fixed flight list, and every tool
call goes through ``step`` exactly as it does on the OpenEnv server.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
from openenv.core import CallToolAction

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


def fake_simulator(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    params = params or {}
    if path == "/api/version":
        return {"simVersion": "test", "rngSeed": 1, "dataSnapshotHash": None}
    if path != "/api/flights":
        raise AssertionError(f"unexpected simulator path {path}")
    if params["tripType"] == "round-trip":
        departing, returning = OUTBOUND_FLIGHTS, RETURN_FLIGHTS
    else:
        departing, returning = ONE_WAY_FLIGHTS, []
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


def search_one_way(env: NoodleFlightsEnvironment, **extra: Any) -> dict[str, Any]:
    return payload(
        call(
            env,
            "search_flights",
            origin="SFO",
            destination="JFK",
            departure_date="2030-06-12",
            travel_class="economy",
            trip_type="one-way",
            **extra,
        )
    )


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


def test_search_for_the_wrong_route_fails_and_ends_the_episode(env):
    env.reset(seed=0)
    payload(call(env, "search_flights", origin="SFO", destination="EWR", departure_date="2030-06-12"))
    call(env, "select_departing_flight", option_id=1)

    finish = call(env, "complete_booking")
    assert finish.done is True
    assert finish.reward == 0.0
    assert "expected" not in str(payload(finish))


def test_completing_without_a_selection_ends_the_episode(env):
    env.reset(seed=0)
    search_one_way(env)

    finish = call(env, "complete_booking")
    assert finish.done is True
    assert finish.reward == 0.0
    assert env.state.evaluation["failures"] == ["no departing flight selected"]


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


def test_async_step_reports_done_and_reward(env):
    env.reset(seed=0)
    search_one_way(env)
    call(env, "select_departing_flight", option_id=1)

    finish = asyncio.run(env.step_async(CallToolAction(tool_name="complete_booking", arguments={})))
    assert finish.done is True
    assert finish.reward == 1.0
