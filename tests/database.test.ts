import { DatabaseManager } from '../src/managers/DatabaseManager';
import { CrossExtensionReader } from '../src/core/CrossExtensionReader';

// Simple test runner
function runTest(testName: string, testFn: () => void): void {
    try {
        testFn();
        console.log(`✓ ${testName}`);
    } catch (error) {
        console.error(`✗ ${testName}: ${error}`);
    }
}

// Clean up function
function cleanup(db: DatabaseManager): void {
    const characters = db.getAllCharacters();
    for (const character of characters) {
        db.deleteCharacter(character.id);
    }
}

// Main test function
async function runTests(): Promise<void> {
    const db = new DatabaseManager('./db/test-db.sqlite', 'test-extension');
    const crossExtensionReader = new CrossExtensionReader();

    // Register the test database with the cross-extension reader
    crossExtensionReader.registerExtensionDatabase('test-extension', db);

    // Clean up before tests
    cleanup(db);

    runTest('Should create and retrieve a character', () => {
        const character = db.upsertCharacter({ id: 'char-1', name: 'Test Character' });
        const retrieved = db.getCharacter('char-1');

        if (!retrieved) throw new Error('Character not found after creation');
        if (retrieved.id !== 'char-1') throw new Error('Character ID mismatch');
        if (retrieved.name !== 'Test Character') throw new Error('Character name mismatch');
        if (character.id !== retrieved.id) throw new Error('Upsert and retrieve character IDs do not match');
    });

    runTest('Should create and retrieve an instance', () => {
        const instance = db.upsertInstance({
            id: 'instance-1',
            characterId: 'char-1',
            name: 'Test Instance',
        });
        const retrieved = db.getInstance('instance-1');

        if (!retrieved) throw new Error('Instance not found after creation');
        if (retrieved.id !== 'instance-1') throw new Error('Instance ID mismatch');
        if (retrieved.characterId !== 'char-1') throw new Error('Instance character ID mismatch');
        if (instance.id !== retrieved.id) throw new Error('Upsert and retrieve instance IDs do not match');
    });

    runTest('Should store arbitrary data in an instance', () => {
        // Store primitive values
        db.upsertData('instance-1', 'health', 100);
        db.upsertData('instance-1', 'level', 'advanced');
        db.upsertData('instance-1', 'isAlive', true);

        // Store complex objects
        db.upsertData('instance-1', 'inventory', {
            weapons: ['sword', 'shield'],
            potions: 5,
            gold: 250,
        });

        // Store arrays
        db.upsertData('instance-1', 'quests', ['quest1', 'quest2', 'quest3']);

        // Store nested objects
        db.upsertData('instance-1', 'stats', {
            strength: 15,
            dexterity: 18,
            constitution: {
                base: 14,
                modifier: 2,
            },
        });

        const data = db.getData('instance-1');

        if (data.health !== 100) throw new Error('Primitive number value not stored correctly');
        if (data.level !== 'advanced') throw new Error('Primitive string value not stored correctly');
        if (data.isAlive !== true) throw new Error('Primitive boolean value not stored correctly');
        const inventory = data.inventory as { weapons: string[]; potions: number; gold: number };
        if (inventory.weapons[0] !== 'sword') throw new Error('Complex object not stored correctly');
        const quests = data.quests as string[];
        if (quests.length !== 3) throw new Error('Array not stored correctly');
        const stats = data.stats as {
            strength: number;
            dexterity: number;
            constitution: { base: number; modifier: number }
        };
        if (stats.constitution.modifier !== 2) throw new Error('Nested object not stored correctly');
    });

    runTest('Should retrieve full character with instances and data', () => {
        const fullCharacter = db.getFullCharacter('char-1');

        if (!fullCharacter) throw new Error('Full character not found');
        if (fullCharacter.character.id !== 'char-1') throw new Error('Character ID mismatch in full character');
        if (fullCharacter.instances.length === 0) throw new Error('No instances found in full character');
        if (fullCharacter.instances[0].instance.id !== 'instance-1') throw new Error('Instance ID mismatch in full character');
        if (fullCharacter.instances[0].data.health !== 100) throw new Error('Data not included in full character');
    });

    runTest('Should override instance data', () => {
        const newData = {
            health: 50,
            newStat: 'special',
            inventory: {
                weapons: ['axe'],
                potions: 0,
            },
        };

        // First clear and add the new data
        db.clearInstanceData('instance-1');
        for (const [key, value] of Object.entries(newData)) {
            db.upsertData('instance-1', key, value);
        }

        const data = db.getData('instance-1');

        if (data.health !== 50) throw new Error('Override data not stored correctly');
        if (data.newStat !== 'special') throw new Error('New override key not added correctly');
        const inventory = data.inventory as { weapons: string[] };
        if (inventory.weapons[0] !== 'axe') throw new Error('Override object not stored correctly');

        // Verify old data is gone
        if ('level' in data) throw new Error('Old data not cleared during override');
    });

    runTest('Should merge instance data', () => {
        const mergeData = {
            health: 75,  // Update existing
            mergedStat: 'merged',  // Add new
            inventory: {  // Replace complex object
                weapons: ['bow'],
                arrows: 30,
            },
        };

        for (const [key, value] of Object.entries(mergeData)) {
            db.upsertData('instance-1', key, value);
        }

        const data = db.getData('instance-1');

        if (data.health !== 75) throw new Error('Merged data not updated correctly');
        if (data.mergedStat !== 'merged') throw new Error('New merged key not added correctly');
        const inventory = data.inventory as { weapons: string[]; arrows: number };
        if (inventory.weapons[0] !== 'bow') throw new Error('Merged object not updated correctly');
        if (inventory.arrows !== 30) throw new Error('New merged object property not added correctly');

        // Old data should still exist if not overwritten
        if (!('newStat' in data)) throw new Error('Old data was incorrectly removed during merge');
    });

    runTest('Should remove specific data keys', () => {
        db.deleteDataValue('instance-1', 'mergedStat');

        const data = db.getData('instance-1');

        if ('mergedStat' in data) throw new Error('Data key not removed correctly');
        if (!('health' in data)) throw new Error('Other data keys were incorrectly removed');
    });

    runTest('Should handle deleting a character and its instances/data', () => {
        // Create a second character and instance for this test
        db.upsertCharacter({ id: 'char-delete-test', name: 'Delete Test Character' });
        db.upsertInstance({
            id: 'instance-delete-test',
            characterId: 'char-delete-test',
            name: 'Delete Test Instance',
        });

        // Add some data to the delete test instance
        db.upsertData('instance-delete-test', 'special', 'value');

        // Delete the character
        const success = db.deleteCharacter('char-delete-test');

        if (!success) throw new Error('Character deletion failed');
        if (db.getCharacter('char-delete-test') !== null) throw new Error('Character still exists after deletion');
        if (db.getInstance('instance-delete-test') !== null) throw new Error('Instance still exists after character deletion');
    });

    runTest('Should handle large amounts of data', () => {
        // Create a new character and instance for this test
        db.upsertCharacter({ id: 'stress-test', name: 'Stress Test Character' });
        db.upsertInstance({ id: 'stress-instance', characterId: 'stress-test', name: 'Stress Test Instance' });

        // Add many data entries to test performance and limits
        for (let i = 0; i < 100; i++) {
            db.upsertData('stress-instance', `key${i}`, {
                id: i,
                name: `item${i}`,
                properties: {
                    value: Math.random() * 100,
                    tags: [`tag${i % 5}`, `group${Math.floor(i / 10)}`],
                    active: i % 2 === 0,
                },
            });
        }

        const data = db.getData('stress-instance');

        if (Object.keys(data).length < 100) throw new Error('Not all data entries were stored');

        // Clean up
        db.deleteCharacter('stress-test');
    });

    // Test cross-extension functionality
    runTest('Should allow cross-extension reading of characters', () => {
        // Verify that the cross-extension reader can read the character we created
        const fullCharacter = crossExtensionReader.getFullCharacter('test-extension', 'char-1');

        if (!fullCharacter) throw new Error('Cross-extension reader could not retrieve character');
        if (fullCharacter.character.id !== 'char-1') throw new Error('Cross-extension character ID mismatch');
        if (fullCharacter.instances.length === 0) throw new Error('Cross-extension no instances found');
    });

    runTest('Should allow cross-extension reading of instances', () => {
        // Verify that the cross-extension reader can read the instance we created
        const fullInstance = crossExtensionReader.getFullInstance('test-extension', 'instance-1');

        if (!fullInstance) throw new Error('Cross-extension reader could not retrieve instance');
        if (fullInstance.instance.id !== 'instance-1') throw new Error('Cross-extension instance ID mismatch');
        if (fullInstance.data.health !== 75) throw new Error('Cross-extension data not retrieved correctly');
    });

    runTest('Should allow cross-extension reading of instance data', () => {
        // Verify that the cross-extension reader can read specific data
        const data = crossExtensionReader.getInstanceData('test-extension', 'instance-1');

        if (!data) throw new Error('Cross-extension reader could not retrieve instance data');
        if (data.health !== 75) throw new Error('Cross-extension health value mismatch');
        const inventory = data.inventory as { arrows: number };
        if (inventory.arrows !== 30) throw new Error('Cross-extension inventory data mismatch');
    });

    runTest('Should allow cross-extension reading of specific data keys', () => {
        // Verify that the cross-extension reader can read specific data keys
        const healthValue = crossExtensionReader.getDataValue('test-extension', 'instance-1', 'health');

        if (healthValue !== 75) throw new Error('Cross-extension specific data key value mismatch');

        const inventoryValue = crossExtensionReader.getDataValue('test-extension', 'instance-1', 'inventory');
        const inventory = inventoryValue as { arrows: number };
        if (inventory.arrows !== 30) throw new Error('Cross-extension specific complex data key value mismatch');
    });

    runTest('Should return empty array for non-existent extension', () => {
        // Verify that the cross-extension reader handles non-existent extensions gracefully
        const characters = crossExtensionReader.getAllCharacters('non-existent-extension');

        if (!Array.isArray(characters) || characters.length !== 0) {
            throw new Error('Cross-extension reader did not return empty array for non-existent extension');
        }
    });

    runTest('Should handle extension database registration and deregistration', () => {
        // Create a second database for testing registration/deregistration
        const db2 = new DatabaseManager('./db/test-db-2.sqlite', 'test-extension-2');
        const testDbPath = db2.getDbPath();

        // Verify the database path was created properly (use the variable to avoid unused warning)
        if (!testDbPath || testDbPath.length === 0) {
            throw new Error('Database path should not be empty');
        }

        // Register the second database
        crossExtensionReader.registerExtensionDatabase('test-extension-2', db2);

        // Verify it's registered by creating a character in it
        db2.upsertCharacter({ id: 'char-2', name: 'Test Character 2' });
        const charFromReader = crossExtensionReader.getFullCharacter('test-extension-2', 'char-2');
        if (!charFromReader || charFromReader.character.id !== 'char-2') {
            throw new Error('Character not accessible through registered extension');
        }

        // Deregister the database
        crossExtensionReader.deregisterExtensionDatabase('test-extension-2');

        // Verify it's no longer accessible
        const charAfterDereg = crossExtensionReader.getFullCharacter('test-extension-2', 'char-2');
        if (charAfterDereg !== null) {
            throw new Error('Character still accessible after deregistration');
        }

        // Clean up the second database
        db2.close();
    });

    // Test edge cases and error conditions
    runTest('Should handle upsert with invalid data', () => {
        // Test upserting without required ID
        let errorCaught = false;
        try {
            db.upsertCharacter({ id: '', name: 'Invalid Character' });
        } catch (e) {
            errorCaught = true;
        }
        if (!errorCaught) {
            throw new Error('Should have thrown error for empty ID');
        }

        // Test upserting instance without required fields
        errorCaught = false;
        try {
            db.upsertInstance({ id: '', characterId: 'char-1', name: 'Invalid Instance' });
        } catch (e) {
            errorCaught = true;
        }
        if (!errorCaught) {
            throw new Error('Should have thrown error for empty ID');
        }

        // Test upserting instance without characterId
        errorCaught = false;
        try {
            db.upsertInstance({ id: 'instance-no-char', characterId: '', name: 'Invalid Instance' });
        } catch (e) {
            errorCaught = true;
        }
        if (!errorCaught) {
            throw new Error('Should have thrown error for empty characterId');
        }
    });

    runTest('Should handle missing data retrieval gracefully', () => {
        // Test retrieving non-existent character
        const missingCharacter = db.getCharacter('non-existent');
        if (missingCharacter !== null) {
            throw new Error('Should return null for non-existent character');
        }

        // Test retrieving non-existent instance
        const missingInstance = db.getInstance('non-existent');
        if (missingInstance !== null) {
            throw new Error('Should return null for non-existent instance');
        }

        // Test retrieving non-existent data key
        const missingDataValue = db.getDataValue('instance-1', 'non-existent-key');
        if (missingDataValue !== undefined) {
            throw new Error('Should return undefined for non-existent data key');
        }

        // Test retrieving data for non-existent instance
        const missingData = db.getData('non-existent-instance');
        if (Object.keys(missingData).length !== 0) {
            throw new Error('Should return empty object for non-existent instance data');
        }
    });

    runTest('Should handle data values with special characters', () => {
        // Test storing data with special characters
        const specialString = 'Special chars: \n\r\t\'"\\!@#$%^&*()';
        const specialObj = {
            'key with spaces': 'value with spaces',
            'key-with-dashes': 'value-with-dashes',
            'key_with_underscores': 'value_with_underscores',
            'key.with.dots': 'value.with.dots',
            'key/with/slashes': 'value/with/slashes',
        };

        db.upsertData('instance-1', 'special-string', specialString);
        db.upsertData('instance-1', 'special-object', specialObj);

        const retrievedString = db.getDataValue('instance-1', 'special-string');
        if (retrievedString !== specialString) {
            throw new Error('Special character string not stored correctly');
        }

        const retrievedObj = db.getDataValue('instance-1', 'special-object');
        if (JSON.stringify(retrievedObj) !== JSON.stringify(specialObj)) {
            throw new Error('Special character object not stored correctly');
        }
    });

    runTest('Should handle data values with very large strings', () => {
        // Test storing very large data values
        const largeString = 'A'.repeat(10000); // 10KB string
        const largeObj = {
            data: largeString,
            array: Array(1000).fill(largeString),
            nested: { deep: { deeper: { deepest: largeString } } },
        };

        db.upsertData('instance-1', 'large-string', largeString);
        db.upsertData('instance-1', 'large-object', largeObj);

        const retrievedString = db.getDataValue('instance-1', 'large-string');
        if (retrievedString !== largeString) {
            throw new Error('Large string not stored correctly');
        }

        const retrievedObj = db.getDataValue('instance-1', 'large-object');
        if (JSON.stringify(retrievedObj) !== JSON.stringify(largeObj)) {
            throw new Error('Large object not stored correctly');
        }
    });

    runTest('Should handle database connection state properly', () => {
        // Test that operations fail gracefully when database is closed
        const tempDb = new DatabaseManager('./db/test-closed-db.sqlite', 'test-closed-extension');

        // Close the database
        tempDb.close();

        // Check that the database is indeed closed
        if (tempDb.isOpen()) {
            throw new Error('Database should be closed after calling close()');
        }

        // Attempt operations on closed database - they should throw errors
        let errorCaught = false;
        try {
            tempDb.upsertCharacter({ id: 'closed-test', name: 'Test' });
        } catch (e) {
            errorCaught = true;
        }
        if (!errorCaught) {
            throw new Error('Should have thrown error when upserting to closed database');
        }

        // Clean up
        tempDb.close();
    });

    // Clean up after tests
    cleanup(db);
    db.close();
    crossExtensionReader.closeAll();

    console.log('\nAll tests completed!');
}

// Run the tests
runTests().catch(console.error);
