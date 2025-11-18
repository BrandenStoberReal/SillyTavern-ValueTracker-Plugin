import bodyParser from 'body-parser';
import {Router} from 'express';
import {Chalk} from 'chalk';
import {DatabaseManager} from './DatabaseManager';
import {ApiEndpoints} from './ApiEndpoints';

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
let dbManager: DatabaseManager;
let apiEndpoints: ApiEndpoints;

/**
 * Initialize the plugin.
 * @param router Express Router
 */
export async function init(router: Router): Promise<void> {
    const jsonParser = bodyParser.json();

    // Initialize database manager
    dbManager = new DatabaseManager();
    apiEndpoints = new ApiEndpoints(dbManager);

    // Register API endpoints
    router.use('/api', apiEndpoints.getRouter());

    // Used to check if the server plugin is running
    router.post('/probe', (_req, res) => {
        return res.sendStatus(204);
    });
    // Use body-parser to parse the request body
    router.post('/ping', jsonParser, async (req, res) => {
        try {
            const {message} = req.body;
            return res.json({message: `Pong! ${message}`});
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Request failed', error);
            return res.status(500).send('Internal Server Error');
        }
    });

    console.log(chalk.green(MODULE_NAME), 'Plugin loaded!');
}

export async function exit(): Promise<void> {
    console.log(chalk.yellow(MODULE_NAME), 'Plugin exited');
    // Close database connection
    if (dbManager) {
        dbManager.close();
    }
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
