[@sync-background](../background/sync-background.md)

[@friending-concept](../concepts/Friending/Friending.md)

[@music-discovery-concept](../concepts/MusicDiscovery/MusicDiscovery.md)

[@playlist-concept](../concepts/Playlist/Playlist.md)

[@profile-concept](../concepts/Profile/implementation.md)

[@review-concept](../concepts/Review/Review.md)

[@session-concept](../concepts/Session/Session.md)

[@userauth-concept](../concepts/UserAuthentication/UserAuthentication.md)

[@api-syncs](api-syncs.md)

[@sync-design](sync-design.md)

[@example-sync](example-syncs.md)

[@sample-sync](../../src/syncs/sample.sync.ts)

# prompt: provide the implementation for profile related syncs. do not use helpers and model this after the sample sync file
# response:

Okay, here are the TypeScript synchronization files (`.sync.ts`) for the `Profile` concept, modeled after the provided examples and adhering to the stated principles.

These synchronizations focus on operations for the *authenticated user's own profile*, demonstrating how `Sessioning` is used to derive the `User` ID from the `Session` before interacting with the `Profile` concept.

---

**`src/syncs/profile.sync.ts`**

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, Profile } from "@concepts"; // Assuming Profile and Sessioning are correctly imported

// Generic types needed for synchronizations
type User = ID;
type Session = ID;
type ProfileData = { bio: string; thumbnailUrl: string }; // For combined profile return

// --- Action: updateBio ---

/**
 * Sync: Handles requests to update an authenticated user's biographical information.
 * When a request to `/profile/update/bio` arrives, it first authenticates the user
 * via their session, then calls the `Profile.updateBio` action.
 */
export const UpdateBioRequest: Sync = ({ request, session, bio, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/update/bio", session, bio },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    // If session is invalid, the 'user' binding won't exist.
    // We inject an error into the frame so a response sync can pick it up.
    if (frames.length === 0) {
      return new Frames({ ...frames[0], error: "Authentication failed: Invalid session." });
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
    [Requesting.request, { path: "/profile/update/bio" }, { request }],
    [Profile.updateBio, {}, {}], // Matches successful (empty) return from action
  ),
  then: actions([Requesting.respond, { request, status: "Bio updated successfully." }]),
});

/**
 * Sync: Responds to an errored `Profile.updateBio` action.
 */
export const UpdateBioResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/update/bio" }, { request }],
    [Profile.updateBio, {}, { error }], // Matches error return from action
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Action: updateThumbnail ---

/**
 * Sync: Handles requests to update an authenticated user's profile thumbnail URL.
 * When a request to `/profile/update/thumbnail` arrives, it first authenticates the user
 * via their session, then calls the `Profile.updateThumbnail` action.
 */
export const UpdateThumbnailRequest: Sync = ({ request, session, thumbnailUrl, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/update/thumbnail", session, thumbnailUrl },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    if (frames.length === 0) {
      return new Frames({ ...frames[0], error: "Authentication failed: Invalid session." });
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
    [Requesting.request, { path: "/profile/update/thumbnail" }, { request }],
    [Profile.updateThumbnail, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "Thumbnail updated successfully." }]),
});

/**
 * Sync: Responds to an errored `Profile.updateThumbnail` action.
 */
export const UpdateThumbnailResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/update/thumbnail" }, { request }],
    [Profile.updateThumbnail, {}, { error }],
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
    { path: "/profile/delete", session },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    
    if (frames.length === 0) {
      return new Frames({ ...frames[0], error: "Authentication failed: Invalid session." });
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
    [Requesting.request, { path: "/profile/delete" }, { request }],
    [Profile.deleteProfile, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "Profile deleted successfully." }]),
});

/**
 * Sync: Responds to an errored `Profile.deleteProfile` action.
 */
export const DeleteProfileResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/delete" }, { request }],
    [Profile.deleteProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Query: _getProfile (for the authenticated user) ---

/**
 * Sync: Handles requests to get the authenticated user's complete profile (bio and thumbnail URL).
 * Fetches the user from the session, then queries `Profile._getProfile`.
 * Handles cases where the session is invalid or the user's profile might not exist.
 */
export const GetMyProfileRequest: Sync = ({ request, session, user, profile }) => ({
  when: actions([Requesting.request, { path: "/profile/my", session }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture the initial frame for potential error/default response
    
    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      // If session is invalid, immediately return an error frame.
      return new Frames({ ...originalFrame, error: "Authentication failed: Invalid session." });
    }

    // 2. Query for the user's profile. Profile._getProfile returns an array.
    frames = await frames.query(Profile._getProfile, { user }, { profile });

    if (frames.length === 0) {
      // If _getProfile returns an empty array (no profile found),
      // we generate a default empty profile to ensure a response is sent.
      return new Frames({ ...originalFrame, [profile]: { bio: "", thumbnailUrl: "" } });
    }

    return frames;
  },
  then: actions([Requesting.respond, { request, profile }]),
});

// No separate success/error response syncs are needed for GetMyProfileRequest,
// as the 'where' clause explicitly crafts the final frame with 'profile' or 'error'
// before the single 'then' clause responds.
```