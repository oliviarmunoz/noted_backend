---
timestamp: 'Mon Dec 01 2025 17:37:50 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_173750.dc5a604a.md]]'
content_id: bea4748da2a27557c49aaf9cc56fcd1ce5451114921174d0f398e942905f20e4
---

# concept: MusicDiscovery \[User]

**purpose** Enable the exploration of a global music catalog via domain-specific entities (tracks, albums, artists) and preserve user search context.

**principle** Users search for music using text queries. The system retrieves matches from an external source, caches them as domain entities, and maintains a specific set of active search results for that user, allowing them to browse and select items.

**state**

* a set of Users with
  * a lastQuery String

* a set of MusicEntities with
  * an externalId String
  * a type of TRACK or ALBUM or ARTIST
  * a name String
  * a uri String
  * a imageUrl String
  * a description String
  * // Cached details
  * a releaseDate String
  * a artistName String

* a set of SearchResults with
  * a User
  * a MusicEntity

**actions**

* search (user: User, query: String): (musicEntities: MusicEntity\[])
  * **requires** query is not empty
  * **effects** updates `lastQuery` of user; fetches data from external provider; creates or updates `MusicEntities` based on results (idempotent by `externalId`); removes old `SearchResults` for user; creates new `SearchResults` linking user to the found entities; returns the found entities.

* clearSearch (user: User): ()
  * **effects** sets `lastQuery` of user to null; removes all `SearchResults` where owner is user.

* loadEntityDetails (externalId: String, type: String): (musicEntity: MusicEntity)
  * **requires** `externalId` is valid
  * **effects** fetches detailed info from external provider; updates the specific `MusicEntity` with richer data; returns the updated entity.

**queries**

* \_getSearchResults (user: User): (musicEntities: MusicEntity\[])
  * returns the music entities currently linked to the user via `SearchResults`.

* \_getEntityByExternalId (externalId: String): (musicEntity: MusicEntity)
  * returns the music entity matching the external service identifier.
