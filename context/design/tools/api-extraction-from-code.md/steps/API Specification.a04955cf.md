---
timestamp: 'Sun Nov 23 2025 21:51:23 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_215123.e8de5066.md]]'
content_id: a04955cfe70d177012bc124813a2edb4951b763132949c5b9eda48dac6d29c07
---

# API Specification: Review Concept

**Purpose:** allow users to rate and provide textual feedback on generic targets

***

## API Endpoints

### POST /api/Review/postReview

**Description:** Allows an author to post a new review for a target with a rating and text.

**Requirements:**

* `author` exists; `target` exists; `rating` is between 1 and 5 inclusive;
* `author` has not previously reviewed `target`

**Effects:**

* creates a new `Review` `r`; sets `author` of `r` to `author`; sets `target` of `r` to `target`;
* sets `rating` of `r` to `rating`; sets `text` of `r` to `text`; returns `r` as `review`

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

***

### POST /api/Review/updateReview

**Description:** Updates the rating and text of an existing review, provided the correct author is specified.

**Requirements:**

* `review` exists and `author` is its author; `rating` is between 1 and 5 inclusive

**Effects:**

* sets `rating` of `review` to `rating`; sets `text` of `review` to `text`

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

***

### POST /api/Review/deleteReview

**Description:** Deletes an existing review, provided the correct author is specified.

**Requirements:**

* `review` exists and `author` is its author

**Effects:**

* deletes `review`

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

***

### POST /api/Review/\_getReviewsByTarget

**Description:** Returns a list of all reviews for a specific target, including author, rating, and text.

**Requirements:**

* `target` exists

**Effects:**

* returns set of all `Review`s for `target`, with their `author`, `rating`, and `text`

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

***

### POST /api/Review/\_getReviewsByAuthor

**Description:** Returns a list of all reviews posted by a specific author, including target, rating, and text.

**Requirements:**

* `author` exists

**Effects:**

* returns set of all `Review`s by `author`, with their `target`, `rating`, and `text`

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

***

### POST /api/Review/\_getAverageRating

**Description:** Returns the average rating for a specific target.

**Requirements:**

* `target` exists

**Effects:**

* returns the average rating for `target`

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

***
