[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

[@api-extraction-from-spec](../../tools/api-extraction-from-spec.md)

[@concept-definition](Friending.md)

[@concept-implementation](implementation.md)

# prompt: generate the API documentation for the Friending concept, use the implementation reference

# response:

# API Specification: Friending Concept

**Purpose:** enable users to establish and manage mutual social connections

---

## API Endpoints

### POST /api/Friending/sendFriendRequest

**Description:** Sends a friend request from one user to another.

**Requirements:**
- user and target are not existing friends
- user has not already sent a request to target
- target has not sent a request to user.

**Effects:**
- target is added to the set of the user's outgoing requests
- user is added to the set of target's incoming requests

**Request Body:**
```json
{
  "user": "string",
  "target": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Friending/acceptFriendRequest

**Description:** Accepts a pending friend request, establishing a mutual friendship.

**Requirements:**
- requester has sent a friend request to target
- requester and target are not friends

**Effects:**
- requester and target are added to each other's set of friends
- they are both removed from the other's set of incoming/outgoingRequests

**Request Body:**
```json
{
  "requester": "string",
  "target": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Friending/removeFriendRequest

**Description:** Removes a pending friend request. This can be done by either the sender or the recipient.

**Requirements:**
- requester has sent a friend request to target
- requester and target are not friends

**Effects:**
- requester is removed from the target's set of incomingRequests
- target is removed the requester's set of outgoingRequests

**Request Body:**
```json
{
  "requester": "string",
  "target": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Friending/removeFriend

**Description:** Removes an existing mutual friendship between two users.

**Requirements:**
- user and friend are friends with each other

**Effects:**
- user and friends are both removed from each other's set of friends

**Request Body:**
```json
{
  "user": "string",
  "friend": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Friending/_getFriends

**Description:** Retrieves the list of friends for a given user.

**Requirements:**
- (Implicit) The `user` must exist in the concept's state for any friends to be returned.

**Effects:**
- Returns a list of users who are friends with the specified user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "friend": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Friending/_getIncomingRequests

**Description:** Retrieves the list of pending friend requests sent to a given user.

**Requirements:**
- (Implicit) The `user` must exist in the concept's state for any incoming requests to be returned.

**Effects:**
- Returns a list of users who have sent friend requests to the specified user.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "requester": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Friending/_getOutgoingRequests

**Description:** Retrieves the list of pending friend requests sent by a given user.

**Requirements:**
- (Implicit) The `user` must exist in the concept's state for any outgoing requests to be returned.

**Effects:**
- Returns a list of users to whom the specified user has sent friend requests.

**Request Body:**
```json
{
  "user": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "target": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---