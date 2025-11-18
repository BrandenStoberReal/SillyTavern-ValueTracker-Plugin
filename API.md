# API Reference

## Character Operations

### `GET /api/characters`

Get all characters

**Response:**

```json
[
  {
    "id": "string",
    "name": "string",
    "createdAt": "date",
    "updatedAt": "date"
  }
]
```

### `GET /api/characters/:id`

Get a specific character with all its instances and data

**Response:**

```json
{
  "character": {
    "id": "string",
    "name": "string",
    "createdAt": "date",
    "updatedAt": "date"
  },
  "instances": [
    {
      "instance": {
        "id": "string",
        "characterId": "string",
        "name": "string",
        "createdAt": "date",
        "updatedAt": "date"
      },
      "data": {
        "key1": "value1",
        "key2": "value2"
      }
    }
  ]
}
```

### `POST /api/characters`

Create or update (upsert) a character

**Request:**

```json
{
  "id": "string",
  "name": "string"
}
```

**Response:**

```json
{
  "id": "string",
  "name": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### `DELETE /api/characters/:id`

Delete a character and all its instances/data

**Response:**

```json
{
  "success": true
}
```

## Instance Operations

### `GET /api/instances/:id`

Get a specific instance with its data

**Response:**

```json
{
  "instance": {
    "id": "string",
    "characterId": "string",
    "name": "string",
    "createdAt": "date",
    "updatedAt": "date"
  },
  "data": {
    "key1": "value1",
    "key2": "value2"
  }
}
```

### `GET /api/characters/:characterId/instances`

Get all instances for a character

**Response:**

```json
[
  {
    "id": "string",
    "characterId": "string",
    "name": "string",
    "createdAt": "date",
    "updatedAt": "date"
  }
]
```

### `POST /api/instances`

Create or update (upsert) an instance

**Request:**

```json
{
  "id": "string",
  "characterId": "string",
  "name": "string"
}
```

**Response:**

```json
{
  "id": "string",
  "characterId": "string",
  "name": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### `DELETE /api/instances/:id`

Delete an instance and all its data

**Response:**

```json
{
  "success": true
}
```

## Data Operations

### `GET /api/instances/:id/data`

Get all data for an instance

**Response:**

```json
{
  "key1": "value1",
  "key2": "value2"
}
```

### `GET /api/instances/:id/data/:key`

Get a specific data key for an instance

**Response:**

```json
{
  "key": "value"
}
```

### `POST /api/instances/:id/data`

Add or update a data key for an instance

**Request:**

```json
{
  "key": "string",
  "value": "any"
}
```

**Response:**

```json
{
  "success": true,
  "key": "string",
  "value": "any"
}
```

### `DELETE /api/instances/:id/data/:key`

Remove a specific data key from an instance

**Response:**

```json
{
  "success": true
}
```

### `DELETE /api/instances/:id/data`

Clear all data for an instance

**Response:**

```json
{
  "success": true
}
```

## Complex Data Operations

### `PUT /api/instances/:id/data/override`

Replace all instance data with new data

**Request:**

```json
{
  "key1": "new_value1",
  "key2": "new_value2"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Instance data overridden successfully"
}
```

### `PUT /api/instances/:id/data/merge`

Merge new data with existing instance data

**Request:**

```json
{
  "key1": "updated_value1",
  "new_key": "new_value"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Instance data merged successfully"
}
```

### `PUT /api/instances/:id/data/remove`

Remove specific data keys from an instance

**Request:**

```json
{
  "keys": ["key1", "key2"]
}
```

**Response:**

```json
{
  "success": true,
  "removedCount": 2
}
```