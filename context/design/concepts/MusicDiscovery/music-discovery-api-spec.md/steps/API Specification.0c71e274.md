---
timestamp: 'Mon Nov 24 2025 23:16:16 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_231616.d271a3b6.md]]'
content_id: 0c71e274e442768e7af714fdb690e8ccc2cbd2276f5021ceace9b8b37da5228a
---

# API Specification: MusicDiscovery Concept

**Purpose:** Enable the exploration of a global music catalog and the preservation of search context.

***

## API Endpoints

### POST /api/MusicDiscovery/search

**Description:** Performs a search against the external music service (Spotify), updates the user's search history, and returns the matching music entities.

**Requirements:**

* `query` is not empty.

**Effects:**

* Updates `lastQuery` of the user.
* Removes all existing `SearchResults` for the user.
* Fetches data from the external service.
* Creates or updates `MusicEntities` based on results.
* Creates `SearchResults` linking the user to the new entities.

**Request Body:**

```json
{
  "user": "string",
  "query": "string"
}
```

**Success Response Body (Action):**

```json
{
  "musicEntities": [
    {
      "_id": "string",
      "externalId": "string",
      "type": "string", 
      "name": "string",
      "uri": "string",
      "imageUrl": "string",
      "description": "string",
      "releaseDate": "string",
      "durationMs": "number",
      "artistName": "string"
    }
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/MusicDiscovery/clearSearch

**Description:** Clears the search results associated with a specific user.

**Requirements:**

* None specified (User must exist).

**Effects:**

* Removes all `SearchResults` where the owner is the user.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/MusicDiscovery/loadEntityDetails

**Description:** Fetches and updates detailed information for a specific music entity from the external service.

**Requirements:**

* `externalId` is valid.

**Effects:**

* Fetches detailed info from external service.
* Updates the specific `MusicEntity` with richer data (dates, popularity, etc.).
* Returns the corresponding `MusicEntity`.

**Request Body:**

```json
{
  "externalId": "string",
  "type": "string"
}
```

**Success Response Body (Action):**

```json
{
  "music": {
    "_id": "string",
    "externalId": "string",
    "type": "string",
    "name": "string",
    "uri": "string",
    "imageUrl": "string",
    "description": "string",
    "releaseDate": "string",
    "durationMs": "number",
    "artistName": "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/MusicDiscovery/\_getSearchResults

**Description:** Retrieves the music entities currently associated with the user's last search results.

**Requirements:**

* None specified.

**Effects:**

* Returns the music entities tied to the search results that correspond to the given user.

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "musicEntity": {
      "_id": "string",
      "externalId": "string",
      "type": "string",
      "name": "string",
      "uri": "string",
      "imageUrl": "string",
      "description": "string",
      "releaseDate": "string",
      "durationMs": "number",
      "artistName": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/MusicDiscovery/\_getEntityFromId

**Description:** Retrieves a specific music entity by its external service ID.

**Requirements:**

* None specified.

**Effects:**

* Returns the music entity with the given external id.

**Request Body:**

```json
{
  "externalId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "musicEntity": {
      "_id": "string",
      "externalId": "string",
      "type": "string",
      "name": "string",
      "uri": "string",
      "imageUrl": "string",
      "description": "string",
      "releaseDate": "string",
      "durationMs": "number",
      "artistName": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/MusicDiscovery/\_getEntityFromUri

**Description:** Retrieves a specific music entity by its URI.

**Requirements:**

* None specified.

**Effects:**

* Returns the music entity with the given external uri.

**Request Body:**

```json
{
  "uri": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "musicEntity": {
      "_id": "string",
      "externalId": "string",
      "type": "string",
      "name": "string",
      "uri": "string",
      "imageUrl": "string",
      "description": "string",
      "releaseDate": "string",
      "durationMs": "number",
      "artistName": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
