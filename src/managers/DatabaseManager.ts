import * as fs from 'fs/promises';
import * as path from 'path';
import {Database as SqlJsDatabase, SqlJsStatic} from 'sql.js';
import {Chalk} from 'chalk';

import {Character, FullCharacter, FullInstance, Instance} from '../types/interfaces';
import {validateExtensionId} from '../helpers/utils';

const sqlJsModule = require('sql.js');
const initSqlJs = sqlJsModule.default || sqlJsModule;

const chalk = new Chalk();
const MODULE_NAME = '[ValueTracker-DatabaseManager]';

export class DatabaseManager {
    private static SQL: SqlJsStatic;
    private dbPath: string;
    private extensionId: string;
    private db!: SqlJsDatabase;

    private constructor(extensionId: string) {
        this.extensionId = validateExtensionId(extensionId);
        this.dbPath = path.join(process.cwd(), 'db', `${this.extensionId}.db`);
    }

    public static async create(extensionId: string): Promise<DatabaseManager> {
        if (!extensionId || typeof extensionId !== 'string') {
            console.error(chalk.red(MODULE_NAME), `Invalid extension ID provided: ${extensionId}`);
            throw new Error('A valid extension ID is required to create a DatabaseManager.');
        }

        const manager = new DatabaseManager(extensionId);

        if (!DatabaseManager.SQL) {
            console.log(chalk.blue(MODULE_NAME), 'Initializing SQL.js...');
            try {
                DatabaseManager.SQL = await initSqlJs();
                console.log(chalk.green(MODULE_NAME), 'SQL.js initialized successfully.');
            } catch (error) {
                console.error(chalk.red(MODULE_NAME), 'Failed to initialize SQL.js:', error);
                throw new Error('Could not initialize sql.js. Make sure sql-wasm.js and sql-wasm.wasm are in the dist directory.');
            }
        }

        await manager.initializeDb();
        return manager;
    }

    public isOpen(): boolean {
        return this.db !== undefined && this.db !== null;
    }

    public getExtensionId(): string {
        return this.extensionId;
    }

    public getDbPath(): string {
        return this.dbPath;
    }

    public async upsertCharacter(character: Omit<Character, 'createdAt' | 'updatedAt'>): Promise<Character> {
        if (!this.isOpen()) throw new Error('Database is closed');
        if (!character.id) throw new Error('Character ID is required');

        console.log(chalk.blue(MODULE_NAME), 'Upserting character:', character.id);
        const now = new Date().toISOString();
        const existingCharacter = await this.getCharacter(character.id);

        if (existingCharacter) {
            this.db.run(
                'UPDATE characters SET name = COALESCE(?, name), updated_at = ? WHERE id = ?',
                [character.name || null, now, character.id],
            );
        } else {
            this.db.run(
                'INSERT INTO characters (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
                [character.id, character.name || null, now, now],
            );
        }

        const result = await this.getCharacter(character.id);
        if (!result) throw new Error('Failed to retrieve character after upsert');

        await this.flushToDisk();
        return result;
    }

