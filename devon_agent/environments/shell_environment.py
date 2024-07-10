import errno
import os
import shutil
import subprocess
import tempfile
import traceback
from typing import TYPE_CHECKING, List

from pydantic import Field

from devon_agent.environment import EnvironmentModule

if TYPE_CHECKING:
    pass


class LocalShellEnvironment(EnvironmentModule):
    path: str
    old_dir: str = Field(default=None)
    process: subprocess.Popen = Field(default=None)

    class Config:
        arbitrary_types_allowed = True

    @property
    def name(self):
        return "local"

    def setup(self, **kwargs):
        try:
            self.old_dir = os.getcwd()
            os.chdir(self.path)
        except Exception as e:
            print("Error changing directory", e)

        # Start a new shell process
        self.process = subprocess.Popen(
            ["/bin/bash"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            text=True,
        )

    def teardown(self, **kwargs):
        os.chdir(self.old_dir)

    def get_cwd(self):
        return self.execute("pwd")[0]

    def execute(self, input: str, timeout_duration=25):
        try:
            self.event_log.append(
                {
                    "type": "EnvironmentRequest",
                    "content": input,
                    "producer": "tool",
                    "consumer": self.name,
                }
            )

            self.process.stdin.write(input + "\n")
            self.process.stdin.write('echo "\n$?"\n')
            self.process.stdin.write("echo 'EOL'\n")
            self.process.stdin.write("echo 'EOL' >&2\n")
            self.process.stdin.flush()

            output = ""
            error = ""

            while (line := self.process.stdout.readline()) != "EOL\n":
                output += line

            while (line := self.process.stderr.readline()) != "EOL\n":
                error += line

            return_code = int(output.splitlines()[-1])
            output = "\n".join(output.splitlines()[:-1])
            output = output if return_code == 0 else output + error

            self.event_log.append(
                {
                    "type": "EnvironmentResponse",
                    "content": output,
                    "producer": self.name,
                    "consumer": "tool",
                }
            )

            return output, return_code
        except Exception as e:
            traceback.print_exc()
            return str(e), -1

    def __enter__(self):
        self.setup()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.teardown(exc_type, exc_value, traceback)

    def save(self):
        return {
            "type": "LocalShellEnvironment",
            "path": self.path,
            "cwd": self.get_cwd(),
            "old_dir": self.old_dir,
            # "state": self.state,
        }

    def load(self, data):
        self.path = data["path"]
        # self.state = data["state"]
        self.old_dir = data["old_dir"]
        if not self.process:
            pass
        else:
            os.chdir(data["cwd"])

    @classmethod
    def from_data(cls, data):
        env = cls(**data)
        env.load(data)
        return env

def copyanything(src, dst):
    try:
        shutil.copytree(src, dst)
    except OSError as exc: # python >2.5
        if exc.errno in (errno.ENOTDIR, errno.EINVAL):
            shutil.copy(src, dst)
        else: raise

class TempDirShellEnvironment(LocalShellEnvironment):
    path: str = Field(default_factory=lambda: tempfile.TemporaryDirectory().name)

    def setup(self, files_to_cp: List[str], **kwargs):
        for src in files_to_cp:
            print(src)
            dest = copyanything(src, self.path)
            print(dest)
        super().setup(**kwargs)
