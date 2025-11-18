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
    value: any;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Represents a complete instance with its data
 */
export interface FullInstance {
    instance: Instance;
    data: Record<string, any>;
}

/**
 * Represents a character with its instances
 */
export interface FullCharacter {
    character: Character;
    instances: FullInstance[];
}