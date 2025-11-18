import {CrossExtensionReader} from './CrossExtensionReader';

// Singleton instance of the CrossExtensionReader
let crossExtensionReader: CrossExtensionReader;

// Export methods for other parts of the plugin
export function setCrossExtensionReader(reader: CrossExtensionReader): void {
    crossExtensionReader = reader;
}

export function getCrossExtensionReader(): CrossExtensionReader {
    if (!crossExtensionReader) {
        throw new Error('CrossExtensionReader not initialized. Call setCrossExtensionReader first.');
    }
    return crossExtensionReader;
}

// Export the interfaces that other extensions might need through the API
export type {
    ICrossExtensionReader,
    FullCharacter,
    FullInstance,
    Character,
    Instance,
} from './interfaces';
