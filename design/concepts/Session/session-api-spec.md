[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

[@api-extraction-from-spec](../../tools/api-extraction-from-spec.md)

[@concept-definition](Session.md)

[@concept-implementation](implementation.md)

# prompt: generate the API documentation for the Session concept, use the implementation reference
# response:

# API Specification: Sessioning Concept

**Purpose:** maintain a user's logged-in state across multiple requests without re-sending credentials.

---

## API Endpoints

### POST /api/Sessioning/create

**Description:** Creates a new session and associates it with a given user.

**Requirements:**
- true.

**Effects:**
- a new session is created; the session is associated with the given user; returns the session created

**Request Body:**
```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "session": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Sessioning/delete

**Description:** Deletes an existing session.

**Requirements:**
- the given session exists

**Effects:**
- the session is removed

**Request Body:**
```json
{
  "session": "ID"
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

### POST /api/Sessioning/_getUser

**Description:** Retrieves the user associated with a given session.

**Requirements:**
- the given session exists

**Effects:**
- returns the user associated with the session.

**Request Body:**
```json
{
  "session": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "ID"
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