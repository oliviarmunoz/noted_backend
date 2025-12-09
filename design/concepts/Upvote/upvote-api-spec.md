[@api-extraction-from-code](../../tools/api-extraction-from-code.md)

[@api-extraction-from-spec](../../tools/api-extraction-from-spec.md)

[@concept-definition](Upvote.md)

[@concept-implementation](implementation.md)

# prompt: generate the API documentation for the Upvote concept, use the implementation reference
# response:

# API Specification: Upvote Concept

**Purpose:** Enable users to upvote items.

---

## API Endpoints

### POST /api/Upvote/upvote

**Description:** Adds a Vote associating the user and the item.

**Requirements:**
- The user has not already upvoted the item.

**Effects:**
- Adds a Vote associating the user and the item.

**Request Body:**
```json
{
  "user": "string",
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

### POST /api/Upvote/unvote

**Description:** Removes the Vote associating the user and the item.

**Requirements:**
- The user has previously upvoted the item.

**Effects:**
- Removes the Vote associating the user and the item.

**Request Body:**
```json
{
  "user": "string",
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

### POST /api/Upvote/\_hasUpvoted

**Description:** Returns `true` if the user has upvoted the item, otherwise `false`.

**Requirements:**
- true

**Effects:**
- Returns `true` if the user has upvoted the item, otherwise `false`.

**Request Body:**
```json
{
  "user": "string",
  "item": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "hasUpvoted": "boolean"
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

### POST /api/Upvote/\_getUpvoteCount

**Description:** Returns the total number of upvotes for the item.

**Requirements:**
- true

**Effects:**
- Returns the total number of upvotes for the item.

**Request Body:**
```json
{
  "item": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "count": "number"
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

### POST /api/Upvote/\_getUpvotedItems

**Description:** Returns all items the user has upvoted.

**Requirements:**
- true

**Effects:**
- Returns all items the user has upvoted.

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

### POST /api/Upvote/\_getUpvoters

**Description:** Returns all users who have upvoted the item.

**Requirements:**
- true

**Effects:**
- Returns all users who have upvoted the item.

**Request Body:**
```json
{
  "item": "string"
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