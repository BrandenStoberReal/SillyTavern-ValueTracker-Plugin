import {spawn} from 'child_process';
import fs from 'fs';
import path from 'path';
import {Chalk} from 'chalk';

const chalk = new Chalk();
const MODULE_NAME = '[SillyTavern-ValueTracker-Plugin-Entry]';

/**
 * Checks if better-sqlite3 is available, with multiple fallback strategies.
 */
async function ensureBetterSqlite3(): Promise<void> {
    try {
        // Try to require better-sqlite3
        require('better-sqlite3');
        console.log(chalk.green(MODULE_NAME), 'better-sqlite3 is available');
        return;
    } catch (error) {
        console.log(chalk.yellow(MODULE_NAME), 'better-sqlite3 not found, attempting to install...');

        // Check if package.json exists in the current directory
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            console.error(chalk.red(MODULE_NAME), 'package.json not found in expected location');
            throw new Error('package.json not found in expected location');
        }

        // Try to install better-sqlite3 using npm
        try {
            await installWithNpm();
            console.log(chalk.green(MODULE_NAME), 'better-sqlite3 installed via npm');

            // Verify that it can now be loaded
            require('better-sqlite3');
            console.log(chalk.green(MODULE_NAME), 'better-sqlite3 loaded successfully after npm installation');
            return;
        } catch (npmError) {
            console.error(chalk.red(MODULE_NAME), 'npm installation failed:', npmError);

            // Provide clear instructions to the user
            console.log(chalk.yellow(MODULE_NAME), 'To fix this issue, please manually install the dependency:');
            console.log(chalk.yellow(MODULE_NAME), '1. Navigate to the plugin directory');
            console.log(chalk.yellow(MODULE_NAME), '2. Run: npm install better-sqlite3');

            throw new Error(`Both automatic installation and manual installation required. Error: ${npmError}`);
        }
    }
}

/**
 * Attempts to install better-sqlite3 using npm.
 */
function installWithNpm(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Run npm install for better-sqlite3
        const npmInstall = spawn('npm', ['install', 'better-sqlite3', '--no-save'], {
            cwd: path.join(__dirname, '..'), // Go up one level to the plugin root
            stdio: ['pipe', 'pipe', 'pipe']
        });

        npmInstall.on('error', (err) => {
            console.error(chalk.red(MODULE_NAME), 'Failed to start npm process:', err.message);
            reject(new Error(`Failed to start npm process: ${err.message}`));
        });

        npmInstall.stdout.on('data', (data) => {
            console.log(chalk.blue(MODULE_NAME), `npm install stdout: ${data}`);
        });

        npmInstall.stderr.on('data', (data) => {
            console.error(chalk.red(MODULE_NAME), `npm install stderr: ${data}`);
        });

        npmInstall.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
    });
}

/**
 * Load the main plugin after ensuring dependencies are available.
 */
async function loadMainPlugin() {
    try {
        await ensureBetterSqlite3();

        // Now dynamically import the main plugin
        const mainPlugin = await import('./index');
        console.log(chalk.green(MODULE_NAME), 'Main plugin loaded successfully');

        // Return the plugin interface
        return mainPlugin;
    } catch (error) {
        console.error(chalk.red(MODULE_NAME), 'Failed to load plugin:', error);
        throw error;
    }
}

// Export the functions that SillyTavern expects
export async function init(router: any) {
    try {
        const mainPlugin = await loadMainPlugin();
        return await mainPlugin.init(router);
    } catch (error) {
        console.error(chalk.red(MODULE_NAME), 'Failed to initialize plugin:', error);
        throw error;
    }
}

export async function exit() {
    try {
        const mainPlugin = await loadMainPlugin();
        return await mainPlugin.exit();
    } catch (error) {
        console.error(chalk.red(MODULE_NAME), 'Error during plugin exit:', error);
        // Still try to exit even if loading failed
        console.log(chalk.yellow(MODULE_NAME), 'Attempting graceful exit...');
        return Promise.resolve();
    }
}

export const info = {
    id: 'valuetracker',
    name: 'Value Tracking Plugin',
    description: 'A simple value tracking plugin for SillyTavern server with database support.',
};

// Export the default object as well
export default {
    init,
    exit,
    info,
};