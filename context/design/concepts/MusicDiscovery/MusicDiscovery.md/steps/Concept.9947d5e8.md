---
timestamp: 'Mon Dec 01 2025 20:18:31 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_201831.6094b4d3.md]]'
content_id: 9947d5e89f1a3df472cb6b71ca37145c84814121c263756cd391f89504e6cdca
---

# Concept: MusicDiscovery \[User]

**purpose** allow users to search for and retrieve specific music entities from a global catalog, creating a persistent local cache of discovered content.

**principle**
Users interact with the concept by searching for text or requesting specific items. The concept fetches data from an external provider and stores it in a catalog hierarchy: generic items for search display, and specialized subsets (Tracks, Albums, Artists) for detailed views.

**state**

```ssf
a set of MusicItems with
  an externalId String
  a name String
  a uri String
  a imageUrl String
  an externalUrl String

a Tracks set of MusicItems with
  a durationMs Number
  an explicit Flag
  an albumId String       // Link to Album
  an artistId String      // Link to primary Artist

a Albums set of MusicItems with
  a releaseDate String
  an artistId String      // Link to primary Artist
  a totalTracks Number

a Artists set of MusicItems with
  a popularity Number
  a genres set of String

a set of Users with
  a searchResults set of MusicItems
```

**actions**

* **search** (user: User, query: String, type: String): (items: MusicItem\[])
  * **requires**: `query` is not empty.
  * **effects**: Fetches matches from provider. Upserts items into the `MusicItems` set (and appropriate subsets based on type). Replaces `user`'s `searchResults` with these items. Returns the items.

* **clearSearch** (user: User)
  * **effects**: Removes all items from `user`'s `searchResults`.

* **loadTrack** (externalId: String): (track: Track)
  * **requires**: `externalId` is a valid track ID.
  * **effects**: Fetches details. Upserts into `Tracks` subset. Returns the track.

* **loadAlbum** (externalId: String): (album: Album)
  * **requires**: `externalId` is a valid album ID.
  * **effects**: Fetches details. Upserts into `Albums` subset. Returns the album.

* **loadArtist** (externalId: String): (artist: Artist)
  * **requires**: `externalId` is a valid artist ID.
  * **effects**: Fetches details. Upserts into `Artists` subset. Returns the artist.

* **loadAlbumTracks** (albumId: String): (tracks: Track\[])
  * **requires**: `albumId` refers to a valid album.
  * **effects**: Fetches tracks for the album. Upserts them into `Tracks` subset (linking them to the `albumId`). Returns the tracks.

* **loadArtistAlbums** (artistId: String): (albums: Album\[])
  * **requires**: `artistId` refers to a valid artist.
  * **effects**: Fetches albums for the artist. Upserts them into `Albums` subset. Returns the albums.

**queries**

* **\_getSearchResults** (user: User): (items: MusicItem\[])
  * **effects**: Returns the set of `MusicItems` currently linked to the user.

* **\_getTrack** (externalId: String): (track: Track)
  * **requires**: Item exists in `Tracks` subset.
  * **effects**: Returns the track.

* **\_getAlbum** (externalId: String): (album: Album)
  * **requires**: Item exists in `Albums` subset.
  * **effects**: Returns the album.

* **\_getArtist** (externalId: String): (artist: Artist)
  * **requires**: Item exists in `Artists` subset.
  * **effects**: Returns the artist.

* **\_getTracksByAlbum** (albumId: String): (tracks: Track\[])
  * **effects**: Returns all items in `Tracks` where the `albumId` matches.

* **\_getAlbumsByArtist** (artistId: String): (albums: Album\[])
  * **effects**: Returns all items in `Albums` where the `artistId` matches.

* **\_getItem** (externalId: String): (item: MusicItem)
  * **effects**: Returns the generic `MusicItem` (useful if you don't know the type yet).
