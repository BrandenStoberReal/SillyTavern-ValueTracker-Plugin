"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossExtensionReader = void 0;
const DatabaseManager_1 = require("../managers/DatabaseManager");
const utils_1 = require("../helpers/utils");
const chalk_1 = require("chalk");
const chalk = new chalk_1.Chalk();
const MODULE_NAME = '[ValueTracker-CrossExtensionReader]';
class CrossExtensionReader {
    constructor() {
        this.extensionDatabases = new Map();
    }
    /**
     * Register a database manager for an extension
     */
    registerExtensionDatabase(extensionId, dbManager) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
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
    registerExtensionDatabaseByPath(extensionId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
        // Close existing database manager if it exists
        if (this.extensionDatabases.has(sanitizedExtensionId)) {
            const existingDbManager = this.extensionDatabases.get(sanitizedExtensionId);
            if (existingDbManager) {
                existingDbManager.close();
            }
        }
        // Create a new database manager for the extension in the db directory with the extension ID as filename
        const dbManager = new DatabaseManager_1.DatabaseManager(undefined, sanitizedExtensionId);
        this.extensionDatabases.set(sanitizedExtensionId, dbManager);
    }
    /**
     * Deregister a database for an extension
     */
    deregisterExtensionDatabase(extensionId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Deregistering database for extension:', sanitizedExtensionId);
        const dbManager = this.extensionDatabases.get(sanitizedExtensionId);
        if (dbManager) {
            // Don't close the database manager here if it's shared with other parts of the app
            // Just remove it from our map
            this.extensionDatabases.delete(sanitizedExtensionId);
            console.log(chalk.green(MODULE_NAME), 'Database deregistered successfully for extension:', sanitizedExtensionId);
        }
        else {
            console.log(chalk.yellow(MODULE_NAME), 'Database not found for extension during deregistration:', sanitizedExtensionId);
        }
    }
    /**
     * Get a database manager for the specified extension
     */
    getDbManager(extensionId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
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
    getFullCharacter(extensionId, characterId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Retrieving full character:', characterId, 'from extension:', sanitizedExtensionId);
        const dbManager = this.getDbManager(sanitizedExtensionId);
        if (!dbManager) {
            console.warn(chalk.yellow(MODULE_NAME), 'Database not registered for extension:', sanitizedExtensionId);
            return null;
        }
        const result = dbManager.getFullCharacter(characterId);
        if (result) {
            console.log(chalk.blue(MODULE_NAME), 'Successfully retrieved full character:', characterId, 'from extension:', sanitizedExtensionId);
        }
        else {
            console.log(chalk.yellow(MODULE_NAME), 'Character not found:', characterId, 'in extension:', sanitizedExtensionId);
        }
        return result;
    }
    /**
     * Get a specific instance with its data from another extension
     */
    getFullInstance(extensionId, instanceId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
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
    getInstanceData(extensionId, instanceId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
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
    getDataValue(extensionId, instanceId, key) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
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
    getAllCharacters(extensionId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
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
    getInstancesByCharacter(extensionId, characterId) {
        // Sanitize and validate the extension ID
        const sanitizedExtensionId = (0, utils_1.validateExtensionId)(extensionId);
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
    closeAll() {
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
            }
            catch (error) {
                console.error(chalk.red(MODULE_NAME), 'Error closing database for extension', extensionId + ':', error);
            }
        }
        // Create a new map to ensure all references are cleared
        const closedCount = this.extensionDatabases.size;
        this.extensionDatabases = new Map();
        console.log(chalk.green(MODULE_NAME), 'All extension databases closed successfully. Total:', closedCount);
    }
}
exports.CrossExtensionReader = CrossExtensionReader;
//# sourceMappingURL=CrossExtensionReader.js.map