    public async getCharacter(id: string): Promise<Character | null> {
        const stmt = this.db.prepare('SELECT id, name, created_at, updated_at FROM characters WHERE id = ?');
        const row = stmt.getAsObject({':id': id});
        stmt.free();

        if (Object.keys(row).length === 0) return null;

        return {
            id: row.id as string,
            name: row.name as string,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string),
        };
    }

    public async getAllCharacters(): Promise<Character[]> {
        const stmt = this.db.prepare('SELECT id, name, created_at, updated_at FROM characters');
        const characters: Character[] = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            characters.push({
                id: row.id as string,
                name: row.name as string,
                createdAt: new Date(row.created_at as string),
                updatedAt: new Date(row.updated_at as string),
            });
        }
        stmt.free();
        return characters;
    }

    public async deleteCharacter(id: string): Promise<boolean> {
        if (!id) throw new Error('Character ID is required');

        const existingChar = await this.getCharacter(id);
        if (!existingChar) return false;

        const instances = await this.getInstancesByCharacter(id);
        for (const instance of instances) {
            this.db.run('DELETE FROM data WHERE instance_id = ?', [instance.id]);
        }
        this.db.run('DELETE FROM instances WHERE character_id = ?', [id]);
        this.db.run('DELETE FROM characters WHERE id = ?', [id]);

        await this.flushToDisk();
        return true;
    }

    public async upsertInstance(instance: Omit<Instance, 'createdAt' | 'updatedAt'>): Promise<Instance> {
        if (!this.isOpen()) throw new Error('Database is closed');
        if (!instance.id || !instance.characterId) throw new Error('Instance ID and character ID are required');

        const now = new Date().toISOString();
        const existingInstance = await this.getInstance(instance.id);

        if (existingInstance) {
            this.db.run(
                'UPDATE instances SET name = COALESCE(?, name), character_id = COALESCE(?, character_id), updated_at = ? WHERE id = ?',
                [instance.name || null, instance.characterId, now, instance.id],
            );
        } else {
            this.db.run(
                'INSERT INTO instances (id, character_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                [instance.id, instance.characterId, instance.name || null, now, now],
            );
        }
        const result = await this.getInstance(instance.id);
        if (!result) throw new Error('Failed to retrieve instance after upsert');

        await this.flushToDisk();
        return result;
    }

    public async getInstance(id: string): Promise<Instance | null> {
        const stmt = this.db.prepare('SELECT id, character_id, name, created_at, updated_at FROM instances WHERE id = ?');
        const row = stmt.getAsObject({':id': id});
        stmt.free();

        if (Object.keys(row).length === 0) return null;

        return {
            id: row.id as string,
            characterId: row.character_id as string,
            name: row.name as string,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string),
        };
    }

    public async getInstancesByCharacter(characterId: string): Promise<Instance[]> {
        const stmt = this.db.prepare('SELECT id, character_id, name, created_at, updated_at FROM instances WHERE character_id = ?');
        const instances: Instance[] = [];
        stmt.bind([characterId]);
        while (stmt.step()) {
            const row = stmt.getAsObject();
            instances.push({
                id: row.id as string,
                characterId: row.character_id as string,
                name: row.name as string,
                createdAt: new Date(row.created_at as string),
                updatedAt: new Date(row.updated_at as string),
            });
        }
        stmt.free();
        return instances;
    }

    public async deleteInstance(id: string): Promise<boolean> {
        if (!id) throw new Error('Instance ID is required');
        const existingInstance = await this.getInstance(id);
        if (!existingInstance) return false;

        this.db.run('DELETE FROM data WHERE instance_id = ?', [id]);
        this.db.run('DELETE FROM instances WHERE id = ?', [id]);

        await this.flushToDisk();
        return true;
    }

    public async upsertData(instanceId: string, key: string, value: unknown): Promise<void> {
        if (!this.isOpen()) throw new Error('Database is closed');
        if (!instanceId || !key) throw new Error('Instance ID and key are required');

        const now = new Date().toISOString();
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

        this.db.run(
            'INSERT OR REPLACE INTO data (instance_id, key, value, updated_at) VALUES (?, ?, ?, ?)',
            [instanceId, key, valueStr, now],
        );

        await this.flushToDisk();
    }

    public async getData(instanceId: string): Promise<Record<string, unknown>> {
        const stmt = this.db.prepare('SELECT key, value FROM data WHERE instance_id = ?');
        const data: Record<string, unknown> = {};
        stmt.bind([instanceId]);
        while (stmt.step()) {
            const row = stmt.getAsObject();
            const key = row.key as string;
            const value = row.value as string;
            try {
                data[key] = JSON.parse(value);
            } catch {
                data[key] = value;
            }
        }
        stmt.free();
        return data;
    }

    public async getDataValue(instanceId: string, key: string): Promise<unknown> {
        if (!instanceId || !key) throw new Error('Instance ID and key are required');
        const stmt = this.db.prepare('SELECT value FROM data WHERE instance_id = ? AND key = ?');
        const row = stmt.getAsObject({':instance_id': instanceId, ':key': key});
        stmt.free();

        if (!row || !row.value) return undefined;

        const value = row.value as string;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    public async deleteDataValue(instanceId: string, key: string): Promise<boolean> {
        if (!instanceId || !key) throw new Error('Instance ID and key are required');
        const existingValue = await this.getDataValue(instanceId, key);
        if (existingValue === undefined) return false;

        this.db.run('DELETE FROM data WHERE instance_id = ? AND key = ?', [instanceId, key]);

        await this.flushToDisk();
        return true;
    }

    public async getFullCharacter(id: string): Promise<FullCharacter | null> {
        const character = await this.getCharacter(id);
        if (!character) return null;

        const instances = await this.getInstancesByCharacter(id);
        const fullInstances: FullInstance[] = await Promise.all(instances.map(async (instance) => {
            const data = await this.getData(instance.id);
            return {instance, data};
        }));

        return {character, instances: fullInstances};
    }

    public async getFullInstance(id: string): Promise<FullInstance | null> {
        const instance = await this.getInstance(id);
        if (!instance) return null;
        const data = await this.getData(id);
        return {instance, data};
    }

    public async clearInstanceData(instanceId: string): Promise<boolean> {
        if (!instanceId) throw new Error('Instance ID is required');
        const currentData = await this.getData(instanceId);
        if (Object.keys(currentData).length === 0) return false;

        this.db.run('DELETE FROM data WHERE instance_id = ?', [instanceId]);

        await this.flushToDisk();
        return true;
    }

    public async close(): Promise<void> {
        console.log(chalk.yellow(MODULE_NAME), 'Closing database connection for extension:', this.extensionId);
        try {
            await this.flushToDisk();
            this.db.close();
            console.log(chalk.green(MODULE_NAME), 'Database connection closed successfully.');
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Error closing database:', error);
        }
    }

    private async flushToDisk(): Promise<void> {
        try {
            const data = this.db.export();
            await fs.writeFile(this.dbPath, data);
            console.log(chalk.green(MODULE_NAME), 'Database flushed to disk successfully.');
        } catch (error) {
            console.error(chalk.red(MODULE_NAME), 'Error flushing database to disk:', error);
            throw error; // Re-throw the error to be handled by the caller
        }
    }

    private async initializeDb(): Promise<void> {
        console.log(chalk.blue(MODULE_NAME), 'Initializing database for extension:', this.extensionId);
        console.log(chalk.blue(MODULE_NAME), 'Database path:', this.dbPath);

        const dbDir = path.dirname(this.dbPath);
        await this.ensureDirectoryExists(dbDir);
        console.log(chalk.blue(MODULE_NAME), 'Ensured database directory exists:', dbDir);

        let dbData: Uint8Array | undefined;
        try {
            const fileData = await fs.readFile(this.dbPath);
            dbData = new Uint8Array(fileData);
            console.log(chalk.blue(MODULE_NAME), 'Loaded existing database from file.');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log(chalk.blue(MODULE_NAME), 'No existing database file found. A new one will be created.');
            } else {
                throw error;
            }
        }

        this.db = new DatabaseManager.SQL.Database(dbData);
        this.initializeTables();
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, {recursive: true});
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    private initializeTables(): void {
        console.log(chalk.blue(MODULE_NAME), 'Initializing database tables...');
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS instances (
                id TEXT PRIMARY KEY,
                character_id TEXT NOT NULL,
                name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (character_id) REFERENCES characters (id)
            );
            CREATE TABLE IF NOT EXISTS data (
                instance_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (instance_id, key),
                FOREIGN KEY (instance_id) REFERENCES instances (id)
            );
            CREATE INDEX IF NOT EXISTS idx_instances_character_id ON instances(character_id);
            CREATE INDEX IF NOT EXISTS idx_data_instance_id ON data(instance_id);
        `);
        console.log(chalk.green(MODULE_NAME), 'Database tables initialized successfully.');
    }
}
