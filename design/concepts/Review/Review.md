[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

# concept: Review [User, Item]

**Purpose**: Enable users to provide qualitative and quantitative feedback on items. \
**Principle**: A user creates a review for an item containing a numerical rating and an optional written entry; modify the entry and rating for this review if needed; the user can also delete their review; each review can optionally create comments from other users associated with it and delete those comments.

**State**

- a set of **Reviews** with
  - an **item** Item
  - a **user** User
  - a **rating** Number
  - a **date** Date
  - an optional **notes** String
  - a set of **comments** with
    - a **commentId** Id
    - a **commenter** User
    - a **notes** String

**Actions**

- `postReview(item: Item, user: User, ratingNumber: Number, notes: String): (review: Review)`
  - _Requires_: `ratingNumber` is an integer in the range [0,5].
  - _Effects_: Creates and returns a review with the given information.
- `updateReview(review: Review, ratingNumber: Number, notes: String)`
  - _Requires_: `review` exists, `ratingNumber` is an integer in the range [0,5].
  - _Effects_: Updates the `ratingNumber` and `notes` of the associated `review`.
- `deleteReview(review: Review)`
  - _Requires_: `review` exists.
  - _Effects_: Removes the associated `review` from the set of all reviews.
- `addComment(review: Review, commenter: User, comment: String): (commentId: Id)`
  - _Requires_: `review` exists.
  - _Effects_: Adds a comment by the input user to the list of comments of the associated `review`.
- `deleteComment(review: Review, comment: commentId)`
  - _Requires_: `review` to be in the set of reviews, `commentId` to be in list of comments of the associated review.
  - _Effects_: Deletes the comment from the list.
- `_getReviewByItemAndUser(item: Item, user: User): Review`
  - _Requires_: `review` exists.
  - _Effects_: Returns the reviews that the given `user` has authored for an `item`.
- `_getItemReviews(item: Item): Review[]`
  - _Effects_: Returns reviews associated with that `item`.
- `_getUserReviews(user: User): Review[]`
  - _Effects_: Returns reviews associated with the given `user`.
- `_getReviewComments(review: Review): Id[]`
  - _Effects_: Returns all comments associated with the given `review`.