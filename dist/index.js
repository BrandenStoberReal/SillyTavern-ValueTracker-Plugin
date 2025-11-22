"use strict";
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
const body_parser_1 = __importDefault(require("body-parser"));
const chalk_1 = require("chalk");
const ApiEndpoints_1 = require("./core/ApiEndpoints");
const CrossExtensionReader_1 = require("./core/CrossExtensionReader");
const ExtensionRegistration_1 = require("./core/ExtensionRegistration");
const chalk = new chalk_1.Chalk();
const MODULE_NAME = '[SillyTavern-ValueTracker-Plugin]';
let crossExtensionReader;
let apiEndpoints;
/**
 * Initialize the plugin.
 * @param router Express Router
 */
function init(router) {
    return __awaiter(this, void 0, void 0, function* () {
        const jsonParser = body_parser_1.default.json();
        console.log(chalk.blue(MODULE_NAME), 'Initializing Value Tracker Plugin...');
        crossExtensionReader = new CrossExtensionReader_1.CrossExtensionReader();
        console.log(chalk.green(MODULE_NAME), 'CrossExtensionReader initialized');
        // Note: There is no internal database for the plugin itself
        // Extensions will register their own databases as needed
        // Initialize API endpoints with the cross-extension reader
        apiEndpoints = new ApiEndpoints_1.ApiEndpoints(crossExtensionReader);
        console.log(chalk.green(MODULE_NAME), 'API endpoints initialized');
        // Set the cross extension reader for other extensions to use
        (0, ExtensionRegistration_1.setCrossExtensionReader)(crossExtensionReader);
        console.log(chalk.green(MODULE_NAME), 'CrossExtensionReader set for other extensions');
        // Register API endpoints at root level - SillyTavern framework will handle prefixing with /api/plugins/{id}/
        router.use('/', apiEndpoints.getRouter());
        console.log(chalk.green(MODULE_NAME), 'API routes registered');
        // Used to check if the server plugin is running
        router.get('/probe', (req, res) => {
            console.log(chalk.blue(MODULE_NAME), 'Probe endpoint accessed from IP:', req.ip || req.socket.remoteAddress);
            return res.sendStatus(204);
        });
        // Use body-parser to parse the request body
        router.post('/ping', jsonParser, (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(chalk.blue(MODULE_NAME), 'Ping endpoint accessed from IP:', req.ip || req.socket.remoteAddress);
                const { message } = req.body;
                console.log(chalk.blue(MODULE_NAME), 'Ping received with message:', message);
                return res.json({ message: `Pong! ${message}` });
            }
            catch (error) {
                console.error(chalk.red(MODULE_NAME), 'Ping request failed', error);
                return res.status(500).send('Internal Server Error');
            }
        }));
        console.log(chalk.green(MODULE_NAME), 'Plugin loaded successfully!');
    });
}
exports.init = init;
/**
 * Unloads and cleans up the plugin.
 */
function exit() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(chalk.yellow(MODULE_NAME), 'Plugin exit started');
        // Close cross-extension reader
        if (crossExtensionReader) {
            crossExtensionReader.closeAll();
            console.log(chalk.yellow(MODULE_NAME), 'All extension databases closed');
        }
        console.log(chalk.yellow(MODULE_NAME), 'Plugin exited successfully');
    });
}
exports.exit = exit;
exports.info = {
    id: 'valuetracker',
    name: 'Value Tracking Plugin',
    description: 'A simple value tracking plugin for SillyTavern server with database support.',
};
const plugin = {
    init,
    exit,
    info: exports.info,
};
exports.default = plugin;
//# sourceMappingURL=index.js.map