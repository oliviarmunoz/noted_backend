import { actions, Frames, Sync } from "@engine";
import { Requesting, Session, Profile } from "@concepts"; // Assuming Profile and Session are correctly imported

// --- Action: updateBio ---

/**
 * Sync: Handles requests to update an authenticated user's biographical information.
 * When a request to `/profile/update/bio` arrives, it first authenticates the user
 * via their session, then calls the `Profile.updateBio` action.
 */
export const UpdateBioRequest: Sync = ({ request, session, bio, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/updateBio", session, bio },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });

    // If session is invalid, the 'user' binding won't exist.
    // We inject an error into the frame so a response sync can pick it up.
    if (frames.length === 0) {
      return new Frames({
        ...frames[0],
        error: "Authentication failed: Invalid session.",
      });
    }
    return frames;
  },
  then: actions([Profile.updateBio, { user, bio }]),
});

/**
 * Sync: Responds to a successful `Profile.updateBio` action.
 */
export const UpdateBioResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/updateBio" }, { request }],
    [Profile.updateBio, {}, {}] // Matches successful (empty) return from action
  ),
  then: actions([
    Requesting.respond,
    { request },
  ]),
});

/**
 * Sync: Responds to an errored `Profile.updateBio` action.
 */
export const UpdateBioResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/updateBio" }, { request }],
    [Profile.updateBio, {}, { error }] // Matches error return from action
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Action: updateThumbnail ---

/**
 * Sync: Handles requests to update an authenticated user's profile thumbnail URL.
 * When a request to `/profile/update/thumbnail` arrives, it first authenticates the user
 * via their session, then calls the `Profile.updateThumbnail` action.
 */
export const UpdateThumbnailRequest: Sync = ({
  request,
  session,
  thumbnailUrl,
  user,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/updateThumbnail", session, thumbnailUrl },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({
        ...frames[0],
        error: "Authentication failed: Invalid session.",
      });
    }
    return frames;
  },
  then: actions([Profile.updateThumbnail, { user, thumbnailUrl }]),
});

/**
 * Sync: Responds to a successful `Profile.updateThumbnail` action.
 */
export const UpdateThumbnailResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/updateThumbnail" }, { request }],
    [Profile.updateThumbnail, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    { request },
  ]),
});

/**
 * Sync: Responds to an errored `Profile.updateThumbnail` action.
 */
export const UpdateThumbnailResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/updateThumbnail" }, { request }],
    [Profile.updateThumbnail, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Action: deleteProfile ---

/**
 * Sync: Handles requests to delete an authenticated user's profile.
 * When a request to `/profile/delete` arrives, it first authenticates the user
 * via their session, then calls the `Profile.deleteProfile` action.
 */
export const DeleteProfileRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/deleteProfile", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await frames.query(Session._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({
        ...frames[0],
        error: "Authentication failed: Invalid session.",
      });
    }
    return frames;
  },
  then: actions([Profile.deleteProfile, { user }]),
});

/**
 * Sync: Responds to a successful `Profile.deleteProfile` action.
 */
export const DeleteProfileResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/deleteProfile" }, { request }],
    [Profile.deleteProfile, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    { request },
  ]),
});

/**
 * Sync: Responds to an errored `Profile.deleteProfile` action.
 */
export const DeleteProfileResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/deleteProfile" }, { request }],
    [Profile.deleteProfile, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});