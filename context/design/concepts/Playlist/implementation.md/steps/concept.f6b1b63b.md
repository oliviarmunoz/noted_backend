---
timestamp: 'Sun Nov 23 2025 12:56:49 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_125649.b16dd179.md]]'
content_id: f6b1b63be469c9baa2988b5b2ac6fa7461ad0e9cd4f70ede31d69963fe1c1d4d
---

# concept: Playlist \[User, Item]

**Purpose**: Enable users to establish and manage collections of items. \
**Principle**: A user can create a playlist; add items to a playlist; remove items from a playlist; and retrieve the items in a playlist.

**State**

* a set of **Playlists** with
  * a **playlistName** String
  * a **isPublic** Flag
  * a **user** User
  * a set of **items** Items

**Actions**

* `addItem(user: User, item: Item, playlist: playlistName)`
  * *Requires*: `playlistName` to be in set of playlists associated with the `user`.
  * *Effects*: Adds the `item` to the playlist.
* `deleteItem(user: User, item: Item, playlist: playlistName)`
  * *Requires*: `playlistName` is in set of playlists associated with the `user`.
  * *Effects*: Removes the `item` from the playlist.
* `createPlaylist(user: User, playlistName: String)`
  * *Requires*: `playlistName` to not already exist in set of playlists associated with the `user`.
  * *Effects*: Creates a new Playlist with the given information.
* `_getPlaylistItems(user: User, playlistName: String): Item[]`
  * *Requires*: `playlistName` is in set of playlists associated with the `user`.
  * *Effects*: Returns all items in this playlist.

*Note*: This concept will be used to implement the “Listen Later” and “Favorites” playlist. The user should only be able to add and remove items, while the backend will create those playlists upon user creation.
