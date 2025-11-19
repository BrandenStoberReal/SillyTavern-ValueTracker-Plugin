import {isValidId, isValidObject, isValidString, sanitizeExtensionId, validateExtensionId} from '../src/utils';

// Simple test runner for validation tests
function runValidationTest(testName: string, testFn: () => void): void {
    try {
        testFn();
        console.log(`✓ ${testName}`);
    } catch (error) {
        console.error(`✗ ${testName}: ${error}`);
    }
}

// Test validation functions
function runValidationTests(): void {
    console.log('\nStarting validation tests...\n');

    // Test isValidId function
    runValidationTest('Validation: isValidId should return true for valid IDs', () => {
        const validIds = [
            'simpleid',
            'simple_id',
            'simple-id',
            'simple123',
            'id_with_numbers_123',
            'ID-MIXED_123',
            'a',
            'a1',
            'a_1',
            'a-1',
            'very_long_extension_id_with_numbers_12345',
        ];

        for (const id of validIds) {
            if (!isValidId(id)) {
                throw new Error(`isValidId should return true for: ${id}`);
            }
        }
    });

    runValidationTest('Validation: isValidId should return false for invalid IDs', () => {
        const invalidIds = [
            '',
            ' ',
            '  ',
            'id with spaces',
            'id.with.dots',
            'id/with/slashes',
            'id\\with\\backslashes',
            'id@with#special$chars',
            'id<script>',
            'id"attacker',
            'id\'sql',
            null as any,
            undefined as any,
        ];

        for (const id of invalidIds) {
            if (isValidId(id)) {
                throw new Error(`isValidId should return false for: ${id}`);
            }
        }
    });

    // Test isValidString function
    runValidationTest('Validation: isValidString should return true for valid strings', () => {
        const validStrings = [
            'simple string',
            'string with numbers 123',
            'string with symbols !@#$%^&*()',
            'string with spaces and tabs \t and newlines \n',
            'a', // minimum length
            'very long string'.repeat(100),
        ];

        for (const str of validStrings) {
            if (!isValidString(str)) {
                throw new Error(`isValidString should return true for: ${str}`);
            }
        }
    });

    runValidationTest('Validation: isValidString should return false for invalid strings', () => {
        const invalidStrings = [
            '',
            '   ', // only spaces
            '\t\t\t', // only tabs
            '\n\n\n', // only newlines
            ' \t \n ', // combination of whitespace
            null as any,
            undefined as any,
            123 as any,
            {} as any,
            [] as any,
        ];

        for (const str of invalidStrings) {
            if (isValidString(str)) {
                throw new Error(`isValidString should return false for: ${str}`);
            }
        }
    });

    // Test isValidObject function
    runValidationTest('Validation: isValidObject should return true for valid objects', () => {
        const validObjects = [
            {},
            {key: 'value'},
            {nested: {obj: 'value'}},
            {array: [1, 2, 3]},
            {number: 123, boolean: true, nullVal: null},
        ];

        for (const obj of validObjects) {
            if (!isValidObject(obj)) {
                throw new Error(`isValidObject should return true for: ${JSON.stringify(obj)}`);
            }
        }
    });

    runValidationTest('Validation: isValidObject should return false for invalid objects', () => {
        const invalidObjects = [
            null,
            undefined,
            'string',
            123,
            true,
            [],
            [1, 2, 3],
            function () {
            },
        ];

        for (const obj of invalidObjects) {
            if (isValidObject(obj)) {
                throw new Error(`isValidObject should return false for: ${JSON.stringify(obj)}`);
            }
        }
    });

    // Test sanitizeExtensionId function
    runValidationTest('Validation: sanitizeExtensionId should sanitize path traversal', () => {
        const testCases = [
            {input: '../extension', expected: 'extension'}, // ../ should be removed
            {input: '..\\extension', expected: 'extension'}, // ..\ should be removed
            {input: 'ext/../extension', expected: 'ext_extension'}, // ../ should be replaced with _
            {input: 'ext\\..\\extension', expected: 'ext_extension'}, // ..\ should be replaced with _
        ];

        for (const testCase of testCases) {
            const result = sanitizeExtensionId(testCase.input);
            if (result !== testCase.expected) {
                throw new Error(`sanitizeExtensionId('${testCase.input}') should return '${testCase.expected}', got '${result}'`);
            }
        }
    });

    runValidationTest('Validation: sanitizeExtensionId should sanitize dangerous characters', () => {
        const dangerousChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

        for (const char of dangerousChars) {
            const input = `extension${char}name`;
            const result = sanitizeExtensionId(input);
            if (result.includes(char)) {
                throw new Error(`sanitizeExtensionId should replace '${char}' with '_'`);
            }
            if (!result.includes('_')) {
                throw new Error(`sanitizeExtensionId should replace '${char}' with '_'`);
            }
        }
    });

    runValidationTest('Validation: sanitizeExtensionId should limit length', () => {
        const longString = 'a'.repeat(300);
        const result = sanitizeExtensionId(longString);

        if (result.length > 255) {
            throw new Error(`sanitizeExtensionId should limit length to 255, got ${result.length}`);
        }
    });

    // Test validateExtensionId function
    runValidationTest('Validation: validateExtensionId should accept valid IDs', () => {
        const validIds = [
            'valid-extension-id',
            'valid_extension_id',
            'validextensionid',
            'ExtensionID123',
            'a',
            'a1',
            'a_1',
            'a-1',
        ];

        for (const id of validIds) {
            try {
                const result = validateExtensionId(id);
                if (result !== id) {
                    throw new Error(`validateExtensionId should return original ID if valid: ${id}`);
                }
            } catch (error) {
                throw new Error(`validateExtensionId should accept valid ID: ${id}, error: ${error}`);
            }
        }
    });

    runValidationTest('Validation: validateExtensionId should reject invalid IDs', () => {
        const invalidIds = [
            '',
            '   ', // only spaces
            '.hidden', // starts with dot
            '.', // just a dot
            '..', // just two dots
        ];

        for (const id of invalidIds) {
            let errorCaught = false;
            try {
                validateExtensionId(id);
            } catch (error) {
                errorCaught = true;
            }

            if (!errorCaught) {
                throw new Error(`validateExtensionId should reject invalid ID: ${id}`);
            }
        }

        // Test space + dot separately - this will be trimmed, leaving .hidden which starts with dot
        let errorCaught = false;
        try {
            validateExtensionId(' .hidden');
        } catch (error) {
            errorCaught = true;
        }
        if (!errorCaught) {
            throw new Error('validateExtensionId should reject invalid ID: \' .hidden\' (gets trimmed to .hidden)');
        }
    });

    // Test validateExtensionId with sanitized content
    runValidationTest('Validation: validateExtensionId should work with sanitized content', () => {
        const input = '../dangerous/path';
        const result = validateExtensionId(input);
        if (result !== 'dangerous_path') {
            throw new Error(`validateExtensionId should sanitize and return: 'dangerous_path', got: '${result}'`);
        }
    });

    console.log('\nValidation tests completed!');
}

// Run the validation tests
runValidationTests();
