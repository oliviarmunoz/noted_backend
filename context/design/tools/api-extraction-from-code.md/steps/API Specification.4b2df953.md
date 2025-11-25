---
timestamp: 'Tue Nov 25 2025 12:49:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_124955.894c5a4e.md]]'
content_id: 4b2df953a19f4981f97d62680ae881d0687bc4dcf6d361407b6f88b6d54589bc
---

# API Specification: Review Concept

**Purpose:** support users in providing feedback and ratings on specific targets

***

## API Endpoints

### POST /api/Review/createReview

**Description:** Creates a new review for a target with a rating and optional text.

**Requirements:**

* `rating` is between 1 and 5 (inclusive)
* a `User` can only create one `Review` for a given `Target`

**Effects:**

* creates a new Review `r`
* sets `r.author` to `author`, `r.target` to `target`, `r.rating` to `rating`, and `r.text` if provided
* sets `r.createdAt` and `r.lastModified` to the current time
* returns `r` as `review`

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

***

### POST /api/Review/updateReview

**Description:** Updates the rating and/or text of an existing review.

**Requirements:**

* the `review` exists
* if `rating` is provided, it must be between 1 and 5 (inclusive)
* at least one of `rating` or `text` must be provided

**Effects:**

* updates the `rating` and/or `text` of the `review` if provided
* updates `lastModified` to the current time

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

***

### POST /api/Review/deleteReview

**Description:** Deletes an existing review.

**Requirements:**

* the `review` exists

**Effects:**

* deletes the `review`

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

***

### POST /api/Review/\_getReviewById

**Description:** Returns the details of a specific review by its ID.

**Requirements:**

* the `review` exists

**Effects:**

* returns the details of the review: author, target, rating, text, creation date, and last modified date

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

***

### POST /api/Review/\_getReviewsByTarget

**Description:** Returns a list of all reviews for a given target.

**Requirements:**

* true

**Effects:**

* returns a list of all reviews for a given `target`, including their ID, author, rating, text, creation date, and last modified date

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

***

### POST /api/Review/\_getReviewsByAuthor

**Description:** Returns a list of all reviews created by a given author.

**Requirements:**

* true

**Effects:**

* returns a list of all reviews created by a given `author`, including their ID, target, rating, text, creation date, and last modified date

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

***
