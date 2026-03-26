from __future__ import annotations

from pathlib import Path
from typing import Any

import verifiers as vf

SYSTEM_PROMPT = """You are using the Noodle Flights simulator.

Solve the booking task by calling the available tools. Search with the exact task
constraints, pick the itinerary that satisfies the objective, then call
`complete_booking` to finish the episode. Do not invent flight results or claim
success without using the tools.
"""


def render_noodle_flights_prompt(
    observation: dict[str, Any],
    *,
    seed: int | None = None,
    **_: Any,
) -> list[dict[str, str]]:
    task = observation.get("task") or {}
    objective = task.get("objective", "Complete the flight-booking task.")
    trip_type = task.get("trip_type", "one-way")
    details = [
        f"Task ID: {task.get('id', 'unknown')}",
        f"Objective: {objective}",
        f"Trip type: {trip_type}",
        f"Origin: {task.get('origin', 'unknown')}",
        f"Destination: {task.get('destination', 'unknown')}",
        f"Departure date: {task.get('departure_date', 'unknown')}",
        f"Travel class: {task.get('travel_class', 'economy')}",
    ]
    return_date = task.get("return_date")
    if return_date:
        details.append(f"Return date: {return_date}")
    if seed is not None:
        details.append(f"Seed: {seed}")
    details.extend(
        [
            "",
            "Success criteria:",
            "- Search using the exact task parameters.",
            "- Select the cheapest valid departing flight.",
            "- For round-trip tasks, also select the cheapest valid return flight.",
            "- Finish by calling complete_booking.",
        ]
    )

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "\n".join(details)},
    ]


def load_environment(
    num_train_examples: int = 2,
    num_eval_examples: int = 2,
    seed: int = 0,
    max_turns: int = 10,
    startup_timeout_seconds: int = 120,
) -> vf.Environment:
    project_dir = Path(__file__).resolve().parent / "proj"
    return vf.OpenEnvEnv(
        openenv_project=project_dir,
        num_train_examples=num_train_examples,
        num_eval_examples=num_eval_examples,
        seed=seed,
        max_turns=max_turns,
        startup_timeout_seconds=startup_timeout_seconds,
        prompt_renderer=render_noodle_flights_prompt,
    )
