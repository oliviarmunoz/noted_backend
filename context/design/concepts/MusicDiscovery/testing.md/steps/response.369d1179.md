---
timestamp: 'Mon Dec 01 2025 23:26:19 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_232619.345da438.md]]'
content_id: 369d11794ef5dd10a1294bb157744c163d7b008caf5be23430981d13959f7085
---

# response:

## Concept: MusicDiscovery \[User]

* **concept**: MusicDiscovery \[User]

* **purpose**: allow users to search for and retrieve specific music entities from a global catalog, creating a persistent local cache of discovered content.

* **principle**: a user can search for any kind of music item (track, album, artist), and the music information will be fetched from an external provider; this information will then be stored in a catalog; users may clear their search whenever they desire.

* **state**:
  * a set of MusicItems with
    * an externalId String
    * a name String
    * a uri String
    * a imageUrl String
    * an externalUrl String
    * a type of "track" or "album" or "artist"
  * a Tracks set of MusicItems with
    * a durationMs Number
    * an optional albumId MusicItem // Link to Album, internal ID
    * an optional artistId MusicItem // Link to primary Artist, internal ID
  * an Albums set of MusicItems with
    * a releaseDate String
    * an optional artistId MusicItem // Link to primary Artist, internal ID
    * a totalTracks Number
  * a Artists set of MusicItems with
    * an albums set of MusicItems // Internal IDs of albums by this artist
  * a set of Users with
    * a searchResults set of MusicItems // Internal IDs of music items from the last search

* **actions**:
  * `search` (user: User, query: String, type: String): (items: MusicItem\[])
    * **requires**: `query` is not empty. `type` is one of "track", "album", "artist", or a comma-separated combination.
    * **effects**: Fetches matches from provider. Upserts items into the `MusicItems` set (and appropriate subsets based on type), generating internal IDs. Replaces `user`'s `searchResults` with these internal item IDs. Returns the full `MusicItem` objects.
  * `clearSearch` (user: User)
    * **effects**: Removes all items from `user`'s `searchResults`.
  * `loadTrack` (externalId: String): (track: MusicItem)
    * **requires**: `externalId` is a valid track ID from the external provider.
    * **effects**: Fetches detailed track information from the provider. Upserts the track into `Tracks` subset (and `MusicItems`). Returns the full `Track` object.
  * `loadAlbum` (externalId: String): (album: MusicItem)
    * **requires**: `externalId` is a valid album ID from the external provider.
    * **effects**: Fetches detailed album information from the provider. Upserts the album into `Albums` subset (and `MusicItems`). Returns the full `Album` object.
  * `loadArtist` (externalId: String): (artist: MusicItem)
    * **requires**: `externalId` is a valid artist ID from the external provider.
    * **effects**: Fetches detailed artist information from the provider. Upserts the artist into `Artists` subset (and `MusicItems`). Returns the full `Artist` object.
  * `loadAlbumTracks` (albumId: MusicItem): (tracks: MusicItem\[])
    * **requires**: `albumId` refers to an existing album in the concept's state.
    * **effects**: Fetches tracks for the specified album from the provider. Upserts them into `Tracks` subset (and `MusicItems`), linking them to the `albumId`. Returns the full `Track` objects.
  * `loadArtistAlbums` (artistId: MusicItem): (albums: MusicItem\[])
    * **requires**: `artistId` refers to an existing artist in the concept's state.
    * **effects**: Fetches albums for the specified artist from the provider. Upserts them into `Albums` subset (and `MusicItems`), linking them to the `artistId`. Updates the `Artists` record for `artistId` with the new album associations. Returns the full `Album` objects.

* **queries**:
  * `_getSearchResults` (user: User): (items: MusicItem\[])
    * **effects**: Returns the set of `MusicItem` objects currently linked as `searchResults` for the given user.
  * `_getTrack` (externalId: String): (track: MusicItem)
    * **effects**: Returns the `Track` object with the given external ID, if it exists in the concept's state.
  * `_getAlbum` (externalId: String): (album: MusicItem)
    * **effects**: Returns the `Album` object with the given external ID, if it exists in the concept's state.
  * `_getArtist` (externalId: String): (artist: MusicItem)
    * **effects**: Returns the `Artist` object with the given external ID, if it exists in the concept's state.
  * `_getTracksByAlbum` (albumId: MusicItem): (tracks: MusicItem\[])
    * **effects**: Returns all `Track` objects that are linked to the given `albumId`.
  * `_getAlbumsByArtist` (artistId: MusicItem): (albums: MusicItem\[])
    * **effects**: Returns all `Album` objects that are linked to the given `artistId`.
  * `_getItem` (externalId: String): (item: MusicItem)
    * **effects**: Returns the generic `MusicItem` object (track, album, or artist) with the given external ID, if it exists.
  * `_getEntityFromId` (externalId: String): (musicEntity: MusicItem)
    * **effects**: Returns the generic `MusicItem` object (track, album, or artist) with the given external ID.
  * `_getEntityFromUri` (uri: String): (musicEntity: MusicItem)
    * **effects**: Returns the generic `MusicItem` object (track, album, or artist) with the given URI.

***
