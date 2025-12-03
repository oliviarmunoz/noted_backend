---
timestamp: 'Mon Dec 01 2025 18:01:16 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_180116.64d69c6d.md]]'
content_id: 467097bff34512f975bfd52d190cb07e2bceee4932a924593b8e7bfa07fa2c72
---

# Concept: MusicDiscovery \[User]

**purpose** enable the discovery and retrieval of music information from a global catalog

**principle**
When a user searches for music, the system retrieves matching items (tracks, albums, or artists) from an external source and preserves them as the user's current search context. Users can then inspect specific items to load more detailed relationships (such as the tracks within an album or the albums by an artist) into the catalog.

**state**

```ssf
a set of MusicEntities with
  an externalId String
  a type of TRACK or ALBUM or ARTIST
  a name String
  a uri String
  a imageUrl String
  a description String
  an optional artistId String    // Used to link Albums/Tracks to an Artist
  an optional albumId String     // Used to link Tracks to an Album

a set of Users with
  a searchResults set of MusicEntities
```

**actions**

* **search** (user: User, query: String, type: String)
  * **requires**: `query` is not empty.
  * **effects**: Fetches matching items from the external provider. Updates the `MusicEntities` catalog with these items. Replaces the `user`'s `searchResults` with these new items.

* **clearSearch** (user: User)
  * **effects**: Removes all items from the `user`'s `searchResults`.

* **loadRelated** (entityId: String, relationType: String)
  * **purpose**: Fetch granular data that might not be in the initial search (e.g., "Get all albums for this artist").
  * **requires**: `entityId` corresponds to a valid existing entity.
  * **effects**: Fetches the related items (e.g., if `entityId` is an Artist and `relationType` is "ALBUMS", fetches that artist's albums). Upserts these items into `MusicEntities`. (Note: This does *not* change the user's current `searchResults`, it just augments the catalog).

**queries**

* **\_getSearchResults** (user: User): (items: MusicEntity\[])
  * **effects**: Returns the set of entities currently linked to the user in `searchResults`.

* **\_getEntity** (externalId: String): (item: MusicEntity)
  * **effects**: Returns the specific entity from the catalog matching the ID.

* **\_getAlbumsByArtist** (artistId: String): (albums: MusicEntity\[])
  * **effects**: Returns all `MusicEntities` in the catalog where `type` is "ALBUM" and `artistId` matches the argument.

* **\_getTracksByAlbum** (albumId: String): (tracks: MusicEntity\[])
  * **effects**: Returns all `MusicEntities` in the catalog where `type` is "TRACK" and `albumId` matches the argument.
