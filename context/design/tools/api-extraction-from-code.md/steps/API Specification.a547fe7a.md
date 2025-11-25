---
timestamp: 'Tue Nov 25 2025 12:49:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_124955.894c5a4e.md]]'
content_id: a547fe7aa5c651b9c003ab587a107cc46b7543fb6ec8061a421a65429aadbd8e
---

# API Specification: Friending Concept

**Purpose:** support the creation of friendships between users

***

## API Endpoints

### POST /api/Friending/createFriendship

**Description:** Creates a new friendship between two users.

**Requirements:**

* no Friendship already exists between `sender` and `receiver` (either direction)
* `sender` and `receiver` are not the same user

**Effects:**

* creates a new Friendship `f`
* sets `f.sender` to `sender` and `f.receiver` to `receiver`
* sets `f.createdAt` to the current time
* returns `f` as `friendship`

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

***

### POST /api/Friending/deleteFriendship

**Description:** Deletes an existing friendship.

**Requirements:**

* the `friendship` exists

**Effects:**

* deletes the `friendship`

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

***

### POST /api/Friending/\_getFriends

**Description:** Returns a set of all Users who are friends with the specified user.

**Requirements:**

* true

**Effects:**

* returns a set of all Users who are friends with `user`

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

### POST /api/Friending/\_getFriendship

**Description:** Returns the Friendship ID if a friendship exists between two users.

**Requirements:**

* true

**Effects:**

* returns the Friendship ID if a friendship exists between `userA` and `userB`, or an empty array if not

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

***

### POST /api/Friending/\_getFriendshipsOfUser

**Description:** Returns all Friendship IDs associated with the given user.

**Requirements:**

* true

**Effects:**

* returns all Friendship IDs associated with the given `user`

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

***
