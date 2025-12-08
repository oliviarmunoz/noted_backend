---
timestamp: 'Mon Dec 08 2025 16:22:21 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251208_162221.655d9a52.md]]'
content_id: 09dd5029a8081ee486a0960349e48a55fd1cc92aa58b20ff0334944d224bf03c
---

# response:

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, MusicDiscovery, Review } from "@concepts";
import { ID } from "@utils/types.ts";

// Define local types for clarity, aligning with concept specifications
type User = ID;
type Item = ID; // Internal MusicEntity ID, used as generic parameter in Review concept
type ReviewId = ID;
type CommentId = ID;

// --- Synchronizations for Review Concept ---

/**
 * Sync: Handles the request to post a new review for a music item.
 *
 * When a `Requesting.request` for `/review/post` occurs:
 * 1. Authenticates the user session.
 * 2. Resolves the `itemExternalId` (Spotify ID) to an internal `MusicEntity` ID,
 *    creating/updating the `MusicEntity` in the `MusicDiscovery` concept if necessary.
 * 3. Calls the `Review.postReview` action with the authenticated user and resolved
 *    `MusicEntity` internal ID.
 */
export const PostReviewRequest: Sync = ({ request, session, itemExternalId, ratingNumber, notes, user, musicEntity }) => ({
  when: actions([
    Requesting.request,
    { path: "/review/post", itemExternalId, ratingNumber, notes, session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user session
    const authenticatedFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authenticatedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: "Unauthorized: Invalid session." });
    }

    // 2. Resolve externalId to internal MusicEntity ID, ensuring it exists in MusicDiscovery
    // We assume MusicDiscovery.loadEntityDetails handles fetching from Spotify and persistence.
    // The 'type' argument is a comma-separated string for search, or specific type for direct ID lookup.
    // Here we use a broad type for robustness.
    const musicEntityFrames = await authenticatedFrames.query(MusicDiscovery.loadEntityDetails, { externalId: itemExternalId, type: "track,album,artist" }, { music: musicEntity });

    if (musicEntityFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: `Music entity with external ID '${itemExternalId}' not found or could not be resolved.` });
    }

    return musicEntityFrames; // Pass on the enriched frames with 'user' and 'musicEntity'
  },
  then: actions([
    Review.postReview,
    { item: musicEntity, user: user, ratingNumber: ratingNumber, notes: notes },
  ]),
});

/**
 * Sync: Handles the successful response from `Review.postReview`.
 * Responds to the original `Requesting.request` with the newly created `review` ID.
 */
export const PostReviewResponseSuccess: Sync = ({ request, review }) => ({
  when: actions(
    [Requesting.request, { path: "/review/post" }, { request }],
    [Review.postReview, {}, { review }],
  ),
  then: actions([Requesting.respond, { request, review }]),
});

/**
 * Sync: Handles an error response from `Review.postReview`.
 * Responds to the original `Requesting.request` with the error message.
 */
export const PostReviewResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/review/post" }, { request }],
    [Review.postReview, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync: Handles the request to update an existing review.
 *
 * When a `Requesting.request` for `/review/update` occurs:
 * 1. Authenticates the user session.
 * 2. Fetches the review details using `Review._getReviewById` to perform an authorization check
 *    (the authenticated user must be the original author of the review).
 * 3. Calls the `Review.updateReview` action.
 */
export const UpdateReviewRequest: Sync = ({ request, session, reviewId, ratingNumber, notes, currentUser, reviewDetails }) => ({
  when: actions([
    Requesting.request,
    { path: "/review/update", review: reviewId, ratingNumber, notes, session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user session
    let processedFrames = await frames.query(Sessioning._getUser, { session }, { user: currentUser });
    if (processedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: "Unauthorized: Invalid session." });
    }

    // 2. Get review details to check ownership. Assuming Review._getReviewById is available and returns { reviewDetails: ReviewDoc }
    processedFrames = await processedFrames.query(Review._getReviewById, { review: reviewId }, { reviewDetails });
    if (processedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: `Review with ID '${reviewId}' not found.` });
    }

    // 3. Authorize: Filter frames to keep only those where the authenticated user is the author of the review.
    const authorizedFrames = processedFrames.filter(($) => $[currentUser] === $[reviewDetails].user);
    if (authorizedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: "Forbidden: You are not the author of this review." });
    }
    return authorizedFrames;
  },
  then: actions([
    Review.updateReview,
    { review: reviewId, ratingNumber: ratingNumber, notes: notes },
  ]),
});

