---
timestamp: 'Sat Nov 22 2025 16:29:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_162914.9afcbdae.md]]'
content_id: faa27d7b90c360de7d3920050a69eac3e4dabaf0f199d3ea1ca5a0551287aa2c
---

# trace:

The following trace demonstrates how the **principle** of the `Review` concept is fulfilled by a sequence of actions.

1. **Given**: Two users, `userAlice` and `userBob`, and an item `itemBook`.

2. **Action**: `userAlice` posts a review for `itemBook` with a rating and notes.
   ```
   Review.postReview({
     item: "item:Book123",
     user: "user:Alice",
     ratingNumber: 4,
     notes: "A captivating story, highly recommended."
   })
   ```

3. **Result**: A new `Review` is created (let's say `review:R1`).
   ```
   { review: "review:R1" }
   ```

4. **Verification**: `userAlice`'s review for `itemBook` can be retrieved.
   ```
   Review._getReviewByItemAndUser({ item: "item:Book123", user: "user:Alice" })
   ```
   **Expected State**:
   ```json
   {
     "_id": "review:R1",
     "item": "item:Book123",
     "user": "user:Alice",
     "rating": 4,
     "date": <current_date_time>,
     "notes": "A captivating story, highly recommended.",
     "comments": []
   }
   ```

5. **Action**: `userAlice` decides to update her review's rating and notes.
   ```
   Review.updateReview({
     review: "review:R1",
     ratingNumber: 5,
     notes: "Absolutely brilliant, a must-read!"
   })
   ```

6. **Result**: The existing `Review` (`review:R1`) is updated.
   ```
   {}
   ```

7. **Verification**: `userAlice`'s review now reflects the updated rating and notes.
   ```
   Review._getReviewByItemAndUser({ item: "item:Book123", user: "user:Alice" })
   ```
   **Expected State**:
   ```json
   {
     "_id": "review:R1",
     "item": "item:Book123",
     "user": "user:Alice",
     "rating": 5,
     "date": <updated_date_time>,
     "notes": "Absolutely brilliant, a must-read!",
     "comments": []
   }
   ```

8. **Action**: `userBob` reads `userAlice`'s review and adds a comment.
   ```
   Review.addComment({
     review: "review:R1",
     commenter: "user:Bob",
     comment: "I couldn't agree more, what a masterpiece!"
   })
   ```

9. **Result**: A new comment is added to `review:R1` (let's say `comment:C1`).
   ```
   { commentId: "comment:C1" }
   ```

10. **Verification**: The comments for `review:R1` now include `userBob`'s comment.
    ```
    Review._getReviewComments({ review: "review:R1" })
    ```
    **Expected State (partial, showing comments array):**
    ```json
    {
      "comments": [
        {
          "commentId": "comment:C1",
          "commenter": "user:Bob",
          "notes": "I couldn't agree more, what a masterpiece!",
          "date": <current_date_time>
        }
      ]
    }
    ```

11. **Action**: `userBob` decides to delete their comment.
    ```
    Review.deleteComment({
      review: "review:R1",
      commentId: "comment:C1"
    })
    ```

12. **Result**: `userBob`'s comment (`comment:C1`) is removed from `review:R1`.
    ```
    {}
    ```

13. **Verification**: The comments for `review:R1` are now empty.
    ```
    Review._getReviewComments({ review: "review:R1" })
    ```
    **Expected State (partial, showing comments array):**
    ```json
    {
      "comments": []
    }
    ```

14. **Action**: `userAlice` deletes her entire review for `itemBook`.
    ```
    Review.deleteReview({ review: "review:R1" })
    ```

15. **Result**: The `Review` (`review:R1`) is removed.
    ```
    {}
    ```

16. **Verification**: The review no longer exists.
    ```
    Review._getReviewByItemAndUser({ item: "item:Book123", user: "user:Alice" })
    ```
    **Expected State**:
    ```
    null
    ```

This trace demonstrates the full lifecycle of a review and its comments as described in the `Review` concept's principle.\`\`\`typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ReviewConcept, { Comment, ReviewDoc } from "./ReviewConcept.ts";

const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const itemBook = "item:Book123" as ID;
const itemMovie = "item:MovieXYZ" as ID;
const itemGame = "item:GameABC" as ID;

Deno.test("Review Concept: Principle fulfillment - User lifecycle of reviews and comments", async (t) => {
const \[db, client] = await testDb();
const reviewConcept = new ReviewConcept(db);

try {
let review1Id: ID;
let comment1Id: ID;

```
await t.step("1. User Alice posts a review for a book", async () => {
  console.log("Trace: Alice posts review for book.");
  const postResult = await reviewConcept.postReview({
    item: itemBook,
    user: userAlice,
    ratingNumber: 4,
    notes: "A great read, highly recommend.",
  });
  assertNotEquals("error" in postResult, true, `Expected no error, got: ${JSON.stringify(postResult)}`);
  review1Id = (postResult as { review: ID }).review;
  assertExists(review1Id);

  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemBook, user: userAlice });
  assertExists(fetchedReview, "Review should exist after posting.");
  assertEquals(fetchedReview.rating, 4, "Review rating should match posted value.");
  assertEquals(fetchedReview.notes, "A great read, highly recommend.", "Review notes should match posted value.");
});

await t.step("2. User Alice updates their review for the book", async () => {
  console.log("Trace: Alice updates review for book.");
  const updateResult = await reviewConcept.updateReview({
    review: review1Id,
    ratingNumber: 5,
    notes: "Even better on a second read!",
  });
  assertNotEquals("error" in updateResult, true, `Expected no error, got: ${JSON.stringify(updateResult)}`);

  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemBook, user: userAlice });
  assertExists(fetchedReview, "Review should still exist after update.");
  assertEquals(fetchedReview.rating, 5, "Review rating should be updated.");
  assertEquals(fetchedReview.notes, "Even better on a second read!", "Review notes should be updated.");
});

await t.step("3. User Bob adds a comment to Alice's review", async () => {
  console.log("Trace: Bob adds comment to Alice's review.");
  const addCommentResult = await reviewConcept.addComment({
    review: review1Id,
    commenter: userBob,
    comment: "Agree, it was fantastic!",
  });
  assertNotEquals("error" in addCommentResult, true, `Expected no error, got: ${JSON.stringify(addCommentResult)}`);
  comment1Id = (addCommentResult as { commentId: ID }).commentId;
  assertExists(comment1Id, "Comment ID should be returned.");

  const reviewComments = await reviewConcept._getReviewComments({ review: review1Id });
  assertEquals(reviewComments.length, 1, "There should be one comment.");
  assertEquals(reviewComments[0].commenter, userBob, "Commenter should be Bob.");
  assertEquals(reviewComments[0].notes, "Agree, it was fantastic!", "Comment text should match.");
});

await t.step("4. User Bob deletes their comment from Alice's review", async () => {
  console.log("Trace: Bob deletes their comment.");
  const deleteCommentResult = await reviewConcept.deleteComment({
    review: review1Id,
    commentId: comment1Id,
  });
  assertNotEquals("error" in deleteCommentResult, true, `Expected no error, got: ${JSON.stringify(deleteCommentResult)}`);

  const reviewComments = await reviewConcept._getReviewComments({ review: review1Id });
  assertEquals(reviewComments.length, 0, "Comment should be deleted.");
});

await t.step("5. User Alice deletes her review", async () => {
  console.log("Trace: Alice deletes her review.");
  const deleteResult = await reviewConcept.deleteReview({ review: review1Id });
  assertNotEquals("error" in deleteResult, true, `Expected no error, got: ${JSON.stringify(deleteResult)}`);

  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemBook, user: userAlice });
  assertEquals(fetchedReview, null, "Review should no longer exist after deletion.");
});
```

} finally {
await client.close();
}
});

Deno.test("Review Concept: postReview action tests", async (t) => {
const \[db, client] = await testDb();
const reviewConcept = new ReviewConcept(db);

try {
await t.step("Should successfully post a valid review", async () => {
console.log("Action Test: postReview - valid case");
const postResult = await reviewConcept.postReview({
item: itemBook,
user: userAlice,
ratingNumber: 3,
notes: "It was okay.",
});
assertNotEquals("error" in postResult, true);
const { review: reviewId } = postResult as { review: ID };
assertExists(reviewId);

```
  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemBook, user: userAlice });
  assertExists(fetchedReview);
  assertEquals(fetchedReview._id, reviewId);
  assertEquals(fetchedReview.item, itemBook);
  assertEquals(fetchedReview.user, userAlice);
  assertEquals(fetchedReview.rating, 3);
  assertEquals(fetchedReview.notes, "It was okay.");
  assertEquals(fetchedReview.comments.length, 0);
});

await t.step("Should successfully post a valid review without notes", async () => {
  console.log("Action Test: postReview - valid case without notes");
  const postResult = await reviewConcept.postReview({
    item: itemGame,
    user: userBob,
    ratingNumber: 5,
  });
  assertNotEquals("error" in postResult, true);
  const { review: reviewId } = postResult as { review: ID };
  assertExists(reviewId);

  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemGame, user: userBob });
  assertExists(fetchedReview);
  assertEquals(fetchedReview.rating, 5);
  assertEquals(fetchedReview.notes, undefined); // notes should be undefined
});

await t.step("Should fail to post a review with rating out of range (low)", async () => {
  console.log("Action Test: postReview - rating < 0");
  const postResult = await reviewConcept.postReview({
    item: itemMovie,
    user: userBob,
    ratingNumber: -1,
    notes: "Bad",
  });
  assertEquals("error" in postResult, true);
  assertEquals((postResult as { error: string }).error, "Rating must be an integer between 0 and 5.");
});

await t.step("Should fail to post a review with rating out of range (high)", async () => {
  console.log("Action Test: postReview - rating > 5");
  const postResult = await reviewConcept.postReview({
    item: itemMovie,
    user: userBob,
    ratingNumber: 6,
    notes: "Too good",
  });
  assertEquals("error" in postResult, true);
  assertEquals((postResult as { error: string }).error, "Rating must be an integer between 0 and 5.");
});

await t.step("Should fail to post a review with non-integer rating", async () => {
  console.log("Action Test: postReview - non-integer rating");
  const postResult = await reviewConcept.postReview({
    item: itemMovie,
    user: userBob,
    ratingNumber: 3.5,
    notes: "Mixed feelings",
  });
  assertEquals("error" in postResult, true);
  assertEquals((postResult as { error: string }).error, "Rating must be an integer between 0 and 5.");
});

await t.step("Should fail to post a second review for the same item by the same user", async () => {
  console.log("Action Test: postReview - double posting");
  await reviewConcept.postReview({ item: itemBook, user: userBob, ratingNumber: 2, notes: "Original" });
  const postResult = await reviewConcept.postReview({
    item: itemBook,
    user: userBob,
    ratingNumber: 3,
    notes: "Second",
  });
  assertEquals("error" in postResult, true);
  assertEquals((postResult as { error: string }).error, `User ${userBob} has already reviewed item ${itemBook}.`);
});

await t.step("Query: _getItemReviews and _getUserReviews should return correct lists", async () => {
  console.log("Action Test: postReview - query verification");
  const reviewsByItem = await reviewConcept._getItemReviews({ item: itemBook });
  assertEquals(reviewsByItem.length, 2); // Alice's and Bob's initial review
  assertArrayIncludes(reviewsByItem.map(r => r.user), [userAlice, userBob]);

  const reviewsByUser = await reviewConcept._getUserReviews({ user: userAlice });
  assertEquals(reviewsByUser.length, 1);
  assertEquals(reviewsByUser[0].item, itemBook);
});
```

} finally {
await client.close();
}
});

Deno.test("Review Concept: updateReview action tests", async (t) => {
const \[db, client] = await testDb();
const reviewConcept = new ReviewConcept(db);

let reviewId: ID;

await t.step("Setup: Post an initial review for updating", async () => {
const postResult = await reviewConcept.postReview({ item: itemBook, user: userAlice, ratingNumber: 3, notes: "Initial notes." });
reviewId = (postResult as { review: ID }).review;
assertExists(reviewId);
});

try {
await t.step("Should successfully update an existing review", async () => {
console.log("Action Test: updateReview - valid case");
const updateResult = await reviewConcept.updateReview({
review: reviewId,
ratingNumber: 4,
notes: "Updated notes for the review.",
});
assertNotEquals("error" in updateResult, true);

```
  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemBook, user: userAlice });
  assertExists(fetchedReview);
  assertEquals(fetchedReview.rating, 4);
  assertEquals(fetchedReview.notes, "Updated notes for the review.");
});

await t.step("Should successfully update an existing review with empty notes", async () => {
  console.log("Action Test: updateReview - valid case, clear notes");
  const updateResult = await reviewConcept.updateReview({
    review: reviewId,
    ratingNumber: 5,
    notes: undefined, // Clear notes
  });
  assertNotEquals("error" in updateResult, true);

  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemBook, user: userAlice });
  assertExists(fetchedReview);
  assertEquals(fetchedReview.rating, 5);
  assertEquals(fetchedReview.notes, undefined);
});

await t.step("Should fail to update a non-existent review", async () => {
  console.log("Action Test: updateReview - review not found");
  const nonExistentReviewId = "review:fake" as ID;
  const updateResult = await reviewConcept.updateReview({
    review: nonExistentReviewId,
    ratingNumber: 2,
    notes: "Attempting to update non-existent.",
  });
  assertEquals("error" in updateResult, true);
  assertEquals((updateResult as { error: string }).error, `Review with ID ${nonExistentReviewId} not found.`);
});

await t.step("Should fail to update with rating out of range", async () => {
  console.log("Action Test: updateReview - rating out of range");
  const updateResult = await reviewConcept.updateReview({
    review: reviewId,
    ratingNumber: 10,
    notes: "Invalid rating.",
  });
  assertEquals("error" in updateResult, true);
  assertEquals((updateResult as { error: string }).error, "Rating must be an integer between 0 and 5.");
});

await t.step("Should fail to update with non-integer rating", async () => {
  console.log("Action Test: updateReview - non-integer rating");
  const updateResult = await reviewConcept.updateReview({
    review: reviewId,
    ratingNumber: 2.5,
    notes: "Invalid rating.",
  });
  assertEquals("error" in updateResult, true);
  assertEquals((updateResult as { error: string }).error, "Rating must be an integer between 0 and 5.");
});
```

} finally {
await client.close();
}
});

Deno.test("Review Concept: deleteReview action tests", async (t) => {
const \[db, client] = await testDb();
const reviewConcept = new ReviewConcept(db);

let reviewIdToDelete: ID;
let reviewIdToKeep: ID;

await t.step("Setup: Post two reviews for deletion test", async () => {
const postResult1 = await reviewConcept.postReview({ item: itemBook, user: userAlice, ratingNumber: 4 });
reviewIdToDelete = (postResult1 as { review: ID }).review;
const postResult2 = await reviewConcept.postReview({ item: itemMovie, user: userBob, ratingNumber: 5 });
reviewIdToKeep = (postResult2 as { review: ID }).review;
assertExists(reviewIdToDelete);
assertExists(reviewIdToKeep);

```
// Add a comment to the review that will be deleted, to ensure embedded comments are removed
await reviewConcept.addComment({ review: reviewIdToDelete, commenter: userBob, comment: "This comment should vanish." });
const commentsBeforeDelete = await reviewConcept._getReviewComments({ review: reviewIdToDelete });
assertEquals(commentsBeforeDelete.length, 1, "Comment should exist before review deletion.");
```

});

try {
await t.step("Should successfully delete an existing review and its embedded comments", async () => {
console.log("Action Test: deleteReview - valid case");
const deleteResult = await reviewConcept.deleteReview({ review: reviewIdToDelete });
assertNotEquals("error" in deleteResult, true);

```
  const fetchedReview = await reviewConcept._getReviewByItemAndUser({ item: itemBook, user: userAlice });
  assertEquals(fetchedReview, null, "Deleted review should not be found.");

  const commentsAfterDelete = await reviewConcept._getReviewComments({ review: reviewIdToDelete });
  assertEquals(commentsAfterDelete.length, 0, "Embedded comments should be removed with the review.");

  const remainingReviews = await reviewConcept.reviews.find().toArray();
  assertEquals(remainingReviews.length, 1, "Only one review should remain.");
  assertEquals(remainingReviews[0]._id, reviewIdToKeep);
});

await t.step("Should fail to delete a non-existent review", async () => {
  console.log("Action Test: deleteReview - review not found");
  const nonExistentReviewId = "review:fake" as ID;
  const deleteResult = await reviewConcept.deleteReview({ review: nonExistentReviewId });
  assertEquals("error" in deleteResult, true);
  assertEquals((deleteResult as { error: string }).error, `Review with ID ${nonExistentReviewId} not found.`);
});
```

} finally {
await client.close();
}
});

Deno.test("Review Concept: addComment action tests", async (t) => {
const \[db, client] = await testDb();
const reviewConcept = new ReviewConcept(db);

let reviewId: ID;

await t.step("Setup: Post an initial review", async () => {
const postResult = await reviewConcept.postReview({ item: itemBook, user: userAlice, ratingNumber: 4 });
reviewId = (postResult as { review: ID }).review;
assertExists(reviewId);
});

try {
await t.step("Should successfully add a comment to an existing review", async () => {
console.log("Action Test: addComment - valid case");
const addCommentResult = await reviewConcept.addComment({
review: reviewId,
commenter: userBob,
comment: "Great review!",
});
assertNotEquals("error" in addCommentResult, true);
const { commentId } = addCommentResult as { commentId: ID };
assertExists(commentId);

```
  const reviewComments = await reviewConcept._getReviewComments({ review: reviewId });
  assertEquals(reviewComments.length, 1);
  assertEquals(reviewComments[0].commentId, commentId);
  assertEquals(reviewComments[0].commenter, userBob);
  assertEquals(reviewComments[0].notes, "Great review!");
});

await t.step("Should add multiple comments to the same review by different users", async () => {
  console.log("Action Test: addComment - multiple comments");
  await reviewConcept.addComment({ review: reviewId, commenter: userAlice, comment: "Thanks Bob!" });
  const reviewComments = await reviewConcept._getReviewComments({ review: reviewId });
  assertEquals(reviewComments.length, 2);
  assertArrayIncludes(reviewComments.map((c: Comment) => c.commenter), [userBob, userAlice]);
});

await t.step("Should add multiple comments to the same review by the same user", async () => {
  console.log("Action Test: addComment - same user multiple comments");
  await reviewConcept.addComment({ review: reviewId, commenter: userBob, comment: "Another thought." });
  const reviewComments = await reviewConcept._getReviewComments({ review: reviewId });
  assertEquals(reviewComments.length, 3);
  const bobComments = reviewComments.filter(c => c.commenter === userBob);
  assertEquals(bobComments.length, 2, "Bob should have two comments now.");
});

await t.step("Should fail to add a comment to a non-existent review", async () => {
  console.log("Action Test: addComment - review not found");
  const nonExistentReviewId = "review:fake" as ID;
  const addCommentResult = await reviewConcept.addComment({
    review: nonExistentReviewId,
    commenter: userBob,
    comment: "This should fail.",
  });
  assertEquals("error" in addCommentResult, true);
  assertEquals((addCommentResult as { error: string }).error, `Review with ID ${nonExistentReviewId} not found.`);
});
```

} finally {
await client.close();
}
});

Deno.test("Review Concept: deleteComment action tests", async (t) => {
const \[db, client] = await testDb();
const reviewConcept = new ReviewConcept(db);

let reviewId: ID;
let comment1Id: ID;
let comment2Id: ID;

await t.step("Setup: Post a review and two comments", async () => {
const postResult = await reviewConcept.postReview({ item: itemBook, user: userAlice, ratingNumber: 4 });
reviewId = (postResult as { review: ID }).review;
assertExists(reviewId);

```
const addCommentResult1 = await reviewConcept.addComment({ review: reviewId, commenter: userBob, comment: "Comment 1" });
comment1Id = (addCommentResult1 as { commentId: ID }).commentId;
assertExists(comment1Id);

const addCommentResult2 = await reviewConcept.addComment({ review: reviewId, commenter: userAlice, comment: "Comment 2" });
comment2Id = (addCommentResult2 as { commentId: ID }).commentId;
assertExists(comment2Id);

const initialComments = await reviewConcept._getReviewComments({ review: reviewId });
assertEquals(initialComments.length, 2);
```

});

try {
await t.step("Should successfully delete an existing comment", async () => {
console.log("Action Test: deleteComment - valid case");
const deleteResult = await reviewConcept.deleteComment({ review: reviewId, commentId: comment1Id });
assertNotEquals("error" in deleteResult, true);

```
  const reviewComments = await reviewConcept._getReviewComments({ review: reviewId });
  assertEquals(reviewComments.length, 1);
  assertEquals(reviewComments[0].commentId, comment2Id, "The remaining comment should be comment2.");
});

await t.step("Should fail to delete a non-existent comment from an existing review", async () => {
  console.log("Action Test: deleteComment - comment not found");
  const nonExistentCommentId = "comment:fake" as ID;
  const deleteResult = await reviewConcept.deleteComment({ review: reviewId, commentId: nonExistentCommentId });
  assertEquals("error" in deleteResult, true);
  assertEquals((deleteResult as { error: string }).error, `Comment with ID ${nonExistentCommentId} not found in review ${reviewId}.`);
});

await t.step("Should fail to delete a comment from a non-existent review", async () => {
  console.log("Action Test: deleteComment - review not found");
  const nonExistentReviewId = "review:fake" as ID;
  const deleteResult = await reviewConcept.deleteComment({ review: nonExistentReviewId, commentId: comment2Id });
  assertEquals("error" in deleteResult, true);
  assertEquals((deleteResult as { error: string }).error, `Review with ID ${nonExistentReviewId} not found.`);
});
```

} finally {
await client.close();
}
});

````

# trace:

The following trace demonstrates how the **principle** of the `Review` concept is fulfilled by a sequence of actions.

1.  **Given**: Two users, `userAlice` and `userBob`, and an item `itemBook`.

2.  **Action**: `userAlice` posts a review for `itemBook` with a rating and notes.
    ```
    Review.postReview({
      item: "item:Book123",
      user: "user:Alice",
      ratingNumber: 4,
      notes: "A captivating story, highly recommended."
    })
    ```
3.  **Result**: A new `Review` is created (let's say `review:R1`).
    ```
    { review: "review:R1" }
    ```
4.  **Verification**: `userAlice`'s review for `itemBook` can be retrieved.
    ```
    Review._getReviewByItemAndUser({ item: "item:Book123", user: "user:Alice" })
    ```
    **Expected State (of the retrieved ReviewDoc)**:
    ```json
    {
      "_id": "review:R1",
      "item": "item:Book123",
      "user": "user:Alice",
      "rating": 4,
      "date": <current_date_time>,
      "notes": "A captivating story, highly recommended.",
      "comments": []
    }
    ```

5.  **Action**: `userAlice` decides to update her review's rating and notes.
    ```
    Review.updateReview({
      review: "review:R1",
      ratingNumber: 5,
      notes: "Absolutely brilliant, a must-read!"
    })
    ```
6.  **Result**: The existing `Review` (`review:R1`) is updated.
    ```
    {}
    ```
7.  **Verification**: `userAlice`'s review now reflects the updated rating and notes.
    ```
    Review._getReviewByItemAndUser({ item: "item:Book123", user: "user:Alice" })
    ```
    **Expected State (of the retrieved ReviewDoc)**:
    ```json
    {
      "_id": "review:R1",
      "item": "item:Book123",
      "user": "user:Alice",
      "rating": 5,
      "date": <updated_date_time>,
      "notes": "Absolutely brilliant, a must-read!",
      "comments": []
    }
    ```

8.  **Action**: `userBob` reads `userAlice`'s review and adds a comment.
    ```
    Review.addComment({
      review: "review:R1",
      commenter: "user:Bob",
      comment: "I couldn't agree more, what a masterpiece!"
    })
    ```
9.  **Result**: A new comment is added to `review:R1` (let's say `comment:C1`).
    ```
    { commentId: "comment:C1" }
    ```
10. **Verification**: The comments for `review:R1` now include `userBob`'s comment.
    ```
    Review._getReviewComments({ review: "review:R1" })
    ```
    **Expected State (of the retrieved Comments array):**
    ```json
    [
      {
        "commentId": "comment:C1",
        "commenter": "user:Bob",
        "notes": "I couldn't agree more, what a masterpiece!",
        "date": <current_date_time>
      }
    ]
    ```

11. **Action**: `userBob` decides to delete their comment.
    ```
    Review.deleteComment({
      review: "review:R1",
      commentId: "comment:C1"
    })
    ```
12. **Result**: `userBob`'s comment (`comment:C1`) is removed from `review:R1`.
    ```
    {}
    ```
13. **Verification**: The comments for `review:R1` are now empty.
    ```
    Review._getReviewComments({ review: "review:R1" })
    ```
    **Expected State (of the retrieved Comments array):**
    ```json
    []
    ```

14. **Action**: `userAlice` deletes her entire review for `itemBook`.
    ```
    Review.deleteReview({ review: "review:R1" })
    ```
15. **Result**: The `Review` (`review:R1`) is removed.
    ```
    {}
    ```
16. **Verification**: The review no longer exists.
    ```
    Review._getReviewByItemAndUser({ item: "item:Book123", user: "user:Alice" })
    ```
    **Expected State**:
    ```
    null
    ```
This trace successfully demonstrates the full lifecycle of a review and its comments, including creation, updates, and deletion, fulfilling the `Review` concept's stated principle.
````
