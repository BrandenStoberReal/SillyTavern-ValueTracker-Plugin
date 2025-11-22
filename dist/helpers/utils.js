"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequestBody = exports.safeJsonParse = exports.isValidJsonString = exports.isValidObject = exports.isValidString = exports.isValidId = exports.validateExtensionId = exports.sanitizeExtensionId = void 0;
/**
 * Sanitizes an extension ID to be safe for use as a filename
 * Removes or replaces potentially dangerous characters
 */
function sanitizeExtensionId(extensionId) {
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
    let sanitized = extensionId.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
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
exports.sanitizeExtensionId = sanitizeExtensionId;
/**
 * Validates that the extension ID is safe to use
 */
function validateExtensionId(extensionId) {
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
exports.validateExtensionId = validateExtensionId;
/**
 * Validates if a string is a valid ID (alphanumeric, hyphens, underscores)
 */
function isValidId(id) {
    if (!id)
        return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
}
exports.isValidId = isValidId;
/**
 * Validates that the provided value is a valid string
 */
function isValidString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
exports.isValidString = isValidString;
/**
 * Validates that the provided value is a valid object
 */
function isValidObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
exports.isValidObject = isValidObject;
/**
 * Validates that the provided value is a valid JSON string that can be parsed
 */
function isValidJsonString(value) {
    if (typeof value !== 'string') {
        return false;
    }
    try {
        JSON.parse(value);
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.isValidJsonString = isValidJsonString;
/**
 * Safely parses a JSON string, returning the parsed object or null if invalid
 */
function safeJsonParse(value) {
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return null;
    }
}
exports.safeJsonParse = safeJsonParse;
/**
 * Validates that a request body contains expected JSON properties
 */
function validateRequestBody(requiredFields, body) {
    const missingFields = [];
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
exports.validateRequestBody = validateRequestBody;
//# sourceMappingURL=utils.js.map