import bodyParser from 'body-parser';
import {Router} from 'express';
import {Chalk} from 'chalk';
import {ApiEndpoints} from './ApiEndpoints';
import {CrossExtensionReader} from './CrossExtensionReader';
import {setCrossExtensionReader} from './ExtensionRegistration';

interface PluginInfo {
    id: string;
    name: string;
    description: string;
}

interface Plugin {
    init: (router: Router) => Promise<void>;
    exit: () => Promise<void>;
    info: PluginInfo;
}

const chalk = new Chalk();
const MODULE_NAME = '[SillyTavern-ValueTracker-Plugin]';
let crossExtensionReader: CrossExtensionReader;
let apiEndpoints: ApiEndpoints;

/**
 * Initialize the plugin.
 * @param router Express Router
 */
export async function init(router: Router): Promise<void> {
    const jsonParser = bodyParser.json();

    console.log(chalk.blue(MODULE_NAME), 'Initializing Value Tracker Plugin...');

    crossExtensionReader = new CrossExtensionReader();
    console.log(chalk.green(MODULE_NAME), 'CrossExtensionReader initialized');

    // Note: There is no internal database for the plugin itself
    // Extensions will register their own databases as needed

    // Initialize API endpoints with the cross-extension reader
    apiEndpoints = new ApiEndpoints(crossExtensionReader);
    console.log(chalk.green(MODULE_NAME), 'API endpoints initialized');

    // Set the cross extension reader for other extensions to use
    setCrossExtensionReader(crossExtensionReader);
    console.log(chalk.green(MODULE_NAME), 'CrossExtensionReader set for other extensions');

    // Register API endpoints at root level - SillyTavern framework will handle prefixing with /api/plugins/{id}/
    router.use('/', apiEndpoints.getRouter());
    console.log(chalk.green(MODULE_NAME), 'API routes registered');

    // Used to check if the server plugin is running
    router.get('/probe', (req, res) => {
        console.log(chalk.blue(MODULE_NAME), 'Probe endpoint accessed from IP:', req.ip || req.connection.remoteAddress);
        return res.sendStatus(204);
    });

    // Use body-parser to parse the request body
    router.post('/ping', jsonParser, async (req, res) => {
        try {
            console.log(chalk.blue(MODULE_NAME), 'Ping endpoint accessed from IP:', req.ip || req.connection.remoteAddress);
            const {message} = req.body;
            console.log(chalk.blue(MODULE_NAME), 'Ping received with message:', message);
            return res.json({message: `Pong! ${message}`});
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Ping request failed', error);
            return res.status(500).send('Internal Server Error');
        }
    });

    console.log(chalk.green(MODULE_NAME), 'Plugin loaded successfully!');
}

export async function exit(): Promise<void> {
    console.log(chalk.yellow(MODULE_NAME), 'Plugin exit started');

    // Close cross-extension reader
    if (crossExtensionReader) {
        crossExtensionReader.closeAll();
        console.log(chalk.yellow(MODULE_NAME), 'All extension databases closed');
    }

    console.log(chalk.yellow(MODULE_NAME), 'Plugin exited successfully');
}

export const info: PluginInfo = {
    id: 'valuetracker',
    name: 'Value Tracking Plugin',
    description: 'A simple value tracking plugin for SillyTavern server with database support.',
};

const plugin: Plugin = {
    init,
    exit,
    info,
};

export default plugin;
