---
timestamp: 'Mon Dec 01 2025 21:19:02 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_211902.d09329b7.md]]'
content_id: 644bf4e834d8ce75c57e08e37d97528c5b9a45a4e12afc689f2a007a5a4af4d5
---

# trace:

The following trace demonstrates how the **principle** of the `MusicDiscovery` concept is fulfilled by a sequence of actions, illustrating searching, caching, and clearing of search results.

1. **Given**: A user identified as `user:Alice`.
2. **Action**: User `user:Alice` searches for music, specifically a track.
   ```
   MusicDiscovery.search({ user: "user:Alice", query: "Need You Now", type: "track" })
   ```
3. **Result**: The concept fetches "Need You Now" (track) from Spotify.
   * The `MusicItems` collection now contains an entry for "Need You Now" (track), and its associated album and primary artist (if they weren't already cached).
   * The `Tracks` collection contains specific details for "Need You Now" (e.g., `durationMs`, `albumExternalId`, `artistExternalId`).
   * The `Albums` collection contains specific details for the album "Need You Now".
   * The `Artists` collection contains specific details for "Lady A".
   * The `Users` collection for "user:Alice" is updated, and its `searchResults` now holds the internal ID of the "Need You Now" track.
   * The action returns an array containing the `MusicItemOutput` for the discovered "Need You Now" track.
   ```json
   {
     "items": [
       {
         "id": "internal:track:...",
         "externalId": "spotify:track:...",
         "name": "Need You Now",
         "uri": "spotify:track:...",
         "imageUrl": "...",
         "externalUrl": "...",
         "type": "track",
         "durationMs": 240000,
         "albumExternalId": "spotify:album:...",
         "artistExternalId": "spotify:artist:..."
       }
     ]
   }
   ```
4. **Action**: User `user:Alice` now wants to clear their current search results to perform a new search.
   ```
   MusicDiscovery.clearSearch({ user: "user:Alice" })
   ```
5. **Result**: The user's `searchResults` are emptied.
   * The `Users` collection for "user:Alice" has its `searchResults` field reset to an empty array.
   * The previously cached music items ("Need You Now" track, album, artist) *remain* in the `MusicItems`, `Tracks`, `Albums`, and `Artists` collections, demonstrating the persistent local cache.
   * The action returns an empty dictionary, indicating success.
   ```json
   {}
   ```
6. **Action**: User `user:Alice` searches for a different music item, e.g., an artist.
   ```
   MusicDiscovery.search({ user: "user:Alice", query: "Taylor Swift", type: "artist" })
   ```
7. **Result**: The concept fetches "Taylor Swift" (artist) from Spotify.
   * The `MusicItems` collection now contains an entry for "Taylor Swift" (artist).
   * The `Artists` collection contains specific details for "Taylor Swift".
   * The `Users` collection for "user:Alice" is updated, and its `searchResults` now holds the internal ID of the "Taylor Swift" artist. The old "Need You Now" track is no longer in `searchResults`.
   * The action returns an array containing the `MusicItemOutput` for the discovered "Taylor Swift" artist.
   ```json
   {
     "items": [
       {
         "id": "internal:artist:...",
         "externalId": "spotify:artist:...",
         "name": "Taylor Swift",
         "uri": "spotify:artist:...",
         "imageUrl": "...",
         "externalUrl": "...",
         "type": "artist",
         "albums": [] // Initial state, to be populated by loadArtistAlbums
       }
     ]
   }
   ```
8. **Action**: The user now wants to load all albums by Taylor Swift to see her discography.
   ```
   MusicDiscovery.loadArtistAlbums({ artistId: "spotify:artist:..." }) // Using the externalId of Taylor Swift
   ```
9. **Result**: The concept fetches Taylor Swift's albums from Spotify.
   * Each discovered album is upserted into the `MusicItems` and `Albums` collections.
   * The `ArtistDoc` for Taylor Swift in the `Artists` collection is updated to include the external IDs of her albums in its `albums` array.
   * The action returns an array of `AlbumOutput` for Taylor Swift's albums.
   ```json
   {
     "albums": [
       { "id": "internal:album:...", "externalId": "spotify:album:...", "name": "Midnights", "type": "album", ... },
       { "id": "internal:album:...", "externalId": "spotify:album:...", "name": "1989 (Taylor's Version)", "type": "album", ... }
       // ... more albums
     ]
   }
   ```