/**
 * Sync: Handles the successful response from `Review.updateReview`.
 */
export const UpdateReviewResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/review/update" }, { request }],
    [Review.updateReview, {}, {}], // Expects Empty result on success
  ),
  then: actions([Requesting.respond, { request, status: "Review updated successfully." }]),
});

/**
 * Sync: Handles an error response from `Review.updateReview`.
 */
export const UpdateReviewResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/review/update" }, { request }],
    [Review.updateReview, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync: Handles the request to delete a review.
 *
 * When a `Requesting.request` for `/review/delete` occurs:
 * 1. Authenticates the user session.
 * 2. Fetches the review details using `Review._getReviewById` to perform an authorization check
 *    (the authenticated user must be the original author of the review).
 * 3. Calls the `Review.deleteReview` action. The `Review` concept is responsible for cascading deletes
 *    of nested comments, as per its state structure.
 */
export const DeleteReviewRequest: Sync = ({ request, session, reviewId, currentUser, reviewDetails }) => ({
  when: actions([
    Requesting.request,
    { path: "/review/delete", review: reviewId, session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user session
    let processedFrames = await frames.query(Sessioning._getUser, { session }, { user: currentUser });
    if (processedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: "Unauthorized: Invalid session." });
    }

    // 2. Get review details to check ownership
    processedFrames = await processedFrames.query(Review._getReviewById, { review: reviewId }, { reviewDetails });
    if (processedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: `Review with ID '${reviewId}' not found.` });
    }

    // 3. Authorize: Filter frames to keep only those where the authenticated user is the author of the review.
    const authorizedFrames = processedFrames.filter(($) => $[currentUser] === $[reviewDetails].user);
    if (authorizedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: "Forbidden: You are not the author of this review." });
    }
    return authorizedFrames;
  },
  then: actions([
    Review.deleteReview,
    { review: reviewId },
  ]),
});

/**
 * Sync: Handles the successful response from `Review.deleteReview`.
 */
export const DeleteReviewResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/review/delete" }, { request }],
    [Review.deleteReview, {}, {}], // Expects Empty result on success
  ),
  then: actions([Requesting.respond, { request, status: "Review deleted successfully." }]),
});

/**
 * Sync: Handles an error response from `Review.deleteReview`.
 */
