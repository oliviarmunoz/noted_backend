---
timestamp: 'Mon Dec 01 2025 17:36:57 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_173657.df2a95bc.md]]'
content_id: 5d451c8d21b30e123212e1f5cda3e1c10f1f840bea2bb72014597ddc646da752
---

# prompt: here's the feedback i received, adjust this concept:

1. Don’t make a “Spotify Integration” concept that just wraps the API. A concept that whose only purpose is basically “wrap Spotify endpoints” is not what we want in this course. Instead of a concept that mirrors the Spotify Web API, we want a concept that has:

Decoupling from Spotify. Your app should talk to a music domain concept (tracks, albums, artists, etc.), not directly to “Spotify.” In principle, you should be able to swap Spotify for another service with minimal changes outside that concept.
Coherent functionality. The concept should embody meaningful app-level functionality, not just be a thin wrapper around HTTP calls. It should expose things like “find an artist” or “get albums for this artist,” not “call GET /v1/search with these params.”
No conflation of concerns. The concept should focus on catalog/search behavior, not mix in unrelated responsibilities (e.g., playback, reviews, user social graph, etc.).
2\. You can incorporate this within “MusicDiscovery” concept.  You already have a MusicDiscovery concept whose purpose is to provide information about tracks, artists, albums, etc. Then, this concept should:

Define your domain objects (Track, Album, Artist, etc).
Expose granular queries:
e.g. “find an artist by name”,
“get all albums of an artist”,
“get basic info about a track”,
“get a human-readable description of an album”.
Internally make the Spotify Web API calls needed to answer those queries.
So: all Spotify API calls should happen inside this MusicDiscovery concept.

For example:

·         MusicDiscovery.search(user, query) → internally calls Spotify search, builds/updates your MusicEntities, and stores the search results for that user.

·         MusicDiscovery.loadEntityDetails(externalId, type) → internally calls the appropriate Spotify endpoint, enriches the MusicEntity, and returns it.

Other concepts (Review, Playlist, Friending, etc.) should only ever see your domain objects (Items / MusicEntities), not raw Spotify responses.

3. About lastQuery and search context. We also wanted to point out that you’re storing lastQuery in MusicDiscovery. That can be OK if you see this concept as “music catalog + search context per user.” If you find lastQuery drifting into UI-ish behavior (e.g., things that are purely for how the frontend looks), you could separate that into another concept later. For now it’s not a big problem, just something to be conscious about: keep each concept’s principle tight.

As a summary:

Drop the “Spotify Integration” concept as a standalone thing.
Put all Spotify Web API calls inside MusicDiscovery.
Make MusicDiscovery expose app-level queries like “find tracks by query”, “get albums for this artist”, “get details for this entity”, etc.
Keep other concepts (Review, Playlist, etc.) talking only to MusicDiscovery via those queries, not to Spotify directly.
