---
timestamp: 'Mon Dec 01 2025 18:10:23 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_181023.70ff337a.md]]'
content_id: e4a99f22dfdca62a66ebf26c1b11c63f266f0bb4d9118e6ce3e395cf383843ab
---

# response:

Here is the refined **Concept Definition**.

To align with the feedback and the capabilities of `spotify.ts`, I have explicitly defined **Actions** for retrieving specific entities (Tracks, Albums, Artists).

**Note on "Queries" vs "Actions":** In Concept Design, if a function calls an external API (Spotify) and saves that data to your database (caches it), it is technically an **Action** because it changes the state of the system. I have defined `loadTrack`, `loadAlbum`, etc., as actions to handle the "fetch from Spotify" logic. I have paired them with corresponding **Queries** to read that data once it is stored.
