---
timestamp: 'Mon Nov 24 2025 20:29:39 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_202939.f05900cc.md]]'
content_id: 529dd4b4c06ff5f249aada5973d1749306108a30b03178aacbe8e687dd4ec841
---

# concept: MusicDiscovery \[User]

**purpose** allow users to search for, browse, and inspect details of music entities from a global catalog

**principle**
When a user searches, results are cached temporarily for that user. If a user wants to explore a specific item (like an album), they explicitly load the details, which populates the internal catalog with the connected entities (like tracks), making them available for viewing.

**state**

```
a set of Users with
  a lastQuery String

// The catalog of all known/cached music items
a set of MusicEntities with
  an externalId String
  a type of TRACK or ALBUM or ARTIST
  a name String
  a uri String
  a imageUrl String
  a description String
  // Optional detailed fields
  a releaseDate String
  a durationMs Number
  a artistName String

// Transient search results for a user
a set of SearchResults with
  a User
  a MusicEntity

// Structural relationship between albums and tracks
a set of AlbumTracks with
  an album MusicEntity
  a track MusicEntity
  an order Number
```

**actions**

```
search (user: User, query: String)
  requires query is not empty
  effects 
    updates lastQuery of user
    removes all SearchResults for user
    fetches data from external service
    creates/updates MusicEntities based on results
    creates SearchResults linking user to the new entities

clearSearch (user: User)
  requires true
  effects
    removes all Items where owner is user
    removes lastQuery of user

loadAlbumTracks (albumExternalId: String)
  requires albumExternalId is valid
  effects
    fetches track list from external service
    creates/updates MusicEntities for the tracks
    creates AlbumTracks linking the album to the tracks
    
loadEntityDetails (externalId: String, type: String)
  requires externalId is valid
  effects
    fetches detailed info from external service
    updates the specific MusicEntity with richer data (dates, popularity, etc.)
```

**queries**

```
_getSearchResults (user: User)
  returns list of { entity: MusicEntity }

_getAlbumTracks (albumExternalId: String)
  returns list of { track: MusicEntity, order: Number }

_getEntity (externalId: String)
  returns { entity: MusicEntity }
```
