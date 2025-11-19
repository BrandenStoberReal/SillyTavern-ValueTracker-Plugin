import {Character, FullCharacter, FullInstance, ICrossExtensionReader, Instance} from './interfaces';
import {DatabaseManager} from './DatabaseManager';
import {validateExtensionId} from './utils';
import {Chalk} from 'chalk';

const chalk = new Chalk();
const MODULE_NAME = '[ValueTracker-CrossExtensionReader]';

export class CrossExtensionReader implements ICrossExtensionReader {
    private extensionDatabases: Map<string, DatabaseManager> = new Map();

    /**
     * Register a database manager for an extension
     */
    public registerExtensionDatabase(extensionId: string, dbManager: DatabaseManager): void {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Registering database for extension:', sanitizedExtensionId);

        // Close existing database manager if it exists
        if (this.extensionDatabases.has(sanitizedExtensionId)) {
            const existingDbManager = this.extensionDatabases.get(sanitizedExtensionId);
            if (existingDbManager) {
                console.log(chalk.yellow(MODULE_NAME), 'Closing existing database for extension:', sanitizedExtensionId);
                existingDbManager.close();
            }
        }

        this.extensionDatabases.set(sanitizedExtensionId, dbManager);
        console.log(chalk.green(MODULE_NAME), 'Database registered successfully for extension:', sanitizedExtensionId);
    }

    /**
     * Register a database for an extension by creating one in the db directory with the extension ID as filename
     */
    public registerExtensionDatabaseByPath(extensionId: string): void {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        // Close existing database manager if it exists
        if (this.extensionDatabases.has(sanitizedExtensionId)) {
            const existingDbManager = this.extensionDatabases.get(sanitizedExtensionId);
            if (existingDbManager) {
                existingDbManager.close();
            }
        }

        // Create a new database manager for the extension in the db directory with the extension ID as filename
        const dbManager = new DatabaseManager(undefined, sanitizedExtensionId);
        this.extensionDatabases.set(sanitizedExtensionId, dbManager);
    }

    /**
     * Deregister a database for an extension
     */
    public deregisterExtensionDatabase(extensionId: string): void {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Deregistering database for extension:', sanitizedExtensionId);

        const dbManager = this.extensionDatabases.get(sanitizedExtensionId);
        if (dbManager) {
            // Don't close the database manager here if it's shared with other parts of the app
            // Just remove it from our map
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
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        const dbManager = this.extensionDatabases.get(sanitizedExtensionId);
        if (!dbManager) {
            console.log(chalk.yellow(MODULE_NAME), 'Database manager not found for extension:', sanitizedExtensionId);
            return null;
        }

        console.log(chalk.blue(MODULE_NAME), 'Database manager retrieved for extension:', sanitizedExtensionId);
        return dbManager;
    }

    /**
     * Get a complete character with all its instances and data from another extension
     */
    public getFullCharacter(extensionId: string, characterId: string): FullCharacter | null {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        console.log(chalk.blue(MODULE_NAME), 'Retrieving full character:', characterId, 'from extension:', sanitizedExtensionId);

        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(chalk.yellow(MODULE_NAME), 'Database not registered for extension:', sanitizedExtensionId);
            return null;
        }

        const result = dbManager.getFullCharacter(characterId);
        if (result) {
            console.log(chalk.blue(MODULE_NAME), 'Successfully retrieved full character:', characterId, 'from extension:', sanitizedExtensionId);
        } else {
            console.log(chalk.yellow(MODULE_NAME), 'Character not found:', characterId, 'in extension:', sanitizedExtensionId);
        }

        return result;
    }

    /**
     * Get a specific instance with its data from another extension
     */
    public getFullInstance(extensionId: string, instanceId: string): FullInstance | null {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(`[CrossExtensionReader] Database not registered for extension: ${sanitizedExtensionId}`);
            return null;
        }

        return dbManager.getFullInstance(instanceId);
    }

    /**
     * Get data for an instance from another extension
     */
    public getInstanceData(extensionId: string, instanceId: string): Record<string, unknown> {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(`[CrossExtensionReader] Database not registered for extension: ${sanitizedExtensionId}`);
            return {};
        }

        return dbManager.getData(instanceId);
    }

    /**
     * Get specific data key for an instance from another extension
     */
    public getDataValue(extensionId: string, instanceId: string, key: string): unknown {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(`[CrossExtensionReader] Database not registered for extension: ${sanitizedExtensionId}`);
            return undefined;
        }

        return dbManager.getDataValue(instanceId, key);
    }

    /**
     * Get all characters from another extension
     */
    public getAllCharacters(extensionId: string): Character[] {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(`[CrossExtensionReader] Database not registered for extension: ${sanitizedExtensionId}`);
            return [];
        }

        return dbManager.getAllCharacters();
    }

    /**
     * Get all instances for a character from another extension
     */
    public getInstancesByCharacter(extensionId: string, characterId: string): Instance[] {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(`[CrossExtensionReader] Database not registered for extension: ${sanitizedExtensionId}`);
            return [];
        }

        return dbManager.getInstancesByCharacter(characterId);
    }

    /**
     * Close all database connections
     */
    public closeAll(): void {
        console.log(chalk.yellow(MODULE_NAME), 'Closing all extension databases');

        if (this.extensionDatabases.size === 0) {
            console.log(chalk.blue(MODULE_NAME), 'No extension databases to close');
            return;
        }

        for (const [extensionId, dbManager] of this.extensionDatabases) {
            try {
                console.log(chalk.yellow(MODULE_NAME), 'Closing database for extension:', extensionId);
                dbManager.close();
                console.log(chalk.green(MODULE_NAME), 'Successfully closed database for extension:', extensionId);
            } catch (error) {
                console.error(chalk.red(MODULE_NAME), 'Error closing database for extension', extensionId + ':', error);
            }
        }

        // Create a new map to ensure all references are cleared
        const closedCount = this.extensionDatabases.size;
        this.extensionDatabases = new Map();

        console.log(chalk.green(MODULE_NAME), 'All extension databases closed successfully. Total:', closedCount);
    }
}
