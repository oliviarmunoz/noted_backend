---
timestamp: 'Mon Dec 08 2025 17:07:18 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251208_170718.6128ce68.md]]'
content_id: 3f06d469b23f47293f79d87e30fa056e7b9e4a5fd6bfbfda86c775ef8e8f880e
---

# response:

```typescript
import { actions, Frames, Sync } from "@engine";
import {
  MusicDiscovery,
  Profile,
  Requesting,
  Review,
  Sessioning,
  UserAuthentication,
} from "@concepts";
import { ID, Empty } from "@utils/types.ts";

// Removed explicit type aliases like `type User = ID;` as per instruction.
// The `ID` type from @utils/types.ts is used directly or inferred for entity IDs.

// --- POST REVIEW ---

/**
 * Sync to handle the request for posting a new review.
 * It authenticates the user, resolves the music entity from an external ID,
 * enforces uniqueness (one review per user per item), and then calls the Review.postReview action.
 */
export const PostReviewRequest: Sync = ({
  request,
  session,
  itemExternalId,
  itemType,
  ratingNumber,
  notes,
  user, // Variable to hold user ID from session
  musicEntityId, // Variable to hold internal MusicEntity ID
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/post", session, itemExternalId, itemType, ratingNumber, notes },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture the initial request frame

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed: No valid session found." });
    }

    // 2. Resolve external item ID to internal MusicEntity ID, ensuring entity exists locally
    // Passes itemType as it's part of MusicDiscovery.loadEntityDetails' signature
    frames = await frames.query(
      MusicDiscovery.loadEntityDetails,
      { externalId: itemExternalId, type: itemType },
      { music: musicEntityId },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: `Music entity with external ID ${itemExternalId} not found or could not be loaded.` });
    }

    // 3. Enforce uniqueness: check if user already reviewed this musicEntity
    // Access resolved 'musicEntityId' and 'user' from the current frames (which are augmented by previous queries)
    const existingReviews = await frames.query(
      Review._getReviewByItemAndUser,
      { item: frames[0][musicEntityId], user: frames[0][user] },
      { review: new Symbol("existingReviewId") }, // Use a temporary symbol for the returned review ID
    );

    if (existingReviews.length > 0) {
      return new Frames({ ...originalFrame, error: `User has already reviewed this item.` });
    }

    // 4. Validate ratingNumber range (as per Review concept spec)
    // Access ratingNumber from the original request frame
    if (originalFrame.hasOwnProperty(ratingNumber) && (originalFrame[ratingNumber] < 0 || originalFrame[ratingNumber] > 5)) {
      return new Frames({ ...originalFrame, error: `Rating number ${originalFrame[ratingNumber]} is outside the allowed range [0, 5].` });
    }
    
    // Pass through the original frame augmented with user and musicEntityId
    return new Frames(frames[0]);
  },
  then: actions([
    Review.postReview,
    { item: musicEntityId, user, ratingNumber, notes },
  ]),
});

/**
 * Sync to respond to successful postReview actions.
 */
export const PostReviewResponseSuccess: Sync = ({ request, review }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/post" }, { request }],
    [Review.postReview, {}, { review }],
  ),
  then: actions([Requesting.respond, { request, review }]),
});

/**
 * Sync to respond to errors from the Review.postReview action itself.
 */
export const PostReviewResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/post" }, { request }],
    [Review.postReview, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync to respond to custom errors generated in the 'where' clause of PostReviewRequest.
 */
export const PostReviewResponseCustomError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/post" }, { request }],
  ),
  where: (frames) => {
    return frames.filter(($) => $[error] !== undefined); // Filter for frames containing our custom error
  },
  then: actions([Requesting.respond, { request, error }]),
});

// --- UPDATE REVIEW ---

/**
 * Sync to handle the request for updating an existing review.
 * It authenticates the user, authorizes them as the review author,
 * validates the rating, and then calls the Review.updateReview action.
 */
export const UpdateReviewRequest: Sync = ({
  request,
  session,
  reviewId,
  ratingNumber,
  notes,
  user, // Current user from session
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/update", session, review: reviewId, ratingNumber, notes },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed: No valid session found." });
    }

    // 2. Authorize: Check if the user is the author of the review
    // Review._getReviewById returns [{ review: { _id: ReviewId, user: Author, ... } }]
    const reviewDocs = await frames.query(Review._getReviewById, { review: reviewId }, { review: new Symbol("fullReviewDoc") });
    if (reviewDocs.length === 0) {
      return new Frames({ ...originalFrame, error: `Review with ID ${reviewId} not found.` });
    }
    
    // Extract the author from the fetched review document and check authorization
    const fetchedReviewDoc = reviewDocs[0][new Symbol("fullReviewDoc")];
    if (!fetchedReviewDoc || fetchedReviewDoc.user !== frames[0][user]) {
        return new Frames({ ...originalFrame, error: "Unauthorized: User is not the author of this review." });
    }

    // 3. Validate ratingNumber range (as per Review concept spec)
    if (originalFrame.hasOwnProperty(ratingNumber) && (originalFrame[ratingNumber] < 0 || originalFrame[ratingNumber] > 5)) {
      return new Frames({ ...originalFrame, error: `Rating number ${originalFrame[ratingNumber]} is outside the allowed range [0, 5].` });
    }

    return new Frames(frames[0]); // Pass through the original frame with resolved variables
  },
  then: actions([
    Review.updateReview,
    { review: reviewId, ratingNumber, notes },
  ]),
});

/**
 * Sync to respond to successful updateReview actions.
 */
export const UpdateReviewResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/update" }, { request }],
    [Review.updateReview, {}, {}], // No specific return for success, just an empty object
  ),
  then: actions([Requesting.respond, { request, status: "Review updated successfully." }]),
});

/**
 * Sync to respond to errors from the Review.updateReview action itself.
 */
export const UpdateReviewResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/update" }, { request }],
    [Review.updateReview, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync to respond to custom errors generated in the 'where' clause of UpdateReviewRequest.
 */
export const UpdateReviewResponseCustomError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/update" }, { request }],
  ),
  where: (frames) => {
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions([Requesting.respond, { request, error }]),
});

// --- DELETE REVIEW ---

/**
 * Sync to handle the request for deleting a review.
 * It authenticates the user and authorizes them as the review author,
 * then calls the Review.deleteReview action.
 */
export const DeleteReviewRequest: Sync = ({
  request,
  session,
  reviewId,
  user, // Current user from session
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/delete", session, review: reviewId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed: No valid session found." });
    }

    // 2. Authorize: Check if the user is the author of the review
    // Review._getReviewById returns [{ review: { _id: ReviewId, user: Author, ... } }]
    const reviewDocs = await frames.query(Review._getReviewById, { review: reviewId }, { review: new Symbol("fullReviewDoc") });
    if (reviewDocs.length === 0) {
      return new Frames({ ...originalFrame, error: `Review with ID ${reviewId} not found.` });
    }
    
    // Extract the author from the fetched review document and check authorization
    const fetchedReviewDoc = reviewDocs[0][new Symbol("fullReviewDoc")];
    if (!fetchedReviewDoc || fetchedReviewDoc.user !== frames[0][user]) {
        return new Frames({ ...originalFrame, error: "Unauthorized: User is not the author of this review." });
    }

    return new Frames(frames[0]);
  },
  then: actions([
    Review.deleteReview,
    { review: reviewId },
  ]),
});

/**
 * Sync to respond to successful deleteReview actions.
 */
export const DeleteReviewResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/delete" }, { request }],
    [Review.deleteReview, {}, {}], // No specific return for success
  ),
  then: actions([Requesting.respond, { request, status: "Review deleted successfully." }]),
});

/**
 * Sync to respond to errors from the Review.deleteReview action itself.
 */
export const DeleteReviewResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/delete" }, { request }],
    [Review.deleteReview, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync to respond to custom errors generated in the 'where' clause of DeleteReviewRequest.
 */
export const DeleteReviewResponseCustomError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/delete" }, { request }],
  ),
  where: (frames) => {
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions([Requesting.respond, { request, error }]),
});

// --- ADD COMMENT TO REVIEW ---

/**
 * Sync to handle the request for adding a comment to a review.
 * It authenticates the user and verifies the review exists,
 * then calls the Review.addComment action.
 */
export const AddCommentRequest: Sync = ({
  request,
  session,
  reviewId,
  commentText,
  user, // Current user from session
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/addComment", session, review: reviewId, comment: commentText },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed: No valid session found." });
    }

    // 2. Verify Review exists
    // Review._getReviewById returns [{ review: { _id: ReviewId, ... } }]
    const existingReviews = await frames.query(Review._getReviewById, { review: reviewId }, { review: new Symbol("fullReviewDoc") });
    if (existingReviews.length === 0) {
      return new Frames({ ...originalFrame, error: `Review with ID ${reviewId} not found.` });
    }

    return new Frames(frames[0]);
  },
  then: actions([
    Review.addComment,
    { review: reviewId, commenter: user, comment: commentText },
  ]),
});

/**
 * Sync to respond to successful addComment actions.
 */
export const AddCommentResponseSuccess: Sync = ({ request, commentId }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/addComment" }, { request }],
    [Review.addComment, {}, { commentId }],
  ),
  then: actions([Requesting.respond, { request, commentId }]),
});

/**
 * Sync to respond to errors from the Review.addComment action itself.
 */
export const AddCommentResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/addComment" }, { request }],
    [Review.addComment, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync to respond to custom errors generated in the 'where' clause of AddCommentRequest.
 */
export const AddCommentResponseCustomError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/addComment" }, { request }],
  ),
  where: (frames) => {
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions([Requesting.respond, { request, error }]),
});

// --- DELETE COMMENT FROM REVIEW ---

/**
 * Sync to handle the request for deleting a comment from a review.
 * It authenticates the user and authorizes them as the comment author,
 * then calls the Review.deleteComment action.
 */
export const DeleteCommentRequest: Sync = ({
  request,
  session,
  reviewId,
  commentId,
  user, // Current user from session
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/deleteComment", session, review: reviewId, comment: commentId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, error: "Authentication failed: No valid session found." });
    }

    // 2. Verify Review exists
    // Review._getReviewById returns [{ review: { _id: ReviewId, ... } }]
    const existingReviews = await frames.query(Review._getReviewById, { review: reviewId }, { review: new Symbol("fullReviewDoc") });
    if (existingReviews.length === 0) {
      return new Frames({ ...originalFrame, error: `Review with ID ${reviewId} not found.` });
    }

    // 3. Authorize: Check if the user is the commenter of the specific comment
    // Review._getReviewComments returns [{ commentId, commenter, notes, date }]
    const commentsInReview = await frames.query(Review._getReviewComments, { review: reviewId }, {
      commentId: new Symbol("tempCommentId"),
      commenter: new Symbol("tempCommenter"), // Bind commenter to a temporary symbol
      notes: new Symbol("tempNotes"),
      date: new Symbol("tempDate"),
    });

    const targetComment = commentsInReview.find(($) => $[new Symbol("tempCommentId")] === commentId);

    if (!targetComment) {
      return new Frames({ ...originalFrame, error: `Comment with ID ${commentId} not found in review ${reviewId}.` });
    }
    
    // Check if the authenticated user is the author of the comment
    if (targetComment[new Symbol("tempCommenter")] !== frames[0][user]) {
      return new Frames({ ...originalFrame, error: "Unauthorized: User is not the author of this comment." });
    }

    return new Frames(frames[0]);
  },
  then: actions([
    Review.deleteComment,
    { review: reviewId, comment: commentId },
  ]),
});

/**
 * Sync to respond to successful deleteComment actions.
 */
export const DeleteCommentResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteComment" }, { request }],
    [Review.deleteComment, {}, {}], // No specific return for success
  ),
  then: actions([Requesting.respond, { request, status: "Comment deleted successfully." }]),
});

/**
 * Sync to respond to errors from the Review.deleteComment action itself.
 */
export const DeleteCommentResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteComment" }, { request }],
    [Review.deleteComment, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Sync to respond to custom errors generated in the 'where' clause of DeleteCommentRequest.
 */
export const DeleteCommentResponseCustomError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteComment" }, { request }],
  ),
  where: (frames) => {
    return frames.filter(($) => $[error] !== undefined);
  },
  then: actions([Requesting.respond, { request, error }]),
});


// --- GET USER REVIEWS (with enrichment) ---

/**
 * Sync to handle the request for retrieving all reviews authored by the current user.
 * It authenticates the user, fetches their reviews, and enriches them with MusicEntity details.
 */
export const GetUserReviewsRequest: Sync = ({
  request,
  session,
  user,
  reviewId,
  itemInternalId, // Internal ID of the MusicEntity
  reviewRating,
  reviewNotes,
  reviewDate,
  itemExternalId,
  itemType,
  itemName,
  itemArtistName,
  itemImageUrl,
  itemDescription,
  itemReleaseDate,
  itemDurationMs,
  itemUri,
  results,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/myReviews", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] }); // No valid user, return empty list
    }

    // 2. Get reviews by this user
    // Expected to return [{ review: ReviewId, item: Item, rating: Number, notes: String, date: Date }]
    frames = await frames.query(Review._getUserReviews, { user: frames[0][user] }, {
      review: reviewId,
      item: itemInternalId, // This is the internal MusicEntity ID from the Review
      rating: reviewRating,
      date: reviewDate,
      notes: reviewNotes,
    });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] }); // No reviews found, return empty list
    }

    // 3. Enrich each review with MusicEntity details
    // This query is expected to return: [{ externalId, type, name, artistName, imageUrl, description, releaseDate, durationMs, uri }]
    // It will expand the frames based on each unique itemInternalId
    frames = await frames.query(MusicDiscovery._getEntityFromId, { musicEntity: itemInternalId }, {
      externalId: itemExternalId,
      type: itemType,
      name: itemName,
      artistName: itemArtistName,
      imageUrl: itemImageUrl,
      description: itemDescription,
      releaseDate: itemReleaseDate,
      durationMs: itemDurationMs,
      uri: itemUri,
    });
    
    // 4. Collect results into a structured array
    return frames.collectAs([
      reviewId,
      reviewRating,
      reviewNotes,
      reviewDate,
      {
        itemExternalId,
        itemType,
        itemName,
        itemArtistName,
        itemImageUrl,
        itemDescription,
        itemReleaseDate,
        itemDurationMs,
        itemUri,
      },
    ], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});


// --- GET ITEM REVIEWS (with enrichment) ---

/**
 * Sync to handle the request for retrieving all reviews for a specific music item.
 * It resolves the music entity, fetches its reviews, and enriches them with reviewer details.
 */
export const GetItemReviewsRequest: Sync = ({
  request,
  itemExternalId,
  itemType, // The type of music entity being queried, e.g., "TRACK"
  musicEntityId, // Internal ID for MusicEntity
  reviewId,
  reviewUser, // Author of the review
  reviewRating,
  reviewNotes,
  reviewDate,
  reviewerUsername,
  reviewerThumbnail,
  results,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/itemReviews", itemExternalId, itemType },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Resolve external item ID to internal MusicEntity ID, ensuring entity exists
    // This query returns [{ music: ID } | { error: string }]
    frames = await frames.query(
      MusicDiscovery.loadEntityDetails,
      { externalId: itemExternalId, type: itemType },
      { music: musicEntityId },
    );
    if (frames.length === 0) {
      // If the music entity cannot be resolved, return an empty list of reviews
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 2. Get all reviews for this internal MusicEntity ID
    // This query returns [{ review: ReviewId, user: User, rating: Number, notes: String, date: Date }]
    frames = await frames.query(Review._getItemReviews, { item: frames[0][musicEntityId] }, {
      review: reviewId,
      user: reviewUser, // Author of the review
      rating: reviewRating,
      notes: reviewNotes,
      date: reviewDate,
    });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 3. Enrich each review with reviewer's username and thumbnail
    // UserAuthentication._getUsername expects { user: ID } and returns { username: string }
    // Profile._getThumbnail expects { user: ID } and returns { thumbnailUrl: string }
    frames = await frames.query(UserAuthentication._getUsername, { user: reviewUser }, { username: reviewerUsername });
    frames = await frames.query(Profile._getThumbnail, { user: reviewUser }, { thumbnailUrl: reviewerThumbnail });

    // 4. Collect results into a structured array
    return frames.collectAs([
      reviewId,
      reviewRating,
      reviewNotes,
      reviewDate,
      { user: reviewUser, username: reviewerUsername, thumbnailUrl: reviewerThumbnail },
    ], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});


// --- GET REVIEW BY ITEM AND USER (with enrichment) ---

/**
 * Sync to handle the request for retrieving a specific user's review for a given music item.
 * It authenticates the user, resolves the music entity, fetches the review, and returns it.
 */
export const GetReviewByItemAndUserRequest: Sync = ({
  request,
  session,
  itemExternalId,
  itemType,
  user, // Current user from session
  musicEntityId, // Internal ID for MusicEntity
  reviewId,
  reviewRating,
  reviewNotes,
  reviewDate,
  itemExternalIdRes, // Renamed variable to avoid clash with input `itemExternalId`
  itemTypeRes,       // Renamed variable to avoid clash with input `itemType`
  itemName,
  itemArtistName,
  itemImageUrl,
  itemDescription,
  itemReleaseDate,
  itemDurationMs,
  itemUri,
  results, // Expected to be a single object, not an array
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/byItemAndUser", session, itemExternalId, itemType },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: null }); // Return null if no valid user
    }

    // 2. Resolve external item ID to internal MusicEntity ID, ensuring entity exists
    frames = await frames.query(
      MusicDiscovery.loadEntityDetails,
      { externalId: itemExternalId, type: itemType },
      { music: musicEntityId },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: null }); // Item not found/resolved, return null
    }

    // 3. Get the specific review by item and user
    // Expected to return [{ review: ReviewId, rating: Number, notes: String, date: Date }]
    frames = await frames.query(Review._getReviewByItemAndUser, { item: frames[0][musicEntityId], user: frames[0][user] }, {
      review: reviewId,
      rating: reviewRating,
      notes: reviewNotes,
      date: reviewDate,
    });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: null }); // No review found for this user/item, return null
    }

    // 4. Enrich the review with MusicEntity details (since we only found one review, apply to its item)
    // This query is expected to return: [{ externalId, type, name, artistName, imageUrl, description, releaseDate, durationMs, uri }]
    frames = await frames.query(MusicDiscovery._getEntityFromId, { musicEntity: frames[0][musicEntityId] }, {
      externalId: itemExternalIdRes,
      type: itemTypeRes,
      name: itemName,
      artistName: itemArtistName,
      imageUrl: itemImageUrl,
      description: itemDescription,
      releaseDate: itemReleaseDate,
      durationMs: itemDurationMs,
      uri: itemUri,
    });

    // 5. Collect as a single object (since it's _getReviewByItemAndUser, expecting 0 or 1 result)
    // Use a temporary symbol for the collected array, then extract the first element.
    const collectedResult = frames.collectAs([
      reviewId,
      reviewRating,
      reviewNotes,
      reviewDate,
      {
        itemExternalId: itemExternalIdRes,
        itemType: itemTypeRes,
        itemName,
        itemArtistName,
        itemImageUrl,
        itemDescription,
        itemReleaseDate,
        itemDurationMs,
        itemUri,
      },
    ], new Symbol("tempResult")); 

    // If a result was found, extract the single object. Otherwise, return null.
    if (collectedResult.length > 0 && collectedResult[0][new Symbol("tempResult")].length > 0) {
        return new Frames({ ...originalFrame, [results]: collectedResult[0][new Symbol("tempResult")][0] });
    } else {
        return new Frames({ ...originalFrame, [results]: null });
    }
  },
  then: actions([Requesting.respond, { request, results }]),
});


// --- GET REVIEW COMMENTS (with enrichment) ---

/**
 * Sync to handle the request for retrieving all comments for a specific review.
 * It fetches the comments and enriches them with commenter details (username, thumbnail).
 */
export const GetReviewCommentsRequest: Sync = ({
  request,
  reviewId,
  commentId,
  commenterId,
  commentNotes,
  commentDate,
  commenterUsername,
  commenterThumbnail,
  results,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/comments", review: reviewId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Verify Review exists
    // Review._getReviewById returns [{ review: { _id: ReviewId, ... } }]
    const existingReviews = await frames.query(Review._getReviewById, { review: reviewId }, { review: new Symbol("fullReviewDoc") });
    if (existingReviews.length === 0) {
      return new Frames({ ...originalFrame, error: `Review with ID ${reviewId} not found.` });
    }

    // 2. Get all comments for the given review
    // Expected to return [{ commentId, commenter, notes, date }]
    frames = await frames.query(Review._getReviewComments, { review: reviewId }, {
      commentId,
      commenter: commenterId,
      notes: commentNotes,
      date: commentDate,
    });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] }); // No comments found, return empty list
    }

    // 3. Enrich each comment with commenter's username and thumbnail
    // UserAuthentication._getUsername expects { user: ID } and returns { username: string }
    // Profile._getThumbnail expects { user: ID } and returns { thumbnailUrl: string }
    frames = await frames.query(UserAuthentication._getUsername, { user: commenterId }, { username: commenterUsername });
    frames = await frames.query(Profile._getThumbnail, { user: commenterId }, { thumbnailUrl: commenterThumbnail });

    // 4. Collect results into a structured array
    return frames.collectAs([
      commentId,
      commentNotes,
      commentDate,
      { user: commenterId, username: commenterUsername, thumbnailUrl: commenterThumbnail },
    ], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
```
