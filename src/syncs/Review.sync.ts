import { actions, Frames, Sync } from "@engine";
import { Requesting, Review, Session } from "@concepts";

// --- POST REVIEW ---

export const PostReviewRequest: Sync = ({
  request,
  session,
  item,
  ratingNumber,
  notes,
  user,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Review/postReview",
      item,
      session,
      ratingNumber,
      notes,
    },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture the initial request frame

    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        error: "Authentication failed: No valid session found.",
      });
    }
    // Pass through the original frame augmented with user and musicEntityId
    return new Frames(frames[0]);
  },
  then: actions([Review.postReview, { item, user, ratingNumber, notes }]),
});

/**
 * Sync to respond to successful postReview actions.
 */
export const PostReviewResponseSuccess: Sync = ({ request, review }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/postReview" }, { request }],
    [Review.postReview, {}, { review }]
  ),
  then: actions([Requesting.respond, { request, review }]),
});

/**
 * Sync to respond to errors from the Review.postReview action itself.
 */
export const PostReviewResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/postReview" }, { request }],
    [Review.postReview, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- UPDATE REVIEW ---

export const UpdateReviewRequest: Sync = ({
  request,
  session,
  review,
  ratingNumber,
  notes,
  user,
  author,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/updateReview", session, review, ratingNumber, notes },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        error: "Authentication failed: No valid session found.",
      });
    }

    // 2. Authorize: Check if the user is the author of the review
    // Review._getReviewById returns [{ review: { _id: ReviewId, user: Author, ... } }]
    await frames.query(Review._getReviewAuthor, { review }, { author });
    if (user !== author) {
      return new Frames({
        ...originalFrame,
        error: `Unauthorized update.`,
      });
    }

    return new Frames(frames[0]);
  },
  then: actions([Review.updateReview, { review: review, ratingNumber, notes }]),
});

/**
 * Sync to respond to successful updateReview actions.
 */
export const UpdateReviewResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/updateReview" }, { request }],
    [Review.updateReview, {}, {}] // No specific return for success, just an empty object
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Review updated successfully." },
  ]),
});

/**
 * Sync to respond to errors from the Review.updateReview action itself.
 */
export const UpdateReviewResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/updateReview" }, { request }],
    [Review.updateReview, {}, { error }]
  ),
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
  review,
  user,
  author,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Review/deleteReview", session, review },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        error: "Authentication failed: No valid session found.",
      });
    }

    // 2. Authorize: Check if the user is the author of the review
    // Review._getReviewById returns [{ review: { _id: ReviewId, user: Author, ... } }]
    await frames.query(Review._getReviewAuthor, { review }, { author });
    if (user !== author) {
      return new Frames({
        ...originalFrame,
        error: `Unauthorized delete.`,
      });
    }

    return new Frames(frames[0]);
  },
  then: actions([Review.deleteReview, { review }]),
});

/**
 * Sync to respond to successful deleteReview actions.
 */
export const DeleteReviewResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteReview" }, { request }],
    [Review.deleteReview, {}, {}] // No specific return for success
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Review deleted successfully." },
  ]),
});

/**
 * Sync to respond to errors from the Review.deleteReview action itself.
 */
export const DeleteReviewResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteReview" }, { request }],
    [Review.deleteReview, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- ADD COMMENT TO REVIEW ---

export const AddCommentRequest: Sync = ({
  request,
  session,
  review,
  comment,
  user,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Review/addComment",
      review,
      session,
      comment,
    },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        error: "Authentication failed: No valid session found.",
      });
    }

    return new Frames(frames[0]);
  },
  then: actions([Review.addComment, { review, commenter: user, comment }]),
});

/**
 * Sync to respond to successful addComment actions.
 */
export const AddCommentResponseSuccess: Sync = ({ request, commentId }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/addComment" }, { request }],
    [Review.addComment, {}, { commentId }]
  ),
  then: actions([Requesting.respond, { request, commentId }]),
});

/**
 * Sync to respond to errors from the Review.addComment action itself.
 */
export const AddCommentResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/addComment" }, { request }],
    [Review.addComment, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- DELETE COMMENT FROM REVIEW ---
export const DeleteCommentRequest: Sync = ({
  request,
  session,
  review,
  comment,
  user,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Review/deleteComment",
      session,
      review,
      comment,
    },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({
        ...originalFrame,
        error: "Authentication failed: No valid session found.",
      });
    }

    return new Frames(frames[0]);
  },
  then: actions([Review.deleteComment, { review, commentId: comment }]),
});

/**
 * Sync to respond to successful deleteComment actions.
 */
export const DeleteCommentResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteComment" }, { request }],
    [Review.deleteComment, {}, {}] // No specific return for success
  ),
  then: actions([
    Requesting.respond,
    { request, status: "Comment deleted successfully." },
  ]),
});

/**
 * Sync to respond to errors from the Review.deleteComment action itself.
 */
export const DeleteCommentResponseActionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Review/deleteComment" }, { request }],
    [Review.deleteComment, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});
