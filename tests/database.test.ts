import {DatabaseManager} from '../src/DatabaseManager';

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
    const db = new DatabaseManager();

    // Clean up before tests
    cleanup(db);

    runTest('Should create and retrieve a character', () => {
        const character = db.upsertCharacter({id: 'char-1', name: 'Test Character'});
        const retrieved = db.getCharacter('char-1');

        if (!retrieved) throw new Error('Character not found after creation');
        if (retrieved.id !== 'char-1') throw new Error('Character ID mismatch');
        if (retrieved.name !== 'Test Character') throw new Error('Character name mismatch');
    });

    runTest('Should create and retrieve an instance', () => {
        const instance = db.upsertInstance({
            id: 'instance-1',
            characterId: 'char-1',
            name: 'Test Instance'
        });
        const retrieved = db.getInstance('instance-1');

        if (!retrieved) throw new Error('Instance not found after creation');
        if (retrieved.id !== 'instance-1') throw new Error('Instance ID mismatch');
        if (retrieved.characterId !== 'char-1') throw new Error('Instance character ID mismatch');
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
            }
        });

        const data = db.getData('instance-1');

        if (data.health !== 100) throw new Error('Primitive number value not stored correctly');
        if (data.level !== 'advanced') throw new Error('Primitive string value not stored correctly');
        if (data.isAlive !== true) throw new Error('Primitive boolean value not stored correctly');
        if (data.inventory.weapons[0] !== 'sword') throw new Error('Complex object not stored correctly');
        if (data.quests.length !== 3) throw new Error('Array not stored correctly');
        if (data.stats.constitution.modifier !== 2) throw new Error('Nested object not stored correctly');
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
            }
        };

        // First clear and add the new data
        db.clearInstanceData('instance-1');
        for (const [key, value] of Object.entries(newData)) {
            db.upsertData('instance-1', key, value);
        }

        const data = db.getData('instance-1');

        if (data.health !== 50) throw new Error('Override data not stored correctly');
        if (data.newStat !== 'special') throw new Error('New override key not added correctly');
        if (data.inventory.weapons[0] !== 'axe') throw new Error('Override object not stored correctly');

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
            }
        };

        for (const [key, value] of Object.entries(mergeData)) {
            db.upsertData('instance-1', key, value);
        }

        const data = db.getData('instance-1');

        if (data.health !== 75) throw new Error('Merged data not updated correctly');
        if (data.mergedStat !== 'merged') throw new Error('New merged key not added correctly');
        if (data.inventory.weapons[0] !== 'bow') throw new Error('Merged object not updated correctly');
        if (data.inventory.arrows !== 30) throw new Error('New merged object property not added correctly');

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
        // Create a second instance for the same character
        db.upsertInstance({
            id: 'instance-2',
            characterId: 'char-1',
            name: 'Second Instance'
        });

        // Add some data to the second instance
        db.upsertData('instance-2', 'special', 'value');

        // Delete the character
        const success = db.deleteCharacter('char-1');

        if (!success) throw new Error('Character deletion failed');
        if (db.getCharacter('char-1') !== null) throw new Error('Character still exists after deletion');
        if (db.getInstance('instance-1') !== null) throw new Error('Instance still exists after character deletion');
        if (db.getInstance('instance-2') !== null) throw new Error('Second instance still exists after character deletion');
    });

    runTest('Should handle large amounts of data', () => {
        // Create a new character and instance for this test
        db.upsertCharacter({id: 'stress-test', name: 'Stress Test Character'});
        db.upsertInstance({id: 'stress-instance', characterId: 'stress-test', name: 'Stress Test Instance'});

        // Add many data entries to test performance and limits
        for (let i = 0; i < 100; i++) {
            db.upsertData('stress-instance', `key${i}`, {
                id: i,
                name: `item${i}`,
                properties: {
                    value: Math.random() * 100,
                    tags: [`tag${i % 5}`, `group${Math.floor(i / 10)}`],
                    active: i % 2 === 0
                }
            });
        }

        const data = db.getData('stress-instance');

        if (Object.keys(data).length < 100) throw new Error('Not all data entries were stored');

        // Clean up
        db.deleteCharacter('stress-test');
    });

    // Clean up after tests
    cleanup(db);
    db.close();

    console.log('\nAll tests completed!');
}

// Run the tests
runTests().catch(console.error);