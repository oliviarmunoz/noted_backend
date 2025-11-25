---
timestamp: 'Sun Nov 23 2025 21:51:23 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_215123.e8de5066.md]]'
content_id: f1beb401194bd28b4a12ffecae63dcb6e5697f67678e9ebd747461fdf29fd22e
---

# API Specification: Friending Concept

**Purpose:** allow users to establish one-way or two-way "friend" relationships with other users

***

## API Endpoints

### POST /api/Friending/sendFriendRequest

**Description:** Creates a new friend request from one user to another.

**Requirements:**

* `sender` and `receiver` exist; `sender` is not `receiver`; `sender` and `receiver` are not already friends;
* no pending `FriendRequest` from `sender` to `receiver` or `receiver` to `sender`

**Effects:**

* creates a new `FriendRequest` `r`; sets `sender` of `r` to `sender`; sets `receiver` of `r` to `receiver`;
* returns `r` as `request`

**Request Body:**

```json
{
  "sender": "string",
  "receiver": "string"
}
```

**Success Response Body (Action):**

```json
{
  "request": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friending/acceptFriendRequest

**Description:** Accepts a pending friend request, making the users friends.

**Requirements:**

* `request` exists and is pending

**Effects:**

* adds `sender` of `request` to `friends` of `receiver` of `request`;
* adds `receiver` of `request` to `friends` of `sender` of `request`;
* deletes `request`

**Request Body:**

```json
{
  "request": "string"
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

***

### POST /api/Friending/rejectFriendRequest

**Description:** Rejects a pending friend request, deleting it.

**Requirements:**

* `request` exists and is pending

**Effects:**

* deletes `request`

**Request Body:**

```json
{
  "request": "string"
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

***

### POST /api/Friending/unfriend

**Description:** Removes the friendship between two users.

**Requirements:**

* `userA` and `userB` exist and are friends

**Effects:**

* removes `userB` from `friends` of `userA`;
* removes `userA` from `friends` of `userB`

**Request Body:**

```json
{
  "userA": "string",
  "userB": "string"
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

***

### POST /api/Friending/\_getFriends

**Description:** Returns a list of users who are friends with the specified user.

**Requirements:**

* `user` exists

**Effects:**

* returns set of all `User`s that are friends with `user`

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

***

### POST /api/Friending/\_getPendingSentFriendRequests

**Description:** Returns a list of pending friend requests sent by the specified user.

**Requirements:**

* `sender` exists

**Effects:**

* returns set of all `FriendRequest`s sent by `sender` that are pending, along with their `receiver`

**Request Body:**

```json
{
  "sender": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "request": "string",
    "receiver": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Friending/\_getPendingReceivedFriendRequests

**Description:** Returns a list of pending friend requests received by the specified user.

**Requirements:**

* `receiver` exists

**Effects:**

* returns set of all `FriendRequest`s received by `receiver` that are pending, along with their `sender`

**Request Body:**

```json
{
  "receiver": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "request": "string",
    "sender": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
