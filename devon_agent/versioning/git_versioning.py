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
    

    def is_git_repo(self):
        result = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode == 0

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
        if init_result.returncode != 0:
            return init_result.returncode, init_result.stderr + init_result.stdout

        init_repo = subprocess.run(["git", "commit", "--allow-empty", "-m", "Initialized Repo"], cwd=self.project_path, capture_output=True, text=True)
        if init_repo.returncode != 0:
            return init_repo.returncode, init_repo.stderr + init_repo.stdout
        
        result = subprocess.run(["git", "switch", "-c", "main"], cwd=self.project_path, capture_output=True, text=True)
        if result.returncode != 0:
            return result.returncode, result.stderr + result.stdout

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
        if log_result.returncode == 0 and log_result.stdout.strip() == "Initial commit":
            hash_result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.project_path, capture_output=True, text=True)
            return hash_result.returncode, hash_result.stdout.strip() if hash_result.returncode == 0 else hash_result.stderr

        add_result = subprocess.run(["git", "add", "."], cwd=self.project_path, capture_output=True, text=True)
        if add_result.returncode != 0:
            return add_result.returncode, add_result.stderr

        commit_result = subprocess.run(
            ["git", "commit", "-m", "Initial commit","--allow-empty"], cwd=self.project_path, capture_output=True, text=True
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

    def stash_changes(self, message="devon_agent"):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "stash", "save", "-u", message], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr
    
    def apply_stash(self, stash_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "stash", "apply", stash_name], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr
    
    def pop_stash(self, stash_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(["git", "stash", "pop", stash_name], cwd=self.project_path, capture_output=True, text=True)
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
        result = subprocess.run(["git", "switch","-c", branch_name], cwd=self.project_path, capture_output=True, text=True)
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr

    def switch_branch(self, branch_name):
        if self.config.versioning_type == "none":
            return 0, "none"
        result = subprocess.run(
            ["git", "switch", branch_name], cwd=self.project_path, capture_output=True, text=True
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
        

        old_branch = self.get_branch()
        if old_branch[0] != 0:
            return old_branch
        
        branch_exists = self.check_branch_exists(branch_name)
        if branch_exists[0] != 0:
            create_result = self.create_branch(branch_name)
            print("create branch", create_result)
            if create_result[0] != 0:
                return create_result



        # checkout_result = self.checkout_branch(branch_name)
        # print("checkout branch", checkout_result)   
        # if checkout_result[0] != 0:
        #     return checkout_result

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
        result = subprocess.run(["git", "switch", branch_name], cwd=self.project_path, capture_output=True, text=True)
        if result.returncode == 0:
            self.current_branch = branch_name
        return result.returncode, result.stdout if result.returncode == 0 else result.stderr
    
    def get_file_content(self, commit, file):
        if self.config.versioning_type == "none":
            return 0, "none"
        
        result = subprocess.run(["git", "show", f'{commit}:{file}'], cwd=self.project_path, capture_output=True, text=True)
        
        if result.returncode == 0:
            return 0, result.stdout
        
        error_message = result.stderr.lower()
        
        if "exists on disk, but not in" in error_message:
            # File doesn't exist in this commit
            return 0, ""
        elif "bad object" in error_message:
            # Invalid commit hash
            return 1, f"Error: Invalid commit hash '{commit}'"
        elif "no such path" in error_message:
            # File doesn't exist in the repository at all
            return 0, ""
        elif "ambiguous argument" in error_message:
            # Ambiguous reference (could be multiple matches)
            return 1, f"Error: Ambiguous reference '{commit}'"
        elif "unknown revision" in error_message:
            # Unknown revision or path
            return 1, f"Error: Unknown revision or path '{commit}'"
        else:
            # Any other unexpected error
            return 1, f"Unexpected error: {result.stderr}"

    def get_diff_list(self, commit1, commit2):
        # Check if commits are valid
        for commit in [commit1, commit2]:
            result = subprocess.run(["git", "rev-parse", "--verify", commit], cwd=self.project_path, capture_output=True, text=True)
            if result.returncode != 0:
                return [], f"Error: Invalid commit '{commit}'"

        # Get the list of files that differ between the two commits
        diff_command = ["git", "diff", "--name-only", commit1, commit2]
        result = subprocess.run(diff_command, cwd=self.project_path, capture_output=True, text=True)
        
        if result.returncode != 0:
            return [], f"Error getting diff: {result.stderr}"

        files = result.stdout.split('\n')
        
        diff_list = []
        for file in files:
            if not file:
                continue
            status1, before_content = self.get_file_content(commit1, file)
            status2, after_content = self.get_file_content(commit2, file)
            
            if status1 == 1 or status2 == 1:
                # If there was an error getting the content, return the error
                return [], before_content if status1 == 1 else after_content
            
            diff_list.append((file, before_content, after_content))
        
        return diff_list, None  # Return None as the second item if there's no error