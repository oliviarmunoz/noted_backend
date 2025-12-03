---
timestamp: 'Mon Dec 01 2025 17:46:34 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_174634.66fc8e03.md]]'
content_id: 59540d284d4b9d317e1cd5446361493a05d77963c4c5a3878d97694faa4a4ae6
---

# concept: MusicDiscovery \[User]

**purpose** Enable the exploration of a global music catalog via domain-specific entities and maintain a persistent search context for the user.

**principle** Users perform text-based searches to populate a personal context of relevant music entities (tracks, albums, artists). Users can also traverse the catalog (e.g., finding albums by a specific artist), which caches these entities locally for use by other concepts.

**state**

* a set of Users with
  * a lastQuery String
  * a lastUpdated Date

* a set of MusicEntities with
  * an externalId String
  * a type of TRACK or ALBUM or ARTIST
  * a name String
  * a uri String
  * a imageUrl String
  * a description String
  * a artistName String

* a set of SearchResults with
  * a User
  * a MusicEntity

**actions**

* search (user: User, query: String): (musicEntities: MusicEntity\[])
  * **requires** query is not empty
  * **effects** updates `lastQuery` of user; fetches data from external provider; caches results as `MusicEntities`; replaces user's `SearchResults` with new results.

* getArtistAlbums (artistId: String): (albums: MusicEntity\[])
  * **requires** `artistId` is a valid external ID for an artist
  * **effects** fetches albums for that artist from provider; caches them as `MusicEntities`; returns them.

* loadEntityDetails (externalId: String, type: String): (musicEntity: MusicEntity)
  * **effects** fetches detailed info; updates the specific `MusicEntity`; returns it.

**queries**

* \_getSearchResults (user: User): (musicEntities: MusicEntity\[])
  * returns the music entities currently in the user's search context.

* \_getEntity (externalId: String): (musicEntity: MusicEntity)
  * returns a specific entity by its external ID if it exists in the cache.
