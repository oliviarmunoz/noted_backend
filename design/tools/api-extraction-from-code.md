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

Verify that every endpoint is in the code. Do not make up any endpoints or leave out any endpoints.
# response:

# API Specification: Friending Concept

**Purpose:** support the creation of friendships between users

---

## API Endpoints

### POST /api/Friending/createFriendship

**Description:** Creates a new friendship between two users.

**Requirements:**
- no Friendship already exists between `sender` and `receiver` (either direction)
- `sender` and `receiver` are not the same user

**Effects:**
- creates a new Friendship `f`
- sets `f.sender` to `sender` and `f.receiver` to `receiver`
- sets `f.createdAt` to the current time
- returns `f` as `friendship`

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
  "friendship": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Friending/deleteFriendship

**Description:** Deletes an existing friendship.

**Requirements:**
- the `friendship` exists

**Effects:**
- deletes the `friendship`

**Request Body:**
```json
{
  "friendship": "string"
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

**Description:** Returns a set of all Users who are friends with the specified user.

**Requirements:**
- true

**Effects:**
- returns a set of all Users who are friends with `user`

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

### POST /api/Friending/_getFriendship

**Description:** Returns the Friendship ID if a friendship exists between two users.

**Requirements:**
- true

**Effects:**
- returns the Friendship ID if a friendship exists between `userA` and `userB`, or an empty array if not

**Request Body:**
```json
{
  "userA": "string",
  "userB": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "friendship": "string"
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

### POST /api/Friending/_getFriendshipsOfUser

**Description:** Returns all Friendship IDs associated with the given user.

**Requirements:**
- true

**Effects:**
- returns all Friendship IDs associated with the given `user`

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
    "friendship": "string"
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

**Purpose:** support users in creating, managing, and sharing ordered collections of items

---

## API Endpoints

### POST /api/Playlist/createPlaylist

**Description:** Creates a new playlist for an owner with a specified name.

**Requirements:**
- `name` is not empty

**Effects:**
- creates a new Playlist `p`
- sets `p.owner` to `owner`
- sets `p.name` to `name`
- sets `p.createdAt` and `p.lastModified` to the current time
- returns `p` as `playlist`

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

### POST /api/Playlist/renamePlaylist

**Description:** Renames an existing playlist.

**Requirements:**
- the `playlist` exists
- `newName` is not empty

**Effects:**
- updates the `name` of the `playlist` to `newName`
- updates `lastModified` to the current time

**Request Body:**
```json
{
  "playlist": "string",
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

### POST /api/Playlist/deletePlaylist

**Description:** Deletes a playlist and all its associated items.

**Requirements:**
- the `playlist` exists

**Effects:**
- deletes the `playlist` and all its associated `playlistItems`

**Request Body:**
```json
{
  "playlist": "string"
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

### POST /api/Playlist/addItemToPlaylist

**Description:** Adds an item to a playlist at the end.

**Requirements:**
- the `playlist` exists
- the `item` is not already in the `playlist`

**Effects:**
- adds the `item` to the `playlist` at the end
- sets its `order` to be the next available integer
- sets `createdAt` to the current time
- updates `playlist.lastModified`
- returns the ID of the new playlist item as `playlistItem`

**Request Body:**
```json
{
  "playlist": "string",
  "item": "string"
}
```

**Success Response Body (Action):**
```json
{
  "playlistItem": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Playlist/removeItemFromPlaylist

**Description:** Removes an item from a playlist and reorders subsequent items.

**Requirements:**
- the `playlist` exists
- the `item` is in the `playlist`

**Effects:**
- removes the `item` from the `playlist`
- updates the `order` of subsequent items
- updates `playlist.lastModified`

**Request Body:**
```json
{
  "playlist": "string",
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

### POST /api/Playlist/reorderPlaylistItem

**Description:** Reorders an item within a playlist to a new position.

**Requirements:**
- the `playlist` exists
- the `item` is in the `playlist`
- `newOrder` is a non-negative integer and within the bounds of the playlist size

**Effects:**
- updates the `order` of the `item` to `newOrder`, shifting other items as necessary
- updates `playlist.lastModified`

**Request Body:**
```json
{
  "playlist": "string",
  "item": "string",
  "newOrder": "number"
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

### POST /api/Playlist/_getPlaylistById

**Description:** Returns the details of a specific playlist by its ID.

**Requirements:**
- the `playlist` exists

**Effects:**
- returns the details of the playlist: its owner, name, creation date, and last modified date

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
    "owner": "string",
    "name": "string",
    "createdAt": "string",
    "lastModified": "string"
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

### POST /api/Playlist/_getPlaylistsByOwner

**Description:** Returns a list of playlists owned by a specific user.

**Requirements:**
- true

**Effects:**
- returns a list of playlists owned by the `owner`, including their IDs, names, creation dates, and last modified dates

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
    "name": "string",
    "createdAt": "string",
    "lastModified": "string"
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

**Description:** Returns all items in a playlist, ordered by their `order` property.

**Requirements:**
- the `playlist` exists

**Effects:**
- returns all items in the `playlist`, ordered by their `order` property, including their ID, order, and creation date

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
    "item": "string",
    "order": "number",
    "createdAt": "string"
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

**Purpose:** support users in providing feedback and ratings on specific targets

---

## API Endpoints

### POST /api/Review/createReview

**Description:** Creates a new review for a target with a rating and optional text.

**Requirements:**
- `rating` is between 1 and 5 (inclusive)
- a `User` can only create one `Review` for a given `Target`

**Effects:**
- creates a new Review `r`
- sets `r.author` to `author`, `r.target` to `target`, `r.rating` to `rating`, and `r.text` if provided
- sets `r.createdAt` and `r.lastModified` to the current time
- returns `r` as `review`

**Request Body:**
```json
{
  "author": "string",
  "target": "string",
  "rating": "number",
  "text": "string" (optional)
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

**Description:** Updates the rating and/or text of an existing review.

**Requirements:**
- the `review` exists
- if `rating` is provided, it must be between 1 and 5 (inclusive)
- at least one of `rating` or `text` must be provided

**Effects:**
- updates the `rating` and/or `text` of the `review` if provided
- updates `lastModified` to the current time

**Request Body:**
```json
{
  "review": "string",
  "rating": "number" (optional),
  "text": "string" (optional)
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

**Description:** Deletes an existing review.

**Requirements:**
- the `review` exists

**Effects:**
- deletes the `review`

**Request Body:**
```json
{
  "review": "string"
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

### POST /api/Review/_getReviewById

**Description:** Returns the details of a specific review by its ID.

**Requirements:**
- the `review` exists

**Effects:**
- returns the details of the review: author, target, rating, text, creation date, and last modified date

**Request Body:**
```json
{
  "review": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "author": "string",
    "target": "string",
    "rating": "number",
    "text": "string" (optional),
    "createdAt": "string",
    "lastModified": "string"
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

### POST /api/Review/_getReviewsByTarget

**Description:** Returns a list of all reviews for a given target.

**Requirements:**
- true

**Effects:**
- returns a list of all reviews for a given `target`, including their ID, author, rating, text, creation date, and last modified date

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
    "text": "string" (optional),
    "createdAt": "string",
    "lastModified": "string"
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

**Description:** Returns a list of all reviews created by a given author.

**Requirements:**
- true

**Effects:**
- returns a list of all reviews created by a given `author`, including their ID, target, rating, text, creation date, and last modified date

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
    "text": "string" (optional),
    "createdAt": "string",
    "lastModified": "string"
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

**Purpose:** provide temporary, authenticated access to a user's account for a limited duration

---

## API Endpoints

### POST /api/Session/createSession

**Description:** Creates a new session for a user with a specified duration.

**Requirements:**
- `user` exists
- `durationHours` is a positive number

**Effects:**
- creates a new Session `s`
- sets `s.user` to `user`
- sets `s.createdAt` to the current time
- sets `s.expiresAt` to `durationHours` from now
- returns `s` as `session` and `s.expiresAt` as `expiresAt`

**Request Body:**
```json
{
  "user": "string",
  "durationHours": "number"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string",
  "expiresAt": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Session/deleteSession

**Description:** Deletes an existing session.

**Requirements:**
- the `session` exists

**Effects:**
- deletes the `session`

**Request Body:**
```json
{
  "session": "string"
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

### POST /api/Session/deleteExpiredSessions

**Description:** Deletes all sessions where `expiresAt` is in the past.

**Requirements:**
- current time is after `expiresAt` for one or more sessions

**Effects:**
- deletes all sessions where `expiresAt` is in the past

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

### POST /api/Session/_getSessionById

**Description:** Returns the details of a specific session by its ID.

**Requirements:**
- the `session` exists

**Effects:**
- returns the details of the session: user, creation date, and expiration date

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
    "user": "string",
    "createdAt": "string",
    "expiresAt": "string"
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

### POST /api/Session/_getSessionsByUser

**Description:** Returns a list of all active sessions for a given user.

**Requirements:**
- true

**Effects:**
- returns a list of all active sessions for a given `user`, including their ID, creation date, and expiration date

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
    "session": "string",
    "createdAt": "string",
    "expiresAt": "string"
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

### POST /api/Session/_isSessionValid

**Description:** Returns `true` if the session exists and has not expired, `false` otherwise.

**Requirements:**
- true

**Effects:**
- returns `true` if the session exists and has not expired, `false` otherwise

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
    "isValid": "boolean"
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
# API Specification: UserAuthentication Concept

**Purpose:** provide secure authentication for users with usernames and passwords

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and a password.

**Requirements:**
- `username` is unique and not empty
- `password` meets complexity requirements (e.g., min length)

**Effects:**
- creates a new User `u`
- sets `u.username` to `username`
- hashes `password` and sets `u.passwordHash`
- returns `u` as `user`

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

**Description:** Authenticates a user with their username and password.

**Requirements:**
- `username` and `password` match an existing user

**Effects:**
- authenticates the user
- returns the User ID as `user`

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

**Description:** Changes the password for an existing user.

**Requirements:**
- the `user` exists and `oldPassword` is correct
- `newPassword` meets complexity requirements and is different from `oldPassword`

**Effects:**
- updates the `passwordHash` for the `user` to `newPasswordHash`

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

### POST /api/UserAuthentication/deleteUser

**Description:** Deletes an existing user account.

**Requirements:**
- the `user` exists

**Effects:**
- deletes the `user`

**Request Body:**
```json
{
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

### POST /api/UserAuthentication/_getUserByUsername

**Description:** Returns the User ID associated with the given username.

**Requirements:**
- true

**Effects:**
- returns the User ID associated with the given `username`, or an empty array if not found

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

### POST /api/UserAuthentication/_getUsername

**Description:** Returns the username of the user.

**Requirements:**
- the `user` exists

**Effects:**
- returns the username of the `user`

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