import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlaylistConcept from "./PlaylistConcept.ts";

const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const item1 = "item:song123" as ID;
const item2 = "item:video456" as ID;
const item3 = "item:article789" as ID;

Deno.test("Playlist Principle: User manages collections of items", async (t) => {
  const [db, client] = await testDb();
  const playlistConcept = new PlaylistConcept(db);

  try {
    await t.step("1. User creates a playlist", async () => {
      console.log("Trace: UserA creates 'My Favorites' playlist.");
      const createResult = await playlistConcept.createPlaylist({ user: userA, playlistName: "My Favorites" });
      assertNotEquals("error" in createResult, true, `Expected successful playlist creation, got: ${JSON.stringify(createResult)}`);
      assertExists((createResult as { playlist: ID }).playlist);

      const userAPlaylists = await playlistConcept._getUserPlaylists({ user: userA });
      assertEquals(userAPlaylists.length, 1, "UserA should have 1 playlist.");
      assertEquals(userAPlaylists[0].playlistName, "My Favorites", "Playlist name should match.");
      assertEquals(userAPlaylists[0].items.length, 0, "New playlist should be empty.");
    });

    await t.step("2. User adds items to a playlist", async () => {
      console.log("Trace: UserA adds item1 and item2 to 'My Favorites'.");
      const add1Result = await playlistConcept.addItem({ user: userA, item: item1, playlistName: "My Favorites" });
      assertNotEquals("error" in add1Result, true, `Expected successful item addition, got: ${JSON.stringify(add1Result)}`);

      const add2Result = await playlistConcept.addItem({ user: userA, item: item2, playlistName: "My Favorites" });
      assertNotEquals("error" in add2Result, true, `Expected successful item addition, got: ${JSON.stringify(add2Result)}`);

      const items = await playlistConcept._getPlaylistItems({ user: userA, playlistName: "My Favorites" });
      assertEquals(items.length, 2, "Playlist should contain 2 items.");
      assertEquals(items.some(i => i.item === item1), true, "Playlist should contain item1.");
      assertEquals(items.some(i => i.item === item2), true, "Playlist should contain item2.");
    });

    await t.step("3. User removes an item from a playlist", async () => {
      console.log("Trace: UserA removes item1 from 'My Favorites'.");
      const deleteResult = await playlistConcept.deleteItem({ user: userA, item: item1, playlistName: "My Favorites" });
      assertNotEquals("error" in deleteResult, true, `Expected successful item deletion, got: ${JSON.stringify(deleteResult)}`);

      const items = await playlistConcept._getPlaylistItems({ user: userA, playlistName: "My Favorites" });
      assertEquals(items.length, 1, "Playlist should contain 1 item after deletion.");
      assertEquals(items.some(i => i.item === item1), false, "Playlist should no longer contain item1.");
      assertEquals(items.some(i => i.item === item2), true, "Playlist should still contain item2.");
    });

    await t.step("4. User retrieves the items in a playlist", async () => {
      console.log("Trace: UserA retrieves items from 'My Favorites'.");
      const items = await playlistConcept._getPlaylistItems({ user: userA, playlistName: "My Favorites" });
      assertEquals(items.length, 1, "Retrieval should show 1 item.");
      assertEquals(items[0].item, item2, "The remaining item should be item2.");
    });

    await t.step("5. User deletes a playlist", async () => {
      console.log("Trace: UserA deletes 'My Favorites' playlist.");
      const deletePlaylistResult = await playlistConcept.deletePlaylist({ user: userA, playlistName: "My Favorites" });
      assertNotEquals("error" in deletePlaylistResult, true, `Expected successful playlist deletion, got: ${JSON.stringify(deletePlaylistResult)}`);

      const userAPlaylists = await playlistConcept._getUserPlaylists({ user: userA });
      assertEquals(userAPlaylists.length, 0, "UserA should have 0 playlists after deletion.");
    });

  } finally {
    await client.close();
  }
});

