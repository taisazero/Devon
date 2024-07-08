


from typing import Dict
from devon_agent.config import Config
from devon_agent.environments.shell_environment import LocalShellEnvironment
from devon_agent.environments.user_environment import UserEnvironment


def hydrate_config(config:Dict,input_func):
    if "environments" in config:
        for k,v in config["environments"].items():
            if v["type"] == "LocalShellEnvironment":
                config["environments"][k] = LocalShellEnvironment.from_data(v)
            elif v["type"] == "UserEnvironment":
                config["environments"][k] = UserEnvironment.from_data(v,input_func)
    return Config(**config)