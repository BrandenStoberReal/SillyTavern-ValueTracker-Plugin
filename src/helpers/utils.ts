/**
 * Sanitizes an extension ID to be safe for use as a filename
 * Removes or replaces potentially dangerous characters
 */
export function sanitizeExtensionId(extensionId: string): string {
    // Ensure extensionId is a string before proceeding
    if (typeof extensionId !== 'string') {
        throw new Error(`Extension ID must be a string, got ${typeof extensionId}`);
    }

    if (extensionId === undefined || extensionId === null) {
        throw new Error('Extension ID cannot be undefined or null');
    }

    if (!extensionId) {
        throw new Error('Extension ID cannot be empty');
    }

    // Remove any path traversal sequences
    let sanitized = extensionId;
    let prevSanitized;
    do {
        prevSanitized = sanitized;
        sanitized = sanitized.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
    } while (sanitized !== prevSanitized);

    // Remove potentially dangerous characters for filenames
    sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '_');

    // Limit length to prevent potential issues
    sanitized = sanitized.substring(0, 255);

    // Ensure it's not empty after sanitization
    if (!sanitized) {
        throw new Error('Extension ID became empty after sanitization');
    }

    return sanitized;
}

/**
 * Validates that the extension ID is safe to use
 */
export function validateExtensionId(extensionId: string): string {
    // Ensure extensionId is a string before proceeding
    if (typeof extensionId !== 'string') {
        throw new Error(`Extension ID must be a string, got ${typeof extensionId}`);
    }

    // Check if extensionId is provided
    if (extensionId === undefined || extensionId === null) {
        throw new Error('Extension ID cannot be undefined or null');
    }

    const sanitized = sanitizeExtensionId(extensionId);

    // Trim whitespace after sanitization
    const trimmed = sanitized.trim();

    // Additional validation to ensure the ID is reasonable
    if (trimmed.length < 1) {
        throw new Error('Extension ID must be at least 1 character');
    }

    // Check for reserved names or patterns that could be problematic
    if (/^\s*$/.test(sanitized)) {
        throw new Error('Extension ID cannot be only whitespace');
    }

    // Prevent extension IDs that start with a dot (hidden files on Unix systems)
    if (trimmed.startsWith('.')) {
        throw new Error('Extension ID cannot start with a dot');
    }

    return trimmed;
}

/**
 * Validates if a string is a valid ID (alphanumeric, hyphens, underscores)
 */
export function isValidId(id: string | undefined): boolean {
    if (!id) return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Validates that the provided value is a valid string
 */
export function isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that the provided value is a valid object
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates that the provided value is a valid JSON string that can be parsed
 */
export function isValidJsonString(value: unknown): value is string {
    if (typeof value !== 'string') {
        return false;
    }

    try {
        JSON.parse(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Safely parses a JSON string, returning the parsed object or null if invalid
 */
export function safeJsonParse(value: string): unknown | null {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

/**
 * Validates that a request body contains expected JSON properties
 */
export function validateRequestBody(requiredFields: string[], body: Record<string, unknown>): {
    isValid: boolean;
    missingFields?: string[]
} {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
        if (!(field in body) || body[field] === undefined || body[field] === null) {
            missingFields.push(field);
        }
    }

    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
}