Deno.test("Playlist Actions: createPlaylist ensures uniqueness per user", async (t) => {
  const [db, client] = await testDb();
  const playlistConcept = new PlaylistConcept(db);

  try {
    const playlistName = "Morning Jams";
    console.log(`Trace: UserA creates playlist '${playlistName}'.`);
    const createResult1 = await playlistConcept.createPlaylist({ user: userA, playlistName });
    assertNotEquals("error" in createResult1, true, `UserA's first playlist should succeed.`);

    console.log(`Trace: UserA tries to create playlist '${playlistName}' again (expected failure).`);
    const createResult2 = await playlistConcept.createPlaylist({ user: userA, playlistName });
    assertEquals("error" in createResult2, true, `UserA's second playlist with same name should fail.`);
    assertEquals((createResult2 as { error: string }).error, `Playlist with name '${playlistName}' already exists for user '${userA}'.`);

    console.log(`Trace: UserB creates playlist '${playlistName}' (expected success).`);
    const createResult3 = await playlistConcept.createPlaylist({ user: userB, playlistName });
    assertNotEquals("error" in createResult3, true, `UserB's playlist with same name should succeed as it's a different user.`);

    const userAPlaylists = await playlistConcept._getUserPlaylists({ user: userA });
    assertEquals(userAPlaylists.length, 1, "UserA should have one playlist.");
    const userBPlaylists = await playlistConcept._getUserPlaylists({ user: userB });
    assertEquals(userBPlaylists.length, 1, "UserB should have one playlist.");

  } finally {
    await client.close();
  }
});

Deno.test("Playlist Actions: deletePlaylist requires existing playlist", async () => {
  const [db, client] = await testDb();
  const playlistConcept = new PlaylistConcept(db);

  try {
    console.log("Trace: Attempting to delete a non-existent playlist.");
    const deleteResult = await playlistConcept.deletePlaylist({ user: userA, playlistName: "NonExistent" });
    assertEquals("error" in deleteResult, true, "Deleting a non-existent playlist should return an error.");
    assertEquals((deleteResult as { error: string }).error, `Playlist with name 'NonExistent' not found for user '${userA}'.`);
  } finally {
    await client.close();
  }
});

Deno.test("Playlist Actions: addItem enforces requirements", async (t) => {
  const [db, client] = await testDb();
  const playlistConcept = new PlaylistConcept(db);
  const playlistName = "New Tunes";
  let playlistId: ID;

  try {
    const createResult = await playlistConcept.createPlaylist({ user: userA, playlistName });
    playlistId = (createResult as { playlist: ID }).playlist;

    await t.step("Requires: Playlist must exist for user", async () => {
      console.log("Trace: Adding item to a non-existent playlist.");
      const addResult = await playlistConcept.addItem({ user: userA, item: item1, playlistName: "Fake Playlist" });
      assertEquals("error" in addResult, true, "Adding item to non-existent playlist should fail.");
    });

    await t.step("Requires: Item must not already be in playlist", async () => {
      console.log("Trace: Adding item1 to playlist (first time).");
      const addResult1 = await playlistConcept.addItem({ user: userA, item: item1, playlistName });
      assertNotEquals("error" in addResult1, true, `First item add should succeed.`);

      console.log("Trace: Adding item1 to playlist again (expected failure).");
      const addResult2 = await playlistConcept.addItem({ user: userA, item: item1, playlistName });
      assertEquals("error" in addResult2, true, "Adding same item twice should fail.");
      assertEquals((addResult2 as { error: string }).error, `Item '${item1}' is already in playlist '${playlistName}' for user '${userA}'.`);

      const items = await playlistConcept._getPlaylistItems({ user: userA, playlistName });
      assertEquals(items.length, 1, "Playlist should still only have 1 item.");
    });

  } finally {
    await client.close();
  }
});