export const DeleteReviewResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/review/delete" }, { request }],
    [Review.deleteReview, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync: Handles the request to add a comment to a review.
 *
 * When a `Requesting.request` for `/review/comment/add` occurs:
 * 1. Authenticates the user session.
 * 2. Calls the `Review.addComment` action. The `Review` concept itself will ensure
 *    the parent review exists (via its 'requires' clause).
 */
export const AddCommentRequest: Sync = ({ request, session, reviewId, commentText, commenterUser }) => ({
  when: actions([
    Requesting.request,
    { path: "/review/comment/add", review: reviewId, comment: commentText, session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user session
    frames = await frames.query(Sessioning._getUser, { session }, { user: commenterUser });
    if (frames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: "Unauthorized: Invalid session." });
    }
    // Review.addComment's 'requires' condition will check if the review exists.
    return frames;
  },
  then: actions([
    Review.addComment,
    { review: reviewId, commenter: commenterUser, comment: commentText },
  ]),
});

/**
 * Sync: Handles the successful response from `Review.addComment`.
 */
export const AddCommentResponseSuccess: Sync = ({ request, commentId }) => ({
  when: actions(
    [Requesting.request, { path: "/review/comment/add" }, { request }],
    [Review.addComment, {}, { commentId }],
  ),
  then: actions([Requesting.respond, { request, commentId }]),
});

/**
 * Sync: Handles an error response from `Review.addComment`.
 */
export const AddCommentResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/review/comment/add" }, { request }],
    [Review.addComment, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync: Handles the request to delete a comment from a review.
 *
 * When a `Requesting.request` for `/review/comment/delete` occurs:
 * 1. Authenticates the user session.
 * 2. Fetches the review details using `Review._getReviewById`.
 * 3. Iterates through the nested comments within the retrieved review to perform an authorization check
 *    (the authenticated user must be the author of the specific comment).
 * 4. Calls the `Review.deleteComment` action.
 */
export const DeleteCommentRequest: Sync = ({ request, session, reviewId, commentId, currentUser, reviewDetails }) => ({
  when: actions([
    Requesting.request,
    { path: "/review/comment/delete", review: reviewId, comment: commentId, session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user session
    let processedFrames = await frames.query(Sessioning._getUser, { session }, { user: currentUser });
    if (processedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: "Unauthorized: Invalid session." });
    }

    // 2. Get review details to find the specific comment and check ownership
    processedFrames = await processedFrames.query(Review._getReviewById, { review: reviewId }, { reviewDetails });
    if (processedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: `Review with ID '${reviewId}' not found.` });
    }

    // 3. Authorize: Check if the authenticated user is the commenter of the specific comment.
    // This involves looking into the nested 'comments' array within 'reviewDetails'.
    const authorizedFrames: Frames<typeof processedFrames> = new Frames();
    for (const frame of processedFrames) {
        const review = frame[reviewDetails];
        // Assuming review.comments is an array of objects like { commentId: ID, commenter: User, notes: string }
        const matchingComment = (review.comments || []).find((c: any) =>
            c.commentId === commentId && c.commenter === currentUser
        );
        if (matchingComment) {
            authorizedFrames.push(frame); // Keep the frame if an owned comment is found
        }
    }

    if (authorizedFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], error: `Forbidden: Comment with ID '${commentId}' not found or not authored by current user.` });
    }

    return authorizedFrames;
  },
  then: actions([
    Review.deleteComment,
    { review: reviewId, comment: commentId },
  ]),
});

/**
 * Sync: Handles the successful response from `Review.deleteComment`.
 */
export const DeleteCommentResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/review/comment/delete" }, { request }],
    [Review.deleteComment, {}, {}], // Expects Empty result on success
  ),
  then: actions([Requesting.respond, { request, status: "Comment deleted successfully." }]),
});

/**
 * Sync: Handles an error response from `Review.deleteComment`.
 */
export const DeleteCommentResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/review/comment/delete" }, { request }],
    [Review.deleteComment, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});


/**
 * Sync: Handles the request to retrieve all reviews for a specific music item.
 * This is a public query, so no authentication is required.
 *
 * When a `Requesting.request` for `/reviews/item/:itemExternalId` occurs:
 * 1. Resolves `itemExternalId` to an internal `MusicEntity` ID using `MusicDiscovery.loadEntityDetails`.
 * 2. Queries `Review._getItemReviews` to get all reviews for that internal `MusicEntity` ID.
 * 3. Collects the results and responds with the list of reviews.
 */
export const GetItemReviewsRequest: Sync = ({ request, itemExternalId, musicEntity, review, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/reviews/item/:itemExternalId", itemExternalId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Resolve itemExternalId to internal MusicEntity ID
    const musicEntityFrames = await frames.query(MusicDiscovery.loadEntityDetails, { externalId: itemExternalId, type: "track,album,artist" }, { music: musicEntity });
    if (musicEntityFrames.length === 0) {
      // If music entity not found, return an empty array for reviews
      return new Frames({ [request]: originalRequestFrame[request], [results]: [], error: `Music entity with external ID '${itemExternalId}' not found or could not be resolved.` });
    }

    // 2. Get reviews for the resolved MusicEntity
    const reviewsFrames = await musicEntityFrames.query(Review._getItemReviews, { item: musicEntity }, { review });

    // 3. Collect reviews into a single result array.
    // If no reviews found, collectAs will naturally result in an empty array for 'results', which is correct.
    return reviewsFrames.collectAs([review], results);
  },
  then: actions([
    Requesting.respond,
    { request, reviews: results },
  ]),
});

