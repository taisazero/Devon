from typing import TYPE_CHECKING, Callable

from devon_agent.environment import EnvironmentModule
import requests
from typing import Dict, Any

if TYPE_CHECKING:
    pass

class VSCodeEnvironment(EnvironmentModule):
    endpoint : str = "http://localhost:4592"

    @property
    def name(self):
        return "vscode_environment"

    def is_online(self) -> bool:
        """
        Check if the ACI service is online.

        Returns:
            bool: True if the service is online, False otherwise.
        """
        try:
            r = requests.get(self.endpoint)
        except requests.exceptions.ConnectionError:
            return False
        return r.status_code == 200
    
    def setup(self, **kwargs):
        return self.is_online()
        

    def teardown(self, **kwargs):
        pass

    def execute(self, action:str, params:Dict[str, Any], timeout_duration=25) -> Dict[str, Any]:

        response = requests.post(
            self.endpoint,
            headers={"Content-Type": "application/json"},
            json={"action": action, "params": params}
        )
        try:
            
            return response.json()
        except:
            return {
                "success": False,
                "error": response.text
            }

    def save(self):
        return {
            "type": "VSCodeEnvironment",
            #TODO: Add anything here that needs to be saved
        }

    def load(self, data, user_func):
        pass

    @classmethod
    def from_data(cls, data, user_func):
        return cls(user_func=user_func)
