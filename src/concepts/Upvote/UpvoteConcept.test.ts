import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UpvoteConcept from "./UpvoteConcept.ts";

// Define some generic User and Item IDs for testing
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const itemPost1 = "item:Post1" as ID;
const itemPost2 = "item:Post2" as ID;
const itemPost3 = "item:Post3" as ID;

Deno.test("Upvote Concept - Principle: User upvotes and can view their upvotes", async () => {
  const [db, client] = await testDb();
  const upvoteConcept = new UpvoteConcept(db);

  try {
    console.log("\n--- Principle Test: User Upvotes and Views ---");

    // Trace Step 1: Alice upvotes Post1
    console.log(`Action: ${userAlice} upvotes ${itemPost1}`);
    const upvoteResult1 = await upvoteConcept.upvote({ user: userAlice, item: itemPost1 });
    assertEquals("error" in upvoteResult1, false, `Upvote 1 should succeed: ${JSON.stringify(upvoteResult1)}`);

    // Trace Step 2: Alice upvotes Post2
    console.log(`Action: ${userAlice} upvotes ${itemPost2}`);
    const upvoteResult2 = await upvoteConcept.upvote({ user: userAlice, item: itemPost2 });
    assertEquals("error" in upvoteResult2, false, `Upvote 2 should succeed: ${JSON.stringify(upvoteResult2)}`);

    // Trace Step 3: Verify Alice has upvoted Post1
    console.log(`Query: Check if ${userAlice} has upvoted ${itemPost1}`);
    const hasUpvotedPost1 = await upvoteConcept._hasUpvoted({ user: userAlice, item: itemPost1 });
    assertEquals(hasUpvotedPost1[0].hasUpvoted, true, `${userAlice} should have upvoted ${itemPost1}`);

    // Trace Step 4: Verify Alice has NOT upvoted Post3 (which she hasn't interacted with)
    console.log(`Query: Check if ${userAlice} has upvoted ${itemPost3}`);
    const hasUpvotedPost3 = await upvoteConcept._hasUpvoted({ user: userAlice, item: itemPost3 });
    assertEquals(hasUpvotedPost3[0].hasUpvoted, false, `${userAlice} should NOT have upvoted ${itemPost3}`);

    // Trace Step 5: Verify Post1 has an upvote count of 1
    console.log(`Query: Get upvote count for ${itemPost1}`);
    const post1UpvoteCount = await upvoteConcept._getUpvoteCount({ item: itemPost1 });
    assertEquals(post1UpvoteCount[0].count, 1, `${itemPost1} should have 1 upvote`);

    // Trace Step 6: Verify Post3 has an upvote count of 0
    console.log(`Query: Get upvote count for ${itemPost3}`);
    const post3UpvoteCount = await upvoteConcept._getUpvoteCount({ item: itemPost3 });
    assertEquals(post3UpvoteCount[0].count, 0, `${itemPost3} should have 0 upvotes`);

    // Trace Step 7: Get all items Alice has upvoted
    console.log(`Query: Get all items upvoted by ${userAlice}`);
    const aliceUpvotedItems = await upvoteConcept._getUpvotedItems({ user: userAlice });
    const itemIds = aliceUpvotedItems.map(r => r.item);
    assertEquals(itemIds.length, 2, `${userAlice} should have upvoted 2 items`);
    assertArrayIncludes(itemIds, [itemPost1, itemPost2], "Alice's upvoted items should include Post1 and Post2");

    console.log("Principle test completed successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Upvote Concept - Action: upvote (valid and invalid)", async () => {
  const [db, client] = await testDb();
  const upvoteConcept = new UpvoteConcept(db);

  try {
    console.log("\n--- Action Test: upvote ---");

    // Test 1: Successful initial upvote
    console.log(`Attempting first upvote by ${userAlice} on ${itemPost1}`);
    const result1 = await upvoteConcept.upvote({ user: userAlice, item: itemPost1 });
    assertEquals("error" in result1, false, `First upvote should succeed: ${JSON.stringify(result1)}`);
    assertEquals((await upvoteConcept._getUpvoteCount({ item: itemPost1 }))[0].count, 1, "Post1 count should be 1 after first upvote.");
    assertEquals((await upvoteConcept._hasUpvoted({ user: userAlice, item: itemPost1 }))[0].hasUpvoted, true, "Alice should show as having upvoted Post1.");

    // Test 2: Attempting to upvote the same item again (precondition failure)
    console.log(`Attempting duplicate upvote by ${userAlice} on ${itemPost1}`);
    const result2 = await upvoteConcept.upvote({ user: userAlice, item: itemPost1 });
    assertEquals("error" in result2, true, "Duplicate upvote should return an error.");
    assertExists((result2 as { error: string }).error, "Error message should be present for duplicate upvote.");
    console.log(`Expected error for duplicate upvote: ${(result2 as { error: string }).error}`);
    assertEquals((await upvoteConcept._getUpvoteCount({ item: itemPost1 }))[0].count, 1, "Post1 count should remain 1 after failed duplicate upvote.");

    // Test 3: Another user upvoting the same item (should succeed)
    console.log(`Attempting upvote by ${userBob} on ${itemPost1}`);
    const result3 = await upvoteConcept.upvote({ user: userBob, item: itemPost1 });
    assertEquals("error" in result3, false, `Bob's upvote on Post1 should succeed: ${JSON.stringify(result3)}`);
    assertEquals((await upvoteConcept._getUpvoteCount({ item: itemPost1 }))[0].count, 2, "Post1 count should be 2 after Bob's upvote.");
    assertEquals((await upvoteConcept._hasUpvoted({ user: userBob, item: itemPost1 }))[0].hasUpvoted, true, "Bob should show as having upvoted Post1.");

    console.log("upvote action tests completed successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Upvote Concept - Action: unvote (valid and invalid)", async () => {
  const [db, client] = await testDb();
  const upvoteConcept = new UpvoteConcept(db);

  try {
    console.log("\n--- Action Test: unvote ---");

    // Setup: Alice upvotes Post1
    await upvoteConcept.upvote({ user: userAlice, item: itemPost1 });
    assertEquals((await upvoteConcept._getUpvoteCount({ item: itemPost1 }))[0].count, 1, "Setup: Post1 count should be 1.");

    // Test 1: Successful unvote
    console.log(`Attempting unvote by ${userAlice} on ${itemPost1}`);
    const result1 = await upvoteConcept.unvote({ user: userAlice, item: itemPost1 });
    assertEquals("error" in result1, false, `Unvote should succeed: ${JSON.stringify(result1)}`);
    assertEquals((await upvoteConcept._getUpvoteCount({ item: itemPost1 }))[0].count, 0, "Post1 count should be 0 after unvote.");
    assertEquals((await upvoteConcept._hasUpvoted({ user: userAlice, item: itemPost1 }))[0].hasUpvoted, false, "Alice should no longer show as having upvoted Post1.");

    // Test 2: Attempting to unvote an item not previously upvoted (precondition failure)
    console.log(`Attempting unvote by ${userAlice} on ${itemPost1} again (no prior upvote)`);
    const result2 = await upvoteConcept.unvote({ user: userAlice, item: itemPost1 });
    assertEquals("error" in result2, true, "Unvoting a non-existent vote should return an error.");
    assertExists((result2 as { error: string }).error, "Error message should be present for non-existent unvote.");
    console.log(`Expected error for unvoting non-existent: ${(result2 as { error: string }).error}`);
    assertEquals((await upvoteConcept._getUpvoteCount({ item: itemPost1 }))[0].count, 0, "Post1 count should remain 0 after failed unvote.");

    // Test 3: Bob tries to unvote Post1 which he never upvoted (precondition failure)
    console.log(`Attempting unvote by ${userBob} on ${itemPost1} (never upvoted)`);
    const result3 = await upvoteConcept.unvote({ user: userBob, item: itemPost1 });
    assertEquals("error" in result3, true, "Bob trying to unvote should fail as he never upvoted.");
    console.log(`Expected error for Bob's unvote: ${(result3 as { error: string }).error}`);

    console.log("unvote action tests completed successfully.");
  } finally {
    await client.close();
  }
});

Deno.test("Upvote Concept - Query: _getUpvotedItems and _getUpvoters", async () => {
  const [db, client] = await testDb();
  const upvoteConcept = new UpvoteConcept(db);

  try {
    console.log("\n--- Query Tests: _getUpvotedItems and _getUpvoters ---");

    // Setup: Multiple upvotes
    await upvoteConcept.upvote({ user: userAlice, item: itemPost1 });
    await upvoteConcept.upvote({ user: userAlice, item: itemPost2 });
    await upvoteConcept.upvote({ user: userBob, item: itemPost1 });
    await upvoteConcept.upvote({ user: userBob, item: itemPost3 });

    // Test 1: Get items upvoted by Alice
    console.log(`Query: Get items upvoted by ${userAlice}`);
    const aliceItems = await upvoteConcept._getUpvotedItems({ user: userAlice });
    const aliceItemIds = aliceItems.map(i => i.item);
    assertEquals(aliceItemIds.length, 2, "Alice should have upvoted 2 items.");
    assertArrayIncludes(aliceItemIds, [itemPost1, itemPost2], "Alice's upvoted items should be Post1 and Post2.");

    // Test 2: Get items upvoted by Bob
    console.log(`Query: Get items upvoted by ${userBob}`);
    const bobItems = await upvoteConcept._getUpvotedItems({ user: userBob });
    const bobItemIds = bobItems.map(i => i.item);
    assertEquals(bobItemIds.length, 2, "Bob should have upvoted 2 items.");
    assertArrayIncludes(bobItemIds, [itemPost1, itemPost3], "Bob's upvoted items should be Post1 and Post3.");

    // Test 3: Get upvoters for Post1
    console.log(`Query: Get upvoters for ${itemPost1}`);
    const post1Upvoters = await upvoteConcept._getUpvoters({ item: itemPost1 });
    const post1UpvoterIds = post1Upvoters.map(u => u.user);
    assertEquals(post1UpvoterIds.length, 2, "Post1 should have 2 upvoters.");
    assertArrayIncludes(post1UpvoterIds, [userAlice, userBob], "Post1 upvoters should be Alice and Bob.");

    // Test 4: Get upvoters for Post2
    console.log(`Query: Get upvoters for ${itemPost2}`);
    const post2Upvoters = await upvoteConcept._getUpvoters({ item: itemPost2 });
    const post2UpvoterIds = post2Upvoters.map(u => u.user);
    assertEquals(post2UpvoterIds.length, 1, "Post2 should have 1 upvoter.");
    assertArrayIncludes(post2UpvoterIds, [userAlice], "Post2 upvoter should be Alice.");

    // Test 5: Get upvoters for Post3
    console.log(`Query: Get upvoters for ${itemPost3}`);
    const post3Upvoters = await upvoteConcept._getUpvoters({ item: itemPost3 });
    const post3UpvoterIds = post3Upvoters.map(u => u.user);
    assertEquals(post3UpvoterIds.length, 1, "Post3 should have 1 upvoter.");
    assertArrayIncludes(post3UpvoterIds, [userBob], "Post3 upvoter should be Bob.");

    console.log("_getUpvotedItems and _getUpvoters tests completed successfully.");
  } finally {
    await client.close();
  }
});