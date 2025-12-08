---
timestamp: 'Sun Dec 07 2025 18:14:50 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251207_181450.d9cfec94.md]]'
content_id: 6512c3df8912e5a7a9ef89c88a2467d2c9ed7e5413b84d453c5e4a04364d79ec
---

# response:

Here are the TypeScript synchronization files (`.sync.ts`) for the `Profile` concept, modeled after the provided `sample.sync.ts` and adhering to the Concept Design principles.

I've organized the synchronizations into a single file `src/syncs/profile.sync.ts`.

***

**File: `src/syncs/profile.sync.ts`**

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, Profile } from "@concepts"; // Assuming Sessioning and Profile concepts are available

// --- Synchronizations for Profile Concept ---

// --- 1. Update User Bio ---

/**
 * Sync: Handles the request to update a user's biographical information.
 * Authenticates the user session before calling Profile.updateBio.
 */
export const UpdateBioRequest: Sync = ({ request, session, bio, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/update/bio", session, bio },
    { request },
  ]),
  where: async (frames) => {
    const initialFrame = frames.getOriginalBindings()[0]; // Capture the original request frame to maintain context

    // Authenticate the user by getting their ID from the session
    const authenticatedFrames = await frames.query(Sessioning._getUser, { session }, { user });

    // If session is invalid (no user found), create an error response frame
    if (authenticatedFrames.length === 0) {
      return new Frames({ ...initialFrame.toObject(), error: "Unauthorized: Invalid session." });
    }
    return authenticatedFrames; // Continue with frames that successfully authenticated the user
  },
  then: actions([Profile.updateBio, { user, bio }]),
});

/**
 * Sync: Responds to a successful bio update request.
 */
export const UpdateBioResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/update/bio" }, { request }],
    [Profile.updateBio, {}, {}], // Matches successful updateBio call (returns Empty)
  ),
  then: actions([Requesting.respond, { request, status: "success", message: "Bio updated successfully." }]),
});

/**
 * Sync: Responds to a failed bio update request.
 */
export const UpdateBioResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/update/bio" }, { request }],
    [Profile.updateBio, {}, { error }], // Matches failed updateBio call (returns { error: string })
  ),
  then: actions([Requesting.respond, { request, status: "error", error }]),
});

// --- 2. Update User Thumbnail ---

/**
 * Sync: Handles the request to update a user's profile thumbnail URL.
 * Authenticates the user session before calling Profile.updateThumbnail.
 */
export const UpdateThumbnailRequest: Sync = ({ request, session, thumbnailUrl, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/update/thumbnail", session, thumbnailUrl },
    { request },
  ]),
  where: async (frames) => {
    const initialFrame = frames.getOriginalBindings()[0];

    // Authenticate the user
    const authenticatedFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authenticatedFrames.length === 0) {
      return new Frames({ ...initialFrame.toObject(), error: "Unauthorized: Invalid session." });
    }
    return authenticatedFrames;
  },
  then: actions([Profile.updateThumbnail, { user, thumbnailUrl }]),
});

/**
 * Sync: Responds to a successful thumbnail update request.
 */
export const UpdateThumbnailResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/update/thumbnail" }, { request }],
    [Profile.updateThumbnail, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "success", message: "Thumbnail updated successfully." }]),
});

/**
 * Sync: Responds to a failed thumbnail update request.
 */
export const UpdateThumbnailResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/update/thumbnail" }, { request }],
    [Profile.updateThumbnail, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, status: "error", error }]),
});

// --- 3. Delete User Profile ---

/**
 * Sync: Handles the request to delete a user's profile.
 * Authenticates the user session before calling Profile.deleteProfile.
 */
export const DeleteProfileRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/delete", session },
    { request },
  ]),
  where: async (frames) => {
    const initialFrame = frames.getOriginalBindings()[0];

    // Authenticate the user
    const authenticatedFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authenticatedFrames.length === 0) {
      return new Frames({ ...initialFrame.toObject(), error: "Unauthorized: Invalid session." });
    }
    return authenticatedFrames;
  },
  then: actions([Profile.deleteProfile, { user }]),
});

