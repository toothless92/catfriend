# CatFriend README

CatFriend is a simple extension to add Python packages that are normally packaged with ROS Catkin to Pylance's search path.

## Features

The extension will walk all the directories in a specified workspace and add any `src` folder to the Python path that is found in a directory also containing a `setup.py` file.

## Extension Settings

* `catfriend.workspacePath`: Your Catkin workspace path (i.e. the root directory to be walked).
* `catfriend.autoRunOnStartup`: If True, CatFriend will search the workspace automatically on VS Code startup. Default is False

### 1.0.0

Initial release of CatFriend.

**Enjoy!**
