---
timestamp: 'Mon Dec 01 2025 17:58:52 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_175852.1a024701.md]]'
content_id: 668b467307e7817b6e037ce091f60e9c61bd06860db617007bddea29641c4e55
---

# concept: MusicDiscovery

**purpose** Model a catalog of music entities (artists, albums, tracks) that can be explored and referenced by other parts of the system.

**principle** The system maintains a catalog of music entities. When a user requests information (like searching for a name or listing an artist's albums), the system retrieves the data from an external source, integrates it into the persistent catalog, and returns the entities.

**state**

* a set of MusicEntities with
  * an externalId String
  * a type of TRACK or ALBUM or ARTIST
  * a name String
  * a uri String
  * a imageUrl String
  * a artistName String
  * a description String

* // Note: No user-specific state. This is a shared catalog.

**actions**

* search (query: String, type: String): (items: MusicEntity\[])
  * **requires** query is not empty
  * **effects** fetches matches from external source; upserts matches into `MusicEntities`; returns the matches.

* getArtist (externalId: String): (artist: MusicEntity)
  * **requires** externalId exists
  * **effects** fetches artist details; upserts into `MusicEntities`; returns the artist.

* getArtistAlbums (artistId: String): (albums: MusicEntity\[])
  * **requires** artistId refers to a valid artist
  * **effects** fetches album list for artist; upserts albums into `MusicEntities`; returns the albums.

* getAlbumTracks (albumId: String): (tracks: MusicEntity\[])
  * **requires** albumId refers to a valid album
  * **effects** fetches track list for album; upserts tracks into `MusicEntities`; returns the tracks.

**queries**

* \_getEntity (externalId: String): (entity: MusicEntity)
  * returns the entity from the local catalog if it exists.
