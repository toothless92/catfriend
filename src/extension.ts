import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("CatFriend Logs");
    outputChannel.appendLine("CatFriend extension activated.");

    const autoRunOnStartup = vscode.workspace.getConfiguration().get<boolean>('catfriend.autoRunOnStartup');
    const workspacePath = vscode.workspace.getConfiguration().get<string>('catfriend.workspacePath');

    if (autoRunOnStartup) {
        outputChannel.appendLine("Auto-run on startup is enabled.");
        if (workspacePath && workspacePath.trim() !== '') {
            vscode.commands.executeCommand('myExtension.scanWorkspace');
        } else {
            outputChannel.appendLine("Workspace path is not set. Skipping auto-run.");
        }
    }

    let disposable = vscode.commands.registerCommand('myExtension.scanWorkspace', async () => {
        outputChannel.appendLine("Scan Workspace command invoked.");
        const workspacePath = vscode.workspace.getConfiguration().get<string>('catfriend.workspacePath');

        if (!workspacePath || workspacePath.trim() === '') {
            vscode.window.showErrorMessage('Please set the workspace path in the CatFriend extension settings.');
            outputChannel.appendLine("No workspace path set.");
            return;
        }

        outputChannel.appendLine(`Workspace path: ${workspacePath}`);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Scanning Workspace for Python Modules",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Starting scan..." });
            outputChannel.appendLine("Starting scan...");

            let foundPaths: string[] = [];

            try {
                foundPaths = await scanFolderForModules(workspacePath, progress, outputChannel);
                context.workspaceState.update('foundPythonPaths', foundPaths);
                await updatePythonPaths(foundPaths, outputChannel);
            } catch (error) {
                handleError(error, outputChannel);
            }

            progress.report({ increment: 100, message: "Scan complete." });
            outputChannel.appendLine("Scan complete.");
        });

        vscode.window.showInformationMessage('Workspace scan complete.');
    });

    context.subscriptions.push(disposable);
}

async function scanFolderForModules(folderPath: string, progress: vscode.Progress<{ message?: string; increment?: number }>, outputChannel: vscode.OutputChannel): Promise<string[]> {
    const foundPaths: string[] = [];
    outputChannel.appendLine("wahey");
    try {
        outputChannel.appendLine(`Scanning folder: ${folderPath}`);
        const files = await readdir(folderPath, { withFileTypes: true });
        outputChannel.appendLine(`Found ${files.length} items in folder: ${folderPath}`);

        const totalFiles = files.length;
        let processedFiles = 0;

        for (const file of files) {
            outputChannel.appendLine(`Processing item: ${file.name}`);
            if (file.isDirectory()) {
                // Skip directories starting with "."
                if (file.name.startsWith(".")) {
                    outputChannel.appendLine(`Skipping hidden directory: ${file.name}`);
                    continue;
                }

                const fullPath = path.join(folderPath, file.name);
                outputChannel.appendLine(`Processing directory: ${fullPath}`);

                if (file.name === 'src') {
                    // Directly add the src directory instead of its subfolders
                    foundPaths.push(fullPath);
                    outputChannel.appendLine(`Added src directory: ${fullPath}`);
                } else {
                    foundPaths.push(...await scanFolderForModules(fullPath, progress, outputChannel));  // Recursively scan subfolders
                }
            } else if (file.name === 'setup.py') {
                const srcPath = path.join(folderPath, 'src');
                if (fs.existsSync(srcPath)) {
                    outputChannel.appendLine(`Found setup.py, processing src directory: ${srcPath}`);
                    foundPaths.push(srcPath); // Add only the src directory
                }
            }

            processedFiles += 1;
            const increment = (processedFiles / totalFiles) * 100;
            progress.report({ increment, message: `Scanning ${file.name}...` });
        }
    } catch (err) {
        handleError(err, outputChannel);
    }

    return foundPaths;
}

function handleError(err: unknown, outputChannel: vscode.OutputChannel) {
    if (err instanceof Error) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
        outputChannel.appendLine(`Error: ${err.message}`);
    } else {
        vscode.window.showErrorMessage('An unknown error occurred.');
        outputChannel.appendLine('An unknown error occurred.');
    }
}

async function updatePythonPaths(foundPaths: string[], outputChannel: vscode.OutputChannel) {
    const pythonExtension = vscode.extensions.getExtension('ms-python.python');
    if (pythonExtension) {
        try {
            await pythonExtension.activate();

            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder is open.');
                outputChannel.appendLine('No workspace folder is open.');
                return;
            }

            const resourceUri = workspaceFolders[0].uri;
            const pythonSettings = vscode.workspace.getConfiguration('python', resourceUri);
            const currentPaths = pythonSettings.get<string[]>('analysis.extraPaths') || [];

            const newPaths = [...new Set([...currentPaths, ...foundPaths])];

            outputChannel.appendLine(`Attempting to update Python paths: ${newPaths}`);

            await pythonSettings.update('analysis.extraPaths', newPaths, vscode.ConfigurationTarget.WorkspaceFolder);
            
            // Confirm that the settings have been updated
            const updatedPaths = pythonSettings.get<string[]>('analysis.extraPaths');
            outputChannel.appendLine(`Updated Python paths in settings: ${updatedPaths}`);

            outputChannel.appendLine('Python paths successfully updated.');
            vscode.window.showInformationMessage('Python paths updated successfully.');
        } catch (error) {
            handleError(error, outputChannel);
        }
    } else {
        outputChannel.appendLine('Python extension is not available.');
        vscode.window.showErrorMessage('Python extension is not available.');
    }
}
