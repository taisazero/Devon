import subprocess

from devon_agent.config import Config


class GitVersioning:
    def __init__(self, project_path, config : Config):
        self.project_path = project_path
        self.config = config

    def check_git_installation(self):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "--version"], capture_output=True, text=True)
        return result.returncode, result.stdout.strip() if result.returncode == 0 else result.stderr

    def initialize_git(self):
        if self.config.versioning_type == "none":
            return 0, "none"
        installation_check = self.check_git_installation()
        if installation_check[0] != 0:
            return installation_check

        result = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=self.project_path,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return 0, "This directory is already a Git repository. Skipping initialization."
        
        init_result = subprocess.run(["git", "init"], cwd=self.project_path, capture_output=True, text=True)
        return init_result.returncode, init_result.stdout if init_result.returncode == 0 else init_result.stderr

    def get_branch(self):
        if self.config.versioning_type == "none":
            return 0, "none"

        result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=self.project_path,
            capture_output=True,
            text=True,
        )
        return result.returncode, result.stdout.strip() if result.returncode == 0 else result.stderr

    def commit_all_files(self, message="Initial commit"):
        if self.config.versioning_type == "none":
            return 0, "none"
        add_result = subprocess.run(["git", "add", "."], cwd=self.project_path, capture_output=True, text=True)
        if add_result.returncode != 0:
            return add_result.returncode, add_result.stderr + add_result.stdout

        commit_result = subprocess.run(
            ["git", "commit", "-m", message], cwd=self.project_path, capture_output=True, text=True
        )
        if commit_result.returncode != 0:
            return commit_result.returncode, commit_result.stderr + commit_result.stdout

        hash_result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.project_path, capture_output=True, text=True)
        return hash_result.returncode, hash_result.stdout.strip() if hash_result.returncode == 0 else hash_result.stderr

    def initial_commit(self):
        if self.config.versioning_type == "none":
            return 0, "none"
        log_result = subprocess.run(["git", "log", "-1", "--pretty=%B"], cwd=self.project_path, capture_output=True, text=True)
        if log_result.returncode == 0 and log_result.stdout.strip() == "initial commit":
            hash_result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.project_path, capture_output=True, text=True)
            return hash_result.returncode, hash_result.stdout.strip() if hash_result.returncode == 0 else hash_result.stderr

        add_result = subprocess.run(["git", "add", "."], cwd=self.project_path, capture_output=True, text=True)
        if add_result.returncode != 0:
            return add_result.returncode, add_result.stderr

        commit_result = subprocess.run(
            ["git", "commit", "-m", "initial commit", "--allow-empty"], cwd=self.project_path, capture_output=True, text=True
        )
        if commit_result.returncode != 0:
            return commit_result.returncode, commit_result.stderr

        hash_result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.project_path, capture_output=True, text=True)
        return hash_result.returncode, hash_result.stdout.strip() if hash_result.returncode == 0 else hash_result.stderr

    def commit_changes(self, message):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(
            ["git", "commit", "-am", message], cwd=self.project_path, capture_output=True, text=True
        )
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr
    
    def get_last_commit(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "rev-parse", branch_name], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout.strip() if result.returncode == 0 else result.stderr

    def get_diff_patch(self, commit_hash_src, commit_hash_dst,format="patch"):
        if self.config.versioning_type == "none":
            return 0, "none"
        format = "-U" if format == "unified" else "-p"
        result = subprocess.run(["git", "diff", format, commit_hash_src, commit_hash_dst], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def apply_patch(self, patchfile):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "apply", patchfile], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def list_commits(self):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(
            ["git", "log", "--oneline"],
            cwd=self.project_path,
            capture_output=True,
            text=True,
        )
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def revert_to_commit(self, commit_hash):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(
            ["git", "reset", '--hard', commit_hash], cwd=self.project_path, capture_output=True, text=True, timeout=2
        )
        # run git clean -fd
        clean_result = subprocess.run(["git", "clean", "-fd"], cwd=self.project_path, capture_output=True, text=True)
        if clean_result.returncode != 0:
            return clean_result.returncode, clean_result.stderr
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def create_branch(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "checkout", "-b", branch_name], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def switch_branch(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(
            ["git", "checkout", branch_name], cwd=self.project_path, capture_output=True, text=True
        )
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def merge_branch(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "merge", branch_name], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def check_branch_exists(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(
            ["git", "rev-parse", "--verify", branch_name],
            cwd=self.project_path,
            capture_output=True,
            text=True
        )
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def create_if_not_exists_and_checkout_branch(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        current_branch = self.get_branch()
        if current_branch[0] == 0 and current_branch[1].strip() == branch_name:
            return 0, "Branch already exists"
        
        branch_exists = self.check_branch_exists(branch_name)
        if branch_exists[0] != 0:
            create_result = self.create_branch(branch_name)
            if create_result[0] != 0:
                return create_result

        old_branch = self.get_branch()
        if old_branch[0] != 0:
            return old_branch

        checkout_result = self.checkout_branch(branch_name)
        if checkout_result[0] != 0:
            return checkout_result

        merge_result = self.merge_branch(old_branch[1])
        if merge_result[0] != 0:
            return merge_result

        return 0, f"Created and checked out new branch: {branch_name}"

    def delete_branch(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "branch", "-d", branch_name], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def get_branch_name(self):
        if self.config.versioning_type == "none":
            return 0, "none"
        return 0, "devon_agent"

    def checkout_branch(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "checkout", branch_name], cwd=self.project_path, capture_output=True, text=True)
        if result.returncode == 0:
            self.current_branch = branch_name
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr
