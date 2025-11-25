---
timestamp: 'Mon Nov 24 2025 20:14:56 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_201456.7df8f783.md]]'
content_id: ac046a3618cadf4af89e8a9e87743e4edd618221a3ffdf5041c28dc21c18c40e
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
