[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@music-discovery](MusicDiscovery.md)

[@example-test](../LikertSurvey/testing.md)

# test: MusicDiscovery
# response:

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MusicDiscoveryConcept from "./MusicDiscoveryConcept.ts";
import { spotifyService } from "@utils/spotify.ts";

const userA = "user:Alice" as ID;

// --- Mock Data & Setup ---

const mockSpotifyResponse = {
  tracks: {
    items: [
      {
        id: "track1",
        name: "Test Track",
        uri: "spotify:track:1",
        type: "track",
        images: [{ url: "http://img.com/track1" }],
        artists: [{ name: "Artist One" }],
        duration_ms: 1000,
        release_date: "2023-01-01"
      }
    ]
  },
  albums: {
    items: [
      {
        id: "album1",
        name: "Test Album",
        uri: "spotify:album:1",
        type: "album",
        images: [{ url: "http://img.com/album1" }],
        artists: [{ name: "Artist Two" }],
        release_date: "2023-02-01"
      }
    ]
  },
  artists: {
    items: []
  }
};

const mockDetailedTrack = {
  id: "track1",
  name: "Test Track",
  uri: "spotify:track:1",
  type: "track",
  images: [{ url: "http://img.com/track1_detailed" }], // URL changed to verify update
  artists: [{ name: "Artist One" }],
  duration_ms: 1000,
  release_date: "2023-01-01"
};

// Monkey-patching the singleton service for testing logic without external calls
spotifyService.searchAll = async (_q, _l, _o) => {
  return Promise.resolve(mockSpotifyResponse);
};

spotifyService.getTrack = async (_id) => {
  return Promise.resolve(mockDetailedTrack);
};

// --- Tests ---

Deno.test("Principle: User searches, results stored, context preserved", async () => {
  const [db, client] = await testDb();
  const musicConcept = new MusicDiscoveryConcept(db);

  try {
    // 1. User searches for "test"
    const searchResult = await musicConcept.search({ user: userA, query: "test" });
    assertNotEquals("error" in searchResult, true, "Search should succeed");
    
    const { musicEntities } = searchResult as { musicEntities: any[] };
    assertEquals(musicEntities.length, 2, "Should return 1 track + 1 album = 2 entities");

    // Verify User State (lastQuery)
    const userState = await musicConcept.users.findOne({ _id: userA });
    assertExists(userState);
    assertEquals(userState?.lastQuery, "test");

    // Verify Search Results linked to user
    const savedResults = await musicConcept._getSearchResults({ user: userA });
    assertEquals(savedResults.length, 2);
    
    // Check specific entity details stored
    const trackEntity = savedResults.find(r => r.musicEntity.type === 'track')?.musicEntity;
    assertExists(trackEntity);
    assertEquals(trackEntity?.name, "Test Track");
    assertEquals(trackEntity?.artistName, "Artist One");

  } finally {
    await client.close();
  }
});

Deno.test("Action: search requires query not empty", async () => {
  const [db, client] = await testDb();
  const musicConcept = new MusicDiscoveryConcept(db);

  try {
    const result = await musicConcept.search({ user: userA, query: "" });
    assertEquals("error" in result, true);
    assertEquals((result as any).error, "Query cannot be empty");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search clears previous results for user", async () => {
  const [db, client] = await testDb();
  const musicConcept = new MusicDiscoveryConcept(db);

  try {
    // First search
    await musicConcept.search({ user: userA, query: "first" });
    const results1 = await musicConcept._getSearchResults({ user: userA });
    assertEquals(results1.length, 2);

    // Second search
    await musicConcept.search({ user: userA, query: "second" });
    const results2 = await musicConcept._getSearchResults({ user: userA });
    assertEquals(results2.length, 2, "Should still have 2 results (previous cleared)");
    
    // Verify lastQuery updated
    const userState = await musicConcept.users.findOne({ _id: userA });
    assertEquals(userState?.lastQuery, "second");
  } finally {
    await client.close();
  }
});

Deno.test("Action: clearSearch removes results", async () => {
  const [db, client] = await testDb();
  const musicConcept = new MusicDiscoveryConcept(db);

  try {
    await musicConcept.search({ user: userA, query: "something" });
    await musicConcept.clearSearch({ user: userA });
    
    const results = await musicConcept._getSearchResults({ user: userA });
    assertEquals(results.length, 0);
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadEntityDetails updates entity data", async () => {
  const [db, client] = await testDb();
  const musicConcept = new MusicDiscoveryConcept(db);

  try {
    // 1. Initial Search to populate entity
    await musicConcept.search({ user: userA, query: "init" });
    
    // Get the track entity ID
    const results = await musicConcept._getSearchResults({ user: userA });
    const track = results.find(r => r.musicEntity.type === 'track')?.musicEntity;
    assertExists(track);
    assertEquals(track?.imageUrl, "http://img.com/track1"); // From search mock

    // 2. Load Details
    const loadResult = await musicConcept.loadEntityDetails({ externalId: "track1", type: "track" });
    assertNotEquals("error" in loadResult, true);
    
    // 3. Verify Update
    const updatedEntity = await musicConcept.entities.findOne({ externalId: "track1" });
    assertEquals(updatedEntity?.imageUrl, "http://img.com/track1_detailed"); // From getTrack mock

  } finally {
    await client.close();
  }
});
```

# trace:

The following trace demonstrates how the **principle** of the `MusicDiscovery` concept is fulfilled.

1.  **Given**: A registered user `user:Alice`.
2.  **Action**: The user searches for "test".
    ```typescript
    MusicDiscovery.search({ user: "user:Alice", query: "test" })
    ```
3.  **Result**:
    *   The user's `lastQuery` state is updated to "test".
    *   Calls are made to the external Spotify service.
    *   `MusicEntity` documents are created (or updated) for the tracks/albums returned (e.g., "Test Track").
    *   `SearchResult` documents are created linking `user:Alice` to these entities.
    *   The list of entities is returned to the caller.
4.  **Action**: The user views their results via query.
    ```typescript
    MusicDiscovery._getSearchResults({ user: "user:Alice" })
    ```
5.  **Result**: The system returns the entities "Test Track" and "Test Album" associated with the user's latest search.
6.  **Action**: The user wants more details on a specific track.
    ```typescript
    MusicDiscovery.loadEntityDetails({ externalId: "track1", type: "track" })
    ```
7.  **Result**: The `MusicEntity` for "Test Track" is updated with richer data (e.g., a higher res image URL), enabling the user to see detailed information.