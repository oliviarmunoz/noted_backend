import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;

Deno.test("Principle: User A sends request to B, B accepts, A removes B as friend", async () => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    console.log("--- Test Principle Flow ---");

    // Initial state check for Alice and Bob
    let aliceFriends = await friendingConcept._getFriends({ user: userAlice });
    const aliceIncoming = await friendingConcept._getIncomingRequests({ user: userAlice });
    let aliceOutgoing = await friendingConcept._getOutgoingRequests({ user: userAlice });
    assertEquals(aliceFriends.length, 0, "Alice should have no friends initially.");
    assertEquals(aliceIncoming.length, 0, "Alice should have no incoming requests initially.");
    assertEquals(aliceOutgoing.length, 0, "Alice should have no outgoing requests initially.");

    let bobFriends = await friendingConcept._getFriends({ user: userBob });
    let bobIncoming = await friendingConcept._getIncomingRequests({ user: userBob });
    const bobOutgoing = await friendingConcept._getOutgoingRequests({ user: userBob });
    assertEquals(bobFriends.length, 0, "Bob should have no friends initially.");
    assertEquals(bobIncoming.length, 0, "Bob should have no incoming requests initially.");
    assertEquals(bobOutgoing.length, 0, "Bob should have no outgoing requests initially.");

    // Step 1: Alice sends a friend request to Bob
    console.log("Alice sends friend request to Bob...");
    const sendRequestResult = await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
    assertEquals("error" in sendRequestResult, false, `Alice should be able to send request to Bob: ${JSON.stringify(sendRequestResult)}`);

    // Verify effects after sending request
    aliceOutgoing = await friendingConcept._getOutgoingRequests({ user: userAlice });
    bobIncoming = await friendingConcept._getIncomingRequests({ user: userBob });
    assertEquals(aliceOutgoing.map(f => f.target), [userBob], "Alice's outgoing requests should include Bob.");
    assertEquals(bobIncoming.map(f => f.requester), [userAlice], "Bob's incoming requests should include Alice.");
    console.log("Request sent. Alice's outgoing:", aliceOutgoing, "Bob's incoming:", bobIncoming);

    // Step 2: Bob accepts the friend request from Alice
    console.log("Bob accepts friend request from Alice...");
    const acceptRequestResult = await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob });
    assertEquals("error" in acceptRequestResult, false, `Bob should be able to accept request from Alice: ${JSON.stringify(acceptRequestResult)}`);

    // Verify effects after accepting request
    aliceFriends = await friendingConcept._getFriends({ user: userAlice });
    bobFriends = await friendingConcept._getFriends({ user: userBob });
    aliceOutgoing = await friendingConcept._getOutgoingRequests({ user: userAlice });
    bobIncoming = await friendingConcept._getIncomingRequests({ user: userBob });

    assertEquals(aliceFriends.map(f => f.friend), [userBob], "Alice should have Bob as a friend.");
    assertEquals(bobFriends.map(f => f.friend), [userAlice], "Bob should have Alice as a friend.");
    assertEquals(aliceOutgoing.length, 0, "Alice's outgoing requests should be empty.");
    assertEquals(bobIncoming.length, 0, "Bob's incoming requests should be empty.");
    console.log("Request accepted. Alice's friends:", aliceFriends, "Bob's friends:", bobFriends);

    // Step 3: Alice removes Bob as a friend
    console.log("Alice removes Bob as a friend...");
    const removeFriendResult = await friendingConcept.removeFriend({ user: userAlice, friend: userBob });
    assertEquals("error" in removeFriendResult, false, `Alice should be able to remove Bob as friend: ${JSON.stringify(removeFriendResult)}`);

    // Verify effects after removing friend
    aliceFriends = await friendingConcept._getFriends({ user: userAlice });
    bobFriends = await friendingConcept._getFriends({ user: userBob });
    assertEquals(aliceFriends.length, 0, "Alice should no longer have Bob as a friend.");
    assertEquals(bobFriends.length, 0, "Bob should no longer have Alice as a friend.");
    console.log("Friendship removed. Alice's friends:", aliceFriends, "Bob's friends:", bobFriends);

    console.log("--- Principle Flow Completed Successfully ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: sendFriendRequest preconditions", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    // Setup: Alice sends request to Bob
    await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
    console.log("Setup: Alice sent request to Bob.");

    await t.step("Fails when user sends request to self", async () => {
      const result = await friendingConcept.sendFriendRequest({ user: userAlice, target: userAlice });
      assertEquals("error" in result, true, "Should fail: user cannot send friend request to self.");
      assertEquals((result as { error: string }).error, "Cannot send a friend request to self.");
    });

    await t.step("Fails when users are already friends", async () => {
      // Bob accepts the request, making them friends
      await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob });
      console.log("Setup: Alice and Bob are now friends.");

      const result = await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
      assertEquals("error" in result, true, "Should fail: cannot send request if already friends.");
      assertEquals((result as { error: string }).error, "Users are already friends.");
    });

    await t.step("Fails when request from user to target already exists", async () => {
      // Clear previous state and re-send request for this test
      await friendingConcept.users.deleteMany({});
      await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
      console.log("Setup: Alice sent request to Bob.");

      const result = await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
      assertEquals("error" in result, true, "Should fail: request already exists (user->target).");
      assertEquals((result as { error: string }).error, `User ${userAlice} has already sent a friend request to ${userBob}.`);
    });

    await t.step("Fails when request from target to user already exists", async () => {
      // Clear previous state and set up reversed request
      await friendingConcept.users.deleteMany({});
      await friendingConcept.sendFriendRequest({ user: userBob, target: userAlice }); // Bob sends to Alice
      console.log("Setup: Bob sent request to Alice.");

      const result = await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob }); // Alice tries to send to Bob
      assertEquals("error" in result, true, "Should fail: request already exists (target->user).");
      assertEquals((result as { error: string }).error, `Target ${userBob} has already sent a friend request to ${userAlice}. Consider accepting it instead.`);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: acceptFriendRequest preconditions and effects", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    await t.step("Fails when no pending request exists", async () => {
      // No request sent
      const result = await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob });
      assertEquals("error" in result, true, "Should fail: no pending request to accept.");
      assertEquals((result as { error: string }).error, "No pending friend request from requester to target.");
    });

    await t.step("Successfully accepts a valid request and updates state", async () => {
      // Setup: Alice sends request to Bob
      await friendingConcept.users.deleteMany({}); // Clear for fresh state
      await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
      console.log("Setup: Alice sent request to Bob.");

      const result = await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob });
      assertEquals("error" in result, false, `Should succeed: accepting valid request. ${JSON.stringify(result)}`);

      // Verify effects
      const aliceDoc = await friendingConcept.users.findOne({ _id: userAlice });
      const bobDoc = await friendingConcept.users.findOne({ _id: userBob });

      assertExists(aliceDoc);
      assertExists(bobDoc);
      assertEquals(aliceDoc.friends.includes(userBob), true, "Alice should have Bob in friends.");
      assertEquals(bobDoc.friends.includes(userAlice), true, "Bob should have Alice in friends.");
      assertEquals(aliceDoc.outgoingRequests.includes(userBob), false, "Alice's outgoing requests should not include Bob.");
      assertEquals(bobDoc.incomingRequests.includes(userAlice), false, "Bob's incoming requests should not include Alice.");
      console.log("Alice's state after accept:", aliceDoc);
      console.log("Bob's state after accept:", bobDoc);
    });

    await t.step("Fails when users are already friends", async () => {
      // State: Alice and Bob are already friends from previous step
      const result = await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob });
      assertEquals("error" in result, true, "Should fail: cannot accept if already friends.");
      assertEquals((result as { error: string }).error, "Users are already friends.");
    });
  } finally {
      await client.close();
  }
});

