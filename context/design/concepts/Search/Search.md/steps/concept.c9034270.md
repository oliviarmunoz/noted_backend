---
timestamp: 'Mon Nov 24 2025 20:13:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_201355.14c4800b.md]]'
content_id: c90342706814e6d6edf1ae87a71882e49b69d616c321779686053409526055a9
---

# concept: MusicSearch \[User]

**purpose** allow users to discover music entities from a global catalog

**principle** when a user performs a search, the resulting items are captured in the state, replacing any previous results, allowing the user to inspect or select them.

**state**

```
a set of Users with
  a lastQuery String
  a lastSearchTime Number

a set of MusicSearches with
  an owner User
  a type of TRACK or ALBUM or ARTIST
  a externalId String
  a name String
  a description String
  a uri String
  a imageUrl String
```

**actions**

```
search (user: User, query: String)
  requires query is not empty
  effects 
    removes all Items where owner is user
    sets lastQuery of user to query
    updates lastSearchTime of user to now
    fetches results from external service
    creates new Items for actor based on results

clearSearch (user: User)
  requires true
  effects
    removes all Items where owner is user
    removes lastQuery of user
```
