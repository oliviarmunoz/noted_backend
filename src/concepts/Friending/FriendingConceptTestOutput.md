```
running 6 tests from ./src/concepts/Friending/FriendingConcept.test.ts


Principle: User A sends request to B, B accepts, A removes B as friend ...
------- output -------

--- Test Principle Flow ---

Alice sends friend request to Bob...
Request sent. 
Alice's outgoing: [ { target: "user:Bob" } ] 
Bob's incoming: [ { requester: "user:Alice" } ]

Bob accepts friend request from Alice...
Request accepted. 
Alice's friends: [ { friend: "user:Bob" } ] 
Bob's friends: [ { friend: "user:Alice" } ]

Alice removes Bob as a friend...
Friendship removed. 
Alice's friends: [] 
Bob's friends: []

--- Principle Flow Completed Successfully ---
----- output end -----

Principle: User A sends request to B, B accepts, A removes B as friend ... ok (1s)



Action: sendFriendRequest preconditions ...
------- output -------

Setup: Alice sent request to Bob.
----- output end -----

  Fails when user sends request to self ... ok (1ms)

  Fails when users are already friends ...
------- output -------
Setup: Alice and Bob are now friends.
----- output end -----
  Fails when users are already friends ... ok (438ms)

  Fails when request from user to target already exists ...
------- output -------
Setup: Alice sent request to Bob.
----- output end -----
  Fails when request from user to target already exists ... ok (555ms)

  Fails when request from target to user already exists ...
------- output -------
Setup: Bob sent request to Alice.
----- output end -----
  Fails when request from target to user already exists ... ok (440ms)

Action: sendFriendRequest preconditions ... ok (2s)



Action: acceptFriendRequest preconditions and effects ...

  Fails when no pending request exists ... ok (117ms)

  Successfully accepts a valid request and updates state ...
------- output -------
Setup: Alice sent request to Bob.

Alice's state after accept: {
  _id: "user:Alice",
  friends: [ "user:Bob" ],
  incomingRequests: [],
  outgoingRequests: []
}

Bob's state after accept: {
  _id: "user:Bob",
  friends: [ "user:Alice" ],
  incomingRequests: [],
  outgoingRequests: []
}
----- output end -----
  Successfully accepts a valid request and updates state ... ok (481ms)

  Fails when users are already friends ... ok (82ms)

Action: acceptFriendRequest preconditions and effects ... ok (1s)



Action: removeFriendRequest preconditions and effects ...

  Successfully removes a pending request ...
------- output -------
Setup: Alice sent request to Bob.

Alice's state after remove request: {
  _id: "user:Alice",
  friends: [],
  incomingRequests: [],
  outgoingRequests: []
}

Bob's state after remove request: {
  _id: "user:Bob",
  friends: [],
  incomingRequests: [],
  outgoingRequests: []
}
----- output end -----
  Successfully removes a pending request ... ok (359ms)

  Fails when no pending request exists ... ok (213ms)

  Fails when users are already friends ...
------- output -------
Setup: Alice and Bob are friends.
----- output end -----
  Fails when users are already friends ... ok (517ms)

Action: removeFriendRequest preconditions and effects ... ok (1s)



Action: removeFriend preconditions and effects ...

  Successfully removes a friendship ...
------- output -------
Setup: Alice and Bob are friends.

Alice's state after remove friend: {
  _id: "user:Alice",
  friends: [],
  incomingRequests: [],
  outgoingRequests: []
}

Bob's state after remove friend: {
  _id: "user:Bob",
  friends: [],
  incomingRequests: [],
  outgoingRequests: []
}
----- output end -----
  Successfully removes a friendship ... ok (520ms)

  Fails when users are not friends ... ok (106ms)

  Fails when user tries to remove self as friend ... ok (0ms)

Action: removeFriend preconditions and effects ... ok (1s)



Queries: _getFriends, _getIncomingRequests, _getOutgoingRequests ... ok (1s)


ok | 6 passed (13 steps) | 0 failed (10s)
```
