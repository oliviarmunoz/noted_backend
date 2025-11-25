[@api-extraction-from-spec](api-extraction-from-spec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze the following Concept Implementation and generate the API documentation based on these instructions.

[friending-concept-impl](../../src/concepts/Friending/FriendingConcept.ts)
[playlist-concept-impl](../../src/concepts/Playlist/PlaylistConcept.ts)
[review-concept-impl](../../src/concepts/Review/ReviewConcept.ts)
[session-concept-impl](../../src/concepts/Session/SessionConcept.ts)
[user-auth-concept-impl](../../src/concepts/UserAuthentication/UserAuthenticationConcept.ts)
# response:

# API Specification: Friending Concept

**Purpose:** allow users to establish one-way or two-way "friend" relationships with other users

---

## API Endpoints

### POST /api/Friending/sendFriendRequest

**Description:** Creates a new friend request from one user to another.

**Requirements:**
- `sender` and `receiver` exist; `sender` is not `receiver`; `sender` and `receiver` are not already friends;
- no pending `FriendRequest` from `sender` to `receiver` or `receiver` to `sender`

**Effects:**
- creates a new `FriendRequest` `r`; sets `sender` of `r` to `sender`; sets `receiver` of `r` to `receiver`;
- returns `r` as `request`

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
---

### POST /api/Friending/acceptFriendRequest

**Description:** Accepts a pending friend request, making the users friends.

**Requirements:**
- `request` exists and is pending

**Effects:**
- adds `sender` of `request` to `friends` of `receiver` of `request`;
- adds `receiver` of `request` to `friends` of `sender` of `request`;
- deletes `request`

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
---

### POST /api/Friending/rejectFriendRequest

**Description:** Rejects a pending friend request, deleting it.

**Requirements:**
- `request` exists and is pending

**Effects:**
- deletes `request`

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
---

### POST /api/Friending/unfriend

**Description:** Removes the friendship between two users.

**Requirements:**
- `userA` and `userB` exist and are friends

**Effects:**
- removes `userB` from `friends` of `userA`;
- removes `userA` from `friends` of `userB`

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
---

### POST /api/Friending/_getFriends

**Description:** Returns a list of users who are friends with the specified user.

**Requirements:**
- `user` exists

**Effects:**
- returns set of all `User`s that are friends with `user`

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

### POST /api/Friending/_getPendingSentFriendRequests

**Description:** Returns a list of pending friend requests sent by the specified user.

**Requirements:**
- `sender` exists

**Effects:**
- returns set of all `FriendRequest`s sent by `sender` that are pending, along with their `receiver`

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
---

### POST /api/Friending/_getPendingReceivedFriendRequests

**Description:** Returns a list of pending friend requests received by the specified user.

**Requirements:**
- `receiver` exists

**Effects:**
- returns set of all `FriendRequest`s received by `receiver` that are pending, along with their `sender`

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
---

# API Specification: Playlist Concept

**Purpose:** allow users to create and manage ordered lists of generic items

---

## API Endpoints

### POST /api/Playlist/createPlaylist

**Description:** Creates a new playlist for a given owner with a specified name.

**Requirements:**
- `owner` exists; no `Playlist` with `name` exists for `owner`

**Effects:**
- creates a new `Playlist` `p`; sets `owner` of `p` to `owner`; sets `name` of `p` to `name`;
- sets `items` of `p` to empty list; returns `p` as `playlist`

**Request Body:**
```json
{
  "owner": "string",
  "name": "string"
}
```

**Success Response Body (Action):**
```json
{
  "playlist": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Playlist/deletePlaylist

**Description:** Deletes a playlist, provided the correct owner is specified.

**Requirements:**
- `playlist` exists and `owner` is its owner

**Effects:**
- deletes `playlist`

**Request Body:**
```json
{
  "playlist": "string",
  "owner": "string"
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

### POST /api/Playlist/renamePlaylist

**Description:** Renames an existing playlist, provided the correct owner is specified and the new name is not already in use by another playlist of the same owner.

**Requirements:**
- `playlist` exists and `owner` is its owner; no other `Playlist` with `newName` exists for `owner`

**Effects:**
- sets `name` of `playlist` to `newName`

**Request Body:**
```json
{
  "playlist": "string",
  "owner": "string",
  "newName": "string"
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

### POST /api/Playlist/addPlaylistItem

**Description:** Adds a generic item to the end of a playlist.

**Requirements:**
- `playlist` exists and `owner` is its owner; `item` exists (externally defined)

**Effects:**
- adds `item` to the end of `items` of `playlist`

**Request Body:**
```json
{
  "playlist": "string",
  "owner": "string",
  "item": "string"
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

### POST /api/Playlist/removePlaylistItem

**Description:** Removes the first occurrence of a specified item from a playlist.

**Requirements:**
- `playlist` exists and `owner` is its owner; `item` is in `items` of `playlist`

**Effects:**
- removes first occurrence of `item` from `items` of `playlist`

**Request Body:**
```json
{
  "playlist": "string",
  "owner": "string",
  "item": "string"
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

### POST /api/Playlist/movePlaylistItem

**Description:** Moves an item within a playlist from one index to another.

**Requirements:**
- `playlist` exists and `owner` is its owner; `item` is at `fromIndex` in `items` of `playlist`;
- `fromIndex` and `toIndex` are valid indices within the `items` list

**Effects:**
- moves `item` from `fromIndex` to `toIndex` in `items` of `playlist`

**Request Body:**
```json
{
  "playlist": "string",
  "owner": "string",
  "item": "string",
  "fromIndex": "number",
  "toIndex": "number"
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

### POST /api/Playlist/_getPlaylists

**Description:** Returns a list of playlists owned by a specified user, along with their names.

**Requirements:**
- `owner` exists

**Effects:**
- returns set of all `Playlist`s owned by `owner`, with their `name`

**Request Body:**
```json
{
  "owner": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "playlist": "string",
    "name": "string"
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

### POST /api/Playlist/_getPlaylistDetails

**Description:** Returns the full details (name, owner, and items) of a specific playlist.

**Requirements:**
- `playlist` exists

**Effects:**
- returns `name`, `owner`, and `items` of `playlist`

**Request Body:**
```json
{
  "playlist": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "name": "string",
    "owner": "string",
    "items": "string[]"
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

### POST /api/Playlist/_getPlaylistItems

**Description:** Returns an ordered list of items contained within a specified playlist.

**Requirements:**
- `playlist` exists

**Effects:**
- returns ordered list of `item`s in `playlist`

**Request Body:**
```json
{
  "playlist": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "item": "string"
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

# API Specification: Review Concept

**Purpose:** allow users to rate and provide textual feedback on generic targets

---

## API Endpoints

### POST /api/Review/postReview

**Description:** Allows an author to post a new review for a target with a rating and text.

**Requirements:**
- `author` exists; `target` exists; `rating` is between 1 and 5 inclusive;
- `author` has not previously reviewed `target`

**Effects:**
- creates a new `Review` `r`; sets `author` of `r` to `author`; sets `target` of `r` to `target`;
- sets `rating` of `r` to `rating`; sets `text` of `r` to `text`; returns `r` as `review`

**Request Body:**
```json
{
  "author": "string",
  "target": "string",
  "rating": "number",
  "text": "string"
}
```

**Success Response Body (Action):**
```json
{
  "review": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Review/updateReview

**Description:** Updates the rating and text of an existing review, provided the correct author is specified.

**Requirements:**
- `review` exists and `author` is its author; `rating` is between 1 and 5 inclusive

**Effects:**
- sets `rating` of `review` to `rating`; sets `text` of `review` to `text`

**Request Body:**
```json
{
  "review": "string",
  "author": "string",
  "rating": "number",
  "text": "string"
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

### POST /api/Review/deleteReview

**Description:** Deletes an existing review, provided the correct author is specified.

**Requirements:**
- `review` exists and `author` is its author

**Effects:**
- deletes `review`

**Request Body:**
```json
{
  "review": "string",
  "author": "string"
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

### POST /api/Review/_getReviewsByTarget

**Description:** Returns a list of all reviews for a specific target, including author, rating, and text.

**Requirements:**
- `target` exists

**Effects:**
- returns set of all `Review`s for `target`, with their `author`, `rating`, and `text`

**Request Body:**
```json
{
  "target": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "review": "string",
    "author": "string",
    "rating": "number",
    "text": "string"
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

### POST /api/Review/_getReviewsByAuthor

**Description:** Returns a list of all reviews posted by a specific author, including target, rating, and text.

**Requirements:**
- `author` exists

**Effects:**
- returns set of all `Review`s by `author`, with their `target`, `rating`, and `text`

**Request Body:**
```json
{
  "author": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "review": "string",
    "target": "string",
    "rating": "number",
    "text": "string"
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

### POST /api/Review/_getAverageRating

**Description:** Returns the average rating for a specific target.

**Requirements:**
- `target` exists

**Effects:**
- returns the average rating for `target`

**Request Body:**
```json
{
  "target": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "averageRating": "number"
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

# API Specification: Session Concept

**Purpose:** support authentication and user state across multiple requests via session tokens

---

## API Endpoints

### POST /api/Session/createSession

**Description:** Creates a new session for a user with a specified duration, returning a session ID.

**Requirements:**
- `user` exists; `durationMs` is a positive number

**Effects:**
- creates a new `Session` `s`; sets `user` of `s` to `user`;
- sets `expiryTime` of `s` to current time + `durationMs`;
- returns `s` as `session`

**Request Body:**
```json
{
  "user": "string",
  "durationMs": "number"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Session/endSession

**Description:** Ends an active session by deleting it, provided the correct user is specified and the session is not expired.

**Requirements:**
- `session` exists and `user` is its user and session is not expired

**Effects:**
- deletes `session`

**Request Body:**
```json
{
  "session": "string",
  "user": "string"
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

### POST /api/Session/_getSessionUser

**Description:** Returns the user associated with a given active session.

**Requirements:**
- `session` exists and is not expired

**Effects:**
- returns the `user` associated with `session`

**Request Body:**
```json
{
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "string"
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

### POST /api/Session/_getSessionExpiry

**Description:** Returns the expiration timestamp of a given active session.

**Requirements:**
- `session` exists and is not expired

**Effects:**
- returns the `expiryTime` of `session`

**Request Body:**
```json
{
  "session": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "expiryTime": "number"
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

### POST /api/Session/cleanupExpiredSessions

**Description:** Deletes all sessions that have passed their expiration time.

**Requirements:**
- true

**Effects:**
- deletes all expired sessions

**Request Body:**
```json
{}
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

# API Specification: UserAuthentication Concept

**Purpose:** allow users to register with a unique username and password, and then login to authenticate

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**
- `username` is unique; `password` meets complexity requirements (e.g., min length)

**Effects:**
- creates a new `User` `u`; sets `username` of `u` to `username`;
- sets `password` of `u` to a hashed version of `password`; returns `u` as `user`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/UserAuthentication/login

**Description:** Authenticates a user with a username and password, returning the user ID on success.

**Requirements:**
- `username` and `password` match an existing user

**Effects:**
- returns the `user` if credentials are valid

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/UserAuthentication/changePassword

**Description:** Allows a user to change their password, requiring the old password for verification.

**Requirements:**
- `user` exists; `oldPassword` matches current password of `user`; `newPassword` meets complexity requirements

**Effects:**
- sets `password` of `user` to a hashed version of `newPassword`

**Request Body:**
```json
{
  "user": "string",
  "oldPassword": "string",
  "newPassword": "string"
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

### POST /api/UserAuthentication/_getUsername

**Description:** Returns the username for a given user ID.

**Requirements:**
- `user` exists

**Effects:**
- returns the `username` of `user`

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
    "username": "string"
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

### POST /api/UserAuthentication/_userExists

**Description:** Checks if a user with the specified username exists.

**Requirements:**
- true

**Effects:**
- returns `true` if a user with `username` exists, `false` otherwise

**Request Body:**
```json
{
  "username": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "exists": "boolean"
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