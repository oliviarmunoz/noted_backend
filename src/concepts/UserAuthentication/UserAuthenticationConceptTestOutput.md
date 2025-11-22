```
running 10 tests from ./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts

Principle: User can register and then authenticate ...
------- output -------
--- Test Principle: Register and Authenticate ---
Action: Registering user 'alice'
Effect: User 'alice' registered with ID: 019a6058-ed64-7b59-81ea-c3cb13d0ff54
Query: Verifying username for ID '019a6058-ed64-7b59-81ea-c3cb13d0ff54'
Verification: Username 'alice' found for user ID.
Action: Authenticating user 'alice' with correct password.
Effect: User 'alice' successfully authenticated.
Principle fulfilled: User registered and successfully authenticated.
----- output end -----

Principle: User can register and then authenticate ... ok (677ms)


Action: register - success with unique username ...
------- output -------
--- Test Action: register - success ---
Action: Registering user 'bob'
Effect: User 'bob' registered with ID: 019a6058-efcd-72b2-afdd-28c94d5b8c44
Query: Confirming user 'bob' exists via username query.
Verification: User successfully registered and found in system.
----- output end -----

Action: register - success with unique username ... ok (593ms)


Action: register - failure with duplicate username ...
------- output -------
--- Test Action: register - duplicate username failure ---
Action: First registration attempt for 'alice'
Effect: User 'alice' registered with ID: 019a6058-f22c-71e3-9376-56760093ca74
Action: Second registration attempt for duplicate username 'alice'
Requirement violation: Registering duplicate username returned expected error: 'Username 'alice' already exists'
Query: Verifying only one user 'alice' exists.
Verification: Only one user record exists as expected.
----- output end -----

Action: register - failure with duplicate username ... ok (630ms)


Action: authenticate - success with correct credentials ...
------- output -------
--- Test Action: authenticate - success ---
Setup: User 'alice' registered with ID: 019a6058-f494-7613-9d54-df3201264249
Action: Authenticating user 'alice' with correct password.
Effect: User '019a6058-f494-7613-9d54-df3201264249' successfully authenticated.
----- output end -----

Action: authenticate - success with correct credentials ... ok (585ms)


Action: authenticate - failure with incorrect password ...
------- output -------
--- Test Action: authenticate - incorrect password failure ---
Setup: User 'alice' registered.
Action: Authenticating user 'alice' with incorrect password.
Requirement violation: Authenticating with wrong password returned expected error: 'Invalid username or password'
----- output end -----

Action: authenticate - failure with incorrect password ... ok (569ms)


Action: authenticate - failure with non-existent username ...
------- output -------
--- Test Action: authenticate - non-existent username failure ---
Action: Attempting to authenticate non-existent user 'bob'.
Requirement violation: Authenticating non-existent user returned expected error: 'Invalid username or password'
----- output end -----

Action: authenticate - failure with non-existent username ... ok (503ms)


Query: _getUsername - success for existing user ...
------- output -------
--- Test Query: _getUsername - success ---
Setup: User 'alice' registered with ID: 019a6058-fb0c-71ac-8840-eaa8cb13d48a
Query: Getting username for user ID '019a6058-fb0c-71ac-8840-eaa8cb13d48a'.
Effect: Successfully retrieved username 'alice'.
----- output end -----

Query: _getUsername - success for existing user ... ok (586ms)


Query: _getUsername - failure for non-existent user ...
------- output -------
--- Test Query: _getUsername - non-existent user failure ---
Query: Getting username for non-existent user ID 'user:fake'.
Requirement violation: Query for non-existent user returned empty array as expected.
----- output end -----

Query: _getUsername - failure for non-existent user ... ok (528ms)


Query: _getUserByUsername - success for existing username ...
------- output -------
--- Test Query: _getUserByUsername - success ---
Setup: User 'alice' registered with ID: 019a6058-ff67-7f55-b676-6f8265d9cee3
Query: Getting user ID for username 'alice'.
Effect: Successfully retrieved user ID '019a6058-ff67-7f55-b676-6f8265d9cee3'.
----- output end -----

Query: _getUserByUsername - success for existing username ... ok (577ms)


Query: _getUserByUsername - failure for non-existent username ...
------- output -------
--- Test Query: _getUserByUsername - non-existent username failure ---
Query: Getting user ID for non-existent username 'unknownuser'.
Requirement violation: Query for non-existent username returned empty array as expected.
----- output end -----

Query: _getUserByUsername - failure for non-existent username ... ok (568ms)


ok | 10 passed | 0 failed (5s)
```
