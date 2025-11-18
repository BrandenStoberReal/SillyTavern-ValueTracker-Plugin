/**
 * Sanitizes an extension ID to be safe for use as a filename
 * Removes or replaces potentially dangerous characters
 */
export function sanitizeExtensionId(extensionId: string): string {
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

/**
 * Validates that the extension ID is safe to use
 */
export function validateExtensionId(extensionId: string): string {
    const sanitized = sanitizeExtensionId(extensionId);

    // Additional validation to ensure the ID is reasonable
    if (sanitized.length < 1) {
        throw new Error('Extension ID must be at least 1 character');
    }

    // Check for reserved names or patterns that could be problematic
    if (/^\s*$/.test(sanitized)) {
        throw new Error('Extension ID cannot be only whitespace');
    }

    // Prevent extension IDs that start with a dot (hidden files on Unix systems)
    if (sanitized.startsWith('.')) {
        throw new Error('Extension ID cannot start with a dot');
    }

    return sanitized;
}
