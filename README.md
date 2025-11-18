# SillyTavern Value Tracker Plugin

This plugin provides a SQLite-based storage system for tracking character values and instances in SillyTavern. It
features a complete API for managing characters, instances, and arbitrary data storage.

## Features

- SQLite database storage for persistent data
- Unique character and instance management
- Arbitrary data storage per instance
- RESTful API endpoints for all operations
- Support for removing, overriding, and merging data
- Unlimited number of characters and instances

## Database Schema

The database consists of three main tables:

1. `characters` - Stores character information with unique IDs
2. `instances` - Stores character instances with unique IDs per character (instance metadata only)
3. `data` - Stores arbitrary key-value data for each instance (acts as a subtable per instance)

### Structure

```
[Root DB] -> characters[0] -> instances[0] -> arbitrary data here
```

The instances table holds only instance metadata, while the dedicated data table holds the arbitrary data associated
with each instance.

## API Endpoints

See [API.md](API.md) for complete API reference.

The API supports all CRUD operations on characters, instances (metadata), and data (arbitrary key-value pairs).

## Arbitrary Data Support

The system supports storing any type of data in instances, including:

- Primitive values (strings, numbers, booleans)
- Complex objects and arrays
- Nested structures
- Any JSON-serializable data

## Storage Location

The SQLite database is stored at `./db/sqlite.db` relative to the application root.