---
timestamp: 'Sun Dec 07 2025 19:28:09 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251207_192809.28e09019.md]]'
content_id: d5929fbd98ceeade41c4af298ee35214c2fab1d92ef134b4b3500b08cf2f77ec
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
* `deletePlaylist (user: User, playlistName: String)`
  * *Requires*: A playlist with the given `playlistName` must exist for the `user`.
  * *Effects*: Deletes the specified playlist.
* `_getPlaylistItems(user: User, playlistName: String): Item[]`
  * *Requires*: `playlistName` is in set of playlists associated with the `user`.
  * *Effects*: Returns all items in this playlist.
* `_getUserPlaylists (user: User): (playlistName: String, isPublic: Flag, playlistId: Playlist, items: Item[])[]`
  * Effects: Returns all playlists that the given `user` owns.

*Note*: This concept will be used to implement the “Listen Later” and “Favorites” playlist. The user should only be able to add and remove items, while the backend will create those playlists upon user creation.
