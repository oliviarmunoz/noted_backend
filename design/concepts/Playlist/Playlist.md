[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

# concept: Playlist [User, Item]

**Purpose**: Enable users to establish and manage collections of items. \
**Principle**: A user can create a playlist; add items to a playlist; remove items from a playlist; and retrieve the items in a playlist.

**State**

- a set of **Playlists** with
  - a **playlistName** String
  - a **isPublic** Flag
  - a **user** User
  - a set of **items** Items

**Actions**

- `addItem(user: User, item: Item, playlist: playlistName)`
  - _Requires_: `playlistName` to be in set of playlists associated with the `user`.
  - _Effects_: Adds the `item` to the playlist.
- `deleteItem(user: User, item: Item, playlist: playlistName)`
  - _Requires_: `playlistName` is in set of playlists associated with the `user`.
  - _Effects_: Removes the `item` from the playlist.
- `createPlaylist(user: User, playlistName: String)`
  - _Requires_: `playlistName` to not already exist in set of playlists associated with the `user`.
  - _Effects_: Creates a new Playlist with the given information.
- `_getPlaylistItems(user: User, playlistName: String): Item[]`
  - _Requires_: `playlistName` is in set of playlists associated with the `user`.
  - _Effects_: Returns all items in this playlist.

_Note_: This concept will be used to implement the “Listen Later” and “Favorites” playlist. The user should only be able to add and remove items, while the backend will create those playlists upon user creation.