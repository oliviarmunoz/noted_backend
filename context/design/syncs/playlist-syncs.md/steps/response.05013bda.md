---
timestamp: 'Sun Dec 07 2025 19:35:53 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251207_193553.5428518a.md]]'
content_id: 05013bda46b5ca40c7e0f062c6c8a0e5e5bbe7450b73db30b2ffc5984bcff59d
---

# response:

Okay, I understand. We need to implement the playlist-related synchronizations strictly using the existing concept definitions and the provided `Frames` and `actions` helpers, without introducing new concept methods like `_getPlaylistByNameAndUser`.

The key change will be how we locate a specific playlist. Instead of a direct query for `_getPlaylistByNameAndUser`, we'll leverage `Playlist._getUserPlaylists` which returns *all* playlists for a user, and then perform a `.filter` operation on the `Frames` to find the specific playlist by its `playlistName`.

I'll also ensure `MusicDiscovery._getEntityFromId` is used as a query (since it was updated to handle the get-or-create logic and return an `error` if fetching from Spotify fails, as per our previous iteration).

Here's the re-generated `playlist.sync.ts` file:

```typescript
// src/syncs/playlist.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, MusicDiscovery, Playlist } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID is used for generic types

// Define the generic type for Item from the Playlist concept
type Item = ID; // Item here represents the externalId of a MusicEntity
type PlaylistId = ID; // Using PlaylistId for clarity to distinguish from playlistName string

/**
 * @concept Playlist
 * @purpose Enable users to establish and manage collections of items.
 *
 * This file contains synchronizations for the Playlist concept.
 * It orchestrates interactions between Requesting, Sessioning, MusicDiscovery, and Playlist concepts.
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
): Promise<Frames> => {
  const originalFrames = frames;
  const originalFrame = frames[0];

  // Query all playlists for the user
  const allUserPlaylistsFrames = await frames.query(Playlist._getUserPlaylists, { user: originalFrame[userSymbol] }, {
    playlistName: "foundPlaylistName",
    isPublic: "foundIsPublic",
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
    { path: "/playlist/create", session, playlistName, isPublic },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0]; // Preserve original request details for response

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
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
    [Requesting.request, { path: "/playlist/create" }, { request }],
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
    [Requesting.request, { path: "/playlist/create" }, { request }],
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
export const DeletePlaylistRequest: Sync = ({ request, session, playlistName, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/delete_playlist", session, playlistName },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    // 2. Ensure the playlist exists and belongs to the authenticated user.
    // Use the helper to find the playlist by name and bind its ID if found.
    const playlistFoundFrames = await findUserPlaylistByName(currentFrames, user, playlistName, "pId");
    if (playlistFoundFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${originalRequestFrame.playlistName}' not found or does not belong to user.`);
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
    [Requesting.request, { path: "/playlist/delete_playlist" }, { request }],
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
    [Requesting.request, { path: "/playlist/delete_playlist" }, { request }],
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
export const AddItemToPlaylistRequest: Sync = ({ request, session, playlistName, itemExternalId, itemType, user, musicEntity, entityLookupError }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/add", session, playlistName, itemExternalId, itemType },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }
    // `currentFrames` now has `user` bound.

    // 2. Ensure the playlist belongs to the user and exists.
    // Use the helper to find the playlist by name.
    const playlistFoundFrames = await findUserPlaylistByName(currentFrames, user, playlistName, "pId");
    if (playlistFoundFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${originalRequestFrame.playlistName}' not found or does not belong to user.`);
    }
    // Ensure the `user` and `playlistName` from the request context are retained for later actions.
    // The `pId` from `playlistFoundFrames` is not directly used in Playlist.addItem inputs, but confirms existence.

    // 3. Ensure MusicEntity exists locally or fetch/create from Spotify using _getEntityFromId query.
    // _getEntityFromId can return { musicEntity: ... } or { error: ... } or [].
    // It's crucial to pass `itemExternalId` and `itemType` which are in the original frame.
    let entityResolutionFrames = await currentFrames.query(MusicDiscovery._getEntityFromId, { externalId: originalRequestFrame.itemExternalId, type: originalRequestFrame.itemType }, { musicEntity, error: entityLookupError });

    if (entityResolutionFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Music entity for external ID '${originalRequestFrame.itemExternalId}' could not be retrieved or created.`);
    }
    if (entityResolutionFrames[0][entityLookupError]) { // Explicit error from the query
      return createErrorFrame(originalRequestFrame, entityResolutionFrames[0][entityLookupError] as string);
    }
    // `entityResolutionFrames` now holds the `musicEntity` (internal ID) and potentially `entityLookupError`.
    currentFrames = entityResolutionFrames; // Propagate these bindings

    // 4. Check if item is already in the playlist (pre-condition for addItem in PlaylistConcept).
    // The Playlist.addItem action itself performs this check and returns an error if violated.
    // We don't need an explicit 'where' filter here for this, relying on the concept's action.

    return currentFrames; // All conditions met, proceed to then clause
  },
  then: actions([
    Playlist.addItem,
    { user, item: itemExternalId, playlistName }, // Pass itemExternalId as 'item' as per concept spec
  ]),
});

/**
 * sync AddItemToPlaylistResponseSuccess
 * Responds to the client with success after an item is successfully added to a playlist.
 */
export const AddItemToPlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/add" }, { request }],
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
    [Requesting.request, { path: "/playlist/add" }, { request }],
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
export const DeleteItemFromPlaylistRequest: Sync = ({ request, session, playlistName, itemExternalId, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/delete", session, playlistName, itemExternalId },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const playlistFoundFrames = await findUserPlaylistByName(currentFrames, user, playlistName, "pId");
    if (playlistFoundFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${originalRequestFrame.playlistName}' not found or does not belong to user.`);
    }

    // 3. Check if the item is actually in the playlist (pre-condition for deleteItem in PlaylistConcept).
    // The Playlist.deleteItem action itself performs this check and returns an error if violated.
    // We don't need an explicit 'where' filter here for this, relying on the concept's action.

    return currentFrames; // All conditions met, proceed
  },
  then: actions([
    Playlist.deleteItem,
    { user, item: itemExternalId, playlistName },
  ]),
});

