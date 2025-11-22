import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import SessioningConcept from "./SessionConcept.ts";

const testUser1 = freshID() as ID;
const testUser2 = freshID() as ID;

Deno.test("Principle: User's identity can be retrieved via session until deleted", async () => {
  const [db, client] = await testDb();
  const sessioningConcept = new SessioningConcept(db);

  try {
    console.log(`Trace: User ${testUser1} starts a session.`);
    // 1. Create a session for a user
    const createResult = await sessioningConcept.create({ user: testUser1 });
    assertNotEquals("error" in createResult, true, "Session creation should succeed.");
    const { session: sessionId } = createResult;
    assertExists(sessionId, "A session ID should be returned.");
    console.log(`Action: create({ user: "${testUser1}" }) -> { session: "${sessionId}" }`);

    console.log(`Trace: Retrieve user identity using the session.`);
    // 2. Retrieve user identity using the session
    const getUserResult1 = await sessioningConcept._getUser({ session: sessionId });
    assertNotEquals("error" in getUserResult1[0], true, "Retrieving user should succeed.");
    // Type assertion here:
    assertEquals((getUserResult1[0] as { user: ID }).user, testUser1, "The retrieved user should match the original user.");
    console.log(`Query: _getUser({ session: "${sessionId}" }) -> [{ user: "${(getUserResult1[0] as { user: ID }).user}" }]`);

    console.log(`Trace: Delete the session.`);
    // 3. Delete the session
    const deleteResult = await sessioningConcept.delete({ session: sessionId });
    assertEquals("error" in deleteResult, false, "Session deletion should succeed.");
    console.log(`Action: delete({ session: "${sessionId}" }) -> {}`);

    console.log(`Trace: Try to retrieve user identity using the deleted session.`);
    // 4. Attempt to retrieve user identity with the deleted session
    const getUserResult2 = await sessioningConcept._getUser({ session: sessionId });
    assertEquals("error" in getUserResult2[0], true, "Retrieving user from a deleted session should fail.");
    // Type assertion here:
    assertEquals(
      (getUserResult2[0] as { error: string }).error,
      `Session with id ${sessionId} not found`,
      "Error message should indicate session not found.",
    );
    console.log(`Query: _getUser({ session: "${sessionId}" }) -> [{ error: "${(getUserResult2[0] as { error: string }).error}" }]`);
    console.log("Principle fulfilled: Session created, user retrieved, session deleted, user no longer retrievable via session.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: create - effects a new session for the user", async () => {
  const [db, client] = await testDb();
  const sessioningConcept = new SessioningConcept(db);

  try {
    console.log("Test: create action effects.");
    const createResult = await sessioningConcept.create({ user: testUser1 });
    assertNotEquals("error" in createResult, true, "Creating a session should not return an error.");
    const { session: newSessionId } = createResult;
    assertExists(newSessionId, "A session ID should be generated.");
    console.log(`Action: create({ user: "${testUser1}" }) -> { session: "${newSessionId}" }`);

    // Verify effects: session is associated with the given user
    const foundSessionDoc = await sessioningConcept.sessions.findOne({ _id: newSessionId });
    assertExists(foundSessionDoc, "The session document should exist in the database.");
    assertEquals(foundSessionDoc.user, testUser1, "The stored user ID should match the created user ID.");
    console.log("Effect confirmed: session document found with correct user.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: delete - requires session exists and effects its removal", async () => {
  const [db, client] = await testDb();
  const sessioningConcept = new SessioningConcept(db);

  try {
    // Setup: Create a session to be deleted
    const createResult = await sessioningConcept.create({ user: testUser1 });
    const { session: sessionIdToDelete } = createResult;
    assertExists(sessionIdToDelete);
    console.log(`Setup: created session "${sessionIdToDelete}" for user "${testUser1}".`);

    console.log(`Test: delete action effects.`);
    const deleteResult = await sessioningConcept.delete({ session: sessionIdToDelete });
    assertEquals("error" in deleteResult, false, "Deleting an existing session should not return an error.");
    console.log(`Action: delete({ session: "${sessionIdToDelete}" }) -> {}`);

    // Verify effects: session is removed
    const foundSessionDoc = await sessioningConcept.sessions.findOne({ _id: sessionIdToDelete });
    assertEquals(foundSessionDoc, null, "The session document should no longer exist in the database.");
    console.log("Effect confirmed: session document is removed from the database.");

    console.log(`Test: delete action requires the session to exist (failure case).`);
    const nonExistentSessionId = freshID() as ID;
    const deleteNonExistentResult = await sessioningConcept.delete({ session: nonExistentSessionId });
    assertEquals("error" in deleteNonExistentResult, true, "Deleting a non-existent session should return an error.");
    // Type assertion here:
    assertEquals(
      (deleteNonExistentResult as { error: string }).error,
      `Session with id ${nonExistentSessionId} not found`,
      "Error message should indicate session not found.",
    );
    console.log(`Action: delete({ session: "${nonExistentSessionId}" }) -> { error: "${(deleteNonExistentResult as { error: string }).error}" }`);
    console.log("Requirement confirmed: attempting to delete a non-existent session fails with an error.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getUser - requires session exists and effects user retrieval", async () => {
  const [db, client] = await testDb();
  const sessioningConcept = new SessioningConcept(db);

  try {
    // Setup: Create a session to query
    const createResult = await sessioningConcept.create({ user: testUser2 });
    const { session: sessionIdToQuery } = createResult;
    assertExists(sessionIdToQuery);
    console.log(`Setup: created session "${sessionIdToQuery}" for user "${testUser2}".`);

    console.log(`Test: _getUser query effects.`);
    const getUserResult = await sessioningConcept._getUser({ session: sessionIdToQuery });
    assertNotEquals("error" in getUserResult[0], true, "Querying an existing session should not return an error.");
    // Type assertion here:
    assertEquals((getUserResult[0] as { user: ID }).user, testUser2, "The retrieved user should match the user who created the session.");
    console.log(`Query: _getUser({ session: "${sessionIdToQuery}" }) -> [{ user: "${(getUserResult[0] as { user: ID }).user}" }]`);
    console.log("Effect confirmed: correct user is returned for an existing session.");

    console.log(`Test: _getUser query requires the session to exist (failure case).`);
    const nonExistentSessionId = freshID() as ID;
    const getUserNonExistentResult = await sessioningConcept._getUser({ session: nonExistentSessionId });
    assertEquals("error" in getUserNonExistentResult[0], true, "Querying a non-existent session should return an error.");
    // Type assertion here:
    assertEquals(
      (getUserNonExistentResult[0] as { error: string }).error,
      `Session with id ${nonExistentSessionId} not found`,
      "Error message should indicate session not found.",
    );
    console.log(`Query: _getUser({ session: "${nonExistentSessionId}" }) -> [{ error: "${(getUserNonExistentResult[0] as { error: string }).error}" }]`);
    console.log("Requirement confirmed: attempting to retrieve user from a non-existent session fails with an error.");
  } finally {
    await client.close();
  }
});