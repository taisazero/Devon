from devon_agent.tool import Tool, ToolContext
from devon_agent.tools.utils import (cwd_normalize_path,
                                     make_abs_path)

class ListFileTree(Tool):
    @property
    def name(self):
        return "listFileTree"

    @property
    def supported_formats(self):
        return ["docstring"] # , "manpage"]

    def setup(self, context: ToolContext):
        pass

    def cleanup(self, context: ToolContext):
        pass

    def documentation(self, format="docstring"):
        match format:
            case "docstring":
                return self.function.__doc__
            case "manpage":
                return """
                """
            case _:
                raise ValueError(f"Invalid format: {format}")

    def function(self, context: ToolContext, **kwargs):
        """
        command_name: listFileTree
        description: The listFileTree command shows all the files and folders in the current IDE workspace.
        signature: listFileTree
        example: listFileTree
        """
        

        dict_tree= context["environment"].execute(action=self.name, params={})['tree']
        # create a tree from the following dict: 'tree': {'.vscode': 2, 'main.py': 1, 'utils': {'__pycache__': {'dataloader.cpython-310.pyc': 1}, 'dataloader.py': 1}}
        file_tree = self.create_file_tree_string(dict_tree)
        return file_tree

    def create_file_tree_string(self, tree, indent=0):
        tree_string = ""
        for key, value in tree.items():
            if isinstance(value, dict):
                tree_string += "    " * indent + key + "/\n"
                tree_string += self.create_file_tree_string(value, indent + 1)
            else:
                tree_string += "    " * indent + key + "\n"
        return tree_string





class OpenFile(Tool):
    @property
    def name(self):
        return "openFile"

    @property
    def supported_formats(self):
        return ["docstring"] # , "manpage"]

    def setup(self, context: ToolContext):
        pass

    def cleanup(self, context: ToolContext):
        pass

    def documentation(self, format="docstring"):
        match format:
            case "docstring":
                return self.function.__doc__
            case "manpage":
                return """
                """
            case _:
                raise ValueError(f"Invalid format: {format}")

    def function(self, context: ToolContext, file_path: str, **kwargs):
        """
        command_name: openFile
        description: The `openFile` command opens a file in the current IDE workspace to shows its contents.
        signature: openFile [FILE_PATH]
        example: openFile main.py
        """
        file_path = "/home/erfan/Documents/simple_app/" + file_path
        content = context["environment"].execute(action=self.name, params={"file": file_path})['contentStr']
        # add line numbers to the content
        content = self.add_line_numbers(content)
        return content
    def add_line_numbers(self, content):
        lines = content.split("\n")
        numbered_lines = ""
        for i, line in enumerate(lines):
            numbered_lines += f"{i+1:03d} | {line}\n"
        return numbered_lines
    
class EditFile(Tool):
    @property
    def name(self):
        return "editFile"

    @property
    def supported_formats(self):
        return ["docstring"] # , "manpage"]

    def setup(self, context: ToolContext):
        pass

    def cleanup(self, context: ToolContext):
        pass

    def documentation(self, format="docstring"):
        match format:
            case "docstring":
                return self.function.__doc__
            case "manpage":
                return """
                """
            case _:
                raise ValueError(f"Invalid format: {format}")

    def function(self, context: ToolContext, file_path: str, *args, **kwargs):
        """
        command_name: editFile
        description: The `editFile` command edits a file in the current IDE workspace by inserting the content between the start and end lines with the provided content.
        signature: editFile [FILE_PATH] [CONTENT] [START_LINE] [END_LINE]
        example: editFile main.py "print('hello world')" 25 26
        """
        # *args would contain all of the content, start_line, and end_line
        # everything in between "" is considered as content
        
        content = ""
        for arg in args[:-2]:
            content += arg
        start_line = args[-2]
        end_line = args[-1]
        file_path = "/home/erfan/Documents/simple_app/" + file_path
        return str(context["environment"].execute(action=self.name, params={"file": file_path, "content": content, "startLine": start_line, "endLine": end_line}))


