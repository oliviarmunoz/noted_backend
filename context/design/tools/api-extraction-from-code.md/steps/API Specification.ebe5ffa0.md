---
timestamp: 'Tue Nov 25 2025 12:49:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_124955.894c5a4e.md]]'
content_id: ebe5ffa0af904cfd1f3b0b11ab69993a667f12be7db81be95025958c1c93abc8
---

# API Specification: Playlist Concept

**Purpose:** support users in creating, managing, and sharing ordered collections of items

***

## API Endpoints

### POST /api/Playlist/createPlaylist

**Description:** Creates a new playlist for an owner with a specified name.

**Requirements:**

* `name` is not empty

**Effects:**

* creates a new Playlist `p`
* sets `p.owner` to `owner`
* sets `p.name` to `name`
* sets `p.createdAt` and `p.lastModified` to the current time
* returns `p` as `playlist`

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

### POST /api/Playlist/renamePlaylist

**Description:** Renames an existing playlist.

**Requirements:**

* the `playlist` exists
* `newName` is not empty

**Effects:**

* updates the `name` of the `playlist` to `newName`
* updates `lastModified` to the current time

**Request Body:**

```json
{
  "playlist": "string",
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

### POST /api/Playlist/deletePlaylist

**Description:** Deletes a playlist and all its associated items.

**Requirements:**

* the `playlist` exists

**Effects:**

* deletes the `playlist` and all its associated `playlistItems`

**Request Body:**

```json
{
  "playlist": "string"
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

### POST /api/Playlist/addItemToPlaylist

**Description:** Adds an item to a playlist at the end.

**Requirements:**

* the `playlist` exists
* the `item` is not already in the `playlist`

**Effects:**

* adds the `item` to the `playlist` at the end
* sets its `order` to be the next available integer
* sets `createdAt` to the current time
* updates `playlist.lastModified`
* returns the ID of the new playlist item as `playlistItem`

**Request Body:**

```json
{
  "playlist": "string",
  "item": "string"
}
```

**Success Response Body (Action):**

```json
{
  "playlistItem": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Playlist/removeItemFromPlaylist

**Description:** Removes an item from a playlist and reorders subsequent items.

**Requirements:**

* the `playlist` exists
* the `item` is in the `playlist`

**Effects:**

* removes the `item` from the `playlist`
* updates the `order` of subsequent items
* updates `playlist.lastModified`

**Request Body:**

```json
{
  "playlist": "string",
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

### POST /api/Playlist/reorderPlaylistItem

**Description:** Reorders an item within a playlist to a new position.

**Requirements:**

* the `playlist` exists
* the `item` is in the `playlist`
* `newOrder` is a non-negative integer and within the bounds of the playlist size

**Effects:**

* updates the `order` of the `item` to `newOrder`, shifting other items as necessary
* updates `playlist.lastModified`

**Request Body:**

```json
{
  "playlist": "string",
  "item": "string",
  "newOrder": "number"
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

### POST /api/Playlist/\_getPlaylistById

**Description:** Returns the details of a specific playlist by its ID.

**Requirements:**

* the `playlist` exists

**Effects:**

* returns the details of the playlist: its owner, name, creation date, and last modified date

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
    "owner": "string",
    "name": "string",
    "createdAt": "string",
    "lastModified": "string"
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

### POST /api/Playlist/\_getPlaylistsByOwner

**Description:** Returns a list of playlists owned by a specific user.

**Requirements:**

* true

**Effects:**

* returns a list of playlists owned by the `owner`, including their IDs, names, creation dates, and last modified dates

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
    "name": "string",
    "createdAt": "string",
    "lastModified": "string"
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

**Description:** Returns all items in a playlist, ordered by their `order` property.

**Requirements:**

* the `playlist` exists

**Effects:**

* returns all items in the `playlist`, ordered by their `order` property, including their ID, order, and creation date

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
    "item": "string",
    "order": "number",
    "createdAt": "string"
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