/**
 * Sync: Handles the request to retrieve all reviews authored by the currently authenticated user.
 * This query requires user authentication.
 *
 * When a `Requesting.request` for `/reviews/my` occurs:
 * 1. Authenticates the user session.
 * 2. Queries `Review._getUserReviews` to get all reviews by that user.
 * 3. Collects the results and responds with the list of reviews.
 */
export const GetUserReviewsRequest: Sync = ({ request, session, user, review, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/reviews/my", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ [request]: originalRequestFrame[request], error: "Unauthorized: Invalid session." });
    }

    // 2. Get reviews authored by this user
    const reviewsFrames = await frames.query(Review._getUserReviews, { user }, { review });

    // 3. Collect reviews into a single result array.
    // If no reviews found, collectAs will naturally result in an empty array for 'results', which is correct.
    return reviewsFrames.collectAs([review], results);
  },
  then: actions([
    Requesting.respond,
    { request, reviews: results },
  ]),
});

/**
 * Sync: Handles the request to retrieve all comments for a specific review.
 * This is a public query, so no authentication is required.
 *
 * When a `Requesting.request` for `/reviews/:reviewId/comments` occurs:
 * 1. Queries `Review._getReviewComments` to get all comment IDs (and implied details) for that review.
 * 2. Collects the results and responds with the list of comment IDs.
 */
export const GetReviewCommentsRequest: Sync = ({ request, reviewId, commentId, results }) => ({
  when: actions([
    Requesting.request,
    { path: "/reviews/:reviewId/comments", review: reviewId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    // 1. Get comments for the specified review
    const commentsFrames = await frames.query(Review._getReviewComments, { review: reviewId }, { commentId });

    // 2. Collect comments into a single result array.
    // If no comments found, collectAs will naturally result in an empty array for 'results', which is correct.
    return commentsFrames.collectAs([commentId], results);
  },
  then: actions([
    Requesting.respond,
    { request, comments: results },
  ]),
});

/**
 * Sync: Handles the request to retrieve a single review by a specific user for a specific music item.
 * This is useful for checking if a user has already reviewed an item or retrieving their existing review.
 *
 * When a `Requesting.request` for `/review/item/:itemExternalId/user/:userId` occurs:
 * 1. Resolves `itemExternalId` to an internal `MusicEntity` ID using `MusicDiscovery.loadEntityDetails`.
 * 2. Queries `Review._getReviewByItemAndUser` using the resolved `MusicEntity` ID and `userId`.
 * 3. Responds with the single review object (or null if not found).
 */
export const GetReviewByItemAndUserRequest: Sync = ({ request, itemExternalId, userId, musicEntity, review }) => ({
  when: actions([
    Requesting.request,
    { path: "/review/item/:itemExternalId/user/:userId", itemExternalId, userId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Resolve itemExternalId to internal MusicEntity ID
    const musicEntityFrames = await frames.query(MusicDiscovery.loadEntityDetails, { externalId: itemExternalId, type: "track,album,artist" }, { music: musicEntity });
    if (musicEntityFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], review: null, error: `Music entity with external ID '${itemExternalId}' not found or could not be resolved.` });
    }

    // 2. Get the review by item and user. _getReviewByItemAndUser is specified to return a single Review.
    const reviewFrames = await musicEntityFrames.query(Review._getReviewByItemAndUser, { item: musicEntity, user: userId }, { review });

    // If no review is found, _getReviewByItemAndUser would return an empty array, so 'review' variable won't be bound.
    if (reviewFrames.length === 0) {
        return new Frames({ [request]: originalRequestFrame[request], review: null }); // Explicitly return null for no review
    }

    // If a review is found, it will be bound to the `review` symbol in the frame.
    // We expect only one result, so the first frame's `review` binding is the one.
    return new Frames({ [request]: originalRequestFrame[request], review: reviewFrames[0][review] });
  },
  then: actions([
    Requesting.respond,
    { request, review: review }, // Respond with the bound 'review' variable
  ]),
});
```
