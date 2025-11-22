"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sql_js_1 = __importDefault(require("sql.js"));
const chalk_1 = require("chalk");
const utils_1 = require("../helpers/utils");
const chalk = new chalk_1.Chalk();
const MODULE_NAME = '[ValueTracker-DatabaseManager]';
class DatabaseManager {
    constructor(dbPath, extensionId) {
        if (!extensionId) {
            console.error(chalk.red(MODULE_NAME), 'Extension ID is required for per-extension database');
            throw new Error('Extension ID is required for per-extension database');
        }
        // Ensure extensionId is a string before passing to validation
        if (typeof extensionId !== 'string') {
            console.error(chalk.red(MODULE_NAME), `Extension ID must be a string, got ${typeof extensionId}`);
            throw new Error(`Extension ID must be a string, got ${typeof extensionId}`);
        }
        // Sanitize and validate the extension ID
        this.extensionId = (0, utils_1.validateExtensionId)(extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Creating DatabaseManager for extension:', this.extensionId);
        // Force the database to be created in the 'db' directory with the sanitized extension ID as filename
        if (dbPath) {
            // If a dbPath is provided, ignore it for security reasons and use the default location
            console.warn(chalk.yellow(MODULE_NAME), 'dbPath argument ignored for security. Database will be created in default location.');
        }
        // Double-check that extensionId is valid before creating dbPath
        if (!this.extensionId) {
            console.error(chalk.red(MODULE_NAME), 'Extension ID is empty after validation, cannot create database path');
            throw new Error('Extension ID is empty after validation');
        }
        // Use the directory structure relative to SillyTavern's expected location
        // SillyTavern typically has a "db" directory in its root
        this.dbPath = path.join(process.cwd(), 'db', `${this.extensionId}.db`);
        console.log(chalk.blue(MODULE_NAME), 'Database path:', this.dbPath);
        // Ensure dbPath is a proper string before creating the database
        if (typeof this.dbPath !== 'string' || !this.dbPath) {
            console.error(chalk.red(MODULE_NAME), 'Database path is not a valid string:', this.dbPath);
            throw new Error('Database path is not a valid string');
        }
        // Ensure the directory exists before creating the database
        const dbDir = path.dirname(this.dbPath);
        this.ensureDirectoryExists(dbDir);
        console.log(chalk.blue(MODULE_NAME), 'Ensured database directory exists:', dbDir);
        // Initialize SQL.js database
        try {
            // Initialize SQL.js with default configuration
            const initSql = (0, sql_js_1.default)({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });
            // We need to handle SQL.js initialization asynchronously, but the constructor must be synchronous
            // So we'll initialize it here and wait for it in an async method if needed
            let data;
            if (fs.existsSync(this.dbPath)) {
                data = fs.readFileSync(this.dbPath);
            }
            this.db = new initSql.Database(data);
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Failed to create or load database:', error);
            throw error;
        }
        console.log(chalk.blue(MODULE_NAME), 'Database connection established');
        this.initializeTables();
        console.log(chalk.green(MODULE_NAME), 'Database tables initialized for extension:', this.extensionId);
    }
    getExtensionId() {
        return this.extensionId;
    }
    getDbPath() {
        return this.dbPath;
    }
    isOpen() {
        // For SQL.js, we just check if the db instance exists
        return this.db !== undefined;
    }
    /**
     * Insert or update a character
     */
    upsertCharacter(character) {
        if (!this.isOpen()) {
            console.error(chalk.red(MODULE_NAME), 'Database is closed for extension:', this.extensionId);
            throw new Error('Database is closed');
        }
        if (!character.id) {
            console.error(chalk.red(MODULE_NAME), 'Character ID is required for extension:', this.extensionId);
            throw new Error('Character ID is required');
        }
        console.log(chalk.blue(MODULE_NAME), 'Upserting character:', character.id, 'for extension:', this.extensionId);
        const now = new Date().toISOString();
        const existingCharacter = this.getCharacter(character.id);
        try {
            if (existingCharacter) {
                // Update existing character
                console.log(chalk.blue(MODULE_NAME), 'Updating existing character:', character.id);
                this.db.run(`
                    UPDATE characters
                    SET name       = COALESCE(?, name),
                        updated_at = ?
                    WHERE id = ?
                `, [character.name || null, now, character.id]);
            }
            else {
                // Insert new character
                console.log(chalk.blue(MODULE_NAME), 'Inserting new character:', character.id);
                this.db.run(`
                    INSERT INTO characters (id, name, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                `, [character.id, character.name || null, now, now]);
            }
            const result = this.getCharacter(character.id);
            console.log(chalk.green(MODULE_NAME), 'Character upserted successfully:', character.id, 'for extension:', this.extensionId);
            return result;
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Error upserting character', character.id, 'for extension', this.extensionId + ':', error);
            throw error;
        }
    }
    /**
     * Get a character by ID
     */
    getCharacter(id) {
        const stmt = this.db.prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM characters WHERE id = ?');
        const row = stmt.get([id]);
        stmt.free(); // Free statement to prevent memory leaks
        if (!row)
            return null;
        // Properly cast the returned values and convert date strings to Date objects
        return {
            id: row[0],
            name: row[1],
            createdAt: new Date(row[2]),
            updatedAt: new Date(row[3])
        };
    }
    /**
     * Get all characters
     */
    getAllCharacters() {
        const stmt = this.db.prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM characters');
        const rows = stmt.all();
        stmt.free(); // Free statement to prevent memory leaks
        return rows.map(row => ({
            id: row[0],
            name: row[1],
            createdAt: new Date(row[2]),
            updatedAt: new Date(row[3])
        }));
    }
    /**
     * Delete a character and all its instances and data
     */
    deleteCharacter(id) {
        if (!id) {
            console.error(chalk.red(MODULE_NAME), 'Character ID is required for extension:', this.extensionId);
            throw new Error('Character ID is required');
        }
        console.log(chalk.blue(MODULE_NAME), 'Deleting character:', id, 'for extension:', this.extensionId);
        // Check if the character exists first
        const existingChar = this.getCharacter(id);
        if (!existingChar) {
            console.log(chalk.yellow(MODULE_NAME), 'Character not found for deletion:', id, 'for extension:', this.extensionId);
            return false;
        }
        try {
            // First, get all instances for this character to delete their data
            const instances = this.getInstancesByCharacter(id);
            console.log(chalk.blue(MODULE_NAME), 'Found', instances.length, 'instances for character', id, 'to be deleted');
            // Delete all data for each instance
            for (const instance of instances) {
                console.log(chalk.blue(MODULE_NAME), 'Deleting data for instance:', instance.id);
                this.db.run('DELETE FROM data WHERE instance_id = ?', [instance.id]);
            }
            // Delete all instances for this character
            console.log(chalk.blue(MODULE_NAME), 'Deleting instances for character:', id);
            this.db.run('DELETE FROM instances WHERE character_id = ?', [id]);
            // Finally, delete the character itself
            console.log(chalk.blue(MODULE_NAME), 'Deleting character:', id);
            this.db.run('DELETE FROM characters WHERE id = ?', [id]);
            console.log(chalk.green(MODULE_NAME), 'Character deleted successfully:', id, 'for extension:', this.extensionId);
            return true;
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Error deleting character', id, 'for extension', this.extensionId + ':', error);
            throw error;
        }
    }
    /**
     * Insert or update an instance
     */
    upsertInstance(instance) {
        if (!this.isOpen()) {
            throw new Error('Database is closed');
        }
        if (!instance.id || !instance.characterId) {
            throw new Error('Instance ID and character ID are required');
        }
        try {
            const now = new Date().toISOString();
            const existingInstance = this.getInstance(instance.id);
            if (existingInstance) {
                // Update existing instance
                this.db.run(`
            UPDATE instances
            SET name = COALESCE(?, name),
                character_id = COALESCE(?, character_id),
                updated_at = ?
            WHERE id = ?
          `, [instance.name || null, instance.characterId, now, instance.id]);
            }
            else {
                // Insert new instance
                this.db.run(`
            INSERT INTO instances (id, character_id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `, [instance.id, instance.characterId, instance.name || null, now, now]);
            }
            return this.getInstance(instance.id);
        }
        catch (error) {
            console.error(`[DatabaseManager] Error upserting instance ${instance.id}:`, error);
            throw error;
        }
    }
    /**
     * Get an instance by ID
     */
    getInstance(id) {
        const stmt = this.db.prepare('SELECT id, character_id as characterId, name, created_at as createdAt, updated_at as updatedAt FROM instances WHERE id = ?');
        const row = stmt.get([id]);
        stmt.free(); // Free statement to prevent memory leaks
        if (!row)
            return null;
        return {
            id: row[0],
            characterId: row[1],
            name: row[2],
            createdAt: new Date(row[3]),
            updatedAt: new Date(row[4])
        };
    }
    /**
     * Get all instances for a character
     */
    getInstancesByCharacter(characterId) {
        const stmt = this.db.prepare('SELECT id, character_id as characterId, name, created_at as createdAt, updated_at as updatedAt FROM instances WHERE character_id = ?');
        const rows = stmt.all();
        stmt.free(); // Free statement to prevent memory leaks
        return rows.map(row => ({
            id: row[0],
            characterId: row[1],
            name: row[2],
            createdAt: new Date(row[3]),
            updatedAt: new Date(row[4])
        }));
    }
    /**
     * Delete an instance and all its data
     */
    deleteInstance(id) {
        if (!id) {
            throw new Error('Instance ID is required');
        }
        // Check if the instance exists first
        const existingInstance = this.getInstance(id);
        if (!existingInstance) {
            return false;
        }
        try {
            // First delete all data for this instance
            this.db.run('DELETE FROM data WHERE instance_id = ?', [id]);
            // Then delete the instance itself
            this.db.run('DELETE FROM instances WHERE id = ?', [id]);
            return true;
        }
        catch (error) {
            console.error(`[DatabaseManager] Error deleting instance ${id}:`, error);
            throw error;
        }
    }
    /**
     * Insert or update data entry for an instance
     */
    upsertData(instanceId, key, value) {
        if (!this.isOpen()) {
            console.error(chalk.red(MODULE_NAME), 'Database is closed for extension:', this.extensionId);
            throw new Error('Database is closed');
        }
        if (!instanceId || !key) {
            console.error(chalk.red(MODULE_NAME), 'Instance ID and key are required for extension:', this.extensionId);
            throw new Error('Instance ID and key are required');
        }
        console.log(chalk.blue(MODULE_NAME), 'Upserting data for instance:', instanceId, 'key:', key, 'value:', value, 'for extension:', this.extensionId);
        try {
            const now = new Date().toISOString();
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            this.db.run(`
          INSERT OR REPLACE INTO data (instance_id, key, value, updated_at)
          VALUES (?, ?, ?, ?)
        `, [instanceId, key, valueStr, now]);
            console.log(chalk.green(MODULE_NAME), 'Data upserted successfully for instance:', instanceId, 'key:', key, 'for extension:', this.extensionId);
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Error upserting data for instance', instanceId, 'key', key, 'for extension', this.extensionId + ':', error);
            throw error;
        }
    }
    /**
     * Get data for an instance
     */
    getData(instanceId) {
        const stmt = this.db.prepare(`SELECT key, value FROM data WHERE instance_id = ?`);
        const rows = stmt.all();
        stmt.free(); // Free statement to prevent memory leaks
        const data = {};
        for (const row of rows) {
            const key = row[0];
            const value = row[1];
            try {
                // Try to parse as JSON first, otherwise return as string
                data[key] = JSON.parse(value);
            }
            catch (_a) {
                data[key] = value;
            }
        }
        return data;
    }
    /**
     * Get specific data key for an instance
     */
    getDataValue(instanceId, key) {
        if (!instanceId || !key) {
            throw new Error('Instance ID and key are required');
        }
        try {
            const stmt = this.db.prepare(`SELECT value FROM data WHERE instance_id = ? AND key = ?`);
            const row = stmt.get([instanceId, key]);
            stmt.free(); // Free statement to prevent memory leaks
            if (!row || row.length === 0)
                return undefined;
            const value = row[0];
            try {
                // Try to parse as JSON first, otherwise return as string
                return JSON.parse(value);
            }
            catch (_a) {
                return value;
            }
        }
        catch (error) {
            console.error(`[DatabaseManager] Error getting data value for instance ${instanceId}, key ${key}:`, error);
            throw error;
        }
    }
    /**
     * Delete a specific data key for an instance
     */
    deleteDataValue(instanceId, key) {
        if (!instanceId || !key) {
            throw new Error('Instance ID and key are required');
        }
        // Check if the data key exists first
        const existingValue = this.getDataValue(instanceId, key);
        if (existingValue === undefined) {
            return false;
        }
        try {
            this.db.run('DELETE FROM data WHERE instance_id = ? AND key = ?', [instanceId, key]);
            return true;
        }
        catch (error) {
            console.error(`[DatabaseManager] Error deleting data value for instance ${instanceId}, key ${key}:`, error);
            throw error;
        }
    }
    /**
     * Get a complete character with all its instances and data
     */
    getFullCharacter(id) {
        const character = this.getCharacter(id);
        if (!character)
            return null;
        const instances = this.getInstancesByCharacter(id);
        const fullInstances = instances.map(instance => {
            const data = this.getData(instance.id);
            return {
                instance,
                data,
            };
        });
        return {
            character,
            instances: fullInstances,
        };
    }
    /**
     * Get a specific instance with its data
     */
    getFullInstance(id) {
        const instance = this.getInstance(id);
        if (!instance)
            return null;
        const data = this.getData(id);
        return {
            instance,
            data,
        };
    }
    /**
     * Clear all data for an instance
     */
    clearInstanceData(instanceId) {
        if (!instanceId) {
            throw new Error('Instance ID is required');
        }
        // Get the current data to check if there's anything to clear
        const currentData = this.getData(instanceId);
        if (Object.keys(currentData).length === 0) {
            return false; // Nothing to clear
        }
        try {
            this.db.run('DELETE FROM data WHERE instance_id = ?', [instanceId]);
            return true;
        }
        catch (error) {
            console.error(`[DatabaseManager] Error clearing data for instance ${instanceId}:`, error);
            throw error;
        }
    }
    /**
     * Close the database connection
     */
    close() {
        console.log(chalk.yellow(MODULE_NAME), 'Closing database connection for extension:', this.extensionId);
        try {
            // Write database to file before closing
            const data = this.db.export();
            fs.writeFileSync(this.dbPath, data);
            this.db.close();
            console.log(chalk.green(MODULE_NAME), 'Database connection closed successfully for extension:', this.extensionId);
        }
        catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Error closing database connection for extension', this.extensionId + ':', error);
        }
    }
    /**
     * Ensures the directory for the database file exists
     */
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    /**
     * Initialize the database tables
     */
    initializeTables() {
        console.log(chalk.blue(MODULE_NAME), 'Initializing database tables for extension:', this.extensionId);
        // Create characters table
        console.log(chalk.blue(MODULE_NAME), 'Creating characters table for extension:', this.extensionId);
        this.db.run(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create instances table
        console.log(chalk.blue(MODULE_NAME), 'Creating instances table for extension:', this.extensionId);
        this.db.run(`
      CREATE TABLE IF NOT EXISTS instances (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters (id)
      )
    `);
        // Create data table
        console.log(chalk.blue(MODULE_NAME), 'Creating data table for extension:', this.extensionId);
        this.db.run(`
      CREATE TABLE IF NOT EXISTS data (
        instance_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (instance_id, key),
        FOREIGN KEY (instance_id) REFERENCES instances (id)
      )
    `);
        // Create indexes for better performance
        console.log(chalk.blue(MODULE_NAME), 'Creating indexes for extension:', this.extensionId);
        this.db.run('CREATE INDEX IF NOT EXISTS idx_instances_character_id ON instances(character_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_data_instance_id ON data(instance_id)');
        console.log(chalk.green(MODULE_NAME), 'Database tables initialized successfully for extension:', this.extensionId);
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=DatabaseManager.js.map