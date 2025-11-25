---
timestamp: 'Mon Nov 24 2025 18:50:21 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_185021.26a75bf9.md]]'
content_id: a4cbcead84f70e541cd9bd60208626c1081cdb00d4b8de34884fe1a9f79d0996
---

# solution: Optimistic State & Debouncing

In a full production environment, we might separate the "request to search" from the "execution of search" using a queue. However, adhering to the Concept Design structure where actions are atomic units of behavior:

1. We maintain the atomicity: The action does not complete until the search is done.
2. Clients (the UI) should implement debouncing on the `search` action trigger.
3. The `MusicSearch` concept implementation caches the result in MongoDB. This allows subsequent *queries* (`_getResults`) to be extremely fast and not hit the API, fulfilling the principle that the state "holds" the results for inspection.

No code changes are required for the concept itself, as it correctly models the dependency on the external service as part of the action's cost.
