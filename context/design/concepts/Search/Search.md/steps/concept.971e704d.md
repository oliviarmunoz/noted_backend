---
timestamp: 'Mon Nov 24 2025 18:42:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_184214.52af98fa.md]]'
content_id: 971e704dc9fd420dbab66b780c1084546f666cd3843863180bb8aa6b33a97516
---

# concept: SpotifySearch

**purpose** enable users to search for music and audio content on Spotify and retrieve structured information about specific results.

**principle** If a user searches for a specific song title, they are presented with a list of matching tracks, and they can then select a track from that list to view its full details. This process allows them to discover new music and learn more about existing content.

**state**
// The SpotifySearch concept primarily facilitates access to Spotify's API.
// Its state keeps track of recent search queries and their simplified results (Spotify IDs and types),
// allowing for a persistent record of user interaction with the search functionality.
a set of SearchInteractions with
\_id SearchID // Internal ID for this specific search session/interaction
query String // The search query text (e.g., "Need You Now")
searchType String // The type of content searched for (e.g., "track", "album", "artist", "all")
timestamp Number // Unix timestamp of when the search was performed

```
// SearchResultInfo captures the essential external identifiers needed to
// later fetch full details from Spotify. Each entry references a specific SearchInteraction.
a set of SearchResultInfos with
    _id ResultInfoID // Internal ID for this specific search result entry
    spotifyId String // The actual Spotify ID (e.g., "3JzYJjGg5FjGjHjGjHjGj")
    itemType String // The type of the item (e.g., "track", "album", "artist")
    searchRef SearchID // Reference to the SearchInteraction this result belongs to
```

**actions**
// Performs a search on Spotify and records the interaction.
// Returns a unique ID for this search interaction and a list of basic result identifiers.
search (query: String, type?: String) : (searchInteractionId: SearchID, results: {spotifyId: String, itemType: String}\[])
**requires** `query` is not empty.
**effects**
creates a new `SearchInteraction` `si` with a fresh `SearchID`;
sets `si.query` to `query`;
sets `si.searchType` to `type` (defaulting to "track,album,artist" if not provided);
sets `si.timestamp` to the current time;
calls `spotifyService.search` with `query` and `type`;
for each item in the `spotifyService` response (up to `limit` items, e.g., 20):
creates a new `SearchResultInfo` `sri` with a fresh `ResultInfoID`;
sets `sri.spotifyId` to the item's Spotify ID;
sets `sri.itemType` to the item's type (e.g., "track", "album", "artist");
sets `sri.searchRef` to `si._id`;
adds `sri` to the set of `SearchResultInfos` entities;
returns `si._id` as `searchInteractionId` and an array of objects `{spotifyId: sri.spotifyId, itemType: sri.itemType}` for all `sri` associated with `si`.

**queries**
// Retrieves details for a specific track from Spotify.
\_getTrackDetails (trackId: String) : (details: Object)
**requires** `trackId` is a valid Spotify track ID string.
**effects** calls `spotifyService.getTrack(trackId)` and returns the full JSON response from Spotify as `details`. If the ID is invalid or not found, returns `{error: "Track not found"}`.

```
// Retrieves details for a specific album from Spotify.
_getAlbumDetails (albumId: String) : (details: Object)
    **requires** `albumId` is a valid Spotify album ID string.
    **effects** calls `spotifyService.getAlbum(albumId)` and returns the full JSON response from Spotify as `details`. If the ID is invalid or not found, returns `{error: "Album not found"}`.

// Retrieves details for a specific artist from Spotify.
_getArtistDetails (artistId: String) : (details: Object)
    **requires** `artistId` is a valid Spotify artist ID string.
    **effects** calls `spotifyService.getArtist(artistId)` and returns the full JSON response from Spotify as `details`. If the ID is invalid or not found, returns `{error: "Artist not found"}`.

// Retrieves the tracks contained within a specific album from Spotify.
_getAlbumTracks (albumId: String) : (tracks: Object[])
    **requires** `albumId` is a valid Spotify album ID string.
    **effects** calls `spotifyService.getAlbumTracks(albumId)` and returns an array of track objects from Spotify as `tracks`. If the ID is invalid or not found, returns `{error: "Album not found or has no tracks"}`.

// Retrieves a list of search result information for a given search interaction.
_getSearchResults (searchInteractionId: SearchID) : (results: {spotifyId: String, itemType: String}[])
    **requires** a `SearchInteraction` with `searchInteractionId` exists.
    **effects** returns an array of objects `{spotifyId: sri.spotifyId, itemType: sri.itemType}` for all `SearchResultInfo` `sri` where `sri.searchRef` is `searchInteractionId`. Returns an empty array if no such search interaction or results are found.
```

***
