---
timestamp: 'Sat Nov 22 2025 16:28:26 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_162826.05e2a64e.md]]'
content_id: a93f9242ebe5857f0ca326fc30c3334735a3c8ab880ad292f3e89d641bc26bd4
---

# concept: Review \[User, Item]

**Purpose**: Enable users to provide qualitative and quantitative feedback on items. \
**Principle**: A user creates a review for an item containing a numerical rating and an optional written entry; modify the entry and rating for this review if needed; the user can also delete their review; each review can optionally create comments from other users associated with it and delete those comments.

**State**

* a set of **Reviews** with
  * an **item** Item
  * a **user** User
  * a **rating** Number
  * a **date** Date
  * an optional **notes** String
  * a set of **comments** with
    * a **commentId** Id
    * a **commenter** User
    * a **notes** String

**Actions**

* `postReview(item: Item, user: User, ratingNumber: Number, notes: String): (review: Review)`
  * *Requires*: `ratingNumber` is an integer in the range \[0,5].
  * *Effects*: Creates and returns a review with the given information.
* `updateReview(review: Review, ratingNumber: Number, notes: String)`
  * *Requires*: `review` exists, `ratingNumber` is an integer in the range \[0,5].
  * *Effects*: Updates the `ratingNumber` and `notes` of the associated `review`.
* `deleteReview(review: Review)`
  * *Requires*: `review` exists.
  * *Effects*: Removes the associated `review` from the set of all reviews.
* `addComment(review: Review, commenter: User, comment: String): (commentId: Id)`
  * *Requires*: `review` exists.
  * *Effects*: Adds a comment by the input user to the list of comments of the associated `review`.
* `deleteComment(review: Review, comment: commentId)`
  * *Requires*: `review` to be in the set of reviews, `commentId` to be in list of comments of the associated review.
  * *Effects*: Deletes the comment from the list.
* `_getReviewByItemAndUser(item: Item, user: User): Review`
  * *Requires*: `review` exists.
  * *Effects*: Returns the reviews that the given `user` has authored for an `item`.
* `_getItemReviews(item: Item): Review[]`
  * *Effects*: Returns reviews associated with that `item`.
* `_getUserReviews(user: User): Review[]`
  * *Effects*: Returns reviews associated with the given `user`.
* `_getReviewComments(review: Review): Id[]`
  * *Effects*: Returns all comments associated with the given `review`.
