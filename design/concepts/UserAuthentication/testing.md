[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@UserAuthentication](UserAuthentication.md)

[@example-test](../LikertSurvey/testing.md)

# test: UserAuthentication
# response:

# file: src/userauthentication/UserAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";

const aliceUsername = "alice";
const alicePassword = "password123";
const bobUsername = "bob";
const bobPassword = "securepassword";

Deno.test("Principle: User can register and then authenticate", async () => {
  console.log("--- Test Principle: Register and Authenticate ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log(`Action: Registering user '${aliceUsername}'`);
    const registerResult = await authConcept.register({
      username: aliceUsername,
      password: alicePassword,
    });
    assertNotEquals("error" in registerResult, true, "Registration should succeed.");
    const { user: aliceId } = registerResult as { user: ID };
    assertExists(aliceId, "Registered user ID should be returned.");
    console.log(`Effect: User '${aliceUsername}' registered with ID: ${aliceId}`);

    console.log(`Query: Verifying username for ID '${aliceId}'`);
    const fetchedUsername = await authConcept._getUsername({ user: aliceId });
    assertEquals(fetchedUsername.length, 1, "Should find one username for the user ID.");
    assertEquals(fetchedUsername[0].username, aliceUsername, "Fetched username should match.");
    console.log(`Verification: Username '${fetchedUsername[0].username}' found for user ID.`);

    console.log(
      `Action: Authenticating user '${aliceUsername}' with correct password.`,
    );
    const authenticateResult = await authConcept.authenticate({
      username: aliceUsername,
      password: alicePassword,
    });
    assertNotEquals("error" in authenticateResult, true, "Authentication should succeed.");
    const { user: authenticatedAliceId } = authenticateResult as { user: ID };
    assertEquals(
      authenticatedAliceId,
      aliceId,
      "Authenticated user ID should match registered ID.",
    );
    console.log(`Effect: User '${aliceUsername}' successfully authenticated.`);

    console.log("Principle fulfilled: User registered and successfully authenticated.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: register - success with unique username", async () => {
  console.log("--- Test Action: register - success ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log(`Action: Registering user '${bobUsername}'`);
    const result = await authConcept.register({
      username: bobUsername,
      password: bobPassword,
    });
    assertNotEquals("error" in result, true, "Registration should succeed.");
    const { user: bobId } = result as { user: ID };
    assertExists(bobId, "User ID should be returned on successful registration.");
    console.log(`Effect: User '${bobUsername}' registered with ID: ${bobId}`);

    console.log(`Query: Confirming user '${bobUsername}' exists via username query.`);
    const fetchedUser = await authConcept._getUserByUsername({ username: bobUsername });
    assertEquals(fetchedUser.length, 1, "Should find the registered user.");
    assertEquals(fetchedUser[0].user, bobId, "Fetched user ID should match.");
    console.log("Verification: User successfully registered and found in system.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: register - failure with duplicate username", async () => {
  console.log("--- Test Action: register - duplicate username failure ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    // First registration (should succeed)
    console.log(`Action: First registration attempt for '${aliceUsername}'`);
    const firstRegisterResult = await authConcept.register({
      username: aliceUsername,
      password: alicePassword,
    });
    assertNotEquals("error" in firstRegisterResult, true, "First registration should succeed.");
    const { user: aliceId } = firstRegisterResult as { user: ID };
    console.log(`Effect: User '${aliceUsername}' registered with ID: ${aliceId}`);

    // Second registration with the same username (should fail)
    console.log(`Action: Second registration attempt for duplicate username '${aliceUsername}'`);
    const secondRegisterResult = await authConcept.register({
      username: aliceUsername,
      password: "anotherpassword",
    });
    assertEquals(
      "error" in secondRegisterResult,
      true,
      "Registration with duplicate username should return an error.",
    );
    assertEquals(
      (secondRegisterResult as { error: string }).error,
      `Username '${aliceUsername}' already exists`,
      "Error message should indicate duplicate username.",
    );
    console.log(
      `Requirement violation: Registering duplicate username returned expected error: '${
        (secondRegisterResult as { error: string }).error
      }'`,
    );

    console.log(`Query: Verifying only one user '${aliceUsername}' exists.`);
    const users = await db.collection("UserAuthentication.users").find({ username: aliceUsername }).toArray();
    assertEquals(users.length, 1, "Only one user document should exist for the username.");
    console.log("Verification: Only one user record exists as expected.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate - success with correct credentials", async () => {
  console.log("--- Test Action: authenticate - success ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    // Setup: Register a user first
    const { user: aliceId } = (await authConcept.register({
      username: aliceUsername,
      password: alicePassword,
    })) as { user: ID };
    console.log(`Setup: User '${aliceUsername}' registered with ID: ${aliceId}`);

    console.log(
      `Action: Authenticating user '${aliceUsername}' with correct password.`,
    );
    const authenticateResult = await authConcept.authenticate({
      username: aliceUsername,
      password: alicePassword,
    });
    assertNotEquals("error" in authenticateResult, true, "Authentication should succeed.");
    const { user: authenticatedId } = authenticateResult as { user: ID };
    assertEquals(authenticatedId, aliceId, "Authenticated user ID should match.");
    console.log(`Effect: User '${authenticatedId}' successfully authenticated.`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate - failure with incorrect password", async () => {
  console.log("--- Test Action: authenticate - incorrect password failure ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    // Setup: Register a user first
    await authConcept.register({ username: aliceUsername, password: alicePassword });
    console.log(`Setup: User '${aliceUsername}' registered.`);

    console.log(
      `Action: Authenticating user '${aliceUsername}' with incorrect password.`,
    );
    const authenticateResult = await authConcept.authenticate({
      username: aliceUsername,
      password: "wrongpassword",
    });
    assertEquals(
      "error" in authenticateResult,
      true,
      "Authentication with incorrect password should return an error.",
    );
    assertEquals(
      (authenticateResult as { error: string }).error,
      "Invalid username or password",
      "Error message should indicate invalid credentials.",
    );
    console.log(
      `Requirement violation: Authenticating with wrong password returned expected error: '${
        (authenticateResult as { error: string }).error
      }'`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate - failure with non-existent username", async () => {
  console.log("--- Test Action: authenticate - non-existent username failure ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    console.log(`Action: Attempting to authenticate non-existent user '${bobUsername}'.`);
    const authenticateResult = await authConcept.authenticate({
      username: bobUsername,
      password: bobPassword,
    });
    assertEquals(
      "error" in authenticateResult,
      true,
      "Authentication with non-existent username should return an error.",
    );
    assertEquals(
      (authenticateResult as { error: string }).error,
      "Invalid username or password",
      "Error message should indicate invalid credentials.",
    );
    console.log(
      `Requirement violation: Authenticating non-existent user returned expected error: '${
        (authenticateResult as { error: string }).error
      }'`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getUsername - success for existing user", async () => {
  console.log("--- Test Query: _getUsername - success ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    // Setup: Register a user
    const { user: aliceId } = (await authConcept.register({
      username: aliceUsername,
      password: alicePassword,
    })) as { user: ID };
    console.log(`Setup: User '${aliceUsername}' registered with ID: ${aliceId}`);

    console.log(`Query: Getting username for user ID '${aliceId}'.`);
    const result = await authConcept._getUsername({ user: aliceId });
    assertEquals(result.length, 1, "Should return an array with one result.");
    assertEquals(result[0].username, aliceUsername, "Returned username should match.");
    console.log(`Effect: Successfully retrieved username '${result[0].username}'.`);
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getUsername - failure for non-existent user", async () => {
  console.log("--- Test Query: _getUsername - non-existent user failure ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);
  const nonExistentUserId = "user:fake" as ID;

  try {
    console.log(`Query: Getting username for non-existent user ID '${nonExistentUserId}'.`);
    const result = await authConcept._getUsername({ user: nonExistentUserId });
    assertEquals(result.length, 0, "Should return an empty array for a non-existent user.");
    console.log("Requirement violation: Query for non-existent user returned empty array as expected.");
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getUserByUsername - success for existing username", async () => {
  console.log("--- Test Query: _getUserByUsername - success ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    // Setup: Register a user
    const { user: aliceId } = (await authConcept.register({
      username: aliceUsername,
      password: alicePassword,
    })) as { user: ID };
    console.log(`Setup: User '${aliceUsername}' registered with ID: ${aliceId}`);

    console.log(`Query: Getting user ID for username '${aliceUsername}'.`);
    const result = await authConcept._getUserByUsername({ username: aliceUsername });
    assertEquals(result.length, 1, "Should return an array with one result.");
    assertEquals(result[0].user, aliceId, "Returned user ID should match.");
    console.log(`Effect: Successfully retrieved user ID '${result[0].user}'.`);
  } finally {
    await client.close();
  }
});

Deno.test("Query: _getUserByUsername - failure for non-existent username", async () => {
  console.log("--- Test Query: _getUserByUsername - non-existent username failure ---");
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);
  const nonExistentUsername = "unknownuser";

  try {
    console.log(`Query: Getting user ID for non-existent username '${nonExistentUsername}'.`);
    const result = await authConcept._getUserByUsername({ username: nonExistentUsername });
    assertEquals(result.length, 0, "Should return an empty array for a non-existent username.");
    console.log("Requirement violation: Query for non-existent username returned empty array as expected.");
  } finally {
    await client.close();
  }
});
```

# trace:

The following trace demonstrates how the **principle** of the `UserAuthentication` concept is fulfilled: "If a user registers with a unique username and password, they can then authenticate using those same credentials to be identified as the registered user."

1.  **Given**: A unique username "alice" and password "password123".
2.  **Action**: Alice attempts to register with her chosen username and password.
    ```
    UserAuthentication.register({ username: "alice", password: "password123" })
    ```
3.  **Result**: The registration succeeds, and a new `User` ID is returned.
    ```
    { user: "user:alice_id_123" }
    ```
4.  **Action**: Alice attempts to authenticate using the same username and password.
    ```
    UserAuthentication.authenticate({ username: "alice", password: "password123" })
    ```
5.  **Result**: The authentication succeeds, and the `User` ID matching the registration is returned.
    ```
    { user: "user:alice_id_123" }
    ```
6.  **Verification**: The returned user ID from authentication matches the user ID obtained during registration, confirming Alice has been identified as the registered user.
    ```
    UserAuthentication._getUsername({ user: "user:alice_id_123" })
    // -> [{ username: "alice" }]
    ```