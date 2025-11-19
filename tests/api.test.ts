import {ApiEndpoints} from '../src/ApiEndpoints';
import {CrossExtensionReader} from '../src/CrossExtensionReader';
import {DatabaseManager} from '../src/DatabaseManager';

// Simple test runner for API tests
function runApiTest(testName: string, testFn: () => Promise<void>): void {
    testFn()
        .then(() => console.log(`✓ ${testName}`))
        .catch((error) => console.error(`✗ ${testName}: ${error}`));
}

// Test API endpoints
async function runApiTests(): Promise<void> {
    console.log('\nStarting API endpoint tests...\n');

    const crossExtensionReader = new CrossExtensionReader();
    const apiEndpoints = new ApiEndpoints(crossExtensionReader);
    const router = apiEndpoints.getRouter();

    // Test setup before running API tests
    const testDb = new DatabaseManager('./db/test-api-db.sqlite', 'test-api-extension');
    crossExtensionReader.registerExtensionDatabase('test-api-extension', testDb);

    // Create a test character and instance for API tests
    testDb.upsertCharacter({id: 'api-test-char', name: 'API Test Character'});
    testDb.upsertInstance({id: 'api-test-instance', characterId: 'api-test-char', name: 'API Test Instance'});
    testDb.upsertData('api-test-instance', 'test-key', 'test-value');

    // Mock Express request and response objects for testing
    const createMockRequest = (params: any = {}, query: any = {}, body: any = {}, headers: any = {}) => {
        return {
            params,
            query,
            body,
            headers,
        };
    };

    const createMockResponse = () => {
        const response: any = {};
        response.status = (code: number) => {
            response.statusCode = code;
            return response;
        };
        response.json = (data: any) => {
            response.body = data;
            return response;
        };
        response.sendStatus = (code: number) => {
            response.statusCode = code;
            return response;
        };
        return response;
    };

    // Test character endpoints
    await runApiTest('API: Should get all characters', async () => {
        const mockReq: any = {
            headers: {'x-extension-id': 'test-api-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['getAllCharacters'](mockReq, mockRes);

        if (mockRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || mockRes.body.length === 0) {
            throw new Error('Expected at least one character in response');
        }
    });

    await runApiTest('API: Should get specific character', async () => {
        const mockReq: any = {
            params: {id: 'api-test-char'},
            headers: {'x-extension-id': 'test-api-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['getCharacter'](mockReq, mockRes);

        if (mockRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || !mockRes.body.character || mockRes.body.character.id !== 'api-test-char') {
            throw new Error('Expected specific character in response');
        }
    });

    await runApiTest('API: Should handle missing extension ID', async () => {
        const mockReq: any = {
            params: {id: 'api-test-char'},
            headers: {}, // No x-extension-id header
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['getCharacter'](mockReq, mockRes);

        if (mockRes.statusCode !== 400) {
            throw new Error(`Expected status 400, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || !mockRes.body.error) {
            throw new Error('Expected error message in response');
        }
    });

    await runApiTest('API: Should handle invalid extension ID', async () => {
        const mockReq: any = {
            params: {id: 'api-test-char'},
            headers: {'x-extension-id': 'invalid/extension/../path'}, // Invalid chars
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['getCharacter'](mockReq, mockRes);

        if (mockRes.statusCode !== 400) {
            throw new Error(`Expected status 400, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || !mockRes.body.error) {
            throw new Error('Expected error message in response');
        }
    });

    await runApiTest('API: Should get instance data', async () => {
        const mockReq: any = {
            params: {id: 'api-test-instance'},
            headers: {'x-extension-id': 'test-api-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['getInstanceData'](mockReq, mockRes);

        if (mockRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || !('test-key' in mockRes.body)) {
            throw new Error('Expected instance data in response');
        }
    });

    await runApiTest('API: Should get specific data key', async () => {
        const mockReq: any = {
            params: {id: 'api-test-instance', key: 'test-key'},
            headers: {'x-extension-id': 'test-api-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['getInstanceDataKey'](mockReq, mockRes);

        if (mockRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || mockRes.body['test-key'] !== 'test-value') {
            throw new Error('Expected specific data key value in response');
        }
    });

    await runApiTest('API: Should upsert instance data', async () => {
        const mockReq: any = {
            params: {id: 'api-test-instance'},
            body: {key: 'new-key', value: 'new-value'},
            headers: {'x-extension-id': 'test-api-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['upsertInstanceData'](mockReq, mockRes);

        if (mockRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || mockRes.body.key !== 'new-key') {
            throw new Error('Expected success response with upserted key');
        }

        // Verify the data was actually stored
        const data = testDb.getData('api-test-instance');
        if (data['new-key'] !== 'new-value') {
            throw new Error('Data was not actually stored in database');
        }
    });

    await runApiTest('API: Should handle invalid IDs in data operations', async () => {
        const mockReq: any = {
            params: {id: '', key: 'invalid-id-test'}, // Empty ID
            body: {key: 'invalid-key', value: 'invalid-value'},
            headers: {'x-extension-id': 'test-api-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['upsertInstanceData'](mockReq, mockRes);

        if (mockRes.statusCode !== 400) {
            throw new Error(`Expected status 400 for invalid ID, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || !mockRes.body.error) {
            throw new Error('Expected error message for invalid ID');
        }
    });

    await runApiTest('API: Should handle registration endpoint', async () => {
        const mockReq: any = {
            body: {dbPath: './db/test-reg-db.sqlite'},
            headers: {'x-extension-id': 'test-reg-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['registerExtension'](mockReq, mockRes);

        if (mockRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || !mockRes.body.success) {
            throw new Error('Expected success response for registration');
        }
    });

    await runApiTest('API: Should handle deregistration endpoint', async () => {
        const mockReq: any = {
            headers: {'x-extension-id': 'test-reg-extension'},
        };
        const mockRes: any = createMockResponse();

        apiEndpoints['deregisterExtension'](mockReq, mockRes);

        if (mockRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${mockRes.statusCode}`);
        }
        if (!mockRes.body || !mockRes.body.success) {
            throw new Error('Expected success response for deregistration');
        }
    });

    // Clean up
    crossExtensionReader.deregisterExtensionDatabase('test-api-extension');
    testDb.close();
    crossExtensionReader.closeAll();

    console.log('\nAPI endpoint tests completed!');
}

// Run the API tests
runApiTests().catch(console.error);