Deno.test("Playlist Actions: deleteItem enforces requirements", async (t) => {
  const [db, client] = await testDb();
  const playlistConcept = new PlaylistConcept(db);
  const playlistName = "Ephemeral List";
  let playlistId: ID;

  try {
    const createResult = await playlistConcept.createPlaylist({ user: userA, playlistName });
    playlistId = (createResult as { playlist: ID }).playlist;
    await playlistConcept.addItem({ user: userA, item: item1, playlistName });
    await playlistConcept.addItem({ user: userA, item: item2, playlistName });

    await t.step("Requires: Playlist must exist for user", async () => {
      console.log("Trace: Deleting item from a non-existent playlist.");
      const deleteResult = await playlistConcept.deleteItem({ user: userA, item: item1, playlistName: "Ghost Playlist" });
      assertEquals("error" in deleteResult, true, "Deleting item from non-existent playlist should fail.");
    });

    await t.step("Requires: Item must be present in playlist", async () => {
      console.log("Trace: Deleting non-existent item from existing playlist.");
      const deleteResult = await playlistConcept.deleteItem({ user: userA, item: item3, playlistName });
      assertEquals("error" in deleteResult, true, "Deleting non-existent item from playlist should fail.");
      assertEquals((deleteResult as { error: string }).error, `Item '${item3}' is not in playlist '${playlistName}' for user '${userA}'.`);

      const items = await playlistConcept._getPlaylistItems({ user: userA, playlistName });
      assertEquals(items.length, 2, "Playlist should still have 2 items.");
    });

    await t.step("Successful item deletion", async () => {
      console.log("Trace: Successfully deleting item1.");
      const deleteResult = await playlistConcept.deleteItem({ user: userA, item: item1, playlistName });
      assertNotEquals("error" in deleteResult, true, `Expected successful item deletion.`);

      const items = await playlistConcept._getPlaylistItems({ user: userA, playlistName });
      assertEquals(items.length, 1, "Playlist should have 1 item remaining.");
      assertEquals(items[0].item, item2, "Remaining item should be item2.");
    });

  } finally {
    await client.close();
  }
});

Deno.test("Playlist Queries: _getPlaylistItems returns correct items or empty", async () => {
  const [db, client] = await testDb();
  const playlistConcept = new PlaylistConcept(db);
  const playlistName = "Query Test";

  try {
    // Non-existent playlist
    console.log("Trace: Querying items from a non-existent playlist.");
    const nonExistentItems = await playlistConcept._getPlaylistItems({ user: userA, playlistName: "DoesNotExist" });
    assertEquals(nonExistentItems.length, 0, "Query for non-existent playlist should return empty array.");

    // Existing empty playlist
    console.log("Trace: Creating and querying an empty playlist.");
    await playlistConcept.createPlaylist({ user: userA, playlistName });
    const emptyItems = await playlistConcept._getPlaylistItems({ user: userA, playlistName });
    assertEquals(emptyItems.length, 0, "Query for empty playlist should return empty array.");

    // Existing playlist with items
    console.log("Trace: Adding items and querying.");
    await playlistConcept.addItem({ user: userA, item: item1, playlistName });
    await playlistConcept.addItem({ user: userA, item: item2, playlistName });
    const items = await playlistConcept._getPlaylistItems({ user: userA, playlistName });
    assertEquals(items.length, 2, "Query should return 2 items.");
    assertEquals(items.some(i => i.item === item1), true);
    assertEquals(items.some(i => i.item === item2), true);
  } finally {
    await client.close();
  }
});

Deno.test("Playlist Queries: _getUserPlaylists returns all playlists for a user", async () => {
  const [db, client] = await testDb();
  const playlistConcept = new PlaylistConcept(db);

  try {
    // User with no playlists
    console.log("Trace: Querying playlists for a user with no playlists.");
    const userBPlaylists = await playlistConcept._getUserPlaylists({ user: userB });
    assertEquals(userBPlaylists.length, 0, "UserB should have no playlists.");

    // User with multiple playlists
    console.log("Trace: UserA creates multiple playlists.");
    await playlistConcept.createPlaylist({ user: userA, playlistName: "Favorites" });
    await playlistConcept.createPlaylist({ user: userA, playlistName: "Watch Later" });
    await playlistConcept.addItem({ user: userA, item: item1, playlistName: "Favorites" });

    const userAPlaylists = await playlistConcept._getUserPlaylists({ user: userA });
    assertEquals(userAPlaylists.length, 2, "UserA should have two playlists.");

    const favPlaylist = userAPlaylists.find(p => p.playlistName === "Favorites");
    assertExists(favPlaylist);
    assertEquals(favPlaylist.items.length, 1);
    assertEquals(favPlaylist.items[0], item1);

    const watchLaterPlaylist = userAPlaylists.find(p => p.playlistName === "Watch Later");
    assertExists(watchLaterPlaylist);
    assertEquals(watchLaterPlaylist.items.length, 0);
  } finally {
    await client.close();
  }
});