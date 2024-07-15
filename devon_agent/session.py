import asyncio
import inspect
import json
import logging
import os
import time
import traceback
from typing import Dict, List

from devon_agent.agents.conversational_agent import ConversationalAgent
from devon_agent.config import Config
from devon_agent.data_models import _delete_session_util, _save_session_util
from devon_agent.tool import ToolNotFoundException
from devon_agent.tools import parse_command
from devon_agent.tools.codenav import CodeGoTo, CodeSearch
from devon_agent.tools.editorblock import EditBlockTool
from devon_agent.tools.editortools import (CreateFileTool, DeleteFileTool,
                                           OpenFileTool, ScrollDownTool,
                                           ScrollToLineTool, ScrollUpTool,
                                           save_create_file, save_delete_file)
from devon_agent.tools.filesearchtools import (FindFileTool, GetCwdTool,
                                               SearchDirTool)
from devon_agent.tools.filetools import FileTreeDisplay, SearchFileTool
from devon_agent.tools.lifecycle import NoOpTool
from devon_agent.tools.shelltool import ShellTool
from devon_agent.tools.usertools import AskUserTool
from devon_agent.tools.utils import get_ignored_files, read_file
from devon_agent.utils.telemetry import Posthog, SessionStartEvent
from devon_agent.utils.utils import DotDict, Event
from devon_agent.versioning.git_versioning import GitVersioning

def waitForEvent(event_log: List[Dict], event_type: str):
    while True:
        if event_log[-1]["type"] == event_type:
            return event_log[-1]
        time.sleep(1)
    

