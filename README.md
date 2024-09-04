# CatFriend README

CatFriend is a simple extension to add Python packages that are normally packaged with ROS Catkin to Pylance's search path.

The extension will walk all the directories in a specified workspace and add any `src` folder to the Python path that is found in a directory also containing a `setup.py` file.

## Setup

Setup your workspace path by editing your VS Code `setting.json` --> bring up the command palette with `ctrl + shift + p`, select `Preferences: Open User Settings (JSON)`, and add: `"catfriend.workspacePath": "path/to/my/workspace"` to the file.

## Usage

Scan the workspace by running the command `CatFriend: Scan Workspace for Python Modules` (`use ctrl + shift + p` to bring up the command palette), or configure CatFriend to scan automatically when VS Code launches by adding `"catfriend.autoRunOnStartup": true` to `settings.json`.

## Extension Settings

* `catfriend.workspacePath`: Your Catkin workspace path (i.e. the root directory to be walked).
* `catfriend.autoRunOnStartup`: If True, CatFriend will search the workspace automatically on VS Code startup. Default is False

**Enjoy!**
