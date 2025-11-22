---
timestamp: 'Sat Nov 22 2025 16:23:12 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_162312.152fba64.md]]'
content_id: d991ea6ed31d95684a6f1c54e1eb77db19d1971db79966f386a60f4b68f0a342
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Review" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Item = ID;

// Internal entity types, represented as IDs
type Review = ID;

/**
 * State: Embedded comment structure within a Review.
 *
 * a set of comments with
 *   a commentId Id
 *   a commenter User
 *   a notes String
 */
interface Comment {
  commentId: ID; // Unique identifier for the comment within the review
  commenter: User;
  notes: string;
  date: Date; // Added date for comments for better auditing/ordering
}

/**
 * State: A set of Reviews with item, user, rating, date, optional notes, and embedded comments.
 *
 * a set of Reviews with
 *   an item Item
 *   a user User
 *   a rating Number
 *   a date Date
 *   an optional notes String
 *   a set of comments with ...
 */
interface ReviewDoc {
  _id: Review;
  item: Item;
  user: User;
  rating: number;
  date: Date;
  notes?: string; // optional field
  comments: Comment[];
}

/**
 * @concept Review
 * @purpose Enable users to provide qualitative and quantitative feedback on items.
 * @principle A user creates a review for an item containing a numerical rating and an optional written entry;
 * modify the entry and rating for this review if needed; the user can also delete their review;
 * each review can optionally create comments from other users associated with it and delete those comments.
 */
export default class ReviewConcept {
  reviews: Collection<ReviewDoc>;

  constructor(private readonly db: Db) {
    this.reviews = this.db.collection(PREFIX + "reviews");
  }

  /**
   * Action: postReview (item: Item, user: User, ratingNumber: Number, notes: String): (review: Review)
   *
   * @requires ratingNumber is an integer in the range [0,5].
   * @requires A user can only post one review per item.
   * @effects Creates and returns a review with the given information.
   */
  async postReview(
    { item, user, ratingNumber, notes }: { item: Item; user: User; ratingNumber: number; notes?: string },
  ): Promise<{ review: Review } | { error: string }> {
    if (ratingNumber < 0 || ratingNumber > 5 || !Number.isInteger(ratingNumber)) {
      return { error: "Rating must be an integer between 0 and 5." };
    }

    const existingReview = await this.reviews.findOne({ item, user });
    if (existingReview) {
      return { error: `User ${user} has already reviewed item ${item}.` };
    }

    const reviewId = freshID() as Review;
    const newReview: ReviewDoc = {
      _id: reviewId,
      item,
      user,
      rating: ratingNumber,
      date: new Date(),
      notes,
      comments: [],
    };

    await this.reviews.insertOne(newReview);
    return { review: reviewId };
  }

  /**
   * Action: updateReview (review: Review, ratingNumber: Number, notes: String)
   *
   * @requires review exists, ratingNumber is an integer in the range [0,5].
   * @effects Updates the ratingNumber and notes of the associated review.
   */
  async updateReview(
    { review, ratingNumber, notes }: { review: Review; ratingNumber: number; notes?: string },
  ): Promise<Empty | { error: string }> {
    if (ratingNumber < 0 || ratingNumber > 5 || !Number.isInteger(ratingNumber)) {
      return { error: "Rating must be an integer between 0 and 5." };
    }

    const result = await this.reviews.updateOne(
      { _id: review },
      { $set: { rating: ratingNumber, notes, date: new Date() } }, // Also update the date on modification
    );

    if (result.matchedCount === 0) {
      return { error: `Review with ID ${review} not found.` };
    }
    return {};
  }

  /**
   * Action: deleteReview (review: Review)
   *
   * @requires review exists.
   * @effects Removes the associated review from the set of all reviews.
   */
  async deleteReview({ review }: { review: Review }): Promise<Empty | { error: string }> {
    const result = await this.reviews.deleteOne({ _id: review });

    if (result.deletedCount === 0) {
      return { error: `Review with ID ${review} not found.` };
    }
    return {};
  }

  /**
   * Action: addComment (review: Review, commenter: User, comment: String): (commentId: Id)
   *
   * @requires review exists.
   * @effects Adds a comment by the input user to the list of comments of the associated review.
   */
  async addComment(
    { review, commenter, comment }: { review: Review; commenter: User; comment: string },
  ): Promise<{ commentId: ID } | { error: string }> {
    const commentId = freshID();
    const newComment: Comment = { commentId, commenter, notes: comment, date: new Date() };

    const result = await this.reviews.updateOne(
      { _id: review },
      { $push: { comments: newComment } },
    );

    if (result.matchedCount === 0) {
      return { error: `Review with ID ${review} not found.` };
    }
    return { commentId };
  }

  /**
   * Action: deleteComment (review: Review, comment: commentId)
   *
   * @requires review to be in the set of reviews, commentId to be in list of comments of the associated review.
   * @effects Deletes the comment from the list.
   */
  async deleteComment(
    { review, commentId }: { review: Review; commentId: ID },
  ): Promise<Empty | { error: string }> {
    const result = await this.reviews.updateOne(
      { _id: review },
      { $pull: { comments: { commentId } } },
    );

    if (result.matchedCount === 0) {
      // Review not found or comment not found within review
      const reviewExists = await this.reviews.countDocuments({ _id: review });
      if (reviewExists === 0) {
        return { error: `Review with ID ${review} not found.` };
      } else {
        return { error: `Comment with ID ${commentId} not found in review ${review}.` };
      }
    }
    return {};
  }

  /**
   * Query: _getReviewByItemAndUser (item: Item, user: User): (review: ReviewDoc)
   *
   * @effects Returns the review that the given user has authored for an item, or null if not found.
   */
  async _getReviewByItemAndUser(
    { item, user }: { item: Item; user: User },
  ): Promise<ReviewDoc | null> {
    return await this.reviews.findOne({ item, user });
  }

  /**
   * Query: _getItemReviews (item: Item): ReviewDoc[]
   *
   * @effects Returns reviews associated with that item.
   */
  async _getItemReviews({ item }: { item: Item }): Promise<ReviewDoc[]> {
    return await this.reviews.find({ item }).toArray();
  }

  /**
   * Query: _getUserReviews (user: User): ReviewDoc[]
   *
   * @effects Returns reviews associated with the given user.
   */
  async _getUserReviews({ user }: { user: User }): Promise<ReviewDoc[]> {
    return await this.reviews.find({ user }).toArray();
  }

  /**
   * Query: _getReviewComments (review: Review): Comment[]
   *
   * @effects Returns all comments associated with the given review.
   */
  async _getReviewComments({ review }: { review: Review }): Promise<Comment[]> {
    const reviewDoc = await this.reviews.findOne({ _id: review }, { projection: { comments: 1 } });
    return reviewDoc?.comments || [];
  }
}
```
