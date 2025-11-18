import express, {Request, Response} from 'express';
import {DatabaseManager} from './DatabaseManager';

export class ApiEndpoints {
    private dbManager: DatabaseManager;
    private router: express.Router;

    constructor(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
        this.router = express.Router();
        this.setupRoutes();
    }

    getRouter(): express.Router {
        return this.router;
    }

    private setupRoutes(): void {
        // Character endpoints
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
    }

    // Character endpoints
    private getAllCharacters(req: Request, res: Response): void {
        try {
            const characters = this.dbManager.getAllCharacters();
            res.json(characters);
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private getCharacter(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const character = this.dbManager.getFullCharacter(id);

            if (!character) {
                res.status(404).json({error: 'Character not found'});
                return;
            }

            res.json(character);
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private upsertCharacter(req: Request, res: Response): void {
        try {
            const {id, name} = req.body;

            if (!id) {
                res.status(400).json({error: 'Character ID is required'});
                return;
            }

            const character = this.dbManager.upsertCharacter({id, name});
            res.json(character);
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private deleteCharacter(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const success = this.dbManager.deleteCharacter(id);

            if (!success) {
                res.status(404).json({error: 'Character not found'});
                return;
            }

            res.json({success: true});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    // Instance endpoints
    private getAllInstances(req: Request, res: Response): void {
        try {
            // This might be too expensive if there are many instances, but included for completeness
            const {characterId} = req.query;

            if (characterId) {
                const instances = this.dbManager.getInstancesByCharacter(characterId as string);
                res.json(instances);
            } else {
                res.status(400).json({error: 'characterId query parameter is required to get all instances'});
            }
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private getInstance(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const instance = this.dbManager.getFullInstance(id);

            if (!instance) {
                res.status(404).json({error: 'Instance not found'});
                return;
            }

            res.json(instance);
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private getInstancesByCharacter(req: Request, res: Response): void {
        try {
            const {characterId} = req.params;
            const instances = this.dbManager.getInstancesByCharacter(characterId);
            res.json(instances);
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private upsertInstance(req: Request, res: Response): void {
        try {
            const {id, characterId, name} = req.body;

            if (!id || !characterId) {
                res.status(400).json({error: 'Instance ID and Character ID are required'});
                return;
            }

            const instance = this.dbManager.upsertInstance({id, characterId, name});
            res.json(instance);
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private deleteInstance(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const success = this.dbManager.deleteInstance(id);

            if (!success) {
                res.status(404).json({error: 'Instance not found'});
                return;
            }

            res.json({success: true});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    // Data endpoints
    private getInstanceData(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const data = this.dbManager.getData(id);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private getInstanceDataKey(req: Request, res: Response): void {
        try {
            const {id, key} = req.params;
            const value = this.dbManager.getDataValue(id, key);
            res.json({[key]: value});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private upsertInstanceData(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const {key, value} = req.body;

            if (!key) {
                res.status(400).json({error: 'Data key is required'});
                return;
            }

            this.dbManager.upsertData(id, key, value);
            res.json({success: true, key, value});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private deleteInstanceDataKey(req: Request, res: Response): void {
        try {
            const {id, key} = req.params;
            const success = this.dbManager.deleteDataValue(id, key);

            if (!success) {
                res.status(404).json({error: 'Data key not found'});
                return;
            }

            res.json({success: true});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private clearInstanceData(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const success = this.dbManager.clearInstanceData(id);

            if (!success) {
                res.status(404).json({error: 'Instance not found'});
                return;
            }

            res.json({success: true});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    // Complex operations
    private deleteAllInstancesForCharacter(req: Request, res: Response): void {
        try {
            const {characterId} = req.params;
            const instances = this.dbManager.getInstancesByCharacter(characterId);

            let deletedCount = 0;
            for (const instance of instances) {
                if (this.dbManager.deleteInstance(instance.id)) {
                    deletedCount++;
                }
            }

            res.json({success: true, deletedCount});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private overrideInstanceData(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const data: Record<string, any> = req.body;

            // First clear all existing data for this instance
            this.dbManager.clearInstanceData(id);

            // Then add the new data
            for (const [key, value] of Object.entries(data)) {
                this.dbManager.upsertData(id, key, value);
            }

            res.json({success: true, message: 'Instance data overridden successfully'});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private mergeInstanceData(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const data: Record<string, any> = req.body;

            // Add or update the provided data keys while keeping existing ones
            for (const [key, value] of Object.entries(data)) {
                this.dbManager.upsertData(id, key, value);
            }

            res.json({success: true, message: 'Instance data merged successfully'});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }

    private removeInstanceDataKeys(req: Request, res: Response): void {
        try {
            const {id} = req.params;
            const {keys}: { keys: string[] } = req.body;

            if (!Array.isArray(keys)) {
                res.status(400).json({error: 'Keys array is required'});
                return;
            }

            let removedCount = 0;
            for (const key of keys) {
                if (this.dbManager.deleteDataValue(id, key)) {
                    removedCount++;
                }
            }

            res.json({success: true, removedCount});
        } catch (error: any) {
            res.status(500).json({error: error.message});
        }
    }
}