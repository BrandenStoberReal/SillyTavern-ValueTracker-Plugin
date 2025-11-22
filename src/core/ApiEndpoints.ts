import express, {Request, Response} from 'express';
import {DatabaseManager} from '../managers/DatabaseManager';
import {CrossExtensionReader} from './CrossExtensionReader';
import {isValidId, validateRequestBody} from '../helpers/utils';
import {Chalk} from 'chalk';

const chalk = new Chalk();
const MODULE_NAME = '[ValueTracker-ApiEndpoints]';

export class ApiEndpoints {
    private crossExtensionReader: CrossExtensionReader;
    private router: express.Router;

    constructor(crossExtensionReader: CrossExtensionReader) {
        this.crossExtensionReader = crossExtensionReader;
        this.router = express.Router();
        console.log(chalk.green(MODULE_NAME), 'Initializing API endpoints...');
        this.setupRoutes();
        console.log(chalk.green(MODULE_NAME), 'API endpoints initialized successfully');
    }

    private getExtensionIdFromHeader(req: Request): string | null {
        // Check for extensionId in the header
        const extensionId = req.headers['x-extension-id'] as string;
        return extensionId || null;
    }

    getRouter(): express.Router {
        return this.router;
    }

    private setupRoutes(): void {
        // Extension registration endpoint
        console.log(chalk.blue(MODULE_NAME), 'Registering POST /register');
        this.router.post('/register', this.registerExtension.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering DELETE /register');
        this.router.delete('/register', this.deregisterExtension.bind(this));

        // Extension-specific endpoints (extensionId from header)
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /characters');
        this.router.get('/characters', this.getAllCharacters.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /characters/:id');
        this.router.get('/characters/:id', this.getCharacter.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering POST /characters');
        this.router.post('/characters', this.upsertCharacter.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering DELETE /characters/:id');
        this.router.delete('/characters/:id', this.deleteCharacter.bind(this));

        // Instance endpoints
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /instances');
        this.router.get('/instances', this.getAllInstances.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /instances/:id');
        this.router.get('/instances/:id', this.getInstance.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /characters/:characterId/instances');
        this.router.get('/characters/:characterId/instances', this.getInstancesByCharacter.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering POST /instances');
        this.router.post('/instances', this.upsertInstance.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering DELETE /instances/:id');
        this.router.delete('/instances/:id', this.deleteInstance.bind(this));

        // Data endpoints
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /instances/:id/data');
        this.router.get('/instances/:id/data', this.getInstanceData.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /instances/:id/data/:key');
        this.router.get('/instances/:id/data/:key', this.getInstanceDataKey.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering POST /instances/:id/data');
        this.router.post('/instances/:id/data', this.upsertInstanceData.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering PUT /instances/:id/data');
        this.router.put('/instances/:id/data', this.upsertInstanceData.bind(this)); // Alias for POST
        console.log(chalk.blue(MODULE_NAME), 'Registering DELETE /instances/:id/data/:key');
        this.router.delete('/instances/:id/data/:key', this.deleteInstanceDataKey.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering DELETE /instances/:id/data');
        this.router.delete('/instances/:id/data', this.clearInstanceData.bind(this));

        // Complex operations
        console.log(chalk.blue(MODULE_NAME), 'Registering DELETE /characters/:characterId/instances');
        this.router.delete('/characters/:characterId/instances', this.deleteAllInstancesForCharacter.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering PUT /instances/:id/data/override');
        this.router.put('/instances/:id/data/override', this.overrideInstanceData.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering PUT /instances/:id/data/merge');
        this.router.put('/instances/:id/data/merge', this.mergeInstanceData.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering PUT /instances/:id/data/remove');
        this.router.put('/instances/:id/data/remove', this.removeInstanceDataKeys.bind(this));

        // Cross-extension reading endpoints (kept for compatibility, still use path parameters)
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /cross-extension/characters/:extensionId/:id');
        this.router.get('/cross-extension/characters/:extensionId/:id', this.getCrossExtensionCharacter.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /cross-extension/instances/:extensionId/:id');
        this.router.get('/cross-extension/instances/:extensionId/:id', this.getCrossExtensionInstance.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /cross-extension/instances/:extensionId/:id/data');
        this.router.get('/cross-extension/instances/:extensionId/:id/data', this.getCrossExtensionInstanceData.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /cross-extension/instances/:extensionId/:id/data/:key');
        this.router.get('/cross-extension/instances/:extensionId/:id/data/:key', this.getCrossExtensionInstanceDataKey.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /cross-extension/characters/:extensionId');
        this.router.get('/cross-extension/characters/:extensionId', this.getCrossExtensionAllCharacters.bind(this));
        console.log(chalk.blue(MODULE_NAME), 'Registering GET /cross-extension/characters/:extensionId/:characterId/instances');
        this.router.get('/cross-extension/characters/:extensionId/:characterId/instances', this.getCrossExtensionInstancesByCharacter.bind(this));

        console.log(chalk.green(MODULE_NAME), 'All routes registered successfully');
    }

    // Character endpoints
    private getAllCharacters(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'GET /characters called from IP:', req.ip || (req.socket && req.socket.remoteAddress));

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /characters failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            if (!isValidId(extensionId)) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /characters failed: Invalid extension ID format:', extensionId);
                res.status(400).json({error: 'Valid extension ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /characters failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const characters = dbManager.getAllCharacters();
            console.log(chalk.blue(MODULE_NAME), 'GET /characters successful for extension:', extensionId, 'Returning', characters.length, 'characters');
            res.json(characters);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'GET /characters failed with error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private getCharacter(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'GET /characters/:id called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for character ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /characters/:id failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /characters/:id failed: Invalid character ID format:', id);
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /characters/:id failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const character = dbManager.getFullCharacter(id);

            if (!character) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /characters/:id failed: Character not found with ID:', req.params.id, 'for extension:', extensionId);
                res.status(404).json({error: 'Character not found'});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'GET /characters/:id successful for character ID:', req.params.id, 'in extension:', extensionId);
            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'GET /characters/:id failed with error for character ID:', req.params.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private upsertCharacter(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'POST /characters called from IP:', req.ip || (req.socket && req.socket.remoteAddress));

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /characters failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            // Validate the request body
            const validation = validateRequestBody(['id'], req.body);
            if (!validation.isValid) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /characters failed: Missing required fields:', validation.missingFields?.join(', '));
                res.status(400).json({error: `Missing required fields: ${validation.missingFields?.join(', ')}`});
                return;
            }

            const {id, name} = req.body;

            if (!isValidId(id)) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /characters failed: Invalid character ID format:', id);
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            // Validate name if provided
            if (name !== undefined && typeof name !== 'string') {
                console.log(chalk.yellow(MODULE_NAME), 'POST /characters failed: name must be a string');
                res.status(400).json({error: 'name must be a string'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /characters failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Upserting character with ID:', req.body.id, 'in extension:', extensionId);
            const character = dbManager.upsertCharacter({id: req.body.id, name: name || undefined});
            console.log(chalk.green(MODULE_NAME), 'Character upserted successfully for ID:', req.body.id, 'in extension:', extensionId);
            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'POST /characters failed with error for character ID:', req.body.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private deleteCharacter(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'DELETE /characters/:id called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for character ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'DELETE /characters/:id failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                console.log(chalk.yellow(MODULE_NAME), 'DELETE /characters/:id failed: Invalid character ID format:', id);
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'DELETE /characters/:id failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Attempting to delete character with ID:', req.params.id, 'in extension:', extensionId);
            const success = dbManager.deleteCharacter(req.params.id);

            if (!success) {
                console.log(chalk.yellow(MODULE_NAME), 'DELETE /characters/:id failed: Character not found with ID:', req.params.id, 'in extension:', extensionId);
                res.status(404).json({error: 'Character not found'});
                return;
            }

            console.log(chalk.green(MODULE_NAME), 'Character deleted successfully for ID:', req.params.id, 'in extension:', extensionId);
            res.json({success: true});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'DELETE /characters/:id failed with error for character ID:', req.params.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    // Instance endpoints
    private getAllInstances(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            if (!isValidId(extensionId)) {
                res.status(400).json({error: 'Valid extension ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            // This might be too expensive if there are many instances, but included for completeness
            const {characterId} = req.query;

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            if (typeof characterId === 'string' && isValidId(characterId)) {
                const instances = dbManager.getInstancesByCharacter(characterId);
                res.json(instances);
            } else {
                res.status(400).json({error: 'Valid characterId query parameter is required (alphanumeric, hyphens, underscores only)'});
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private getInstance(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'GET /instances/:id called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for instance ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /instances/:id failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /instances/:id failed: Invalid instance ID format:', id);
                res.status(400).json({error: 'Valid instance ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /instances/:id failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Retrieving instance with ID:', req.params.id, 'in extension:', extensionId);
            const instance = dbManager.getFullInstance(req.params.id);

            if (!instance) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /instances/:id failed: Instance not found with ID:', req.params.id, 'in extension:', extensionId);
                res.status(404).json({error: 'Instance not found'});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'GET /instances/:id successful for instance ID:', req.params.id, 'in extension:', extensionId);
            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'GET /instances/:id failed with error for instance ID:', req.params.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private getInstancesByCharacter(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {characterId} = req.params;
            if (!isValidId(characterId)) {
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const instances = dbManager.getInstancesByCharacter(characterId);
            res.json(instances);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private upsertInstance(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'POST /instances called from IP:', req.ip || (req.socket && req.socket.remoteAddress));

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            // Validate the request body
            const validation = validateRequestBody(['id', 'characterId'], req.body);
            if (!validation.isValid) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances failed: Missing required fields:', validation.missingFields?.join(', '));
                res.status(400).json({error: `Missing required fields: ${validation.missingFields?.join(', ')}`});
                return;
            }

            const {id, characterId, name} = req.body;

            if (!isValidId(id) || !isValidId(characterId)) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances failed: Invalid instance ID or character ID format');
                res.status(400).json({error: 'Valid instance ID and character ID are required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            // Validate name if provided
            if (name !== undefined && typeof name !== 'string') {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances failed: name must be a string');
                res.status(400).json({error: 'name must be a string'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Upserting instance with ID:', req.body.id, 'for character:', req.body.characterId, 'in extension:', extensionId);
            const instance = dbManager.upsertInstance({
                id: req.body.id,
                characterId: req.body.characterId,
                name: name || undefined,
            });
            console.log(chalk.green(MODULE_NAME), 'Instance upserted successfully for ID:', req.body.id, 'in extension:', extensionId);
            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'POST /instances failed with error for instance ID:', req.body.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private deleteInstance(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                res.status(400).json({error: 'Valid instance ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const success = dbManager.deleteInstance(id);

            if (!success) {
                res.status(404).json({error: 'Instance not found'});
                return;
            }

            res.json({success: true});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    // Data endpoints
    private getInstanceData(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'GET /instances/:id/data called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for instance ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /instances/:id/data failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /instances/:id/data failed: Invalid instance ID format:', id);
                res.status(400).json({error: 'Valid instance ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'GET /instances/:id/data failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Retrieving data for instance with ID:', req.params.id, 'in extension:', extensionId);
            const data = dbManager.getData(req.params.id);
            console.log(chalk.blue(MODULE_NAME), 'GET /instances/:id/data successful for instance ID:', req.params.id, 'in extension:', extensionId, 'Returning', Object.keys(data).length, 'data entries');
            res.json(data);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'GET /instances/:id/data failed with error for instance ID:', req.params.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private getInstanceDataKey(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id, key} = req.params;
            if (!isValidId(id) || typeof key !== 'string' || key.trim().length === 0) {
                res.status(400).json({error: 'Valid instance ID and key are required (alphanumeric, hyphens, underscores only for ID)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const value = dbManager.getDataValue(id, key);
            res.json({[key]: value});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private upsertInstanceData(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'POST /instances/:id/data called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for instance ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances/:id/data failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const {key, value} = req.body;

            // Validate the request body
            const validation = validateRequestBody(['key'], req.body);
            if (!validation.isValid) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances/:id/data failed: Missing required fields:', validation.missingFields?.join(', '));
                res.status(400).json({error: `Missing required fields: ${validation.missingFields?.join(', ')}`});
                return;
            }

            if (!isValidId(id) || typeof key !== 'string' || key.trim().length === 0) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances/:id/data failed: Invalid instance ID or data key format');
                res.status(400).json({error: 'Valid instance ID and data key are required (alphanumeric, hyphens, underscores only for ID)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'POST /instances/:id/data failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Upserting data for instance ID:', req.params.id, 'key:', req.body.key, 'value:', req.body.value, 'in extension:', extensionId);
            dbManager.upsertData(req.params.id, req.body.key, req.body.value);
            console.log(chalk.green(MODULE_NAME), 'Data upserted successfully for instance ID:', req.params.id, 'key:', req.body.key, 'in extension:', extensionId);
            res.json({success: true, key: req.body.key, value: req.body.value});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'POST /instances/:id/data failed with error for instance ID:', req.params.id, 'key:', req.body.key, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private deleteInstanceDataKey(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id, key} = req.params;
            if (!isValidId(id) || typeof key !== 'string' || key.trim().length === 0) {
                res.status(400).json({error: 'Valid instance ID and key are required (alphanumeric, hyphens, underscores only for ID)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const success = dbManager.deleteDataValue(id, key);

            if (!success) {
                res.status(404).json({error: 'Data key not found'});
                return;
            }

            res.json({success: true});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private clearInstanceData(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                res.status(400).json({error: 'Valid instance ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const success = dbManager.clearInstanceData(id);

            if (!success) {
                res.status(404).json({error: 'Instance not found'});
                return;
            }

            res.json({success: true});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    // Complex operations
    private deleteAllInstancesForCharacter(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {characterId} = req.params;
            if (!isValidId(characterId)) {
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const instances = dbManager.getInstancesByCharacter(characterId);

            let deletedCount = 0;
            for (const instance of instances) {
                if (dbManager.deleteInstance(instance.id)) {
                    deletedCount++;
                }
            }

            res.json({success: true, deletedCount});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private overrideInstanceData(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'PUT /instances/:id/data/override called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for instance ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/override failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const data: Record<string, unknown> = req.body;

            if (!isValidId(id) || typeof data !== 'object' || data === null || Array.isArray(data)) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/override failed: Valid instance ID and data object are required');
                res.status(400).json({error: 'Valid instance ID and data object are required'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/override failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Overriding instance data for instance ID:', req.params.id, 'in extension:', extensionId, 'with', Object.keys(data).length, 'data entries');

            // First clear all existing data for this instance
            dbManager.clearInstanceData(req.params.id);

            // Then add the new data
            for (const [key, value] of Object.entries(data)) {
                if (typeof key === 'string' && key.trim().length > 0) {
                    dbManager.upsertData(req.params.id, key, value);
                }
            }

            console.log(chalk.green(MODULE_NAME), 'Instance data overridden successfully for instance ID:', req.params.id, 'in extension:', extensionId);
            res.json({success: true, message: 'Instance data overridden successfully'});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'PUT /instances/:id/data/override failed with error for instance ID:', req.params.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private mergeInstanceData(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'PUT /instances/:id/data/merge called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for instance ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/merge failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const data: Record<string, unknown> = req.body;

            if (!isValidId(id) || typeof data !== 'object' || data === null || Array.isArray(data)) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/merge failed: Valid instance ID and data object are required');
                res.status(400).json({error: 'Valid instance ID and data object are required'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/merge failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Merging instance data for instance ID:', req.params.id, 'in extension:', extensionId, 'with', Object.keys(data).length, 'data entries');

            // Add or update the provided data keys while keeping existing ones
            for (const [key, value] of Object.entries(data)) {
                if (typeof key === 'string' && key.trim().length > 0) {
                    dbManager.upsertData(req.params.id, key, value);
                }
            }

            console.log(chalk.green(MODULE_NAME), 'Instance data merged successfully for instance ID:', req.params.id, 'in extension:', extensionId);
            res.json({success: true, message: 'Instance data merged successfully'});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'PUT /instances/:id/data/merge failed with error for instance ID:', req.params.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private removeInstanceDataKeys(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'PUT /instances/:id/data/remove called from IP:', req.ip || (req.socket && req.socket.remoteAddress), 'for instance ID:', req.params.id);

            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/remove failed: Extension ID is required in header');
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const {keys}: { keys: string[] } = req.body;

            // Validate the request body
            const validation = validateRequestBody(['keys'], req.body);
            if (!validation.isValid) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/remove failed: Missing required fields:', validation.missingFields?.join(', '));
                res.status(400).json({error: `Missing required fields: ${validation.missingFields?.join(', ')}`});
                return;
            }

            if (!isValidId(id) || !Array.isArray(keys)) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/remove failed: Valid instance ID and keys array are required');
                res.status(400).json({error: 'Valid instance ID and keys array are required'});
                return;
            }

            // Validate that all keys in the array are strings
            for (const key of keys) {
                if (typeof key !== 'string') {
                    console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/remove failed: All keys must be strings');
                    res.status(400).json({error: 'All keys must be strings'});
                    return;
                }
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'PUT /instances/:id/data/remove failed: Database not found for extension:', extensionId);
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Removing instance data keys for instance ID:', req.params.id, 'in extension:', extensionId, 'from', req.body.keys.length, 'keys');

            let removedCount = 0;
            for (const key of req.body.keys) {
                if (typeof key === 'string' && key.trim().length > 0) {
                    if (dbManager.deleteDataValue(req.params.id, key)) {
                        removedCount++;
                    }
                }
            }

            console.log(chalk.green(MODULE_NAME), 'Instance data keys removed successfully for instance ID:', req.params.id, 'in extension:', extensionId, 'Removed:', removedCount, 'keys');
            res.json({success: true, removedCount});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'PUT /instances/:id/data/remove failed with error for instance ID:', req.params.id, 'error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    // Extension registration endpoints
    private registerExtension(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'Register endpoint called from IP:', req.ip || (req.socket && req.socket.remoteAddress));

            // For registration, extension ID comes from request body, not header, since it's not yet registered
            const {extensionId, dbPath} = req.body;

            // Validate the request body
            const validation = validateRequestBody(['extensionId'], req.body);
            if (!validation.isValid) {
                console.log(chalk.yellow(MODULE_NAME), 'Registration failed: Missing required fields:', validation.missingFields?.join(', '));
                res.status(400).json({error: `Missing required fields: ${validation.missingFields?.join(', ')}`});
                return;
            }

            if (!isValidId(extensionId)) {
                console.log(chalk.yellow(MODULE_NAME), 'Registration failed: Invalid extension ID format:', extensionId);
                res.status(400).json({error: 'Valid extension ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            // Security: dbPath should not be provided by the client (will be ignored anyway in DatabaseManager)
            if (dbPath !== undefined) {
                console.log(chalk.yellow(MODULE_NAME), 'Registration failed: dbPath parameter not allowed for security reasons');
                res.status(400).json({error: 'dbPath parameter not allowed for security reasons'});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Creating database manager for extension:', extensionId);

            // Create a new DatabaseManager for this extension
            const dbManager = new DatabaseManager(dbPath, extensionId);

            // Register it with the cross-extension reader
            console.log(chalk.blue(MODULE_NAME), 'Registering extension database for extension:', extensionId);
            this.crossExtensionReader.registerExtensionDatabase(extensionId, dbManager);

            console.log(chalk.green(MODULE_NAME), 'Extension registered successfully:', extensionId);
            res.json({success: true, message: `Extension ${extensionId} registered successfully`});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'Registration failed with error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    private deregisterExtension(req: Request, res: Response): void {
        try {
            console.log(chalk.blue(MODULE_NAME), 'Deregister endpoint called from IP:', req.ip || (req.socket && req.socket.remoteAddress));

            // For deregistration, extension ID comes from request body
            const {extensionId} = req.body;

            if (!extensionId) {
                console.log(chalk.yellow(MODULE_NAME), 'Deregistration failed: Extension ID is required in request body');
                res.status(400).json({error: 'Extension ID is required in request body'});
                return;
            }

            if (!isValidId(extensionId)) {
                console.log(chalk.yellow(MODULE_NAME), 'Deregistration failed: Invalid extension ID format:', extensionId);
                res.status(400).json({error: 'Valid extension ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            console.log(chalk.blue(MODULE_NAME), 'Deregistering extension database for extension:', extensionId);

            // Deregister the extension from the cross-extension reader
            this.crossExtensionReader.deregisterExtensionDatabase(extensionId);

            console.log(chalk.green(MODULE_NAME), 'Extension deregistered successfully:', extensionId);
            res.json({success: true, message: `Extension ${extensionId} deregistered successfully`});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red(MODULE_NAME), 'Deregistration failed with error:', errorMessage);
            res.status(500).json({error: errorMessage});
        }
    }

    // Cross-extension reading endpoints
    private getCrossExtensionCharacter(req: Request, res: Response): void {
        try {
            const {extensionId, id} = req.params;

            if (!isValidId(extensionId) || !isValidId(id)) {
                res.status(400).json({error: 'Valid extension ID and character ID are required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const character = this.crossExtensionReader.getFullCharacter(extensionId, id);

            if (!character) {
                res.status(404).json({error: `Character not found in extension ${extensionId}`});
                return;
            }

            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private getCrossExtensionInstance(req: Request, res: Response): void {
        try {
            const {extensionId, id} = req.params;

            if (!isValidId(extensionId) || !isValidId(id)) {
                res.status(400).json({error: 'Valid extension ID and instance ID are required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const instance = this.crossExtensionReader.getFullInstance(extensionId, id);

            if (!instance) {
                res.status(404).json({error: `Instance not found in extension ${extensionId}`});
                return;
            }

            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private getCrossExtensionInstanceData(req: Request, res: Response): void {
        try {
            const {extensionId, id} = req.params;

            if (!isValidId(extensionId) || !isValidId(id)) {
                res.status(400).json({error: 'Valid extension ID and instance ID are required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const data = this.crossExtensionReader.getInstanceData(extensionId, id);
            res.json(data);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private getCrossExtensionInstanceDataKey(req: Request, res: Response): void {
        try {
            const {extensionId, id, key} = req.params;

            if (!isValidId(extensionId) || !isValidId(id) || typeof key !== 'string' || key.trim().length === 0) {
                res.status(400).json({error: 'Valid extension ID, instance ID, and key are required (alphanumeric, hyphens, underscores only for IDs)'});
                return;
            }

            const value = this.crossExtensionReader.getDataValue(extensionId, id, key);
            res.json({[key]: value});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private getCrossExtensionAllCharacters(req: Request, res: Response): void {
        try {
            const {extensionId} = req.params;

            if (!isValidId(extensionId)) {
                res.status(400).json({error: 'Valid extension ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const characters = this.crossExtensionReader.getAllCharacters(extensionId);
            res.json(characters);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private getCrossExtensionInstancesByCharacter(req: Request, res: Response): void {
        try {
            const {extensionId, characterId} = req.params;

            if (!isValidId(extensionId) || !isValidId(characterId)) {
                res.status(400).json({error: 'Valid extension ID and character ID are required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const instances = this.crossExtensionReader.getInstancesByCharacter(extensionId, characterId);
            res.json(instances);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }
}
