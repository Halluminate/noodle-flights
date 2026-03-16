from openenv.core import Observation
from openenv.core.env_server.http_server import create_app

from ..models import NoodleFlightsAction
from .environment import NoodleFlightsEnvironment

app = create_app(
    NoodleFlightsEnvironment,
    NoodleFlightsAction,
    Observation,
    env_name="noodle_flights",
)


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
