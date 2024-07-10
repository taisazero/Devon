import os
import pathlib
from typing import List

import pytest

from devon_agent.config import Config
from devon_agent.environments.shell_environment import (
    LocalShellEnvironment, TempDirShellEnvironment)
from devon_agent.tools.shelltool import ShellTool




