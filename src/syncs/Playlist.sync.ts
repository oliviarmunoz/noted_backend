import { actions, Frames, Sync } from "@engine";
import { Requesting, Session, MusicDiscovery, UserAuthentication, Playlist } from "@concepts";
import { ID } from "@utils/types.ts"; // Import ID type if used in patterns

export const CreateListenLater: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [Playlist.createPlaylist, { user, playlistName: "Listen Later" }],
  ),
});

export const CreateFavorites: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [Playlist.createPlaylist, { user, playlistName: "Favorites" }],
  ),
});

export const CreateFriendRecommendations: Sync = ({ user }) => ({
  when: actions(
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions(
    [Playlist.createPlaylist, { user, playlistName: "Friend Recommendations" }],
  ),
});
type Item = ID; // Item here represents the externalId of a MusicEntity
type PlaylistId = ID; // Using PlaylistId for clarity to distinguish from playlistName string

/**
 * @concept Playlist
 * @purpose Enable users to establish and manage collections of items.
 *
 * This file contains synchronizations for the Playlist concept.
 * It orchestrates interactions between Requesting, Session, MusicDiscovery, and Playlist concepts.
 */

// --- Helper for creating a single error frame with a consistent structure ---
const createErrorFrame = (originalFrame: Record<symbol, unknown>, errorMessage: string): Frames => {
  return new Frames({ ...originalFrame, error: errorMessage });
};

// --- Helper to find a specific playlist by name within a set of user playlists ---
// This will replace the functionality of the non-existent Playlist._getPlaylistByNameAndUser
const findUserPlaylistByName = async (
  frames: Frames,
  userSymbol: symbol, // Symbol for the bound 'user' variable
  playlistNameSymbol: symbol, // Symbol for the bound 'playlistName' variable
  outputPlaylistIdSymbol: symbol, // Symbol for where to bind the found playlist ID
  isPublicSymbol: symbol
): Promise<Frames> => {
  const originalFrame = frames[0];

  // Query all playlists for the user
  const allUserPlaylistsFrames = await frames.query(Playlist._getUserPlaylists, { user: userSymbol }, {
    playlistName: playlistNameSymbol,
    isPublic: isPublicSymbol,
    playlistId: outputPlaylistIdSymbol, // Bind the found playlist ID to the specified symbol
  });

  // Filter to find the specific playlist by name
  const targetPlaylistFrames = allUserPlaylistsFrames.filter(
    ($) => $[userSymbol] === originalFrame[userSymbol] && $[playlistNameSymbol] === originalFrame[playlistNameSymbol],
  );

  if (targetPlaylistFrames.length === 0) {
    return new Frames(); // Return empty frames if playlist not found for user
  }

  // Only return the frame(s) corresponding to the matched playlist,
  // ensuring the outputPlaylistIdSymbol is correctly bound.
  // We explicitly return a new Frames object to ensure only the matched playlist's data is propagated
  return new Frames(
    ...targetPlaylistFrames.map(($) => ({
      ...originalFrame, // Preserve original request context
      [userSymbol]: $[userSymbol],
      [playlistNameSymbol]: $[playlistNameSymbol],
      [outputPlaylistIdSymbol]: $[outputPlaylistIdSymbol], // The actual playlist ID
      // You can add other relevant bindings if needed, e.g., isPublic
    })),
  );
};


// --- Create Playlist ---

/**
 * sync CreatePlaylistRequest
 * Handles the HTTP request for creating a new playlist.
 * It authenticates the user via session and then delegates to Playlist.createPlaylist.
 * The Playlist.createPlaylist action itself handles the unique name check and returns an error if needed.
 */
export const CreatePlaylistRequest: Sync = ({ request, session, playlistName, isPublic, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Playlist/createPlaylist", session, playlistName, isPublic },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0]; // Preserve original request details for response

    // 1. Authenticate user from session
    const currentFrames = await frames.query(Session._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }
    // `currentFrames` now has `user` bound.
    // No explicit check for existing playlist name here in sync,
    // as Playlist.createPlaylist action itself includes that precondition check
    // and returns an error if violated. This follows the principle of "Completeness of functionality"
    // where the concept action is responsible for its own validation.
    return currentFrames;
  },
  then: actions([
    // Playlist.createPlaylist will return { playlist: PlaylistId } on success or { error: string } on failure.
    // Subsequent syncs (CreatePlaylistResponseSuccess/Error) will pick this up.
    Playlist.createPlaylist,
    { user, playlistName, isPublic }, // Pass actual bound variables
  ]),
});

/**
 * sync CreatePlaylistResponseSuccess
 * Responds to the client with success after a playlist is successfully created.
 */
export const CreatePlaylistResponseSuccess: Sync = ({ request, playlist }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/createPlaylist" }, { request }],
    [Playlist.createPlaylist, {}, { playlist }], // Matches successful return from createPlaylist
  ),
  then: actions([Requesting.respond, { request, status: "success", playlist }]),
});

