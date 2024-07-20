import json
from typing import Dict

from devon_agent.config import Checkpoint, Config
from devon_agent.environments.shell_environment import LocalShellEnvironment
from devon_agent.environments.user_environment import UserEnvironment
from devon_agent.versioning.git_versioning import GitVersioning


def hydrate_config(config: Dict, input_func):
    if "environments" in config:
        for k, v in config["environments"].items():
            if v["type"] == "LocalShellEnvironment":
                config["environments"][k] = LocalShellEnvironment.from_data(v)
            elif v["type"] == "UserEnvironment":
                config["environments"][k] = UserEnvironment.from_data(v, input_func)
    return Config(**config)


def make_checkpoint(
    commit_message: str, config: Config, event_id: int, versioning: GitVersioning
) -> Checkpoint:
    success, message = versioning.commit_all_files(commit_message)

    return Checkpoint(
        commit_message=commit_message,
        commit_hash="no_commit" if not (success == 0) else message,
        agent_history=config.agent_configs[0].chat_history,
        event_id=event_id,
        checkpoint_id=len(config.checkpoints),
        state=json.loads(json.dumps(config.state)),
    )