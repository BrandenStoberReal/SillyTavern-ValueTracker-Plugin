import {Character, FullCharacter, FullInstance, ICrossExtensionReader, Instance} from './interfaces';
import {DatabaseManager} from './DatabaseManager';
import {validateExtensionId} from './utils';

export class CrossExtensionReader implements ICrossExtensionReader {
    private extensionDatabases: Map<string, DatabaseManager> = new Map();

    /**
     * Register a database manager for an extension
     */
    public registerExtensionDatabase(extensionId: string, dbManager: DatabaseManager): void {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        // Close existing database manager if it exists
        if (this.extensionDatabases.has(sanitizedExtensionId)) {
            const existingDbManager = this.extensionDatabases.get(sanitizedExtensionId);
            if (existingDbManager) {
                existingDbManager.close();
            }
        }

        this.extensionDatabases.set(sanitizedExtensionId, dbManager);
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

        const dbManager = this.extensionDatabases.get(sanitizedExtensionId);
        if (dbManager) {
            // Don't close the database manager here if it's shared with other parts of the app
            // Just remove it from our map
            this.extensionDatabases.delete(sanitizedExtensionId);
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
            return null;
        }
        return dbManager;
    }

    /**
     * Get a complete character with all its instances and data from another extension
     */
    public getFullCharacter(extensionId: string, characterId: string): FullCharacter | null {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = validateExtensionId(extensionId);

        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(`[CrossExtensionReader] Database not registered for extension: ${sanitizedExtensionId}`);
            return null;
        }

        return dbManager.getFullCharacter(characterId);
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
        for (const [extensionId, dbManager] of this.extensionDatabases) {
            try {
                dbManager.close();
            } catch (error) {
                console.error(`[CrossExtensionReader] Error closing database for extension ${extensionId}:`, error);
            }
        }
        this.extensionDatabases.clear();
    }
}
