---
timestamp: 'Mon Dec 01 2025 20:17:51 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_201751.27fc5f2a.md]]'
content_id: f955dcda382ec7d7381f6e21797eec6192b48b5d68727b03ddf0566669f3bd35
---

# Concept: MusicDiscovery \[User]

**purpose** allow users to search for and retrieve specific music entities from a global catalog, creating a persistent local cache of discovered content.

**principle**
Users interact with the concept by searching for text or requesting specific items (tracks, albums, artists) by ID. The concept fetches this data from an external provider, stores it in a shared catalog (the state), and maintains a specific list of "active" search results for the user.

**state**

```ssf
a set of MusicEntities with
  an externalId String
  a type of TRACK or ALBUM or ARTIST
  a name String
  a uri String
  a imageUrl String
  a artistName String
  an externalURL String
  an optional description String
  an optional artistId String    // Links Albums/Tracks to an Artist
  an optional albumId String     // Links Tracks to an Album

a set of Users with
  a searchResults set of MusicEntities
```

**actions**

* **search** (user: User, query: String, type: String): (items: MusicEntity\[])
  * **requires**: `query` is not empty.
  * **effects**: Fetches matches from the external provider. Upserts (updates or inserts) these items into the `MusicEntities` set. Replaces the `user`'s `searchResults` with these items. Returns the items.

* **clearSearch** (user: User)
  * **effects**: Removes all items from the `user`'s `searchResults`.

* **loadTrack** (externalId: String): (track: MusicEntity)
  * **requires**: `externalId` is a valid track ID.
  * **effects**: Fetches the track details from the external provider. Upserts the track into `MusicEntities`. Returns the track.

* **loadAlbum** (externalId: String): (album: MusicEntity)
  * **requires**: `externalId` is a valid album ID.
  * **effects**: Fetches the album details from the external provider. Upserts the album into `MusicEntities`. Returns the album.

* **loadArtist** (externalId: String): (artist: MusicEntity)
  * **requires**: `externalId` is a valid artist ID.
  * **effects**: Fetches the artist details from the external provider. Upserts the artist into `MusicEntities`. Returns the artist.

* **loadAlbumTracks** (albumId: String): (tracks: MusicEntity\[])
  * **requires**: `albumId` refers to a valid album.
  * **effects**: Fetches the list of tracks for this album from the external provider. Upserts these tracks into `MusicEntities`, ensuring they are linked to the `albumId`. Returns the tracks.

* **loadArtistAlbums** (artistId: String): (albums: MusicEntity\[])
  * **requires**: `artistId` refers to a valid artist.
  * **effects**: Fetches the list of albums for this artist from the external provider. Upserts these albums into `MusicEntities`, ensuring they are linked to the `artistId`. Returns the albums.

**queries**

* **\_getSearchResults** (user: User): (items: MusicEntity\[])
  * **effects**: Returns the set of entities currently linked to the user in `searchResults`.

* **\_getTrack** (externalId: String): (track: MusicEntity)
  * **requires**: A track with this `externalId` exists in the local state.
  * **effects**: Returns the specific track entity.

* **\_getAlbum** (externalId: String): (album: MusicEntity)
  * **requires**: An album with this `externalId` exists in the local state.
  * **effects**: Returns the specific album entity.

* **\_getArtist** (externalId: String): (artist: MusicEntity)
  * **requires**: An artist with this `externalId` exists in the local state.
  * **effects**: Returns the specific artist entity.

* **\_getTracksByAlbum** (albumId: String): (tracks: MusicEntity\[])
  * **effects**: Returns all `MusicEntities` in the local state where `type` is "TRACK" and `albumId` matches the argument.

* **\_getAlbumsByArtist** (artistId: String): (albums: MusicEntity\[])
  * **effects**: Returns all `MusicEntities` in the local state where `type` is "ALBUM" and `artistId` matches the argument.

* **\_getEntityFromId** (externalId: String): (musicEntity: MusicEntity)
  * **effects**: Returns the `MusicEntity` with the given external id

* **\_getEntityFromUri** (uri: String): (musicEntity: MusicEntity)
  * **effects**: Returns the `MusicEntity` with the given external uri
