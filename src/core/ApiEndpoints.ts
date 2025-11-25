import express, { Request, Response } from 'express';
import { CrossExtensionReader } from './CrossExtensionReader';
import { isValidId } from '../helpers/utils';
import { Chalk } from 'chalk';

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
        const extensionId = req.headers['x-extension-id'] as string;
        return extensionId || null;
    }

    getRouter(): express.Router {
        return this.router;
    }

    private setupRoutes(): void {
        this.router.post('/register', this.registerExtension.bind(this));
        this.router.delete('/register', this.deregisterExtension.bind(this));

        this.router.get('/characters', this.getAllCharacters.bind(this));
        this.router.get('/characters/:id', this.getCharacter.bind(this));
        this.router.post('/characters', this.upsertCharacter.bind(this));
        this.router.delete('/characters/:id', this.deleteCharacter.bind(this));

        this.router.get('/instances', this.getAllInstances.bind(this));
        this.router.get('/instances/:id', this.getInstance.bind(this));
        this.router.get('/characters/:characterId/instances', this.getInstancesByCharacter.bind(this));
        this.router.post('/instances', this.upsertInstance.bind(this));
        this.router.delete('/instances/:id', this.deleteInstance.bind(this));

        this.router.get('/instances/:id/data', this.getInstanceData.bind(this));
        this.router.get('/instances/:id/data/:key', this.getInstanceDataKey.bind(this));
        this.router.post('/instances/:id/data', this.upsertInstanceData.bind(this));
        this.router.put('/instances/:id/data', this.upsertInstanceData.bind(this));
        this.router.delete('/instances/:id/data/:key', this.deleteInstanceDataKey.bind(this));
        this.router.delete('/instances/:id/data', this.clearInstanceData.bind(this));

        this.router.delete('/characters/:characterId/instances', this.deleteAllInstancesForCharacter.bind(this));
        this.router.put('/instances/:id/data/override', this.overrideInstanceData.bind(this));
        this.router.put('/instances/:id/data/merge', this.mergeInstanceData.bind(this));
        this.router.put('/instances/:id/data/remove', this.removeInstanceDataKeys.bind(this));

        this.router.get('/cross-extension/characters/:extensionId/:id', this.getCrossExtensionCharacter.bind(this));
        this.router.get('/cross-extension/instances/:extensionId/:id', this.getCrossExtensionInstance.bind(this));
        this.router.get('/cross-extension/instances/:extensionId/:id/data', this.getCrossExtensionInstanceData.bind(this));
        this.router.get('/cross-extension/instances/:extensionId/:id/data/:key', this.getCrossExtensionInstanceDataKey.bind(this));
        this.router.get('/cross-extension/characters/:extensionId', this.getCrossExtensionAllCharacters.bind(this));
        this.router.get('/cross-extension/characters/:extensionId/:characterId/instances', this.getCrossExtensionInstancesByCharacter.bind(this));

        console.log(chalk.green(MODULE_NAME), 'All routes registered successfully');
    }

    private async getAllCharacters(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId || !isValidId(extensionId)) {
                res.status(400).json({ error: 'Valid extension ID is required in header: x-extension-id' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const characters = await dbManager.getAllCharacters();
            res.json(characters);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getCharacter(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            if (!isValidId(id)) {
                res.status(400).json({ error: 'Valid character ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const character = await dbManager.getFullCharacter(id);
            if (!character) {
                res.status(404).json({ error: 'Character not found' });
                return;
            }
            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async upsertCharacter(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id, name } = req.body;
            if (!id || !isValidId(id)) {
                res.status(400).json({ error: 'Valid character ID is required in body' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const character = await dbManager.upsertCharacter({ id, name: name || undefined });
            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async deleteCharacter(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            if (!isValidId(id)) {
                res.status(400).json({ error: 'Valid character ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const success = await dbManager.deleteCharacter(id);
            if (!success) {
                res.status(404).json({ error: 'Character not found' });
                return;
            }
            res.json({ success: true });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getAllInstances(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { characterId } = req.query;
            if (typeof characterId !== 'string' || !isValidId(characterId)) {
                res.status(400).json({ error: 'Valid characterId query parameter is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const instances = await dbManager.getInstancesByCharacter(characterId);
            res.json(instances);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getInstance(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            if (!isValidId(id)) {
                res.status(400).json({ error: 'Valid instance ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const instance = await dbManager.getFullInstance(id);
            if (!instance) {
                res.status(404).json({ error: 'Instance not found' });
                return;
            }
            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getInstancesByCharacter(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { characterId } = req.params;
            if (!isValidId(characterId)) {
                res.status(400).json({ error: 'Valid character ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const instances = await dbManager.getInstancesByCharacter(characterId);
            res.json(instances);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async upsertInstance(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id, characterId, name } = req.body;
            if (!id || !isValidId(id) || !characterId || !isValidId(characterId)) {
                res.status(400).json({ error: 'Valid instance ID and character ID are required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const instance = await dbManager.upsertInstance({
                id,
                characterId,
                name: name || undefined,
            });
            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async deleteInstance(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            if (!isValidId(id)) {
                res.status(400).json({ error: 'Valid instance ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const success = await dbManager.deleteInstance(id);
            if (!success) {
                res.status(404).json({ error: 'Instance not found' });
                return;
            }
            res.json({ success: true });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getInstanceData(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            if (!isValidId(id)) {
                res.status(400).json({ error: 'Valid instance ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const data = await dbManager.getData(id);
            res.json(data);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getInstanceDataKey(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id, key } = req.params;
            if (!isValidId(id) || !key) {
                res.status(400).json({ error: 'Valid instance ID and key are required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const value = await dbManager.getDataValue(id, key);
            res.json({ [key]: value });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async upsertInstanceData(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            const { key, value } = req.body;
            if (!isValidId(id) || !key) {
                res.status(400).json({ error: 'Valid instance ID and key are required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            await dbManager.upsertData(id, key, value);
            res.json({ success: true, key, value });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async deleteInstanceDataKey(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id, key } = req.params;
            if (!isValidId(id) || !key) {
                res.status(400).json({ error: 'Valid instance ID and key are required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const success = await dbManager.deleteDataValue(id, key);
            if (!success) {
                res.status(404).json({ error: 'Data key not found' });
                return;
            }
            res.json({ success: true });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async clearInstanceData(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            if (!isValidId(id)) {
                res.status(400).json({ error: 'Valid instance ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const success = await dbManager.clearInstanceData(id);
            res.json({ success });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async deleteAllInstancesForCharacter(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { characterId } = req.params;
            if (!isValidId(characterId)) {
                res.status(400).json({ error: 'Valid character ID is required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            const instances = await dbManager.getInstancesByCharacter(characterId);
            let deletedCount = 0;
            for (const instance of instances) {
                if (await dbManager.deleteInstance(instance.id)) {
                    deletedCount++;
                }
            }
            res.json({ success: true, deletedCount });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async overrideInstanceData(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            const data: Record<string, unknown> = req.body;
            if (!isValidId(id) || typeof data !== 'object' || data === null) {
                res.status(400).json({ error: 'Valid instance ID and data object are required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            await dbManager.clearInstanceData(id);
            for (const [key, value] of Object.entries(data)) {
                await dbManager.upsertData(id, key, value);
            }
            res.json({ success: true, message: 'Instance data overridden successfully' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async mergeInstanceData(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            const data: Record<string, unknown> = req.body;
            if (!isValidId(id) || typeof data !== 'object' || data === null) {
                res.status(400).json({ error: 'Valid instance ID and data object are required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            for (const [key, value] of Object.entries(data)) {
                await dbManager.upsertData(id, key, value);
            }
            res.json({ success: true, message: 'Instance data merged successfully' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async removeInstanceDataKeys(req: Request, res: Response): Promise<void> {
        try {
            const extensionId = this.getExtensionIdFromHeader(req);
            if (!extensionId) {
                res.status(400).json({ error: 'Extension ID is required in header: x-extension-id' });
                return;
            }

            const { id } = req.params;
            const { keys } = req.body;
            if (!isValidId(id) || !Array.isArray(keys)) {
                res.status(400).json({ error: 'Valid instance ID and keys array are required' });
                return;
            }

            const dbManager = this.crossExtensionReader.getDbManager(extensionId);
            if (!dbManager) {
                res.status(404).json({ error: `Database not found for extension: ${extensionId}` });
                return;
            }

            let removedCount = 0;
            for (const key of keys) {
                if (await dbManager.deleteDataValue(id, key)) {
                    removedCount++;
                }
            }
            res.json({ success: true, removedCount });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async registerExtension(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId } = req.body;
            if (!extensionId || !isValidId(extensionId)) {
                res.status(400).json({ error: 'Valid extension ID is required in body' });
                return;
            }

            await this.crossExtensionReader.registerExtensionDatabase(extensionId);
            res.json({ success: true, message: `Extension ${extensionId} registered successfully` });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async deregisterExtension(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId } = req.body;
            if (!extensionId || !isValidId(extensionId)) {
                res.status(400).json({ error: 'Valid extension ID is required in body' });
                return;
            }

            await this.crossExtensionReader.deregisterExtensionDatabase(extensionId);
            res.json({ success: true, message: `Extension ${extensionId} deregistered successfully` });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getCrossExtensionCharacter(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId, id } = req.params;
            if (!isValidId(extensionId) || !isValidId(id)) {
                res.status(400).json({ error: 'Valid extension ID and character ID are required' });
                return;
            }

            const character = await this.crossExtensionReader.getFullCharacter(extensionId, id);
            if (!character) {
                res.status(404).json({ error: `Character not found in extension ${extensionId}` });
                return;
            }
            res.json(character);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getCrossExtensionInstance(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId, id } = req.params;
            if (!isValidId(extensionId) || !isValidId(id)) {
                res.status(400).json({ error: 'Valid extension ID and instance ID are required' });
                return;
            }

            const instance = await this.crossExtensionReader.getFullInstance(extensionId, id);
            if (!instance) {
                res.status(404).json({ error: `Instance not found in extension ${extensionId}` });
                return;
            }
            res.json(instance);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getCrossExtensionInstanceData(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId, id } = req.params;
            if (!isValidId(extensionId) || !isValidId(id)) {
                res.status(400).json({ error: 'Valid extension ID and instance ID are required' });
                return;
            }

            const data = await this.crossExtensionReader.getInstanceData(extensionId, id);
            res.json(data);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getCrossExtensionInstanceDataKey(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId, id, key } = req.params;
            if (!isValidId(extensionId) || !isValidId(id) || !key) {
                res.status(400).json({ error: 'Valid extension ID, instance ID, and key are required' });
                return;
            }

            const value = await this.crossExtensionReader.getDataValue(extensionId, id, key);
            res.json({ [key]: value });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getCrossExtensionAllCharacters(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId } = req.params;
            if (!isValidId(extensionId)) {
                res.status(400).json({ error: 'Valid extension ID is required' });
                return;
            }

            const characters = await this.crossExtensionReader.getAllCharacters(extensionId);
            res.json(characters);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }

    private async getCrossExtensionInstancesByCharacter(req: Request, res: Response): Promise<void> {
        try {
            const { extensionId, characterId } = req.params;
            if (!isValidId(extensionId) || !isValidId(characterId)) {
                res.status(400).json({ error: 'Valid extension ID and character ID are required' });
                return;
            }

            const instances = await this.crossExtensionReader.getInstancesByCharacter(extensionId, characterId);
            res.json(instances);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: errorMessage });
        }
    }
}
