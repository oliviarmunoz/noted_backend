[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

[@api-extraction-from-spec](../../tools/api-extraction-from-spec.md)

[@concept-definition](Playlist.md)

[@concept-implementation](implementation.md)

# prompt: generate the API documentation for the Playlist concept, use the implementation reference
# response:

# API Specification: Playlist Concept

**Purpose:** Enable users to establish and manage collections of items.

---

## API Endpoints

### POST /api/Playlist/createPlaylist

**Description:** Creates a new playlist for a user.

**Requirements:**
- A playlist with the given `playlistName` must not already exist for the `user`.

**Effects:**
- Creates a new Playlist associated with the `user`, with the given `playlistName` and an empty `items` list; returns the ID of the newly created playlist.

**Request Body:**
```json
{
  "user": "ID",
  "playlistName": "string"
}
```

**Success Response Body (Action):**
```json
{
  "playlist": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Playlist/deletePlaylist

**Description:** Deletes a specific playlist owned by a user.

**Requirements:**
- A playlist with the given `playlistName` must exist for the `user`.

**Effects:**
- Deletes the specified playlist.

**Request Body:**
```json
{
  "user": "ID",
  "playlistName": "string"
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

---

### POST /api/Playlist/addItem

**Description:** Adds an item to an existing playlist owned by a user.

**Requirements:**
- A playlist with the given `playlistName` must exist for the `user`.
- The `item` must not already be present in that playlist.

**Effects:**
- Adds the `item` to the specified playlist's list of items.

**Request Body:**
```json
{
  "user": "ID",
  "item": "ID",
  "playlistName": "string"
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

---

### POST /api/Playlist/deleteItem

**Description:** Removes an item from an existing playlist owned by a user.

**Requirements:**
- A playlist with the given `playlistName` must exist for the `user`.
- The `item` must be present in that playlist.

**Effects:**
- Removes the `item` from the specified playlist's list of items.

**Request Body:**
```json
{
  "user": "ID",
  "item": "ID",
  "playlistName": "string"
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

---

### POST /api/Playlist/_getPlaylistItems

**Description:** Retrieves all items contained within a specific playlist owned by a user.

**Requirements:**
- A playlist with the given `playlistName` must exist for the `user`.

**Effects:**
- Returns an array of dictionaries, where each dictionary contains the `item` ID from the specified playlist.

**Request Body:**
```json
{
  "user": "ID",
  "playlistName": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "item": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Playlist/_getUserPlaylists

**Description:** Retrieves all playlists owned by a specific user.

**Requirements:**
- The `user` exists (implicitly, as `User` is a generic ID).

**Effects:**
- Returns an array of dictionaries, each representing a playlist owned by the `user`, including its name, public status, ID, and contained items.

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "playlistName": "string",
    "isPublic": "boolean",
    "playlistId": "ID",
    "items": ["ID"]
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---