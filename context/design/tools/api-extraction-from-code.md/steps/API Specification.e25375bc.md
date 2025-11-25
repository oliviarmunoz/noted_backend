---
timestamp: 'Tue Nov 25 2025 12:49:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_124955.894c5a4e.md]]'
content_id: e25375bccb56c1e8985b7c0ff13fb3eff99cac394096df02b7a930d47803ec76
---

# API Specification: Session Concept

**Purpose:** provide temporary, authenticated access to a user's account for a limited duration

***

## API Endpoints

### POST /api/Session/createSession

**Description:** Creates a new session for a user with a specified duration.

**Requirements:**

* `user` exists
* `durationHours` is a positive number

**Effects:**

* creates a new Session `s`
* sets `s.user` to `user`
* sets `s.createdAt` to the current time
* sets `s.expiresAt` to `durationHours` from now
* returns `s` as `session` and `s.expiresAt` as `expiresAt`

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

***

### POST /api/Session/deleteSession

**Description:** Deletes an existing session.

**Requirements:**

* the `session` exists

**Effects:**

* deletes the `session`

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

***

### POST /api/Session/deleteExpiredSessions

**Description:** Deletes all sessions where `expiresAt` is in the past.

**Requirements:**

* current time is after `expiresAt` for one or more sessions

**Effects:**

* deletes all sessions where `expiresAt` is in the past

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

***

### POST /api/Session/\_getSessionById

**Description:** Returns the details of a specific session by its ID.

**Requirements:**

* the `session` exists

**Effects:**

* returns the details of the session: user, creation date, and expiration date

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

***

### POST /api/Session/\_getSessionsByUser

**Description:** Returns a list of all active sessions for a given user.

**Requirements:**

* true

**Effects:**

* returns a list of all active sessions for a given `user`, including their ID, creation date, and expiration date

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

***

### POST /api/Session/\_isSessionValid

**Description:** Returns `true` if the session exists and has not expired, `false` otherwise.

**Requirements:**

* true

**Effects:**

* returns `true` if the session exists and has not expired, `false` otherwise

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

***
