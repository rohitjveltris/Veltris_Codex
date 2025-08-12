import os
from pathlib import Path
import pathspec
from pathspec.patterns import GitWildMatchPattern

# Global .gitignore spec
GITIGNORE_SPEC = None

# Determine the repository root once
REPO_ROOT = Path(os.getcwd())

def get_validated_path(base_path: str, file_path: str) -> Path:
    if not base_path:
        raise ValueError("A working directory must be specified.")

    base_path = Path(base_path).resolve()

    if not base_path.is_dir():
        raise ValueError(f"Invalid base path: {base_path}")

    full_path = (base_path / file_path).resolve()

    if not full_path.is_relative_to(base_path):
        raise SecurityException(f"Attempted path traversal: {file_path}")

    return full_path


class SecurityException(Exception):
    pass


def load_gitignore(repo_root: Path):
    global GITIGNORE_SPEC
    gitignore_path = repo_root / ".gitignore"
    if gitignore_path.exists():
        with open(gitignore_path, "r") as f:
            lines = f.readlines()
            print(f"DEBUG: Gitignore lines: {lines}") # Added debug print
            GITIGNORE_SPEC = pathspec.PathSpec.from_lines(GitWildMatchPattern, lines)
    else:
        GITIGNORE_SPEC = None

def is_ignored(file_path: Path, repo_root: Path) -> bool:
    # Skip common system files and directories
    name = file_path.name
    
    # Skip hidden files (except .env)
    if name.startswith('.') and name not in ['.env']:
        return True
    
    # Skip common ignore patterns
    if name in ['node_modules', '__pycache__', 'dist', 'build', '.git', '.next', 'coverage']:
        return True
    
    # Skip log files and temp files
    if name.endswith(('.log', '.tmp', '.temp')):
        return True
    
    return False

async def list_directory(path: str) -> dict:
    base_path = Path(path).resolve()
    if not base_path.is_dir():
        return {"error": f"Invalid directory: {path}"}

    load_gitignore(base_path)

    def get_tree(current_dir: Path):
        tree = []
        try:
            for item in os.listdir(current_dir):
                item_path = current_dir / item
                if is_ignored(item_path, base_path): # Check if ignored
                    continue

                if item_path.is_dir():
                    # Recursively get children, but only if not ignored
                    children = get_tree(item_path)
                    tree.append({"name": item, "type": "directory", "children": children or []})
                elif item_path.is_file():
                    tree.append({"name": item, "type": "file"})
        except Exception as e:
            print(f"Error listing directory {current_dir}: {e}")
        return tree

    return {"tree": get_tree(base_path)}

async def read_file(absolute_path: str, base_path: str = None) -> dict:
    try:
        full_path = get_validated_path(base_path, absolute_path)
        with open(full_path, 'r') as f:
            content = f.read()
        return {"content": content}
    except (ValueError, SecurityException) as e:
        return {"content": f"Error: {e}"}
    except Exception as e:
        print(f"Error reading file {full_path}: {e}")
        return {"content": f"Error reading file: {e}"}

async def write_file(file_path: str, content: str, base_path: str = None) -> dict:
    try:
        full_path = get_validated_path(base_path, file_path)
        full_path.parent.mkdir(parents=True, exist_ok=True) # Ensure directory exists
        with open(full_path, 'w') as f:
            f.write(content)
        return {"success": True, "message": f"File {file_path} written successfully."}
    except (ValueError, SecurityException) as e:
        return {"success": False, "message": f"Error: {e}"}
    except Exception as e:
        print(f"Error writing file {full_path}: {e}")
        return {"success": False, "message": f"Error writing file: {e}"}