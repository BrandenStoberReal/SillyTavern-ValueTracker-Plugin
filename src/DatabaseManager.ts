import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

import {Character, DataEntry, FullCharacter, FullInstance, Instance} from './interfaces';
import {validateExtensionId} from './utils';

export class DatabaseManager {
    private db: Database.Database;
    private dbPath: string;
    private extensionId: string;

    constructor(dbPath: string | undefined, extensionId: string) {
        if (!extensionId) {
            throw new Error('Extension ID is required for per-extension database');
        }

        // Sanitize and validate the extension ID
        this.extensionId = validateExtensionId(extensionId);

        // Force the database to be created in the 'db' directory with the sanitized extension ID as filename
        if (dbPath) {
            // If a dbPath is provided, ignore it for security reasons and use the default location
            console.warn('[DatabaseManager] dbPath argument ignored for security. Database will be created in default location.');
        }

        this.dbPath = path.join(process.cwd(), 'db', `${this.extensionId}.db`);
        this.ensureDirectoryExists(path.dirname(this.dbPath));
        this.db = new Database(this.dbPath);
        this.initializeTables();
    }

    public getExtensionId(): string {
        return this.extensionId;
    }

    public getDbPath(): string {
        return this.dbPath;
    }

    public isOpen(): boolean {
        return this.db && this.db.open;
    }

    /**
     * Insert or update a character
     */
    public upsertCharacter(character: Omit<Character, 'createdAt' | 'updatedAt'>): Character {
        if (!this.isOpen()) {
            throw new Error('Database is closed');
        }
        if (!character.id) {
            throw new Error('Character ID is required');
        }

        const transaction = this.db.transaction(() => {
            const now = new Date().toISOString();
            const existingCharacter = this.getCharacter(character.id);

            if (existingCharacter) {
                // Update existing character
                this.db.prepare(`
                    UPDATE characters
                    SET name       = COALESCE(?, name),
                        updated_at = ?
                    WHERE id = ?
                `).run(character.name, now, character.id);
            } else {
                // Insert new character
                this.db.prepare(`
                    INSERT INTO characters (id, name, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                `).run(character.id, character.name, now, now);
            }

            return this.getCharacter(character.id)!;
        });

        try {
            return transaction();
        } catch (error) {
            console.error(`[DatabaseManager] Error upserting character ${character.id}:`, error);
            throw error;
        }
    }

    /**
     * Get a character by ID
     */
    public getCharacter(id: string): Character | null {
        const row = this.db.prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM characters WHERE id = ?').get(id) as Character | undefined;
        return row || null;
    }

    /**
     * Get all characters
     */
    public getAllCharacters(): Character[] {
        return this.db.prepare('SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM characters').all() as Character[];
    }

    /**
     * Delete a character and all its instances and data
     */
    public deleteCharacter(id: string): boolean {
        if (!id) {
            throw new Error('Character ID is required');
        }

        const transaction = this.db.transaction(() => {
            // First, get all instances for this character to delete their data
            const instances = this.getInstancesByCharacter(id);

            // Delete all data for each instance
            for (const instance of instances) {
                this.db.prepare('DELETE FROM data WHERE instance_id = ?').run(instance.id);
            }

            // Delete all instances for this character
            this.db.prepare('DELETE FROM instances WHERE character_id = ?').run(id);

            // Finally, delete the character itself
            return this.db.prepare('DELETE FROM characters WHERE id = ?').run(id);
        });

        try {
            const result = transaction();
            return result.changes > 0;
        } catch (error) {
            console.error(`[DatabaseManager] Error deleting character ${id}:`, error);
            throw error;
        }
    }

