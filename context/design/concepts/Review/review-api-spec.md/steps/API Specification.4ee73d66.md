---
timestamp: 'Sun Nov 23 2025 17:57:28 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_175728.7c6ab515.md]]'
content_id: 4ee73d66e9bb65c3cda79b86399dc19afc423ef964fb31919593ebbb44fa44eb
---

# API Specification: Review Concept

**Purpose:** Enable users to provide qualitative and quantitative feedback on items.

***

## API Endpoints

### POST /api/Review/postReview

**Description:** Creates and returns a review with the given information.

**Requirements:**

* `ratingNumber` is an integer in the range \[0,5].
* A user can only post one review per item.

**Effects:**

* Creates and returns a review with the given information.

**Request Body:**

```json
{
  "item": "ID",
  "user": "ID",
  "ratingNumber": "number",
  "notes": "string (optional)"
}
```

**Success Response Body (Action):**

```json
{
  "review": "ID"
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

**Description:** Updates the `ratingNumber` and `notes` of the associated review.

**Requirements:**

* `review` exists.
* `ratingNumber` is an integer in the range \[0,5].

**Effects:**

* Updates the `ratingNumber` and `notes` of the associated `review`.

**Request Body:**

```json
{
  "review": "ID",
  "ratingNumber": "number",
  "notes": "string (optional)"
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

**Description:** Removes the associated review from the set of all reviews.

**Requirements:**

* `review` exists.

**Effects:**

* Removes the associated `review` from the set of all reviews.

**Request Body:**

```json
{
  "review": "ID"
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

### POST /api/Review/addComment

**Description:** Adds a comment by the input user to the list of comments of the associated review.

**Requirements:**

* `review` exists.

**Effects:**

* Adds a comment by the input user to the list of comments of the associated `review`.

**Request Body:**

```json
{
  "review": "ID",
  "commenter": "ID",
  "comment": "string"
}
```

**Success Response Body (Action):**

```json
{
  "commentId": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Review/deleteComment

**Description:** Deletes the comment from the list.

**Requirements:**

* `review` to be in the set of reviews.
* `commentId` to be in list of comments of the associated review.

**Effects:**

* Deletes the comment from the list.

**Request Body:**

```json
{
  "review": "ID",
  "commentId": "ID"
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

### POST /api/Review/\_getReviewByItemAndUser

**Description:** Returns the review that the given user has authored for an item, or null if not found.

**Requirements:**

* None.

**Effects:**

* Returns the review that the given `user` has authored for an `item`.

**Request Body:**

```json
{
  "item": "ID",
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "item": "ID",
    "user": "ID",
    "rating": "number",
    "date": "Date",
    "notes": "string (optional)",
    "comments": [
      {
        "commentId": "ID",
        "commenter": "ID",
        "notes": "string",
        "date": "Date"
      }
    ]
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

### POST /api/Review/\_getItemReviews

**Description:** Returns reviews associated with that item.

**Requirements:**

* None.

**Effects:**

* Returns reviews associated with that `item`.

**Request Body:**

```json
{
  "item": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "item": "ID",
    "user": "ID",
    "rating": "number",
    "date": "Date",
    "notes": "string (optional)",
    "comments": [
      {
        "commentId": "ID",
        "commenter": "ID",
        "notes": "string",
        "date": "Date"
      }
    ]
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

### POST /api/Review/\_getUserReviews

**Description:** Returns reviews associated with the given user.

**Requirements:**

* None.

**Effects:**

* Returns reviews associated with the given `user`.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "item": "ID",
    "user": "ID",
    "rating": "number",
    "date": "Date",
    "notes": "string (optional)",
    "comments": [
      {
        "commentId": "ID",
        "commenter": "ID",
        "notes": "string",
        "date": "Date"
      }
    ]
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

### POST /api/Review/\_getReviewComments

**Description:** Returns all comments associated with the given review.

**Requirements:**

* None.

**Effects:**

* Returns all comments associated with the given `review`.

**Request Body:**

```json
{
  "review": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "commentId": "ID",
    "commenter": "ID",
    "notes": "string",
    "date": "Date"
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
