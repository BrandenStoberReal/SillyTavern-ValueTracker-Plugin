# SillyTavern Value Tracker Plugin

This plugin provides a per-extension SQLite-based storage system for tracking character values and instances in
SillyTavern. Each extension manages its own database file, with a complete API for managing characters, instances, and
arbitrary data storage.

## Installation

1. Copy the plugin folder to your SillyTavern plugins directory
2. Enable server plugins in your SillyTavern config.yaml file

## Features

- Per-extension SQLite database storage for persistent data
- Unique character and instance management per extension
- Arbitrary data storage per instance
- RESTful API endpoints for all operations
- Support for removing, overriding, and merging data
- Unlimited number of characters and instances per extension
- Cross-extension read-only access capabilities

## Database Schema

Each extension has its own database with three main tables:

1. `characters` - Stores character information with unique IDs
2. `instances` - Stores character instances with unique IDs per character (instance metadata only)
3. `data` - Stores arbitrary key-value data for each instance (acts as a subtable per instance)

### Structure

```
[Extension DB] -> characters[0] -> instances[0] -> arbitrary data here
```

The instances table holds only instance metadata, while the dedicated data table holds the arbitrary data associated
with each instance.

## Per-Extension Database System

The plugin supports each extension having its own separate database file, allowing each extension to manage its own data
independently.

### For Extension Developers

#### Registering Your Extension's Database

Extensions must register their database with the Value Tracker plugin via the API to enable use of the system:

**Register an extension:**

```
POST /api/plugins/valuetracker/register
Content-Type: application/json
Body: {
  "extensionId": "string"  // Required: The unique identifier for the extension
}
```

**Deregister an extension:**

```
DELETE /api/plugins/valuetracker/register
Content-Type: application/json
Body: {
  "extensionId": "string"  // Required: The unique identifier for the extension
}
```

#### Using the API

All database operations are performed through the REST API. Extensions should use HTTP requests to the API endpoints to
manage their data. There is no direct code integration needed - just make HTTP calls to the API.

Example using fetch:

```javascript
// Register your extension first
await fetch('/api/plugins/valuetracker/register', {
    method: 'POST',
    headers: {
        ...context.getRequestHeaders(),  // Include standard ST authentication headers
        'Content-Type': 'application/json',
    },
    body: {
      "extensionId": "string"  // Required: The unique identifier for the extension
    }
});

// Then use your extension's endpoints - note the extension ID is now in the header
const response = await fetch('/api/plugins/valuetracker/characters', {
    method: 'POST',
    headers: {
        ...context.getRequestHeaders(),  // Include standard ST authentication headers
        'Content-Type': 'application/json',
        'x-extension-id': 'my-extension-id'
    },
    body: JSON.stringify({id: 'char-1', name: 'My Character'})
});
```

#### Reading Data from Other Extensions

Extensions can read data from other registered extensions using the cross-extension API endpoints:

```javascript
// Read data from another extension via API (still uses path parameters for cross-extension)
const response = await fetch('/api/plugins/valuetracker/cross-extension/characters/other-extension-id/char-1');
const character = await response.json();

// Get instance data from another extension
const response2 = await fetch('/api/plugins/valuetracker/cross-extension/instances/other-extension-id/instance-1/data');
const instanceData = await response2.json();

// Get specific data key from another extension
const response3 = await fetch('/api/plugins/valuetracker/cross-extension/instances/other-extension-id/instance-1/data/health');
const specificValue = await response3.json();
```

## API Endpoints

See [API.md](API.md) for complete API reference.

All API operations (except cross-extension endpoints) now require an `x-extension-id` header to specify which
extension's database to operate on.

## Arbitrary Data Support

The system supports storing any type of data in instances, including:

- Primitive values (strings, numbers, booleans)
- Complex objects and arrays
- Nested structures
- Any JSON-serializable data

## Storage Location

Each extension has its own database file stored at `./db/{extensionId}.db` relative to the application root. Extensions
can specify custom database file locations during registration.
