from typing import TYPE_CHECKING, Callable

from devon_agent.environment import EnvironmentModule

if TYPE_CHECKING:
    pass

class MorphACIEnvironment(EnvironmentModule):
    user_func: Callable

    @property
    def name(self):
        return "morph_environment"

    def setup(self, **kwargs):
        #TODO: Add any endpoint connections
        pass

    def teardown(self, **kwargs):
        pass

    def execute(self, input: str, timeout_duration=25):
        pass

    def save(self):
        return {
            "type": "MorphACIEnvironment",
            #TODO: Add anything here that needs to be saved
        }

    def load(self, data, user_func):
        self.user_func = user_func

    @classmethod
    def from_data(cls, data, user_func):
        return cls(user_func=user_func)
