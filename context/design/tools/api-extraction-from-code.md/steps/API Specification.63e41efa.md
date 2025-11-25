---
timestamp: 'Sun Nov 23 2025 21:51:23 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_215123.e8de5066.md]]'
content_id: 63e41efa25de9747f2281d7f6625a1c2ba9f96b19dbe3d6af678519e1772dbba
---

# API Specification: Session Concept

**Purpose:** support authentication and user state across multiple requests via session tokens

***

## API Endpoints

### POST /api/Session/createSession

**Description:** Creates a new session for a user with a specified duration, returning a session ID.

**Requirements:**

* `user` exists; `durationMs` is a positive number

**Effects:**

* creates a new `Session` `s`; sets `user` of `s` to `user`;
* sets `expiryTime` of `s` to current time + `durationMs`;
* returns `s` as `session`

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

***

### POST /api/Session/endSession

**Description:** Ends an active session by deleting it, provided the correct user is specified and the session is not expired.

**Requirements:**

* `session` exists and `user` is its user and session is not expired

**Effects:**

* deletes `session`

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

***

### POST /api/Session/\_getSessionUser

**Description:** Returns the user associated with a given active session.

**Requirements:**

* `session` exists and is not expired

**Effects:**

* returns the `user` associated with `session`

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

***

### POST /api/Session/\_getSessionExpiry

**Description:** Returns the expiration timestamp of a given active session.

**Requirements:**

* `session` exists and is not expired

**Effects:**

* returns the `expiryTime` of `session`

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

***

### POST /api/Session/cleanupExpiredSessions

**Description:** Deletes all sessions that have passed their expiration time.

**Requirements:**

* true

**Effects:**

* deletes all expired sessions

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
