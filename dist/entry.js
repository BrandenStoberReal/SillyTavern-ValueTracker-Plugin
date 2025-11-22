"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = exports.exit = exports.init = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = require("chalk");
const chalk = new chalk_1.Chalk();
const MODULE_NAME = '[SillyTavern-ValueTracker-Plugin-Entry]';
/**
 * Checks if better-sqlite3 is available, and installs it if not.
 */
function ensureBetterSqlite3() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Try to require better-sqlite3
            require('better-sqlite3');
            console.log(chalk.green(MODULE_NAME), 'better-sqlite3 is available');
        }
        catch (error) {
            console.log(chalk.yellow(MODULE_NAME), 'better-sqlite3 not found, attempting to install...');
            // Check if package.json exists in the current directory
            const packageJsonPath = path_1.default.join(__dirname, '..', 'package.json');
            if (!fs_1.default.existsSync(packageJsonPath)) {
                const currentPackageJson = path_1.default.join(__dirname, 'package.json');
                if (fs_1.default.existsSync(currentPackageJson)) {
                    console.error(chalk.red(MODULE_NAME), 'package.json found in src directory, please ensure it is available in the root plugin directory.');
                    throw new Error('package.json not found in expected location');
                }
            }
            return new Promise((resolve, reject) => {
                // Run npm install for better-sqlite3
                const npmInstall = (0, child_process_1.spawn)('npm', ['install', 'better-sqlite3', '--no-save'], {
                    cwd: path_1.default.join(__dirname, '..'), // Go up one level to the plugin root
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                npmInstall.stdout.on('data', (data) => {
                    console.log(chalk.blue(MODULE_NAME), `npm install stdout: ${data}`);
                });
                npmInstall.stderr.on('data', (data) => {
                    console.error(chalk.red(MODULE_NAME), `npm install stderr: ${data}`);
                });
                npmInstall.on('close', (code) => {
                    if (code === 0) {
                        console.log(chalk.green(MODULE_NAME), 'better-sqlite3 installed successfully');
                        // Try to require it again to make sure it works
                        try {
                            require('better-sqlite3');
                            console.log(chalk.green(MODULE_NAME), 'better-sqlite3 loaded successfully after installation');
                            resolve();
                        }
                        catch (requireError) {
                            console.error(chalk.red(MODULE_NAME), 'Failed to load better-sqlite3 after installation:', requireError);
                            reject(requireError);
                        }
                    }
                    else {
                        console.error(chalk.red(MODULE_NAME), `npm install failed with code ${code}`);
                        reject(new Error(`npm install failed with code ${code}`));
                    }
                });
            });
        }
    });
}
/**
 * Load the main plugin after ensuring dependencies are available.
 */
function loadMainPlugin() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield ensureBetterSqlite3();
            // Now dynamically import the main plugin
            const mainPlugin = yield Promise.resolve().then(() => __importStar(require('./index')));
            console.log(chalk.green(MODULE_NAME), 'Main plugin loaded successfully');
            // Return the plugin interface
            return mainPlugin;
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Failed to load plugin:', error);
            throw error;
        }
    });
}
// Export the functions that SillyTavern expects
function init(router) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const mainPlugin = yield loadMainPlugin();
            return yield mainPlugin.init(router);
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Failed to initialize plugin:', error);
            throw error;
        }
    });
}
exports.init = init;
function exit() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const mainPlugin = yield loadMainPlugin();
            return yield mainPlugin.exit();
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Error during plugin exit:', error);
            // Still try to exit even if loading failed
            console.log(chalk.yellow(MODULE_NAME), 'Attempting graceful exit...');
            return Promise.resolve();
        }
    });
}
exports.exit = exit;
exports.info = {
    id: 'valuetracker',
    name: 'Value Tracking Plugin',
    description: 'A simple value tracking plugin for SillyTavern server with database support.',
};
// Export the default object as well
exports.default = {
    init,
    exit,
    info: exports.info,
};
//# sourceMappingURL=entry.js.map