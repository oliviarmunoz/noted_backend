---
timestamp: 'Sun Dec 07 2025 19:31:06 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251207_193106.3862eab5.md]]'
content_id: 57bf45d5384a1bc8caa5f8b8732818445bca89322d8571d9dd02bfc32d2483c9
---

# response:

Here are the playlist-related synchronizations, modeled after the provided examples and updated to correctly handle the interactions and error conditions.

```typescript
// src/syncs/playlist.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, MusicDiscovery, Playlist } from "@concepts";
import { ID } from "@utils/types.ts";

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

// --- Helper for creating a single error frame ---
const createErrorFrame = (originalFrame: Record<symbol, unknown>, errorMessage: string): Frames => {
  return new Frames({ ...originalFrame, error: errorMessage });
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
    { user, playlistName, isPublic },
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
    const playlistCheckFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistCheckFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.`);
    }

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
    // Use the `user` and `playlistName` bindings from the current frame.
    const playlistCheckFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistCheckFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.`);
    }
    // `playlist: "pId"` is a local variable for this check. The actual `Playlist.addItem` action
    // uses `user` and `playlistName` from the input arguments directly.

    // 3. Ensure MusicEntity exists locally or fetch/create from Spotify using _getEntityFromId query
    // _getEntityFromId can return { musicEntity: ... } or { error: ... } or [].
    let entityResolutionFrames = await currentFrames.query(MusicDiscovery._getEntityFromId, { externalId: currentFrames[0].itemExternalId, type: currentFrames[0].itemType }, { musicEntity, error: entityLookupError });

    if (entityResolutionFrames.length === 0) {
      // This case should ideally not happen if _getEntityFromId always returns an object or an error.
      // It implies a deeper issue in MusicDiscovery._getEntityFromId if no error is present.
      return createErrorFrame(originalRequestFrame, `Music entity for external ID '${currentFrames[0].itemExternalId}' could not be retrieved or created.`);
    }
    if (entityResolutionFrames[0][entityLookupError]) { // Explicit error from the query
      return createErrorFrame(originalRequestFrame, entityResolutionFrames[0][entityLookupError] as string);
    }
    // `entityResolutionFrames` now holds the `musicEntity` (internal ID) and potentially `entityLookupError`.
    currentFrames = entityResolutionFrames; // Propagate these bindings

    // 4. Check if item is already in the playlist (pre-condition for addItem in PlaylistConcept)
    // Query the specific playlist's items.
    const playlistItemsFrames = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { item: "existingItem" });
    const isAlreadyInPlaylist = playlistItemsFrames.some(f => f.existingItem === currentFrames[0].itemExternalId);

    if (isAlreadyInPlaylist) {
      return createErrorFrame(originalRequestFrame, `Item '${currentFrames[0].itemExternalId}' is already in playlist '${currentFrames[0].playlistName}'.`);
    }

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
    const playlistCheckFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistCheckFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.`);
    }

    // 3. Ensure the item is actually in the playlist (pre-condition for deleteItem in PlaylistConcept)
    const playlistItemsFrames = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { item: "existingItem" });
    const isItemInPlaylist = playlistItemsFrames.some(f => f.existingItem === currentFrames[0].itemExternalId);
    if (!isItemInPlaylist) {
      return createErrorFrame(originalRequestFrame, `Item '${currentFrames[0].itemExternalId}' not found in playlist '${currentFrames[0].playlistName}'.`);
    }
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
      return new Frames({ ...originalRequestFrame, [playlists]: [] }); // Ensure `playlists` is an empty array symbol
    }

    // 2. Query for user's playlists
    const playlistResultsFrames = await currentFrames.query(Playlist._getUserPlaylists, { user: currentFrames[0][user] }, { playlistName, isPublic });
    
    // 3. Collect the playlist details into a single 'playlists' array.
    // collectAs handles the case where playlistResultsFrames is empty by producing an empty array for 'playlists'
    // when grouping by the remaining common elements.
    // However, if the initial `currentFrames` itself has no common elements with `playlistResultsFrames`
    // (e.g., `user` is the only common element), then `collectAs` will correctly merge all results.
    // If playlistResultsFrames is empty, collectAs will return a frame with an empty array for 'playlists'.
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
    const playlistCheckFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistCheckFrames.length === 0) {
      return createErrorFrame(originalRequestFrame, `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.`);
    }

    // 3. Query for playlist items (which are externalIds as per concept spec and PlaylistDoc type)
    const itemResultsFrames = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0][user], playlistName: currentFrames[0].playlistName }, { item });
    
    // 4. Collect the items (externalIds) into a single 'items' array.
    // Similar to GetUserPlaylists, collectAs correctly handles empty results by returning an empty array.
    return itemResultsFrames.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items }]), // Pass actual bound variable
});

```
