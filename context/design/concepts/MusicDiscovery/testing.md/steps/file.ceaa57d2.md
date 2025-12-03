---
timestamp: 'Mon Dec 01 2025 23:34:01 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_233401.6f6b748d.md]]'
content_id: ceaa57d2a1488c1d4b1dea7a2f099ce61fc3dc516029cc591c676c5ef80f3f70
---

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MusicDiscoveryConcept from "./MusicDiscoveryConcept.ts";
import { spotifyService } from "@utils/spotify.ts"; // Ensure spotifyService is imported

// Assume these are external User IDs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

// Mock SpotifyService for deterministic and fast testing
// This requires a bit of manipulation since spotifyService is a singleton.
// For a real scenario, dependency injection would be preferred.
// Here, we'll temporarily override methods.
const originalSpotifyService = { ...spotifyService }; // Save original methods

Deno.test.beforeEach(() => {
  // Reset mocks before each test
  Object.assign(spotifyService, originalSpotifyService);
});

Deno.test("Principle: User searches, items are cached, user clears search", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("--- Principle Test Started ---");

    // Mock Spotify search response for tracks
    spotifyService.search = async ({ query, type }) => {
      console.log(`Mocking Spotify search for query: '${query}', type: '${type}'`);
      if (query === "Imagine" && type === "track") {
        return {
          tracks: {
            items: [{
              id: "spotify-track-imagine",
              name: "Imagine",
              uri: "spotify:track:imagine",
              external_urls: { spotify: "http://spotify.com/imagine" },
              album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
              artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
              duration_ms: 181000,
            }],
          },
        };
      }
      return { tracks: { items: [] } };
    };

    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "spotify-track-imagine") {
        return {
          id: "spotify-track-imagine",
          name: "Imagine",
          uri: "spotify:track:imagine",
          external_urls: { spotify: "http://spotify.com/imagine" },
          album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          duration_ms: 181000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    // Mock Spotify getAlbum response (minimal for _upsertAlbum)
    spotifyService.getAlbum = async (id: string) => {
      console.log(`Mocking Spotify getAlbum for id: '${id}'`);
      if (id === "spotify-album-imagine") {
        return {
          id: "spotify-album-imagine",
          name: "Imagine",
          uri: "spotify:album:imagine",
          external_urls: { spotify: "http://spotify.com/imagine_album" },
          images: [{ url: "http://img.com/imagine_album.jpg" }],
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          release_date: "1971-09-09",
          total_tracks: 10,
        };
      }
      throw new Error("Album not found in mock.");
    };

    // Mock Spotify getArtist response (minimal for _upsertArtist)
    spotifyService.getArtist = async (id: string) => {
      console.log(`Mocking Spotify getArtist for id: '${id}'`);
      if (id === "spotify-artist-johnlennon") {
        return {
          id: "spotify-artist-johnlennon",
          name: "John Lennon",
          uri: "spotify:artist:johnlennon",
          external_urls: { spotify: "http://spotify.com/johnlennon" },
          images: [{ url: "http://img.com/johnlennon.jpg" }],
        };
      }
      throw new Error("Artist not found in mock.");
    };

    await t.step("User A searches for 'Imagine' (track)", async () => {
      const searchResult = await musicDiscovery.search({ user: userA, query: "Imagine", type: "track" });
      
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      // TypeScript now knows `searchResult` is `{ items: MusicItemDoc[] }`

      assertEquals(searchResult.items.length, 1, "Should find one track.");
      const foundTrack = searchResult.items[0];
      assertExists(foundTrack._id);
      assertEquals(foundTrack.name, "Imagine");
      assertEquals(foundTrack.externalId, "spotify-track-imagine");

      console.log("Verifying cached item in musicItems collection.");
      const cachedItem = await musicDiscovery._getItem({ externalId: "spotify-track-imagine" });
      assertEquals(cachedItem.length, 1, "Track should be cached in musicItems.");
      assertEquals(cachedItem[0].item.name, "Imagine");

      console.log("Verifying cached item in tracks subset collection.");
      const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-imagine" });
      assertEquals(cachedTrack.length, 1, "Track should be cached in tracks subset.");
      assertEquals(cachedTrack[0].track.name, "Imagine");

      console.log("Verifying user A's search results.");
      const userASearchResults = await musicDiscovery._getSearchResults({ user: userA });
      assertEquals(userASearchResults.items.length, 1, "User A's search results should contain 1 item.");
      assertEquals(userASearchResults.items[0].name, "Imagine");
    });

    await t.step("User A clears their search", async () => {
      const clearResult = await musicDiscovery.clearSearch({ user: userA });
      // clearResult is Promise<Empty | { error: string }>, but clearSearch should always succeed.
      if ("error" in clearResult) {
        throw new Error(`Clearing search unexpectedly failed: ${clearResult.error}`);
      }
      assertEquals("error" in clearResult, false, "Clearing search should not return an error.");

      console.log("Verifying user A's search results are empty after clearing.");
      const clearedSearchResults = await musicDiscovery._getSearchResults({ user: userA });
      assertEquals(clearedSearchResults.items.length, 0, "User A's search results should be empty.");
    });

    console.log("--- Principle Test Finished ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search handles empty query requirement", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("Trace: Attempting to search with an empty query.");
    const result = await musicDiscovery.search({ user: userA, query: "", type: "track" });
    assertEquals("error" in result, true, "Search with empty query should return an error.");
    assertEquals((result as { error: string }).error, "Query cannot be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search upserts various types and updates user results", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify smartSearch response for mixed types
    spotifyService.smartSearch = async (query: string) => {
      console.log(`Mocking Spotify smartSearch for query: '${query}'`);
      if (query === `"All My Life"`) {
        return {
          tracks: {
            items: [{
              id: "spotify-track-allmylife",
              name: "All My Life",
              uri: "spotify:track:allmylife",
              external_urls: { spotify: "http://spotify.com/allmylife" },
              album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] },
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              duration_ms: 263000,
            }],
          },
          albums: {
            items: [{
              id: "spotify-album-thecolourandtheshape",
              name: "The Colour And The Shape",
              uri: "spotify:album:thecolourandtheshape",
              external_urls: { spotify: "http://spotify.com/thecolourandtheshape" },
              images: [{ url: "http://img.com/album_color.jpg" }],
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              release_date: "1997-05-20",
              total_tracks: 13,
            }],
          },
          artists: {
            items: [{
              id: "spotify-artist-foofighters",
              name: "Foo Fighters",
              uri: "spotify:artist:foofighters",
              external_urls: { spotify: "http://spotify.com/foofighters" },
              images: [{ url: "http://img.com/foofighters.jpg" }],
            }],
          },
        };
      }
      return { tracks: { items: [] }, albums: { items: [] }, artists: { items: [] } };
    };

    // Mock necessary get* calls for upserts
    spotifyService.getTrack = async (id) => (id === "spotify-track-allmylife" ? { id, name: "All My Life", uri: "spotify:track:allmylife", duration_ms: 263000, album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] }, artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] } : Promise.reject(new Error("Mock getTrack not found")));
    spotifyService.getAlbum = async (id) => {
      if (id === "spotify-album-allmylife") return { id, name: "All My Life", uri: "spotify:album:allmylife", release_date: "2002-10-22", total_tracks: 11, images: [{ url: "http://img.com/album.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      if (id === "spotify-album-thecolourandtheshape") return { id, name: "The Colour And The Shape", uri: "spotify:album:thecolourandtheshape", release_date: "1997-05-20", total_tracks: 13, images: [{ url: "http://img.com/album_color.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => (id === "spotify-artist-foofighters" ? { id, name: "Foo Fighters", uri: "spotify:artist:foofighters", images: [{ url: "http://img.com/foofighters.jpg" }] } : Promise.reject(new Error("Mock getArtist not found")));

    await t.step("User B searches for 'All My Life' across all types", async () => {
      const searchResult = await musicDiscovery.search({ user: userB, query: "All My Life", type: "track,album,artist" });
      
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      // TypeScript now knows `searchResult` is `{ items: MusicItemDoc[] }`

      assertEquals(searchResult.items.length, 3, "Should find one track, one album, one artist.");

      // Verify types
      assertExists(searchResult.items.find(item => item.name === "All My Life" && item.type === "track"));
      assertExists(searchResult.items.find(item => item.name === "The Colour And The Shape" && item.type === "album"));
      assertExists(searchResult.items.find(item => item.name === "Foo Fighters" && item.type === "artist"));

      // Verify cached items
      const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-allmylife" });
      assertEquals(cachedTrack.length, 1);
      const cachedAlbum = await musicDiscovery._getAlbum({ externalId: "spotify-album-thecolourandtheshape" });
      assertEquals(cachedAlbum.length, 1);
      const cachedArtist = await musicDiscovery._getArtist({ externalId: "spotify-artist-foofighters" });
      assertEquals(cachedArtist.length, 1);

      // Verify user's search results
      const userBSearchResults = await musicDiscovery._getSearchResults({ user: userB });
      assertEquals(userBSearchResults.items.length, 3, "User B's search results should contain 3 items.");
      assertArrayIncludes(userBSearchResults.items.map(i => i.name), ["All My Life", "The Colour And The Shape", "Foo Fighters"]);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadTrack loads and caches a specific track", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "specific-track-id") {
        return {
          id: "specific-track-id",
          name: "Bohemian Rhapsody",
          uri: "spotify:track:bohemian",
          external_urls: { spotify: "http://spotify.com/bohemian" },
          album: { id: "album-night", name: "A Night at the Opera", images: [{ url: "http://img.com/opera.jpg" }] },
          artists: [{ id: "artist-queen", name: "Queen" }],
          duration_ms: 354000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    spotifyService.getAlbum = async (id) => {
      if (id === "album-night") return { id, name: "A Night at the Opera", uri: "spotify:album:opera", release_date: "1975-11-21", total_tracks: 12, images: [{ url: "http://img.com/opera.jpg" }], artists: [{ id: "artist-queen", name: "Queen" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === "artist-queen") return { id, name: "Queen", uri: "spotify:artist:queen", images: [{ url: "http://img.com/queen.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    await t.step("Loading a specific track 'Bohemian Rhapsody'", async () => {
      const result = await musicDiscovery.loadTrack({ externalId: "specific-track-id" });
      
      if ("error" in result) {
        throw new Error(`Loading track unexpectedly failed: ${result.error}`);
      }
      // TypeScript now knows `result` is `{ track: TrackDoc }`
      const { track } = result; // No need for `as { track: ... }` cast

      assertEquals(track.name, "Bohemian Rhapsody");
      assertEquals(track.type, "track");
      assertExists(track._id);

      console.log("Verifying track is cached by external ID.");
      const cached = await musicDiscovery._getTrack({ externalId: "specific-track-id" });
      assertEquals(cached.length, 1);
      assertEquals(cached[0].track.name, "Bohemian Rhapsody");
    });

    await t.step("Attempting to load a non-existent track", async () => {
      const errorResult = await musicDiscovery.loadTrack({ externalId: "non-existent-track" });
      assertEquals("error" in errorResult, true, "Loading non-existent track should fail.");
    });
  } finally {
    await client.close();
  }
});


Deno.test("Action: loadAlbumTracks loads and links tracks to an album", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    const albumExternalId = "album-darksideofmoon";
    const artistExternalId = "artist-pinkfloyd";

    spotifyService.getAlbum = async (id) => {
      if (id === albumExternalId) return { id, name: "Dark Side of the Moon", uri: "spotify:album:darkside", release_date: "1973-03-01", total_tracks: 10, images: [{ url: "http://img.com/darkside.jpg" }], artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Pink Floyd", uri: "spotify:artist:pinkfloyd", images: [{ url: "http://img.com/pinkfloyd.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    // Perform the initial album loading directly in the main test scope
    const loadAlbumResult = await musicDiscovery.loadAlbum({ externalId: albumExternalId });
    if ("error" in loadAlbumResult) {
      throw new Error(`Loading album unexpectedly failed: ${loadAlbumResult.error}`);
    }
    const { album: loadedAlbum } = loadAlbumResult;
    const internalAlbumId = loadedAlbum._id; // internalAlbumId is now guaranteed to be assigned here

    await t.step("Loading album 'Dark Side of the Moon' (setup)", async () => {
      assertExists(internalAlbumId); // Confirm setup
      assertEquals(loadedAlbum.name, "Dark Side of the Moon");
    });

    // 2. Mock getAlbumTracks and getTrack for individual tracks
    spotifyService.getAlbumTracks = async (albumId: string) => {
      console.log(`Mocking Spotify getAlbumTracks for album: '${albumId}'`);
      if (albumId === albumExternalId) {
        return {
          items: [
            { id: "track-speak", name: "Speak to Me", uri: "spotify:track:speak" },
            { id: "track-breathe", name: "Breathe (In the Air)", uri: "spotify:track:breathe" },
          ],
        };
      }
      return { items: [] };
    };

    spotifyService.getTrack = async (id) => {
      console.log(`Mocking Spotify getTrack for id: '${id}' (from album tracks)`);
      if (id === "track-speak") return { id, name: "Speak to Me", uri: "spotify:track:speak", duration_ms: 90000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      if (id === "track-breathe") return { id, name: "Breathe (In the Air)", uri: "spotify:track:breathe", duration_ms: 163000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getTrack not found: ${id}`);
    };

    await t.step(`Loading tracks for album (internal ID: ${internalAlbumId})`, async () => {
      const loadTracksResult = await musicDiscovery.loadAlbumTracks({ albumId: internalAlbumId });
      if ("error" in loadTracksResult) {
        throw new Error(`Loading album tracks unexpectedly failed: ${loadTracksResult.error}`);
      }
      const { tracks: albumTracks } = loadTracksResult;
      assertEquals(albumTracks.length, 2, "Should load 2 tracks.");
      assertExists(albumTracks.find(t => t.name === "Speak to Me"));
      assertExists(albumTracks.find(t => t.name === "Breathe (In the Air)"));

      console.log("Verifying tracks are linked to the album via query.");
      const queriedTracks = await musicDiscovery._getTracksByAlbum({ albumId: internalAlbumId });
      assertEquals(queriedTracks.tracks.length, 2);
      assertExists(queriedTracks.tracks.find(t => t.name === "Speak to Me" && t.albumId === internalAlbumId));
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadArtistAlbums loads and links albums to an artist", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    const artistExternalId = "artist-taylorswift";
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Taylor Swift", uri: "spotify:artist:taylorswift", images: [{ url: "http://img.com/taylor.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };
    spotifyService.getAlbum = async (id) => {
      if (id === "album-fearless") return { id, name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      if (id === "album-red") return { id, name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };

    // Perform the initial artist loading directly in the main test scope
    const loadArtistResult = await musicDiscovery.loadArtist({ externalId: artistExternalId });
    if ("error" in loadArtistResult) {
      throw new Error(`Loading artist unexpectedly failed: ${loadArtistResult.error}`);
    }
    const { artist: loadedArtist } = loadArtistResult;
    const internalArtistId = loadedArtist._id; // internalArtistId is now guaranteed to be assigned here

    await t.step("Loading artist 'Taylor Swift' (setup)", async () => {
      assertExists(internalArtistId); // Confirm setup
      assertEquals(loadedArtist.name, "Taylor Swift");
    });

    // 2. Mock getArtistAlbums
    spotifyService.getArtistAlbums = async (artistId: string) => {
      console.log(`Mocking Spotify getArtistAlbums for artist: '${artistId}'`);
      if (artistId === artistExternalId) {
        return {
          items: [
            { id: "album-fearless", name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
            { id: "album-red", name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
          ],
        };
      }
      return { items: [] };
    };

    await t.step(`Loading albums for artist (internal ID: ${internalArtistId})`, async () => {
      const loadAlbumsResult = await musicDiscovery.loadArtistAlbums({ artistId: internalArtistId });
      if ("error" in loadAlbumsResult) {
        throw new Error(`Loading artist albums unexpectedly failed: ${loadAlbumsResult.error}`);
      }
      const { albums: artistAlbums } = loadAlbumsResult;
      assertEquals(artistAlbums.length, 2, "Should load 2 albums.");
      assertExists(artistAlbums.find(a => a.name === "Fearless"));
      assertExists(artistAlbums.find(a => a.name === "Red"));

      console.log("Verifying albums are linked to the artist via query.");
      const queriedAlbums = await musicDiscovery._getAlbumsByArtist({ artistId: internalArtistId });
      assertEquals(queriedAlbums.albums.length, 2);
      assertExists(queriedAlbums.albums.find(a => a.name === "Fearless" && a.artistId === internalArtistId));

      console.log("Verifying the artist's document has the album IDs stored.");
      const updatedArtist = await musicDiscovery.artists.findOne({ _id: internalArtistId });
      assertExists(updatedArtist?.albums);
      assertEquals(updatedArtist.albums.length, 2);
      assertArrayIncludes(updatedArtist.albums.map(String), artistAlbums.map(a => a._id.toString()));
    });
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getEntityFromId and _getEntityFromUri work correctly", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify search for setup
    spotifyService.search = async () => ({
      tracks: {
        items: [{
          id: "track-123",
          name: "Sample Track",
          uri: "spotify:track:123",
          external_urls: { spotify: "http://spotify.com/track/123" },
          album: { id: "album-456", name: "Sample Album", images: [] },
          artists: [{ id: "artist-789", name: "Sample Artist" }],
          duration_ms: 100000,
        }],
      },
      albums: { items: [] },
      artists: { items: [] },
    });
    // Mock getTrack, getAlbum, getArtist as needed by upsert helpers
    spotifyService.getTrack = async (id) => (id === "track-123" ? { id, name: "Sample Track", uri: "spotify:track:123", duration_ms: 100000, album: { id: "album-456", name: "Sample Album", images: [] }, artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject(new Error("Not found")));
    spotifyService.getAlbum = async (id) => (id === "album-456" ? { id, name: "Sample Album", uri: "spotify:album:456", release_date: "2023-01-01", total_tracks: 1, images: [], artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject(new Error("Not found")));
    spotifyService.getArtist = async (id) => (id === "artist-789" ? { id, name: "Sample Artist", uri: "spotify:artist:789", images: [] } : Promise.reject(new Error("Not found")));


    await t.step("Adding a sample track via search to populate state", async () => {
      const searchResult = await musicDiscovery.search({ user: userA, query: "Sample", type: "track" });
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      assertEquals(searchResult.items.length, 1, "Should have added one item to state.");
    });

    await t.step("Query: _getEntityFromId with existing external ID", async () => {
      const entityById = await musicDiscovery._getEntityFromId({ externalId: "track-123" });
      assertEquals(entityById.length, 1);
      assertEquals(entityById[0].musicEntity.name, "Sample Track");
      assertEquals(entityById[0].musicEntity.type, "track");
    });

    await t.step("Query: _getEntityFromUri with existing URI", async () => {
      const entityByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:123" });
      assertEquals(entityByUri.length, 1);
      assertEquals(entityByUri[0].musicEntity.name, "Sample Track");
      assertEquals(entityByUri[0].musicEntity.type, "track");
    });

    await t.step("Query: _getEntityFromId with non-existent external ID", async () => {
      const nonExistentById = await musicDiscovery._getEntityFromId({ externalId: "non-existent-id" });
      assertEquals(nonExistentById.length, 0);
    });

    await t.step("Query: _getEntityFromUri with non-existent URI", async () => {
      const nonExistentByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:nonexistent" });
      assertEquals(nonExistentByUri.length, 0);
    });

  } finally {
    await client.close();
  }
});
```
