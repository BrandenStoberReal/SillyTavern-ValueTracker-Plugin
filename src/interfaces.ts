export interface Character {
    id: string;
    name?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Instance {
    id: string;
    characterId: string;  // References character.id
    name?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DataEntry {
    instanceId: string;  // References instance.id
    key: string;
    value: unknown;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Represents a complete instance with its data
 */
export interface FullInstance {
    instance: Instance;
    data: Record<string, unknown>;
}

/**
 * Represents a character with its instances
 */
export interface FullCharacter {
    character: Character;
    instances: FullInstance[];
}

/**
 * Interface for database configuration per extension
 */
export interface DatabaseConfig {
    extensionId: string;
}

/**
 * Interface for cross-extension reading functionality
 */
export interface ICrossExtensionReader {
    getFullCharacter(extensionId: string, characterId: string): FullCharacter | null;

    getFullInstance(extensionId: string, instanceId: string): FullInstance | null;

    getInstanceData(extensionId: string, instanceId: string): Record<string, unknown>;

    getDataValue(extensionId: string, instanceId: string, key: string): unknown;

    getAllCharacters(extensionId: string): Character[];

    getInstancesByCharacter(extensionId: string, characterId: string): Instance[];
}
