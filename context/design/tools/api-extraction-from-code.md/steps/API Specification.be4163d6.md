---
timestamp: 'Tue Nov 25 2025 12:49:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_124955.894c5a4e.md]]'
content_id: be4163d68b2472a01f8da1f6d11f782a3cb4b12c6a5632d63ee10f32fe34ee64
---

# API Specification: UserAuthentication Concept

**Purpose:** provide secure authentication for users with usernames and passwords

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Registers a new user with a unique username and a password.

**Requirements:**

* `username` is unique and not empty
* `password` meets complexity requirements (e.g., min length)

**Effects:**

* creates a new User `u`
* sets `u.username` to `username`
* hashes `password` and sets `u.passwordHash`
* returns `u` as `user`

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

**Description:** Authenticates a user with their username and password.

**Requirements:**

* `username` and `password` match an existing user

**Effects:**

* authenticates the user
* returns the User ID as `user`

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

**Description:** Changes the password for an existing user.

**Requirements:**

* the `user` exists and `oldPassword` is correct
* `newPassword` meets complexity requirements and is different from `oldPassword`

**Effects:**

* updates the `passwordHash` for the `user` to `newPasswordHash`

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

### POST /api/UserAuthentication/deleteUser

**Description:** Deletes an existing user account.

**Requirements:**

* the `user` exists

**Effects:**

* deletes the `user`

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

***

### POST /api/UserAuthentication/\_getUserByUsername

**Description:** Returns the User ID associated with the given username.

**Requirements:**

* true

**Effects:**

* returns the User ID associated with the given `username`, or an empty array if not found

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

***

### POST /api/UserAuthentication/\_getUsername

**Description:** Returns the username of the user.

**Requirements:**

* the `user` exists

**Effects:**

* returns the username of the `user`

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
