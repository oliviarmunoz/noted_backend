---
timestamp: 'Mon Nov 24 2025 18:50:21 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_185021.26a75bf9.md]]'
content_id: 7448e1a6013611fee17cfbf844627d58655172a76462694bc8c6d7f8536ab5e7
---

# concept: MusicSearch \[Actor]

**purpose** allow users to discover music entities from a global catalog

**principle** when an actor performs a search, the resulting items are captured in the state, replacing any previous results, allowing the actor to inspect or select them.

**state**

```
a set of Actors with
  a lastQuery String
  a lastSearchTime Number

a set of Items with
  an owner Actor
  a type of TRACK or ALBUM or ARTIST
  a externalId String
  a name String
  a description String
  a uri String
  a imageUrl String
```

**actions**

```
search (actor: Actor, query: String)
  requires query is not empty
  effects 
    removes all Items where owner is actor
    sets lastQuery of actor to query
    updates lastSearchTime of actor to now
    fetches results from external service
    creates new Items for actor based on results

clearSearch (actor: Actor)
  requires true
  effects
    removes all Items where owner is actor
    removes lastQuery of actor
```

**queries**

```
_getResults (actor: Actor)
  returns list of Items where owner is actor

_getLastSearch (actor: Actor)
  returns { query: String, time: Number } of actor
```
