```
running 4 tests from ./src/concepts/Session/SessionConcept.test.ts

Principle: User's identity can be retrieved via session until deleted ...
------- output -------
Trace: User 019a5fb4-24da-7606-ac3d-03f334acb6b6 starts a session.
Action: create({ user: "019a5fb4-24da-7606-ac3d-03f334acb6b6" }) -> { session: "019a5fb4-276f-7726-a782-e49b91fdd20e" }
Trace: Retrieve user identity using the session.
Query: _getUser({ session: "019a5fb4-276f-7726-a782-e49b91fdd20e" }) -> [{ user: "019a5fb4-24da-7606-ac3d-03f334acb6b6" }]
Trace: Delete the session.
Action: delete({ session: "019a5fb4-276f-7726-a782-e49b91fdd20e" }) -> {}
Trace: Try to retrieve user identity using the deleted session.
Query: _getUser({ session: "019a5fb4-276f-7726-a782-e49b91fdd20e" }) -> [{ error: "Session with id 019a5fb4-276f-7726-a782-e49b91fdd20e not found" }]
Principle fulfilled: Session created, user retrieved, session deleted, user no longer retrievable via session.
----- output end -----
Principle: User's identity can be retrieved via session until deleted ... ok (775ms)

Action: create - effects a new session for the user ...
------- output -------
Test: create action effects.
Action: create({ user: "019a5fb4-24da-7606-ac3d-03f334acb6b6" }) -> { session: "019a5fb4-29eb-7055-a433-915b875ba527" }
Effect confirmed: session document found with correct user.
----- output end -----
Action: create - effects a new session for the user ... ok (570ms)

Action: delete - requires session exists and effects its removal ...
------- output -------
Setup: created session "019a5fb4-2c0e-7d0d-a0af-7bbf03225737" for user "019a5fb4-24da-7606-ac3d-03f334acb6b6".
Test: delete action effects.
Action: delete({ session: "019a5fb4-2c0e-7d0d-a0af-7bbf03225737" }) -> {}
Effect confirmed: session document is removed from the database.
Test: delete action requires the session to exist (failure case).
Action: delete({ session: "019a5fb4-2c5a-71c4-95a0-4b3429e2291f" }) -> { error: "Session with id 019a5fb4-2c5a-71c4-95a0-4b3429e2291f not found" }
Requirement confirmed: attempting to delete a non-existent session fails with an error.
----- output end -----
Action: delete - requires session exists and effects its removal ... ok (585ms)

Query: _getUser - requires session exists and effects user retrieval ...
------- output -------
Setup: created session "019a5fb4-2e66-786f-a709-6bb2937e2fb1" for user "019a5fb4-24db-7e0e-9003-895d63e8a594".
Test: _getUser query effects.
Query: _getUser({ session: "019a5fb4-2e66-786f-a709-6bb2937e2fb1" }) -> [{ user: "019a5fb4-24db-7e0e-9003-895d63e8a594" }]
Effect confirmed: correct user is returned for an existing session.
Test: _getUser query requires the session to exist (failure case).
Query: _getUser({ session: "019a5fb4-2e9b-7984-bb9b-774dadae1bc0" }) -> [{ error: "Session with id 019a5fb4-2e9b-7984-bb9b-774dadae1bc0 not found" }]
Requirement confirmed: attempting to retrieve user from a non-existent session fails with an error.
----- output end -----
Query: _getUser - requires session exists and effects user retrieval ... ok (574ms)

ok | 4 passed | 0 failed (2s)
```