Deno.test("Action: removeFriendRequest preconditions and effects", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    await t.step("Successfully removes a pending request", async () => {
      // Setup: Alice sends request to Bob
      await friendingConcept.users.deleteMany({}); // Clear for fresh state
      await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
      console.log("Setup: Alice sent request to Bob.");

      const result = await friendingConcept.removeFriendRequest({ requester: userAlice, target: userBob });
      assertEquals("error" in result, false, `Should succeed: removing pending request. ${JSON.stringify(result)}`);

      // Verify effects
      const aliceDoc = await friendingConcept.users.findOne({ _id: userAlice });
      const bobDoc = await friendingConcept.users.findOne({ _id: userBob });

      assertExists(aliceDoc);
      assertExists(bobDoc);
      assertEquals(aliceDoc.outgoingRequests.includes(userBob), false, "Alice's outgoing requests should not include Bob.");
      assertEquals(bobDoc.incomingRequests.includes(userAlice), false, "Bob's incoming requests should not include Alice.");
      console.log("Alice's state after remove request:", aliceDoc);
      console.log("Bob's state after remove request:", bobDoc);
    });

    await t.step("Fails when no pending request exists", async () => {
      await friendingConcept.users.deleteMany({}); // Clear for fresh state
      const result = await friendingConcept.removeFriendRequest({ requester: userAlice, target: userBob });
      assertEquals("error" in result, true, "Should fail: no pending request to remove.");
      assertEquals((result as { error: string }).error, "No pending friend request from requester to target.");
    });

    await t.step("Fails when users are already friends", async () => {
      // Setup: Make them friends first
      await friendingConcept.users.deleteMany({});
      await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
      await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob });
      console.log("Setup: Alice and Bob are friends.");

      const result = await friendingConcept.removeFriendRequest({ requester: userAlice, target: userBob });
      assertEquals("error" in result, true, "Should fail: cannot remove request if already friends.");
      assertEquals((result as { error: string }).error, "Users are already friends. Use removeFriend instead.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeFriend preconditions and effects", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    await t.step("Successfully removes a friendship", async () => {
      // Setup: Make Alice and Bob friends
      await friendingConcept.users.deleteMany({});
      await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });
      await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob });
      console.log("Setup: Alice and Bob are friends.");

      const result = await friendingConcept.removeFriend({ user: userAlice, friend: userBob });
      assertEquals("error" in result, false, `Should succeed: removing friendship. ${JSON.stringify(result)}`);

      // Verify effects
      const aliceDoc = await friendingConcept.users.findOne({ _id: userAlice });
      const bobDoc = await friendingConcept.users.findOne({ _id: userBob });

      assertExists(aliceDoc);
      assertExists(bobDoc);
      assertEquals(aliceDoc.friends.includes(userBob), false, "Alice's friends should not include Bob.");
      assertEquals(bobDoc.friends.includes(userAlice), false, "Bob's friends should not include Alice.");
      console.log("Alice's state after remove friend:", aliceDoc);
      console.log("Bob's state after remove friend:", bobDoc);
    });

    await t.step("Fails when users are not friends", async () => {
      await friendingConcept.users.deleteMany({}); // Clear for fresh state
      const result = await friendingConcept.removeFriend({ user: userAlice, friend: userBob });
      assertEquals("error" in result, true, "Should fail: cannot remove non-existent friendship.");
      assertEquals((result as { error: string }).error, "Users are not friends with each other.");
    });

    await t.step("Fails when user tries to remove self as friend", async () => {
      // No explicit ensureUserExists needed, removeFriend will handle it internally
      const result = await friendingConcept.removeFriend({ user: userAlice, friend: userAlice });
      assertEquals("error" in result, true, "Should fail: cannot remove self as friend.");
      assertEquals((result as { error: string }).error, "Cannot be friends with self.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getFriends, _getIncomingRequests, _getOutgoingRequests", async () => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    // Setup a complex scenario
    await friendingConcept.sendFriendRequest({ user: userAlice, target: userBob });      // A -> B
    await friendingConcept.sendFriendRequest({ user: userCharlie, target: userAlice });   // C -> A
    await friendingConcept.acceptFriendRequest({ requester: userAlice, target: userBob }); // A-B become friends

    // Query for Alice
    const aliceFriends = await friendingConcept._getFriends({ user: userAlice });
    const aliceIncoming = await friendingConcept._getIncomingRequests({ user: userAlice });
    const aliceOutgoing = await friendingConcept._getOutgoingRequests({ user: userAlice });

    assertEquals(aliceFriends.map(f => f.friend), [userBob], "Alice's friends should include Bob.");
    assertEquals(aliceIncoming.map(r => r.requester), [userCharlie], "Alice's incoming requests should include Charlie.");
    assertEquals(aliceOutgoing.length, 0, "Alice's outgoing requests should be empty after Bob accepted.");

    // Query for Bob
    const bobFriends = await friendingConcept._getFriends({ user: userBob });
    const bobIncoming = await friendingConcept._getIncomingRequests({ user: userBob });
    const bobOutgoing = await friendingConcept._getOutgoingRequests({ user: userBob });

    assertEquals(bobFriends.map(f => f.friend), [userAlice], "Bob's friends should include Alice.");
    assertEquals(bobIncoming.length, 0, "Bob's incoming requests should be empty after he accepted.");
    assertEquals(bobOutgoing.length, 0, "Bob's outgoing requests should be empty.");

    // Query for Charlie
    const charlieFriends = await friendingConcept._getFriends({ user: userCharlie });
    const charlieIncoming = await friendingConcept._getIncomingRequests({ user: userCharlie });
    const charlieOutgoing = await friendingConcept._getOutgoingRequests({ user: userCharlie });

    assertEquals(charlieFriends.length, 0, "Charlie should have no friends.");
    assertEquals(charlieIncoming.length, 0, "Charlie should have no incoming requests.");
    assertEquals(charlieOutgoing.map(t => t.target), [userAlice], "Charlie's outgoing requests should include Alice.");
  } finally {
    await client.close();
  }
});