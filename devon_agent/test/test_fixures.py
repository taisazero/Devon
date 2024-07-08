import os
import pathlib
from typing import List
import pytest
from devon_agent.config import Config
from devon_agent.environments.shell_environment import (
    LocalShellEnvironment,
    TempDirShellEnvironment,
)
from devon_agent.tools.shelltool import ShellTool


@pytest.fixture
def files_to_copy():
    return ["test_files"]


@pytest.fixture
def temp_dir_shell_environment(tmp_path: pathlib.Path, files_to_copy: List[str]):
    env = TempDirShellEnvironment(path=tmp_path.as_posix())
    env.setup(files_to_copy)
    assert os.path.exists(os.path.join(env.path, "test_files"))
    env = LocalShellEnvironment(
        path=env.path, tools={"shell": ShellTool()}, default_tool=ShellTool()
    )
    return env


def test_config(temp_dir_shell_environment):
    config = Config(
        name="test_config",
        environments={"temp_dir_shell_environment": temp_dir_shell_environment},
        logger_name="test_logger",
        default_environment="temp_dir_shell_environment",
        db_path=".temp",
        persist_to_db=True,
        ignore_files=False,
        path=temp_dir_shell_environment.path,
    )
    return config
