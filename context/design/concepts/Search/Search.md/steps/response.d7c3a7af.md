---
timestamp: 'Mon Nov 24 2025 20:14:56 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_201456.7df8f783.md]]'
content_id: d7c3a7aff61d0773bb06d4b5c1710cb9261cedcd67350918fe954324e9961a5f
---

# response:

Here is the updated concept design. To fulfill the requirement of getting specific details (like album tracks) within the constraints of Concept Design (where **Queries** only read database state and **Actions** perform I/O and mutation), I have renamed the concept to `MusicDiscovery`.

The pattern used here is **Load (Action) -> Read (Query)**. You must call an action (e.g., `loadAlbumTracks`) to fetch data from Spotify and cache it in the concept's state before you can query it.
