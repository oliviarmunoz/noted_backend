---
timestamp: 'Sun Nov 23 2025 21:37:02 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251123_213702.40b67bd6.md]]'
content_id: 0d46263e9a379ea5339e35a6d90c7861e1cfa0f1206fa4d4460220de715fd61a
---

# API Specification: Review Concept

**Purpose:** Enable users to provide qualitative and quantitative feedback on items.

***

## API Endpoints

### POST /api/Review/postReview

**Description:** Creates a new review for an item by a user with a given rating and optional notes.

**Requirements:**

* `ratingNumber` is an integer in the range \[0,5].
* A user can only post one review per item.

**Effects:**

* Creates and returns a review with the given information.

**Request Body:**

```json
{
  "item": "string",
  "user": "string",
  "ratingNumber": "number",
  "notes": "string"
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

**Description:** Updates the rating and/or notes of an existing review.

**Requirements:**

* `review` exists.
* `ratingNumber` is an integer in the range \[0,5].

**Effects:**

* Updates the `ratingNumber` and `notes` of the associated `review`.

**Request Body:**

```json
{
  "review": "string",
  "ratingNumber": "number",
  "notes": "string"
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

* `review` exists.

**Effects:**

* Removes the associated `review` from the set of all reviews.

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

### POST /api/Review/addComment

**Description:** Adds a new comment to an existing review.

**Requirements:**

* `review` exists.

**Effects:**

* Adds a comment by the input user to the list of comments of the associated `review`.

**Request Body:**

```json
{
  "review": "string",
  "commenter": "string",
  "comment": "string"
}
```

**Success Response Body (Action):**

```json
{
  "commentId": "string"
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

**Description:** Deletes a specific comment from a review.

**Requirements:**

* `review` to be in the set of reviews.
* `commentId` to be in list of comments of the associated review.

**Effects:**

* Deletes the comment from the list.

**Request Body:**

```json
{
  "review": "string",
  "commentId": "string"
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

**Description:** Returns the review that the given user has authored for an item, or an empty array if not found.

**Requirements:**

* (Implicitly: a review by the specified user for the item may or may not exist.)

**Effects:**

* Returns the review that the given `user` has authored for an `item`.

**Request Body:**

```json
{
  "item": "string",
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "item": "string",
    "user": "string",
    "rating": "number",
    "date": "string",
    "notes": "string",
    "comments": [
      {
        "commentId": "string",
        "commenter": "string",
        "notes": "string",
        "date": "string"
      }
    ]
  }
]
```

*(Returns an empty array `[]` if no matching review is found)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Review/\_getItemReviews

**Description:** Retrieves all reviews associated with a specific item.

**Requirements:**

* None.

**Effects:**

* Returns reviews associated with that `item`.

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
    "id": "string",
    "item": "string",
    "user": "string",
    "rating": "number",
    "date": "string",
    "notes": "string",
    "comments": [
      {
        "commentId": "string",
        "commenter": "string",
        "notes": "string",
        "date": "string"
      }
    ]
  }
]
```

*(Returns an empty array `[]` if no reviews are found for the item)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Review/\_getUserReviews

**Description:** Retrieves all reviews authored by a specific user.

**Requirements:**

* None.

**Effects:**

* Returns reviews associated with the given `user`.

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
    "id": "string",
    "item": "string",
    "user": "string",
    "rating": "number",
    "date": "string",
    "notes": "string",
    "comments": [
      {
        "commentId": "string",
        "commenter": "string",
        "notes": "string",
        "date": "string"
      }
    ]
  }
]
```

*(Returns an empty array `[]` if no reviews are found for the user)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Review/\_getReviewComments

**Description:** Retrieves all comments associated with a specific review.

**Requirements:**

* None.

**Effects:**

* Returns all comments associated with the given `review`.

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
    "commentId": "string",
    "commenter": "string",
    "notes": "string",
    "date": "string"
  }
]
```

*(Returns an empty array `[]` if no comments are found for the review or the review does not exist)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