/**
 * sync DeleteItemFromPlaylistResponseSuccess
 * Responds to the client with success after an item is successfully deleted from a playlist.
 */
export const DeleteItemFromPlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/delete" }, { request }],
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
    [Requesting.request, { path: "/playlist/delete" }, { request }],
    [Playlist.deleteItem, {}, { error }], // Matches error return from deleteItem
  ),
  then: actions([Requesting.respond, { request, error }]),
});


// --- Get User Playlists ---

/**
 * sync GetUserPlaylistsRequest
 * Handles the HTTP request for retrieving all playlists belonging to the authenticated user.
 */
export const GetUserPlaylistsRequest: Sync = ({ request, session, user, playlistName, isPublic, playlists }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/my", session },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    
    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      // If no valid session/user, return an empty list of playlists immediately.
      return new Frames({ ...originalRequestFrame, [playlists]: [] });
    }

    // 2. Query for user's playlists
    // Note: Playlist._getUserPlaylists already returns data in the format { playlistName, isPublic }
    // We need to extract these fields for collectAs.
    const playlistResultsFrames = await currentFrames.query(Playlist._getUserPlaylists, { user: currentFrames[0][user] }, { playlistName, isPublic });
    
    // 3. Collect the playlist details into a single 'playlists' array.
    // The collectAs function is designed to handle empty input frames by producing an empty array for the collected symbol.
    return playlistResultsFrames.collectAs([playlistName, isPublic], playlists);
  },
  then: actions([Requesting.respond, { request, playlists }]), // Pass actual bound variable
});


// --- Get Playlist Items ---

/**
 * sync GetPlaylistItemsRequest
 * Handles the HTTP request for retrieving all items (external IDs) in a specific playlist.
 * It authenticates the user and ensures the playlist belongs to them.
 */
export const GetPlaylistItemsRequest: Sync = ({ request, session, playlistName, user, item, items }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/:playlistName/items", session, playlistName },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];
    
    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const playlistFoundFrames = await findUserPlaylistByName(currentFrames, user, playlistName, "pId");
    if (playlistFoundFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${originalRequestFrame.playlistName}' not found or does not belong to user.`);
    }

    // 3. Query for playlist items (which are externalIds as per concept spec and PlaylistDoc type)
    const itemResultsFrames = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { item });
    
    // 4. Collect the items (externalIds) into a single 'items' array.
    return itemResultsFrames.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items }]), // Pass actual bound variable
});

// --- Delete Playlist (by owner) ---
// Note: This action is separate from deleting an item.
export const DeletePlaylistByOwnerRequest: Sync = ({ request, session, playlistName, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/delete_by_name", session, playlistName },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0];

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, "Invalid session or user not found.");
    }

    // 2. Ensure the playlist exists and belongs to the authenticated user.
    const playlistCheckFrames = await currentFrames.query(Playlist._getUserPlaylists, { user: currentFrames[0][user] }, { playlistName: "foundName", playlistId: "foundId" });
    const targetPlaylistFrame = playlistCheckFrames.filter(f => f.foundName === originalRequestFrame.playlistName);

    if (targetPlaylistFrame.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${originalRequestFrame.playlistName}' not found or does not belong to user.`);
    }

    return currentFrames;
  },
  then: actions([
    Playlist.deletePlaylist,
    { user, playlistName },
  ]),
});

export const DeletePlaylistByOwnerResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/delete_by_name" }, { request }],
    [Playlist.deletePlaylist, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "success", message: "Playlist deleted successfully" }]),
});

export const DeletePlaylistByOwnerResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/delete_by_name" }, { request }],
    [Playlist.deletePlaylist, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```
