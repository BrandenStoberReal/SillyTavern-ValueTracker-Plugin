import express, {Request, Response} from 'express';
import {DatabaseManager} from './DatabaseManager';
import {CrossExtensionReader} from './CrossExtensionReader';
import {isValidId} from './utils';

export class ApiEndpoints {
    private crossExtensionReader: CrossExtensionReader;
    private router: express.Router;

    constructor(crossExtensionReader: CrossExtensionReader) {
        this.crossExtensionReader = crossExtensionReader;
        this.router = express.Router();
        this.setupRoutes();
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
        this.router.post('/register', this.registerExtension.bind(this));
        this.router.delete('/register', this.deregisterExtension.bind(this));

        // Extension-specific endpoints (extensionId from header)
        this.router.get('/characters', this.getAllCharacters.bind(this));
        this.router.get('/characters/:id', this.getCharacter.bind(this));
        this.router.post('/characters', this.upsertCharacter.bind(this));
        this.router.delete('/characters/:id', this.deleteCharacter.bind(this));

        // Instance endpoints
        this.router.get('/instances', this.getAllInstances.bind(this));
        this.router.get('/instances/:id', this.getInstance.bind(this));
        this.router.get('/characters/:characterId/instances', this.getInstancesByCharacter.bind(this));
        this.router.post('/instances', this.upsertInstance.bind(this));
        this.router.delete('/instances/:id', this.deleteInstance.bind(this));

        // Data endpoints
        this.router.get('/instances/:id/data', this.getInstanceData.bind(this));
        this.router.get('/instances/:id/data/:key', this.getInstanceDataKey.bind(this));
        this.router.post('/instances/:id/data', this.upsertInstanceData.bind(this));
        this.router.put('/instances/:id/data', this.upsertInstanceData.bind(this)); // Alias for POST
        this.router.delete('/instances/:id/data/:key', this.deleteInstanceDataKey.bind(this));
        this.router.delete('/instances/:id/data', this.clearInstanceData.bind(this));

        // Complex operations
        this.router.delete('/characters/:characterId/instances', this.deleteAllInstancesForCharacter.bind(this));
        this.router.put('/instances/:id/data/override', this.overrideInstanceData.bind(this));
        this.router.put('/instances/:id/data/merge', this.mergeInstanceData.bind(this));
        this.router.put('/instances/:id/data/remove', this.removeInstanceDataKeys.bind(this));

        // Cross-extension reading endpoints (kept for compatibility, still use path parameters)
        this.router.get('/cross-extension/characters/:extensionId/:id', this.getCrossExtensionCharacter.bind(this));
        this.router.get('/cross-extension/instances/:extensionId/:id', this.getCrossExtensionInstance.bind(this));
        this.router.get('/cross-extension/instances/:extensionId/:id/data', this.getCrossExtensionInstanceData.bind(this));
        this.router.get('/cross-extension/instances/:extensionId/:id/data/:key', this.getCrossExtensionInstanceDataKey.bind(this));
        this.router.get('/cross-extension/characters/:extensionId', this.getCrossExtensionAllCharacters.bind(this));
        this.router.get('/cross-extension/characters/:extensionId/:characterId/instances', this.getCrossExtensionInstancesByCharacter.bind(this));
    }

    // Character endpoints
    private getAllCharacters(req: Request, res: Response): void {
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

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const characters = dbManager.getAllCharacters();
            res.json(characters);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private getCharacter(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const character = dbManager.getFullCharacter(id);

            if (!character) {
                res.status(404).json({error: 'Character not found'});
                return;
            }

            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private upsertCharacter(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id, name} = req.body;

            if (!isValidId(id)) {
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const character = dbManager.upsertCharacter({id, name: name || undefined});
            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private deleteCharacter(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            if (!isValidId(id)) {
                res.status(400).json({error: 'Valid character ID is required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const success = dbManager.deleteCharacter(id);

            if (!success) {
                res.status(404).json({error: 'Character not found'});
                return;
            }

            res.json({success: true});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

            const instance = dbManager.getFullInstance(id);

            if (!instance) {
                res.status(404).json({error: 'Instance not found'});
                return;
            }

            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id, characterId, name} = req.body;

            if (!isValidId(id) || !isValidId(characterId)) {
                res.status(400).json({error: 'Valid instance ID and character ID are required (alphanumeric, hyphens, underscores only)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            const instance = dbManager.upsertInstance({id, characterId, name: name || undefined});
            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

            const data = dbManager.getData(id);
            res.json(data);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const {key, value} = req.body;

            if (!isValidId(id) || typeof key !== 'string' || key.trim().length === 0) {
                res.status(400).json({error: 'Valid instance ID and data key are required (alphanumeric, hyphens, underscores only for ID)'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            dbManager.upsertData(id, key, value);
            res.json({success: true, key, value});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const data: Record<string, unknown> = req.body;

            if (!isValidId(id) || typeof data !== 'object' || data === null) {
                res.status(400).json({error: 'Valid instance ID and data object are required'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            // First clear all existing data for this instance
            dbManager.clearInstanceData(id);

            // Then add the new data
            for (const [key, value] of Object.entries(data)) {
                if (typeof key === 'string' && key.trim().length > 0) {
                    dbManager.upsertData(id, key, value);
                }
            }

            res.json({success: true, message: 'Instance data overridden successfully'});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private mergeInstanceData(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const data: Record<string, unknown> = req.body;

            if (!isValidId(id) || typeof data !== 'object' || data === null) {
                res.status(400).json({error: 'Valid instance ID and data object are required'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            // Add or update the provided data keys while keeping existing ones
            for (const [key, value] of Object.entries(data)) {
                if (typeof key === 'string' && key.trim().length > 0) {
                    dbManager.upsertData(id, key, value);
                }
            }

            res.json({success: true, message: 'Instance data merged successfully'});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private removeInstanceDataKeys(req: Request, res: Response): void {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({error: 'Extension ID is required in header: x-extension-id'});
                return;
            }

            const {id} = req.params;
            const {keys}: { keys: string[] } = req.body;

            if (!isValidId(id) || !Array.isArray(keys)) {
                res.status(400).json({error: 'Valid instance ID and keys array are required'});
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({error: `Database not found for extension: ${extensionId}`});
                return;
            }

            let removedCount = 0;
            for (const key of keys) {
                if (typeof key === 'string' && key.trim().length > 0) {
                    if (dbManager.deleteDataValue(id, key)) {
                        removedCount++;
                    }
                }
            }

            res.json({success: true, removedCount});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    // Extension registration endpoints
    private registerExtension(req: Request, res: Response): void {
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

            const {dbPath} = req.body;

            // Create a new DatabaseManager for this extension
            const dbManager = new DatabaseManager(dbPath, extensionId);

            // Register it with the cross-extension reader
            this.crossExtensionReader.registerExtensionDatabase(extensionId, dbManager);

            res.json({success: true, message: `Extension ${extensionId} registered successfully`});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({error: errorMessage});
        }
    }

    private deregisterExtension(req: Request, res: Response): void {
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

            // Deregister the extension from the cross-extension reader
            this.crossExtensionReader.deregisterExtensionDatabase(extensionId);

            res.json({success: true, message: `Extension ${extensionId} deregistered successfully`});
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
