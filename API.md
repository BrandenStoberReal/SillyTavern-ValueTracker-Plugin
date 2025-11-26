# ValueTracker Plugin API Documentation

All API routes are prefixed with `/api/plugins/valuetracker`.

## Important: Extension ID Header

For most API endpoints (except registration and cross-extension endpoints), the extension ID must be provided in a
header rather than in
the URL path:

- **Header**: `x-extension-id` - The unique identifier for the extension making the request

Registration endpoints require the extension ID in the request body since the extension is not yet registered.

## Table of Contents

- [Extension Registration](#extension-registration)
- [Character Management](#character-management)
- [Instance Management](#instance-management)
- [Data Management](#data-management)
- [Complex Operations](#complex-operations)
- [Cross-Extension Reading](#cross-extension-reading)

## Extension Registration

### Register Extension

- **Endpoint**: `POST /api/plugins/valuetracker/register`
- **Description**: Registers a new extension with the ValueTracker plugin.
- **Request Body**:
  ```json
  {
    "extensionId": "string"  // Required: The unique identifier for the extension
  }
  ```
- **Response**:
    - Success: `200 OK` with `{ "success": true, "message": "Extension {extensionId} registered successfully" }`
  - Error: `400 Bad Request` if extension ID is missing from request body
      - Error: `500 Internal Server Error` with error details

### Deregister Extension

- **Endpoint**: `DELETE /api/plugins/valuetracker/register`
- **Description**: Deregisters an extension from the ValueTracker plugin.
- **Request Body**:
  ```json
  {
    "extensionId": "string"   // Required: The unique identifier for the extension to deregister
  }
  ```
- **Response**:
    - Success: `200 OK` with `{ "success": true, "message": "Extension {extensionId} deregistered successfully" }`
  - Error: `400 Bad Request` if extension ID is missing from request body
      - Error: `500 Internal Server Error` with error details

## Character Management

### Get All Characters

- **Endpoint**: `GET /api/plugins/valuetracker/characters`
- **Description**: Retrieves all characters for the specified extension.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Response**:
    - Success: `200 OK` with array of Character objects
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Get Character

- **Endpoint**: `GET /api/plugins/valuetracker/characters/:id`
- **Description**: Retrieves a specific character by ID.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the character.
- **Response**:
    - Success: `200 OK` with FullCharacter object
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if character not found or database not found for extension
    - Error: `500 Internal Server Error` with error details

### Create/Update Character

- **Endpoint**: `POST /api/plugins/valuetracker/characters`
- **Description**: Creates or updates a character.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Request Body**:
  ```json
  {
    "id": "string",      // Required: Unique identifier for the character
    "name": "string"     // Optional: Display name for the character
  }
  ```
- **Response**:
    - Success: `200 OK` with the created/updated Character object
    - Error: `400 Bad Request` if character ID is missing or extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Delete Character

- **Endpoint**: `DELETE /api/plugins/valuetracker/characters/:id`
- **Description**: Deletes a character and all its instances and data.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the character.
- **Response**:
    - Success: `200 OK` with `{ "success": true }`
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if character not found or database not found for extension
    - Error: `500 Internal Server Error` with error details

## Instance Management

### Get All Instances for Character

- **Endpoint**: `GET /api/plugins/valuetracker/characters/:characterId/instances`
- **Description**: Retrieves all instances for a specific character.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `characterId` (path): The unique identifier for the character.
- **Response**:
    - Success: `200 OK` with array of Instance objects
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Get Instance

- **Endpoint**: `GET /api/plugins/valuetracker/instances/:id`
- **Description**: Retrieves a specific instance by ID.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Response**:
    - Success: `200 OK` with FullInstance object
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if instance not found or database not found for extension
    - Error: `500 Internal Server Error` with error details

### Create/Update Instance

- **Endpoint**: `POST /api/plugins/valuetracker/instances`
- **Description**: Creates or updates an instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Request Body**:
  ```json
  {
    "id": "string",          // Required: Unique identifier for the instance
    "characterId": "string", // Required: Reference to the character this instance belongs to
    "name": "string"         // Optional: Display name for the instance
  }
  ```
- **Response**:
    - Success: `200 OK` with the created/updated Instance object
    - Error: `400 Bad Request` if instance ID or character ID is missing, or extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Delete Instance

- **Endpoint**: `DELETE /api/plugins/valuetracker/instances/:id`
- **Description**: Deletes an instance and all its data.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Response**:
    - Success: `200 OK` with `{ "success": true }`
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if instance not found or database not found for extension
    - Error: `500 Internal Server Error` with error details

## Data Management

### Get Instance Data

- **Endpoint**: `GET /api/plugins/valuetracker/instances/:id/data`
- **Description**: Retrieves all data for a specific instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Response**:
    - Success: `200 OK` with Record<string, any> containing all key-value pairs for the instance
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Get Instance Data Key

- **Endpoint**: `GET /api/plugins/valuetracker/instances/:id/data/:key`
- **Description**: Retrieves a specific data key value for an instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
    - `key` (path): The key to retrieve.
- **Response**:
    - Success: `200 OK` with `{ [key]: value }` containing the key-value pair
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Create/Update Instance Data

- **Endpoint**: `POST /api/plugins/valuetracker/instances/:id/data`
- **Description**: Creates or updates a data entry for an instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Request Body**:
  ```json
  {
    "key": "string",  // Required: The key for the data entry
    "value": "any"    // Required: The value for the data entry
  }
  ```
- **Response**:
    - Success: `200 OK` with `{ "success": true, "key": "string", "value": "any" }`
    - Error: `400 Bad Request` if data key is missing or extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Alternative Create/Update Instance Data

- **Endpoint**: `PUT /api/plugins/valuetracker/instances/:id/data`
- **Description**: Alias for POST endpoint to create or update a data entry for an instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Request Body**:
  ```json
  {
    "key": "string",  // Required: The key for the data entry
    "value": "any"    // Required: The value for the data entry
  }
  ```
- **Response**:
    - Success: `200 OK` with `{ "success": true, "key": "string", "value": "any" }`
    - Error: `400 Bad Request` if data key is missing or extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Delete Instance Data Key

- **Endpoint**: `DELETE /api/plugins/valuetracker/instances/:id/data/:key`
- **Description**: Deletes a specific data key for an instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
    - `key` (path): The key to delete.
- **Response**:
    - Success: `200 OK` with `{ "success": true }`
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if data key not found or database not found for extension
    - Error: `500 Internal Server Error` with error details

### Clear Instance Data

- **Endpoint**: `DELETE /api/plugins/valuetracker/instances/:id/data`
- **Description**: Clears all data for an instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Response**:
    - Success: `200 OK` with `{ "success": true }`
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if instance not found or database not found for extension
    - Error: `500 Internal Server Error` with error details

## Complex Operations

### Delete All Instances for Character

- **Endpoint**: `DELETE /api/plugins/valuetracker/characters/:characterId/instances`
- **Description**: Deletes all instances associated with a character.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `characterId` (path): The unique identifier for the character.
- **Response**:
    - Success: `200 OK` with `{ "success": true, "deletedCount": number }`
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Override Instance Data

- **Endpoint**: `PUT /api/plugins/valuetracker/instances/:id/data/override`
- **Description**: Overrides all data for an instance with the provided data.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Request Body**:
  ```json
  {
    "key1": "value1",
    "key2": "value2"
    // ... any number of key-value pairs
  }
  ```
- **Response**:
    - Success: `200 OK` with `{ "success": true, "message": "Instance data overridden successfully" }`
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Merge Instance Data

- **Endpoint**: `PUT /api/plugins/valuetracker/instances/:id/data/merge`
- **Description**: Merges the provided data with existing instance data, adding or updating keys while keeping existing
  ones.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Request Body**:
  ```json
  {
    "key1": "value1",
    "key2": "value2"
    // ... any number of key-value pairs
  }
  ```
- **Response**:
    - Success: `200 OK` with `{ "success": true, "message": "Instance data merged successfully" }`
    - Error: `400 Bad Request` if extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

### Remove Instance Data Keys

- **Endpoint**: `PUT /api/plugins/valuetracker/instances/:id/data/remove`
- **Description**: Removes specific data keys from an instance.
- **Headers**:
    - `x-extension-id` (required): The unique identifier for the extension.
- **Parameters**:
    - `id` (path): The unique identifier for the instance.
- **Request Body**:
  ```json
  {
    "keys": ["key1", "key2", "key3"] // Array of keys to remove
  }
  ```
- **Response**:
    - Success: `200 OK` with `{ "success": true, "removedCount": number }`
    - Error: `400 Bad Request` if keys array is missing or invalid, or extension ID is missing from header
    - Error: `404 Not Found` if database not found for extension
    - Error: `500 Internal Server Error` with error details

## Cross-Extension Reading

These endpoints allow extensions to read data from other registered extensions' databases.

### Get Cross-Extension Character

- **Endpoint**: `GET /api/plugins/valuetracker/cross-extension/characters/:extensionId/:id`
- **Description**: Retrieves a specific character from another extension's database.
- **Parameters**:
    - `extensionId` (path): The unique identifier for the target extension.
    - `id` (path): The unique identifier for the character.
- **Response**:
    - Success: `200 OK` with FullCharacter object
    - Error: `404 Not Found` if character not found in specified extension
    - Error: `500 Internal Server Error` with error details

### Get Cross-Extension Instance

- **Endpoint**: `GET /api/plugins/valuetracker/cross-extension/instances/:extensionId/:id`
- **Description**: Retrieves a specific instance from another extension's database.
- **Parameters**:
    - `extensionId` (path): The unique identifier for the target extension.
    - `id` (path): The unique identifier for the instance.
- **Response**:
    - Success: `200 OK` with FullInstance object
    - Error: `404 Not Found` if instance not found in specified extension
    - Error: `500 Internal Server Error` with error details

### Get Cross-Extension Instance Data

- **Endpoint**: `GET /api/plugins/valuetracker/cross-extension/instances/:extensionId/:id/data`
- **Description**: Retrieves all data for a specific instance from another extension's database.
- **Parameters**:
    - `extensionId` (path): The unique identifier for the target extension.
    - `id` (path): The unique identifier for the instance.
- **Response**:
    - Success: `200 OK` with Record<string, any> containing all key-value pairs
    - Error: `500 Internal Server Error` with error details

### Get Cross-Extension Instance Data Key

- **Endpoint**: `GET /api/plugins/valuetracker/cross-extension/instances/:extensionId/:id/data/:key`
- **Description**: Retrieves a specific data key value from another extension's database.
- **Parameters**:
    - `extensionId` (path): The unique identifier for the target extension.
    - `id` (path): The unique identifier for the instance.
    - `key` (path): The key to retrieve.
- **Response**:
    - Success: `200 OK` with `{ [key]: value }` containing the key-value pair
    - Error: `500 Internal Server Error` with error details

### Get All Cross-Extension Characters

- **Endpoint**: `GET /api/plugins/valuetracker/cross-extension/characters/:extensionId`
- **Description**: Retrieves all characters from another extension's database.
- **Parameters**:
    - `extensionId` (path): The unique identifier for the target extension.
- **Response**:
    - Success: `200 OK` with array of Character objects
    - Error: `500 Internal Server Error` with error details

### Get Cross-Extension Instances by Character

- **Endpoint**: `GET /api/plugins/valuetracker/cross-extension/characters/:extensionId/:characterId/instances`
- **Description**: Retrieves all instances for a specific character from another extension's database.
- **Parameters**:
    - `extensionId` (path): The unique identifier for the target extension.
    - `characterId` (path): The unique identifier for the character.
- **Response**:
    - Success: `200 OK` with array of Instance objects
    - Error: `500 Internal Server Error` with error details

## Data Structures

### Character

```
{
  id: string,         // Unique identifier for the character
  name?: string,      // Display name for the character
  createdAt: Date,    // Timestamp when the character was created
  updatedAt: Date     // Timestamp when the character was last updated
}
```

### Instance

```
{
  id: string,         // Unique identifier for the instance
  characterId: string, // Reference to the character this instance belongs to
  name?: string,      // Display name for the instance
  createdAt: Date,    // Timestamp when the instance was created
  updatedAt: Date     // Timestamp when the instance was last updated
}
```

### FullCharacter

```
{
  character: Character,  // The character object
  instances: FullInstance[] // Array of FullInstance objects associated with this character
}
```

### FullInstance

```
{
  instance: Instance,    // The instance object
  data: Record<string, any> // Key-value pairs of data associated with this instance
}
```