---
timestamp: 'Sun Nov 23 2025 21:51:23 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_215123.e8de5066.md]]'
content_id: 9a0f0ec93777c3ee3115af04feed58664fc634554c3570660178e46361675cfe
---

# API Specification: UserAuthentication Concept

**Purpose:** allow users to register with a unique username and password, and then login to authenticate

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

* `username` is unique; `password` meets complexity requirements (e.g., min length)

**Effects:**

* creates a new `User` `u`; sets `username` of `u` to `username`;
* sets `password` of `u` to a hashed version of `password`; returns `u` as `user`

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

***

### POST /api/UserAuthentication/login

**Description:** Authenticates a user with a username and password, returning the user ID on success.

**Requirements:**

* `username` and `password` match an existing user

**Effects:**

* returns the `user` if credentials are valid

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

***

### POST /api/UserAuthentication/changePassword

**Description:** Allows a user to change their password, requiring the old password for verification.

**Requirements:**

* `user` exists; `oldPassword` matches current password of `user`; `newPassword` meets complexity requirements

**Effects:**

* sets `password` of `user` to a hashed version of `newPassword`

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

***

### POST /api/UserAuthentication/\_getUsername

**Description:** Returns the username for a given user ID.

**Requirements:**

* `user` exists

**Effects:**

* returns the `username` of `user`

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

***

### POST /api/UserAuthentication/\_userExists

**Description:** Checks if a user with the specified username exists.

**Requirements:**

* true

**Effects:**

* returns `true` if a user with `username` exists, `false` otherwise

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

***
