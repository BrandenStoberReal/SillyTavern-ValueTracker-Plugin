import {Character, FullCharacter, FullInstance, ICrossExtensionReader, Instance} from '../types/interfaces';
import {DatabaseManager} from '../managers/DatabaseManager';
import {validateExtensionId} from '../helpers/utils';
import {Chalk} from 'chalk';

const chalk = new Chalk();
const MODULE_NAME = '[ValueTracker-CrossExtensionReader]';

export class CrossExtensionReader implements ICrossExtensionReader {
    private extensionDatabases: Map<string, DatabaseManager> = new Map();

    /**
     * Register a database manager for an extension
     */
    public async registerExtensionDatabase(extensionId: string): Promise<void> {
        const sanitizedExtensionId = validateExtensionId(extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Registering database for extension:', sanitizedExtensionId);

        if (this.extensionDatabases.has(sanitizedExtensionId)) {
            const existingDbManager = this.extensionDatabases.get(sanitizedExtensionId);
            if (existingDbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'Closing existing database for extension:', sanitizedExtensionId);
                await existingDbManager.close();
            }
        }

        const dbManager = await DatabaseManager.create(sanitizedExtensionId);
        this.extensionDatabases.set(sanitizedExtensionId, dbManager);
        console.log(chalk.green(MODULE_NAME), 'Database registered successfully for extension:', sanitizedExtensionId);
    }

    /**
     * Deregister a database for an extension
     */
    public async deregisterExtensionDatabase(extensionId: string): Promise<void> {
        const sanitizedExtensionId = validateExtensionId(extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Deregistering database for extension:', sanitizedExtensionId);

        const dbManager = this.extensionDatabases.get(sanitizedExtensionId);
        if (dbManager) {
            await dbManager.close();
            this.extensionDatabases.delete(sanitizedExtensionId);
            console.log(chalk.green(MODULE_NAME), 'Database deregistered successfully for extension:', sanitizedExtensionId);
        } else {
            console.log(chalk.yellow(MODULE_NAME), 'Database not found for extension during deregistration:', sanitizedExtensionId);
        }
    }

    /**
     * Get a database manager for the specified extension
     */
    public getDbManager(extensionId: string): DatabaseManager | null {
        const sanitizedExtensionId = validateExtensionId(extensionId);
        const dbManager = this.extensionDatabases.get(sanitizedExtensionId);
        if (!dbManager) {
            console.log(chalk.yellow(MODULE_NAME), 'Database manager not found for extension:', sanitizedExtensionId);
            return null;
        }
        return dbManager;
    }

    public async getFullCharacter(extensionId: string, characterId: string): Promise<FullCharacter | null> {
        const dbManager = this.getDbManager(extensionId);
        if (!dbManager) return null;
        return dbManager.getFullCharacter(characterId);
    }

    public async getFullInstance(extensionId: string, instanceId: string): Promise<FullInstance | null> {
        const dbManager = this.getDbManager(extensionId);
        if (!dbManager) return null;
        return dbManager.getFullInstance(instanceId);
    }

    public async getInstanceData(extensionId: string, instanceId: string): Promise<Record<string, unknown>> {
        const dbManager = this.getDbManager(extensionId);
        if (!dbManager) return {};
        return dbManager.getData(instanceId);
    }

    public async getDataValue(extensionId: string, instanceId: string, key: string): Promise<unknown> {
        const dbManager = this.getDbManager(extensionId);
        if (!dbManager) return undefined;
        return dbManager.getDataValue(instanceId, key);
    }

    public async getAllCharacters(extensionId: string): Promise<Character[]> {
        const dbManager = this.getDbManager(extensionId);
        if (!dbManager) return [];
        return dbManager.getAllCharacters();
    }

    public async getInstancesByCharacter(extensionId: string, characterId: string): Promise<Instance[]> {
        const dbManager = this.getDbManager(extensionId);
        if (!dbManager) return [];
        return dbManager.getInstancesByCharacter(characterId);
    }

    /**
     * Close all database connections
     */
    public async closeAll(): Promise<void> {
        console.log(chalk.yellow(MODULE_NAME), 'Closing all extension databases');
        if (this.extensionDatabases.size === 0) {
            console.log(chalk.blue(MODULE_NAME), 'No extension databases to close');
            return;
        }

        for (const [extensionId, dbManager] of this.extensionDatabases) {
            try {
                console.log(chalk.yellow(MODULE_NAME), 'Closing database for extension:', extensionId);
                await dbManager.close();
                console.log(chalk.green(MODULE_NAME), 'Successfully closed database for extension:', extensionId);
            } catch (error) {
                console.error(chalk.red(MODULE_NAME), 'Error closing database for extension', extensionId + ':', error);
            }
        }
        this.extensionDatabases.clear();
        console.log(chalk.green(MODULE_NAME), 'All extension databases closed successfully.');
    }
}