/**
 * Sync: Responds to a successful profile deletion request.
 */
export const DeleteProfileResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/delete" }, { request }],
    [Profile.deleteProfile, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "success", message: "Profile deleted successfully." }]),
});

/**
 * Sync: Responds to a failed profile deletion request.
 */
export const DeleteProfileResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/profile/delete" }, { request }],
    [Profile.deleteProfile, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, status: "error", error }]),
});

// --- 4. Get User Bio (Authenticated Access) ---

/**
 * Sync: Handles the request to get the authenticated user's bio.
 * Retrieves user from session and then queries Profile._getBio.
 */
export const GetBioRequest: Sync = ({ request, session, user, bio }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/get/bio", session },
    { request },
  ]),
  where: async (frames) => {
    const initialFrame = frames.getOriginalBindings()[0];

    // Authenticate the user
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return new Frames({ ...initialFrame.toObject(), error: "Unauthorized: Invalid session." });
    }

    // Query for the bio using the authenticated user
    const bioResults = await currentFrames.query(Profile._getBio, { user }, { bio });

    // If no bio found (Profile._getBio returns an empty array), provide a default empty string.
    if (bioResults.length === 0) {
      return new Frames({
        ...initialFrame.toObject(), // Keep original request details
        [user]: currentFrames.get(user), // Explicitly carry over the user from the authenticated frame
        bio: "", // Provide default value for bio if not found
      });
    }
    return bioResults; // bio is now bound to each frame from query results
  },
  then: actions([Requesting.respond, { request, bio }]), // Respond with bio (could be default empty or actual) or error from earlier auth
});

// --- 5. Get User Thumbnail (Authenticated Access) ---

/**
 * Sync: Handles the request to get the authenticated user's thumbnail URL.
 * Retrieves user from session and then queries Profile._getThumbnail.
 */
export const GetThumbnailRequest: Sync = ({ request, session, user, thumbnailUrl }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/get/thumbnail", session },
    { request },
  ]),
  where: async (frames) => {
    const initialFrame = frames.getOriginalBindings()[0];

    // Authenticate the user
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return new Frames({ ...initialFrame.toObject(), error: "Unauthorized: Invalid session." });
    }

    // Query for the thumbnail URL
    const thumbnailResults = await currentFrames.query(Profile._getThumbnail, { user }, { thumbnailUrl });

    // If no thumbnail found, provide a default empty string.
    if (thumbnailResults.length === 0) {
      return new Frames({
        ...initialFrame.toObject(),
        [user]: currentFrames.get(user),
        thumbnailUrl: "",
      });
    }
    return thumbnailResults;
  },
  then: actions([Requesting.respond, { request, thumbnailUrl }]),
});

// --- 6. Get User Profile (Authenticated Access - combines bio and thumbnail) ---

/**
 * Sync: Handles the request to get the authenticated user's complete profile (bio and thumbnail URL).
 * Retrieves user from session and then queries Profile._getProfile.
 */
export const GetProfileRequest: Sync = ({ request, session, user, profile }) => ({
  when: actions([
    Requesting.request,
    { path: "/profile/get", session },
    { request },
  ]),
  where: async (frames) => {
    const initialFrame = frames.getOriginalBindings()[0];

    // Authenticate the user
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return new Frames({ ...initialFrame.toObject(), error: "Unauthorized: Invalid session." });
    }

    // Query for the full profile
    const profileResults = await currentFrames.query(Profile._getProfile, { user }, { profile });

    // If no profile found, provide a default empty object for profile details.
    if (profileResults.length === 0) {
      return new Frames({
        ...initialFrame.toObject(),
        [user]: currentFrames.get(user),
        profile: { bio: "", thumbnailUrl: "" },
      });
    }
    return profileResults;
  },
  then: actions([Requesting.respond, { request, profile }]),
});
```