class Session:
    def __init__(self, config: Config, event_log: List[Dict]):
        self.name = config.name
        self.config = config
        self.persist_to_db = config.persist_to_db
        self.logger = logging.getLogger(self.config.logger_name)

        agent_config = self.config.agent_configs[0]

        if agent_config.agent_type == "conversational":
            self.agent = ConversationalAgent(
                name="ConversationalDevon",
                global_config=self.config,
                agent_config=agent_config,
            )
        else:
            raise ValueError(f"Agent type {agent_config.agent_type} not supported")

        self.environments = config.environments

        self.environments["local"].register_tools(
            {
                "create_file": CreateFileTool().register_post_hook(save_create_file),
                "open_file": OpenFileTool(),
                "scroll_up": ScrollUpTool(),
                "scroll_down": ScrollDownTool(),
                "scroll_to_line": ScrollToLineTool(),
                "search_file": SearchFileTool(),
                "edit": EditBlockTool(),
                "search_dir": SearchDirTool(),
                "find_file": FindFileTool(),
                "get_cwd": GetCwdTool(),
                "no_op": NoOpTool(),
                "delete_file": DeleteFileTool().register_post_hook(save_delete_file),
                "code_search": CodeSearch(),
                "code_goto": CodeGoTo(),
                "file_tree_display": FileTreeDisplay(),
            }
        )
        self.environments["local"].set_default_tool(ShellTool())
        self.environments["local"].event_log = event_log
        self.environments["user"].event_log = event_log

        self.environments["user"].register_tools({"ask_user": AskUserTool()})
        if self.config.versioning_type == "git":
            self.versioning = GitVersioning(config.path, config)

        self.base_path = config.path

        self.telemetry_client = Posthog()

        self.exclude_files = config.exclude_files

        self.status = "paused"

        self.db_path = config.db_path

        self.default_environment = self.environments["local"]

        self.event_log = event_log

    def init_state(self, event_log: List[Dict] = []):
        self.state = DotDict({})
        self.state.PAGE_SIZE = 200


        self.config.task = None

        self.status = "paused"

        self.path = self.config.path
        self.event_id = 0

        self.agent.reset()

        self.event_log = event_log
        for env in self.environments.values():
            env.event_log = event_log

        self.event_log.append(
            Event(
                type="Task",
                content="ask user for what to do",
                producer="system",
                consumer="devon",
            )
        )

    def to_dict(self):
        return {
            "config": self.config.model_dump(mode="json", exclude={"logger"}),
            "event_history": self.event_log,
        }

    @classmethod
    def from_config(cls, config: Config, event_log: List[Dict]):
        config = config
        instance = cls(config, event_log)

        # instance.state = DotDict(data["state"])
        instance.state = DotDict({})
        instance.state.editor = {}
        instance.state.editor["files"] = []
        # instance.event_log = event_log
        instance.event_id = len(event_log)

        # instance.environments["local"].communicate("cd " + data["cwd"])

        instance.event_log.append(
            Event(
                type="ModelRequest",
                content="Your interaction with the user was paused, please resume.",
                producer="system",
                consumer="devon",
            )
        )

        return instance

    def get_last_task(self):
        if self.state.task:
            return self.state.task
        return "Task unspecified ask user to specify task"

    def get_status(self):
        return self.status

    def pause(self):
        if self.status == "terminating" or self.status == "terminated":
            return
        self.status = "paused"

    def start(self):
        self.status = "running"

    def terminate(self):
        if self.status == "terminated":
            return
        self.status = "terminating"

        while self.status != "terminated":
            time.sleep(2)

    def run_event_loop(self):
        if self.config.versioning_type == "git":
            print("hello world")
            self.versioning.initialize_git()
            if not self.config.versioning_metadata:
                self.config.versioning_metadata = {}
            if "old_branch" not in self.config.versioning_metadata:
                self.config.versioning_metadata["old_branch"] = {}
                self.config.versioning_metadata["old_branch"] = self.versioning.get_branch()

            print("OLD BRANCH: ", self.config.versioning_metadata["old_branch"])
            print("NEW BRANCH: ", self.versioning.get_branch_name())
            # THIS PART IS STILL VERY JANKY. NEED A BETTER WAY TO HANDLE BLOCKING.
            if self.config.versioning_metadata["old_branch"] !=self.versioning.get_branch_name():
                while True:
                    try:
                        # TODO: deal with situation where session is being loaded.
                        self.versioning.create_if_not_exists_and_checkout_branch(self.versioning.get_branch_name())
                        self.config.versioning_metadata["current_branch"] = self.versioning.get_branch_name()
                        break
                    except Exception as e:
                        self.logger.error(f"Error creating branch: {e}")
                        self.event_log.append({
                            "type": "GitError",
                            "content": f"Error creating branch: {e}",
                            "producer": "system",
                            "consumer": "user",
                        })
                        resolved = waitForEvent(self.event_log, "GitResolve")
                        if resolved["content"]["action"] == "nogit":
                            self.config.versioning_type = "none"
                            break
            while True:
                try:
                    commit_hash = self.versioning.commit_all_files("initial commit")
                    self.config.versioning_metadata["initial_commit"] = commit_hash
                    self.config.versioning_metadata["commits"] = [commit_hash]
                    break
                except Exception as e:
                    self.logger.error(f"Error committing files: {e}")
                    self.event_log.append({
                        "type": "GitError",
                        "content": f"Error creating branch: {e}",
                        "producer": "system",
                        "consumer": "user",
                    })
                    resolved = waitForEvent(self.event_log, "GitResolve")
                    if resolved["content"]["action"] == "nogit":
                        self.config.versioning_type = "none"
                        break



        while True and not (self.event_id == len(self.event_log)):
            if self.status == "terminating":
                break

            if self.status == "paused":
                print("Session paused, waiting for resume")
                time.sleep(2)
                continue

            event = self.event_log[self.event_id]

            # self.logger.info(f"Event: {event}")
            # self.logger.info(f"State: {self.state}")

            if event["type"] == "Stop" and event["content"]["type"] != "submit":
                print("hopefully here")
                self.status = "terminated"
                break
            elif event["type"] == "Stop" and event["content"]["type"] == "submit":
                self.state.task = (
                    "You have completed your task, ask user for revisions or a new one."
                )
                self.event_log.append(
                    Event(
                        type="Task",
                        content="You have completed your task, ask user for revisions or a new one.",
                        producer="system",
                        consumer="devon",
                    )
                )

            events = self.step_event(event)
            self.event_log.extend(events)

            self.event_id += 1

        self.status = "terminated"
        # if self.config.versioning_type == "git":
        #     self.versioning.checkout_branch(self.config.versioning_metadata["old_branch"])

    def step_event(self, event):
        new_events = []
        # print("event", event)
        match event["type"]:
            case "Error":
                new_events.append(
                    {
                        "type": "Stop",
                        "content": {"type": "error", "message": event["content"]},
                        "producer": event["producer"],
                        "consumer": "user",
                    }
                )

            case "GitRequest":
                if event["content"]["type"] == "revert_to_commit":
                    # vgit
                    # safely_revert_to_commit(self.default_environment, event["content"]["commit_to_revert"], event["content"]["commit_to_go_to"])

                    new_events.append(
                        {
                            "type": "GitEvent",
                            "content": {
                                "type": "revert",
                                "commit": event["content"]["commit_to_go_to"],
                                "files": [],
                            },
                        }
                    )
            case "GitMerge":
                # self.versioning.checkout_branch(self.config.versioning_metadata["old_branch"])
                # self.versioning.merge_branch(self.config.versioning_metadata["current_branch"])
                # self.versioning.checkout_branch(self.config.versioning_metadata["current_branch"])
                dest_commit = self.config.versioning_metadata["commits"][-1]
                src_commit = self.config.versioning_metadata["commits"][0]
                merge_patch = self.versioning.get_diff_patch(src_commit,dest_commit)
                self.versioning.checkout_branch(self.config.versioning_metadata["old_branch"])
                self.versioning.apply_patch(merge_patch)
                self.versioning.commit_all_files(event["content"]["commit_message"])
                self.versioning.checkout_branch(self.config.versioning_metadata["current_branch"])


            case "ModelRequest":
                # TODO: Need some quantized timestep for saving persistence that isn't literally every 0.1s
                self.persist()
                if self.state.editor and self.state.editor.files:
                    for file in self.state.editor.files:
                        self.state.editor.files[file]["lines"] = read_file(
                            {
                                "environment": self.default_environment,
                                "session": self,
                                "state": self.state,
                            },
                            file,
                        )
                thought, action, output, commit_message = self.agent.predict(
                    self.get_last_task(), event["content"], self
                )
                if commit_message:
                    print("COMMIT MESSAGE: ", commit_message)
                    if self.config.versioning_type == "git":
                        success, message = self.versioning.commit_all_files(commit_message)
                        if not success:
                            self.logger.error(f"Error committing files: {message}")
                        else:
                            self.config.versioning_metadata["commits"].append(commit_message)
                            self.event_log.append(
                                {
                                    "type": "GitEvent",
                                    "content": {"type": "commit", "message": commit_message},
                                    "producer": self.agent.name,
                                    "consumer": event["producer"],
                                }
                            )
                if action == "hallucination":
                    new_events.append(
                        {
                            "type": "ModelRequest",
                            "content": output,
                            "producer": self.agent.name,
                            "consumer": event["producer"],
                        }
                    )
                elif action == "error":
                    pass
                else:
                    new_events.append(
                        {
                            "type": "ModelResponse",
                            "content": json.dumps(
                                {"thought": thought, "action": action, "output": output}
                            ),
                            "producer": self.agent.name,
                            "consumer": event["producer"],
                        }
                    )

            case "RateLimit":
                for i in range(60):
                    if self.status == "terminating":
                        break
                    time.sleep(1)
                new_events.append(
                    {
                        "type": "ModelRequest",
                        "content": event["content"],
                        "producer": self.agent.name,
                        "consumer": event["producer"],
                    }
                )


            case "ToolRequest":
                tool_name, args = event["content"]["toolname"], event["content"]["args"]

                match tool_name:
                    case "submit" | "exit" | "stop" | "exit_error" | "exit_api":
                        new_events.append(
                            {
                                "type": "Stop",
                                "content": {
                                    "type": tool_name,
                                    "message": " ".join(args),
                                },
                                "producer": event["producer"],
                                "consumer": "user",
                            }
                        )
                    case _:
                        try:
                            toolname = event["content"]["toolname"]
                            args = event["content"]["args"]
                            raw_command = event["content"]["raw_command"]

                            env = None

                            for _env in list(self.environments.values()):
                                if toolname in _env.tools:
                                    env = _env

                            if not env:
                                raise ToolNotFoundException(toolname, self.environments)

                            response = env.tools[toolname](
                                {
                                    "environment": env,
                                    "config": self.config,
                                    "state": self.state,
                                    "raw_command": raw_command,
                                },
                                *args,
                            )

                            new_events.append(
                                {
                                    "type": "ToolResponse",
                                    "content": response,
                                    "producer": toolname,
                                    "consumer": event["producer"],
                                }
                            )

                        except ToolNotFoundException as e:
                            if not (
                                self.default_environment
                                and self.default_environment.default_tool
                            ):
                                raise e

                            try:
                                new_events.append(
                                    {
                                        "type": "ShellRequest",
                                        "content": event["content"]["raw_command"],
                                        "producer": self.default_environment.name,
                                        "consumer": event["producer"],
                                    }
                                )

                                response = self.default_environment.default_tool(
                                    {
                                        "state": self.state,
                                        "environment": self.default_environment,
                                        "session": self,
                                        "raw_command": event["content"]["raw_command"],
                                    },
                                    event["content"]["toolname"],
                                    event["content"]["args"],
                                )

                                new_events.append(
                                    {
                                        "type": "ShellResponse",
                                        "content": response,
                                        "producer": self.default_environment.name,
                                        "consumer": event["producer"],
                                    }
                                )

                                new_events.append(
                                    {
                                        "type": "ToolResponse",
                                        "content": response,
                                        "producer": self.default_environment.name,
                                        "consumer": event["producer"],
                                    }
                                )
                            except Exception as e:
                                self.logger.error(traceback.format_exc())
                                self.logger.error(f"Error routing tool call: {e}")
                                new_events.append(
                                    {
                                        "type": "ToolResponse",
                                        "content": f"Error calling command, command failed with: {e.args[0] if len(e.args) > 0 else 'unknown'}",
                                        "producer": self.default_environment.name,
                                        "consumer": event["producer"],
                                    }
                                )
                        except Exception as e:
                            self.logger.error(traceback.format_exc())
                            self.logger.error(f"Error routing tool call: {e}")
                            new_events.append(
                                {
                                    "type": "ToolResponse",
                                    "content": e.args[0],
                                    "producer": self.default_environment.name,
                                    "consumer": event["producer"],
                                }
                            )

            case "ToolResponse":
                # self.versioning.commit_all_files("commit")
                # self.versioning.commit_all_files("commit")
                # Sync the editor state

                new_events.append(
                    {
                        "type": "ModelRequest",
                        "content": event["content"],
                        "producer": event["producer"],
                        "consumer": event["consumer"],
                    }
                )

            case "ModelResponse":
                content = json.loads(event["content"])["action"]
                try:
                    toolname, args = parse_command(content)
                    new_events.append(
                        {
                            "type": "ToolRequest",
                            "content": {
                                "toolname": toolname,
                                "args": args,
                                "raw_command": content,
                            },
                            "producer": event["producer"],
                            "consumer": event["consumer"],
                        }
                    )
                except ValueError as e:
                    new_events.append(
                        {
                            "type": "ToolResponse",
                            "content": e.args[0]
                            if len(e.args) > 0
                            else "Failed to parse command please follow the specified format",
                            "producer": event["producer"],
                            "consumer": event["consumer"],
                        }
                    )
                except Exception as e:
                    new_events.append(
                        {
                            "type": "Error",
                            "content": str(e),
                            "producer": event["producer"],
                            "consumer": event["consumer"],
                        }
                    )

            case "Interrupt":
                if self.agent.interrupt:
                    self.agent.interrupt += (
                        "You have been interrupted, pay attention to this message "
                        + event["content"]
                    )
                else:
                    self.agent.interrupt = event["content"]

            case "Task":
                task = event["content"]
                self.logger.info(f"Task: {task}")
                if task is None:
                    task = "Task unspecified ask user to specify task"

                new_events.append(
                    {
                        "type": "ModelRequest",
                        "content": "",
                        "producer": event["producer"],
                        "consumer": event["consumer"],
                    }
                )
            case _:
                pass

        return new_events

    def get_available_actions(self) -> list[str]:
        # get all tools for all environments

        tools = []
        for env in self.environments.values():
            tools.extend(env.tools)

        return tools

    def generate_command_docs(self, format="manpage"):
        """
        Generates a dictionary of function names and their docstrings.
        """
        docs = {}
        for env in self.environments.values():
            for name, tool in env.tools.items():
                signature = inspect.signature(tool.function)
                docs[name] = {
                    "docstring": tool.documentation(format),
                    "signature": str(signature),
                }

        return docs

    def setup(self):
        self.state.task = self.config.task

        self.status = "paused"

        for name, env in self.environments.items():
            print("Setting up env")
            env.setup()
            print(env.tools)
            for tool in env.tools.values():
                print("Setting up tool")
                tool.setup(
                    {
                        "environment": env,
                        "session": self,
                        "state": self.state,
                    }
                )

        if self.config.ignore_files:
            # check if devonignore exists, use default env
            devonignore_path = os.path.join(
                self.config.path, self.config.devon_ignore_file or ".devonignore"
            )
            _, rc = self.default_environment.execute("test -f " + devonignore_path)
            if rc == 0:
                self.config.exclude_files.extend(get_ignored_files(devonignore_path))
        self.telemetry_client.capture(SessionStartEvent(self.name))

    def teardown(self):
        for env in self.environments.values():
            env.teardown()
            for tool in env.tools.values():
                tool.setup(
                    {
                        "environment": env,
                        "session": self,
                        "state": self.state,
                    }
                )
        if self.config.versioning_type == "git":
            self.versioning.checkout_branch(self.config.versioning_metadata["current_branch"])

    def persist(self):
        if self.persist_to_db:
            asyncio.run(_save_session_util(self.name, self.to_dict()))

    def delete_from_db(self):
        if self.persist_to_db:
            asyncio.run(_delete_session_util(self.name))

    # def error_handler(self, system, event):
    #     return [Event(
    #         user=event.user,
    #         session_name=event.session_name,
    #         trajectory_id=event.trajectory_id,
    #         event_type="Stop",
    #         sub_event="",
    #         action="",
    #         producer="system",
    #         consumer="user",
    #     )]

    # @request_handler
    # def model_request_handler(self, system, event):
    #     if self.state.editor and self.state.editor.files:
    #         for file in self.state.editor.files:
    #             self.state.editor.files[file]["lines"]= read_file({
    #                         "environment" : self.default_environment,
    #                         "session" : self,
    #                         "state" : self.state,
    #                     },
    #                     file)
    #     thought, action, output = self.agent.predict(
    #         self.get_last_task(), event.content, self
    #     )
    #     if action == "hallucination":
    #         raise Exception(output)
    #     else:
    #         return {"thought": thought, "action": action, "output": output}

    # @request_handler
    # def tool_request_handler(self, system : EventSystem, event : Event):
    #     tool_name, args = event.content["toolname"], event.content["args"]

    #     match tool_name:
    #         case "submit" | "exit" | "stop" | "exit_error" | "exit_api":
    #             system.add_event(
    #                 Event(
    #         user=event.user,
    #         session_name=event.session_name,
    #         trajectory_id=event.trajectory_id,
    #         event_type="Stop",
    #         sub_event="",
    #         action="",
    #         producer="system",
    #         consumer="user",
    #         content={
    #             "type": tool_name,
    #             "message": " ".join(args),
    #                     },
    #                 )
    #             )
    #             system.pause()
    #             return
    #         case _:
    #             try:
    #                 toolname = event.content["toolname"]
    #                 args = event.content["args"]
    #                 raw_command = event.content["raw_command"]

    #                 env = None

    #                 for _env in list(self.environments.values()):
    #                     if toolname in _env.tools:
    #                         env = _env

    #                 if not env:
    #                     raise ToolNotFoundException(toolname, self.environments)

    #                 response = env.tools[toolname](
    #                     {
    #                         "environment": env,
    #                         "config": self.config,
    #                         "state": self.state,
    #                         "raw_command": raw_command,
    #                     },
    #                     *args,
    #                 )

    #                 return response

    #             except ToolNotFoundException as e:
    #                 if not (
    #                     self.default_environment
    #                     and self.default_environment.default_tool
    #                 ):
    #                     raise e

    #                 try:

    #                     system.add_event(
    #                         Event(
    #                             user=event.user,
    #                             session_name=event.session_name,
    #                             trajectory_id=event.trajectory_id,
    #                             event_type="Shell",
    #                             action="request",
    #                             sub_event="",
    #                             content=event.content["raw_command"],
    #                             producer=self.default_environment.name,
    #                         )
    #                     )

    #                     response = self.default_environment.default_tool(
    #                         {
    #                             "state": self.state,
    #                             "environment": self.default_environment,
    #                             "session": self,
    #                             "raw_command": event["content"]["raw_command"],
    #                         },
    #                         event["content"]["toolname"],
    #                         event["content"]["args"],
    #                     )

    #                     system.add_event(
    #                         Event(
    #                             user=event.user,
    #                             session_name=event.session_name,
    #                             trajectory_id=event.trajectory_id,
    #                             event_type="Shell",
    #                             action="response",
    #                             sub_event="",
    #                             content=response,
    #                             producer=self.default_environment.name,
    #                         )
    #                     )

    #                     return response

    #                 except Exception as e:
    #                     self.logger.error(traceback.format_exc())
    #                     self.logger.error(f"Error routing tool call: {e}")
    #                     raise Exception(f"Error calling command, command failed with: {e.args[0] if len(e.args) > 0 else 'unknown'}")

    #             except Exception as e:
    #                 self.logger.error(traceback.format_exc())
    #                 self.logger.error(f"Error routing tool call: {e}")
    #                 return e.args[0]

    # def interrupt_handler(self, system : EventSystem, event : Event):
    #     if self.agent.interrupt:
    #         self.agent.interrupt += (
    #             "You have been interrupted, pay attention to this message "
    #             + event["content"]
    #         )
    #     else:
    #         self.agent.interrupt = event["content"]

    # def task_handler(self, system : EventSystem, event : Event):
    #     self.state.task = event.content
    #     if self.state.task is None:
    #         self.state.task = "Task unspecified ask user to specify task"
    #     return [Event(
    #         user=event.user,
    #         session_name=event.session_name,
    #         trajectory_id=event.trajectory_id,
    #         event_type="Model",
    #         sub_event="",
    #         action="request",
    #         producer="system",
    #         consumer="devon",
    #         content="",
    #     )]

    # def model_response_handler(self, system : EventSystem, event : Event):
    #     content = event.content["action"]
    #     try:
    #         toolname, args = parse_command(content)
    #         return [Event(
    #             user=event.user,
    #             session_name=event.session_name,
    #             trajectory_id=event.trajectory_id,
    #             event_type="Tool",
    #             sub_event="",
    #             action="request",
    #             producer="system",
    #             consumer="devon",
    #             content={
    #                     "toolname": toolname,
    #                     "args": args,
    #                     "raw_command": content,
    #                 },
    #         )]

    #     except ValueError as e:
    #         return [Event(
    #             user=event.user,
    #             session_name=event.session_name,
    #             trajectory_id=event.trajectory_id,
    #             event_type="Tool",
    #             sub_event="",
    #             action="response",
    #             producer="system",
    #             content=e.args[0]
    #         )]

    #     except Exception as e:
    #         return [Event(
    #             user=event.user,
    #             session_name=event.session_name,
    #             trajectory_id=event.trajectory_id,
    #             event_type="Error",
    #             sub_event="",
    #             action="",
    #             producer="system",
    #             content=str(e),
    #         )]

    # def tool_response_handler(self, system : EventSystem, event : Event):
    #     return [Event(
    #         user=event.user,
    #         session_name=event.session_name,
    #         trajectory_id=event.trajectory_id,
    #         event_type="Model",
    #         sub_event="",
    #         action="request",
    #         producer=event.producer,
    #         content=event.content,
    #     )]
