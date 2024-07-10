import subprocess


class GitVersioning:
    def __init__(self, project_path, config):
        self.project_path = project_path
        self.versioningType = config.versioning_type

    def check_git_installation(self):
        if self.versioningType == "none":
            return True
        try:
            subprocess.run(["git", "--version"], capture_output=True, check=True)
            return True
        except FileNotFoundError:
            return False

    def initialize_git(self):
        if self.versioningType == "none":
            return
        if not self.check_git_installation():
            print("Git is not installed. Attempting to install...")
            # self.install_git()
            raise Exception("Git is not installed")

        # Check if the current directory is already a Git repository
        try:
            subprocess.run(
                ["git", "rev-parse", "--is-inside-work-tree"],
                cwd=self.project_path,
                check=True,
                capture_output=True,
                text=True,
            )
            print(
                "This directory is already a Git repository. Skipping initialization."
            )
            return
        except subprocess.CalledProcessError:
            # If the command fails, it means this is not a Git repository
            subprocess.run(["git", "init"], cwd=self.project_path, check=True)
            print("Git repository initialized successfully.")

    def get_branch(self):
        if self.versioningType == "none":
            return "none"

        result = subprocess.run(
            ["git", "branch", "--show-current"],
        cwd=self.project_path,
        capture_output=True,
        text=True,
        check=True,
        )
        return result.stdout


    def commit_all_files(self, message="Initial commit"):
        if self.versioningType == "none":
            return True, "none"
        subprocess.run(["git", "add", "."], cwd=self.project_path)
        res = subprocess.run(
            ["git", "commit", "-m", message], cwd=self.project_path
        )
        if res.returncode != 0:
            return False, res.stderr
        return True, res.stdout

    def commit_changes(self, message):
        if self.versioningType == "none":
            return True, "none"
        subprocess.run(
            ["git", "commit", "-am", message], cwd=self.project_path, check=True
        )

    def list_commits(self):
        if self.versioningType == "none":
            return "none"
        result = subprocess.run(
            ["git", "log", "--oneline"],
            cwd=self.project_path,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout

    def revert_to_commit(self, commit_hash):
        if self.versioningType == "none":
            return
        subprocess.run(
            ["git", "checkout", commit_hash], cwd=self.project_path, check=True
        )

    def create_branch(self, branch_name):
        if self.versioningType == "none":
            return
        subprocess.run(
            ["git", "checkout", "-b", branch_name], cwd=self.project_path, check=True
        )

    def switch_branch(self, branch_name):
        if self.versioningType == "none":
            return
        subprocess.run(
            ["git", "checkout", branch_name], cwd=self.project_path, check=True
        )

    def merge_branch(self, branch_name):
        if self.versioningType == "none":
            return
        subprocess.run(["git", "merge", branch_name], cwd=self.project_path, check=True)

    def check_branch_exists(self, branch_name):
        if self.versioningType == "none":
            return True
        return subprocess.run(["git", "branch", "--list", branch_name], cwd=self.project_path, check=True)

    def create_if_not_exists_and_checkout_branch(self, branch_name):
        if self.versioningType == "none":
            return
        if not self.check_branch_exists(branch_name):
            self.create_branch(branch_name)
        self.checkout_branch(branch_name)
        print(f"Created and checked out new branch: {branch_name}")

    def delete_branch(self, branch_name):
        if self.versioningType == "none":
            return
        subprocess.run(["git", "branch", "-d", branch_name], cwd=self.project_path, check=True)

    def get_branch_name(self):
        if self.versioningType == "none":
            return "none"
        return "devon_agent"
    
    def checkout_branch(self, branch_name):
        if self.versioningType == "none":
            return
        subprocess.run(["git", "checkout", branch_name], cwd=self.project_path, check=True)
        self.current_branch = branch_name
        