    /**
     * Insert or update an instance
     */
    public upsertInstance(instance: Omit<Instance, 'createdAt' | 'updatedAt'>): Instance {
        if (!this.isOpen()) {
            throw new Error('Database is closed');
        }
        if (!instance.id || !instance.characterId) {
            throw new Error('Instance ID and character ID are required');
        }

        const transaction = this.db.transaction(() => {
            const now = new Date().toISOString();
            const existingInstance = this.getInstance(instance.id);

            if (existingInstance) {
                // Update existing instance
                this.db.prepare(`
            UPDATE instances
            SET name = COALESCE(?, name),
                character_id = COALESCE(?, character_id),
                updated_at = ?
            WHERE id = ?
          `).run(instance.name, instance.characterId, now, instance.id);
            } else {
                // Insert new instance
                this.db.prepare(`
            INSERT INTO instances (id, character_id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(instance.id, instance.characterId, instance.name, now, now);
            }

            return this.getInstance(instance.id)!;
        });

        try {
            return transaction();
        } catch (error) {
            console.error(`[DatabaseManager] Error upserting instance ${instance.id}:`, error);
            throw error;
        }
    }

    /**
     * Get an instance by ID
     */
    public getInstance(id: string): Instance | null {
        const row = this.db.prepare('SELECT id, character_id as characterId, name, created_at as createdAt, updated_at as updatedAt FROM instances WHERE id = ?').get(id) as Instance | undefined;
        return row || null;
    }

    /**
     * Get all instances for a character
     */
    public getInstancesByCharacter(characterId: string): Instance[] {
        return this.db.prepare(
            'SELECT id, character_id as characterId, name, created_at as createdAt, updated_at as updatedAt FROM instances WHERE character_id = ?',
        ).all(characterId) as Instance[];
    }

    /**
     * Delete an instance and all its data
     */
    public deleteInstance(id: string): boolean {
        if (!id) {
            throw new Error('Instance ID is required');
        }

        const transaction = this.db.transaction(() => {
            // First delete all data for this instance
            this.db.prepare('DELETE FROM data WHERE instance_id = ?').run(id);

            // Then delete the instance itself
            return this.db.prepare('DELETE FROM instances WHERE id = ?').run(id);
        });

        try {
            const result = transaction();
            return result.changes > 0;
        } catch (error) {
            console.error(`[DatabaseManager] Error deleting instance ${id}:`, error);
            throw error;
        }
    }

    /**
     * Insert or update data entry for an instance
     */
    public upsertData(instanceId: string, key: string, value: unknown): void {
        if (!this.isOpen()) {
            throw new Error('Database is closed');
        }
        if (!instanceId || !key) {
            throw new Error('Instance ID and key are required');
        }

        const transaction = this.db.transaction(() => {
            const now = new Date().toISOString();
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

            const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO data (instance_id, key, value, updated_at)
          VALUES (?, ?, ?, ?)
        `);
            stmt.run(instanceId, key, valueStr, now);
        });

        try {
            transaction();
        } catch (error) {
            console.error(`[DatabaseManager] Error upserting data for instance ${instanceId}, key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get data for an instance
     */
    public getData(instanceId: string): Record<string, unknown> {
        const rows = this.db.prepare(`
      SELECT key, value FROM data WHERE instance_id = ?
    `).all(instanceId) as DataEntry[];

        const data: Record<string, unknown> = {};
        for (const row of rows) {
            try {
                // Try to parse as JSON first, otherwise return as string
                data[row.key] = JSON.parse(row.value as string);
            } catch {
                data[row.key] = row.value;
            }
        }

        return data;
    }

    /**
     * Get specific data key for an instance
     */
    public getDataValue(instanceId: string, key: string): unknown {
        if (!instanceId || !key) {
            throw new Error('Instance ID and key are required');
        }

        try {
            const row = this.db.prepare(`
          SELECT value FROM data WHERE instance_id = ? AND key = ?
        `).get(instanceId, key) as { value: string } | undefined;

            if (!row) return undefined;

            try {
                // Try to parse as JSON first, otherwise return as string
                return JSON.parse(row.value);
            } catch {
                return row.value;
            }
        } catch (error) {
            console.error(`[DatabaseManager] Error getting data value for instance ${instanceId}, key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Delete a specific data key for an instance
     */
    public deleteDataValue(instanceId: string, key: string): boolean {
        if (!instanceId || !key) {
            throw new Error('Instance ID and key are required');
        }

        try {
            const stmt = this.db.prepare('DELETE FROM data WHERE instance_id = ? AND key = ?');
            const result = stmt.run(instanceId, key);
            return result.changes > 0;
        } catch (error) {
            console.error(`[DatabaseManager] Error deleting data value for instance ${instanceId}, key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get a complete character with all its instances and data
     */
    public getFullCharacter(id: string): FullCharacter | null {
        const character = this.getCharacter(id);
        if (!character) return null;

        const instances = this.getInstancesByCharacter(id);
        const fullInstances: FullInstance[] = instances.map(instance => {
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
    public getFullInstance(id: string): FullInstance | null {
        const instance = this.getInstance(id);
        if (!instance) return null;

        const data = this.getData(id);
        return {
            instance,
            data,
        };
    }

    /**
     * Clear all data for an instance
     */
    public clearInstanceData(instanceId: string): boolean {
        if (!instanceId) {
            throw new Error('Instance ID is required');
        }

        const transaction = this.db.transaction(() => {
            const stmt = this.db.prepare('DELETE FROM data WHERE instance_id = ?');
            const result = stmt.run(instanceId);
            return result;
        });

        try {
            const result = transaction();
            return result.changes > 0;
        } catch (error) {
            console.error(`[DatabaseManager] Error clearing data for instance ${instanceId}:`, error);
            throw error;
        }
    }

    /**
     * Close the database connection
     */
    public close(): void {
        try {
            if (this.db && this.db.open) { // Check if db is still open
                this.db.close();
            }
        } catch (error) {
            console.error(`[DatabaseManager] Error closing database connection:`, error);
        }
    }

    /**
     * Ensures the directory for the database file exists
     */
    private ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, {recursive: true});
        }
    }

    /**
     * Initialize the database tables
     */
    private initializeTables(): void {
        // Create characters table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create instances table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS instances (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES characters (id) ON DELETE CASCADE
      )
    `);

        // Create data table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS data (
        instance_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (instance_id, key),
        FOREIGN KEY (instance_id) REFERENCES instances (id) ON DELETE CASCADE
      )
    `);

        // Create indexes for better performance
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_instances_character_id ON instances(character_id)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_data_instance_id ON data(instance_id)');
    }
}
