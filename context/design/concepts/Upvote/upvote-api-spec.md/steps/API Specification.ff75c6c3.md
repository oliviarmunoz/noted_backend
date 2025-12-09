---
timestamp: 'Mon Dec 08 2025 20:29:16 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251208_202916.e3b8732e.md]]'
content_id: ff75c6c36d7dc9d796f46b2b45b4446e42825d309467ae2517c35ffbe1c46687
---

# API Specification: Upvote Concept

**Purpose:** Enable users to upvote items.

***

## API Endpoints

### POST /api/Upvote/upvote

**Description:** Adds a Vote associating the user and the item.

**Requirements:**

* The user has not already upvoted the item.

**Effects:**

* Adds a Vote associating the user and the item.

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

***

### POST /api/Upvote/unvote

**Description:** Removes the Vote associating the user and the item.

**Requirements:**

* The user has previously upvoted the item.

**Effects:**

* Removes the Vote associating the user and the item.

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

***

### POST /api/Upvote/\_hasUpvoted

**Description:** Returns `true` if the user has upvoted the item, otherwise `false`.

**Requirements:**

* true

**Effects:**

* Returns `true` if the user has upvoted the item, otherwise `false`.

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

***

### POST /api/Upvote/\_getUpvoteCount

**Description:** Returns the total number of upvotes for the item.

**Requirements:**

* true

**Effects:**

* Returns the total number of upvotes for the item.

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

***

### POST /api/Upvote/\_getUpvotedItems

**Description:** Returns all items the user has upvoted.

**Requirements:**

* true

**Effects:**

* Returns all items the user has upvoted.

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

***

### POST /api/Upvote/\_getUpvoters

**Description:** Returns all users who have upvoted the item.

**Requirements:**

* true

**Effects:**

* Returns all users who have upvoted the item.

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

***
