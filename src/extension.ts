import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('myExtension.scanWorkspace', async () => {
        // Access the custom setting for the workspace path
        const workspacePath = vscode.workspace.getConfiguration().get<string>('catfriend.workspacePath');

        if (!workspacePath || workspacePath.trim() === '') {
            vscode.window.showErrorMessage('Please set the workspace path in the CatFriend extension settings.');
            return;
        }

        // Show a progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Scanning Workspace for Python Modules",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Starting scan..." });

            // Perform the scan
            await scanFolderForModules(workspacePath, progress);

            // Final progress update
            progress.report({ increment: 100, message: "Scan complete." });
        });

        vscode.window.showInformationMessage('Workspace scan complete.');
    });

    context.subscriptions.push(disposable);
}

async function scanFolderForModules(folderPath: string, progress: vscode.Progress<{ message?: string; increment?: number }>) {
    return new Promise<void>((resolve, reject) => {
        fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
            if (err) {
                vscode.window.showErrorMessage(`Error reading folder: ${err.message}`);
                reject(err);
                return;
            }

            const totalFiles = files.length;
            let processedFiles = 0;

            files.forEach(file => {
                if (file.isDirectory()) {
                    const fullPath = path.join(folderPath, file.name);

                    if (file.name === 'src') {
                        handleSrcDirectory(fullPath);
                    } else {
                        scanFolderForModules(fullPath, progress);  // Recursively scan subfolders
                    }
                } else if (file.name === 'setup.py') {
                    const srcPath = path.join(folderPath, 'src');
                    if (fs.existsSync(srcPath)) {
                        handleSrcDirectory(srcPath);
                    }
                }

                // Update progress
                processedFiles += 1;
                const increment = (processedFiles / totalFiles) * 100;
                progress.report({ increment, message: `Scanning ${file.name}...` });
            });

            resolve();
        });
    });
}

function handleSrcDirectory(srcPath: string) {
    fs.readdir(srcPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            vscode.window.showErrorMessage(`Error reading src directory: ${err.message}`);
            return;
        }

        files.forEach(file => {
            if (file.isDirectory()) {
                const modulePath = path.join(srcPath, file.name);
                addModuleToPythonPath(modulePath);
            }
        });
    });
}

function addModuleToPythonPath(modulePath: string) {
    const pythonExtension = vscode.extensions.getExtension('ms-python.python');
    if (pythonExtension) {
        pythonExtension.activate().then(() => {
            const pythonSettings = vscode.workspace.getConfiguration('python');
            const currentPaths = pythonSettings.get<string[]>('analysis.extraPaths') || [];
            if (!currentPaths.includes(modulePath)) {
                currentPaths.push(modulePath);
                pythonSettings.update('analysis.extraPaths', currentPaths, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage(`Added ${modulePath} to Python path.`);
            }
        });
    }
}

export function deactivate() {}
