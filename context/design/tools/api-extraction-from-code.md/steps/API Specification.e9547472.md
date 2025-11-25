---
timestamp: 'Sun Nov 23 2025 21:51:23 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_215123.e8de5066.md]]'
content_id: e9547472c3f9da53018c2a356fd9433856741cd0b5cae5bdcb881706209d0873
---

# API Specification: Playlist Concept

**Purpose:** allow users to create and manage ordered lists of generic items

***

## API Endpoints

### POST /api/Playlist/createPlaylist

**Description:** Creates a new playlist for a given owner with a specified name.

**Requirements:**

* `owner` exists; no `Playlist` with `name` exists for `owner`

**Effects:**

* creates a new `Playlist` `p`; sets `owner` of `p` to `owner`; sets `name` of `p` to `name`;
* sets `items` of `p` to empty list; returns `p` as `playlist`

**Request Body:**

```json
{
  "owner": "string",
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "playlist": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Playlist/deletePlaylist

**Description:** Deletes a playlist, provided the correct owner is specified.

**Requirements:**

* `playlist` exists and `owner` is its owner

**Effects:**

* deletes `playlist`

**Request Body:**

```json
{
  "playlist": "string",
  "owner": "string"
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

### POST /api/Playlist/renamePlaylist

**Description:** Renames an existing playlist, provided the correct owner is specified and the new name is not already in use by another playlist of the same owner.

**Requirements:**

* `playlist` exists and `owner` is its owner; no other `Playlist` with `newName` exists for `owner`

**Effects:**

* sets `name` of `playlist` to `newName`

**Request Body:**

```json
{
  "playlist": "string",
  "owner": "string",
  "newName": "string"
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

### POST /api/Playlist/addPlaylistItem

**Description:** Adds a generic item to the end of a playlist.

**Requirements:**

* `playlist` exists and `owner` is its owner; `item` exists (externally defined)

**Effects:**

* adds `item` to the end of `items` of `playlist`

**Request Body:**

```json
{
  "playlist": "string",
  "owner": "string",
  "item": "string"
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

### POST /api/Playlist/removePlaylistItem

**Description:** Removes the first occurrence of a specified item from a playlist.

**Requirements:**

* `playlist` exists and `owner` is its owner; `item` is in `items` of `playlist`

**Effects:**

* removes first occurrence of `item` from `items` of `playlist`

**Request Body:**

```json
{
  "playlist": "string",
  "owner": "string",
  "item": "string"
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

### POST /api/Playlist/movePlaylistItem

**Description:** Moves an item within a playlist from one index to another.

**Requirements:**

* `playlist` exists and `owner` is its owner; `item` is at `fromIndex` in `items` of `playlist`;
* `fromIndex` and `toIndex` are valid indices within the `items` list

**Effects:**

* moves `item` from `fromIndex` to `toIndex` in `items` of `playlist`

**Request Body:**

```json
{
  "playlist": "string",
  "owner": "string",
  "item": "string",
  "fromIndex": "number",
  "toIndex": "number"
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

### POST /api/Playlist/\_getPlaylists

**Description:** Returns a list of playlists owned by a specified user, along with their names.

**Requirements:**

* `owner` exists

**Effects:**

* returns set of all `Playlist`s owned by `owner`, with their `name`

**Request Body:**

```json
{
  "owner": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "playlist": "string",
    "name": "string"
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

### POST /api/Playlist/\_getPlaylistDetails

**Description:** Returns the full details (name, owner, and items) of a specific playlist.

**Requirements:**

* `playlist` exists

**Effects:**

* returns `name`, `owner`, and `items` of `playlist`

**Request Body:**

```json
{
  "playlist": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "name": "string",
    "owner": "string",
    "items": "string[]"
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

### POST /api/Playlist/\_getPlaylistItems

**Description:** Returns an ordered list of items contained within a specified playlist.

**Requirements:**

* `playlist` exists

**Effects:**

* returns ordered list of `item`s in `playlist`

**Request Body:**

```json
{
  "playlist": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "item": "string"
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
