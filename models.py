"""Action and Observation types for the Noodle Flights MCP environment."""

from __future__ import annotations

from typing import Any

from openenv.core import Action, CallToolAction, ListToolsAction, Observation, State


class NoodleFlightsAction(Action):
    """Dispatch wrapper that deserializes MCP action payloads.

    ``create_app`` calls ``action_cls.model_validate(data)`` to turn
    incoming JSON into an ``Action`` instance.  ``MCPEnvironment.step``
    then uses ``isinstance`` checks to route ``CallToolAction`` and
    ``ListToolsAction`` to the correct handler.  This class bridges the
    two by inspecting the ``type`` discriminator and returning the
    concrete MCP action type.
    """

    model_config = {"extra": "allow"}

    @classmethod
    def model_validate(
        cls,
        obj: Any,
        *,
        strict: bool | None = None,
        from_attributes: bool | None = None,
        context: dict[str, Any] | None = None,
    ) -> Action:
        if isinstance(obj, dict):
            action_type = obj.get("type")
            if action_type == "call_tool":
                return CallToolAction.model_validate(
                    obj, strict=strict, from_attributes=from_attributes, context=context,
                )
            if action_type == "list_tools":
                return ListToolsAction.model_validate(
                    obj, strict=strict, from_attributes=from_attributes, context=context,
                )
        return super().model_validate(
            obj, strict=strict, from_attributes=from_attributes, context=context,
        )


__all__ = ["NoodleFlightsAction", "Action", "Observation", "State"]