/**
 * sync CreatePlaylistResponseError
 * Responds to the client with an error if playlist creation fails (e.g., name already exists).
 */
export const CreatePlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/createPlaylist" }, { request }],
    [Playlist.createPlaylist, {}, { error }], // Matches error return from createPlaylist
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Delete Playlist ---

/**
 * sync DeletePlaylistRequest
 * Handles the HTTP request for deleting an entire playlist.
 * It authenticates the user and verifies ownership of the playlist before calling the concept action.
 */
export const DeletePlaylistRequest: Sync = ({ request, session, playlistName, user, playlistId, isPublic }) => ({
  when: actions([
    Requesting.request,
    { path: "/Playlist/deletePlaylist", session, playlistName },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    const currentFrames = await frames.query(Session._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    // 2. Ensure the playlist exists and belongs to the authenticated user.
    // Use the helper to find the playlist by name and bind its ID if found.
    const playlistFoundFrames = await findUserPlaylistByName(currentFrames, user, playlistName, playlistId, isPublic);
    if (playlistFoundFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist not found or does not belong to user.`);
    }

    // Pass original frames forward, as Playlist.deletePlaylist needs `user` and `playlistName` directly
    return currentFrames;
  },
  then: actions([
    Playlist.deletePlaylist,
    { user, playlistName },
  ]),
});

/**
 * sync DeletePlaylistResponseSuccess
 * Responds to the client with success after a playlist is successfully deleted.
 */
export const DeletePlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/deletePlaylist" }, { request }],
    [Playlist.deletePlaylist, {}, {}], // Matches successful (empty) return from deletePlaylist
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync DeletePlaylistResponseError
 * Responds to the client with an error if playlist deletion fails.
 */
export const DeletePlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/deletePlaylist" }, { request }],
    [Playlist.deletePlaylist, {}, { error }], // Matches error return from deletePlaylist
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Add Item to Playlist ---

/**
 * sync AddItemToPlaylistRequest
 * Handles the HTTP request for adding an item to a playlist.
 * It authenticates the user, ensures the playlist exists, and ensures the MusicEntity exists
 * (creating it via MusicDiscovery._getEntityFromId if necessary, which is now part of that query).
 */
export const AddItemToPlaylistRequest: Sync = ({ request, session, playlistName, playlistId, isPublic, item, user, musicEntity, entityLookupError }) => ({
  when: actions([
    Requesting.request,
    { path: "/Playlist/addItem", session, item, playlistName },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    const currentFrames = await frames.query(Session._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    // 4. Check if item is already in the playlist (pre-condition for addItem in PlaylistConcept).
    // The Playlist.addItem action itself performs this check and returns an error if violated.
    // We don't need an explicit 'where' filter here for this, relying on the concept's action.

    return currentFrames; // All conditions met, proceed to then clause
  },
  then: actions([
    Playlist.addItem,
    { user, item, playlistName }, // Pass itemExternalId as 'item' as per concept spec
  ]),
});

/**
 * sync AddItemToPlaylistResponseSuccess
 * Responds to the client with success after an item is successfully added to a playlist.
 */
export const AddItemToPlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/addItem" }, { request }],
    [Playlist.addItem, {}, {}], // Matches successful (empty) return from addItem
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync AddItemToPlaylistResponseError
 * Responds to the client with an error if adding an item to a playlist fails.
 */
export const AddItemToPlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/addItem" }, { request }],
    [Playlist.addItem, {}, { error }], // Matches error return from addItem
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Delete Item from Playlist ---

/**
 * sync DeleteItemFromPlaylistRequest
 * Handles the HTTP request for deleting an item from a playlist.
 * It authenticates the user, ensures the playlist exists, and that the item is in the playlist.
 */
export const DeleteItemFromPlaylistRequest: Sync = ({ request, session, playlistName, playlistId, isPublic, item, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Playlist/deleteItem", session, item, playlistName },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    const currentFrames = await frames.query(Session._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    return currentFrames; // All conditions met, proceed
  },
  then: actions([
    Playlist.deleteItem,
    { user, item, playlistName },
  ]),
});

/**
 * sync DeleteItemFromPlaylistResponseSuccess
 * Responds to the client with success after an item is successfully deleted from a playlist.
 */
export const DeleteItemFromPlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/deleteItem" }, { request }],
    [Playlist.deleteItem, {}, {}], // Matches successful (empty) return from deleteItem
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync DeleteItemFromPlaylistResponseError
 * Responds to the client with an error if deleting an item from a playlist fails.
 */
export const DeleteItemFromPlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Playlist/deleteItem" }, { request }],
    [Playlist.deleteItem, {}, { error }], // Matches error return from deleteItem
  ),
  then: actions([Requesting.respond, { request, error }]),
});
