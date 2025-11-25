---
timestamp: 'Mon Nov 24 2025 21:21:50 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_212150.e5c640ae.md]]'
content_id: adbec5ac231147bf377ba937e50d8c8b2e6a29797fd30e82796d994832b28c78
---

# concept: MusicDiscovery \[User]

**purpose** Enable the exploration of a global music catalog and the preservation of search context.

**principle** Users can search for any kind of music through the external spotify API. Once a user searches for a term, the system retains a list of matching entities for that user.

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
  * // Optional detailed fields
  * a releaseDate String
  * a durationMs Number
  * a artistName String

* a set of SearchResults with
  * a User
  * a MusicEntity

**actions**

* search (user: User, query: String): (musicEntities: MusicEntity\[])
  * **requires** query is not empty
  * **effects** updates lastQuery of user, removes all SearchResults for user, fetches data from external service, creates/updates MusicEntities based on results, creates SearchResults linking user to the new entities

* clearSearch (user: User): ()
  * **effects** removes all SearchResults where owner is user

* loadEntityDetails (externalId: String, type: String): (music: MusicEntity)
  * **requires** externalId is valid
  * **effects** fetches detailed info from external service, updates the specific MusicEntity with richer data (dates, popularity, etc.), and returns the corresponding MusicEntity

**queries**

* \_getSearchResults (user: User): (musicEntities: MusicEntity\[])
  * returns the music entities tied to the search results that correspond to the given user

* \_getEntityFromId (externalId: String): (musicEntity: MusicEntity)
  * returns the music entity with the given external id

* \_getEntityFromUri (uri: String): (musicEntity: MusicEntity)
  * returns the music entity with the given external uri

*Note*: This concept will be used as an interface for handling calls to the external Spotify API, specifically the search feature.
