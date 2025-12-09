import { actions, Frames, Sync } from "@engine";
import { Requesting, Session, Upvote } from "@concepts";

/**
 * @concept Upvote
 * @purpose Enable users to upvote items.
 *
 * This file contains synchronizations for the Upvote concept.
 * It orchestrates interactions between Requesting, Session, and Upvote concepts.
 */

// --- Helper for creating a single error frame with a consistent structure ---
const createErrorFrame = (originalFrame: Record<symbol, unknown>, errorMessage: string): Frames => {
  return new Frames({ ...originalFrame, error: errorMessage });
};

// --- Action: upvote ---

/**
 * sync UpvoteRequest
 * Handles the HTTP request for upvoting an item.
 * It authenticates the user via session and then delegates to Upvote.upvote.
 */
export const UpvoteRequest: Sync = ({ request, session, item, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Upvote/upvote", session, item },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    const currentFrames = await frames.query(Session._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    return currentFrames;
  },
  then: actions([
    Upvote.upvote,
    { user, item },
  ]),
});

/**
 * sync UpvoteResponseSuccess
 * Responds to the client with success after an item is successfully upvoted.
 */
export const UpvoteResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Upvote/upvote" }, { request }],
    [Upvote.upvote, {}, {}], // Matches successful (empty) return from upvote
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync UpvoteResponseError
 * Responds to the client with an error if upvoting fails (e.g., already upvoted).
 */
export const UpvoteResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Upvote/upvote" }, { request }],
    [Upvote.upvote, {}, { error }], // Matches error return from upvote
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Action: unvote ---

/**
 * sync UnvoteRequest
 * Handles the HTTP request for removing an upvote from an item.
 * It authenticates the user via session and then delegates to Upvote.unvote.
 */
export const UnvoteRequest: Sync = ({ request, session, item, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Upvote/unvote", session, item },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    const currentFrames = await frames.query(Session._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    return currentFrames;
  },
  then: actions([
    Upvote.unvote,
    { user, item },
  ]),
});

/**
 * sync UnvoteResponseSuccess
 * Responds to the client with success after an upvote is successfully removed.
 */
export const UnvoteResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Upvote/unvote" }, { request }],
    [Upvote.unvote, {}, {}], // Matches successful (empty) return from unvote
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync UnvoteResponseError
 * Responds to the client with an error if removing an upvote fails (e.g., not upvoted).
 */
export const UnvoteResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Upvote/unvote" }, { request }],
    [Upvote.unvote, {}, { error }], // Matches error return from unvote
  ),
  then: actions([Requesting.respond, { request, error }]),
});

