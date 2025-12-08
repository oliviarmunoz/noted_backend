---
timestamp: 'Sun Dec 07 2025 19:28:29 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251207_192829.0d1c8c90.md]]'
content_id: cb06f31a7f2402819740f25458db9432a7fd1607e9fe788d8db96f349cac2897
---

# response:

Here are the corrected and refined synchronizations for the Playlist concept, taking into account the updated concept definitions and modeling after the provided examples.

The key changes address:

1. **`MusicDiscovery._getEntityFromId` usage**: This query is now designed to *get or create* the `MusicEntity`, returning an `Array<{ musicEntity: MusicEntityDoc }>` on success or `Array<{ error: string }>` on failure. The syncs will call this query in the `where` clause and handle both outcomes.
2. **`PlaylistConcept` queries**: The new `_getUserPlaylists` and `_getPlaylistByNameAndUser` queries are properly utilized for validation.
3. **Error Propagation**: More explicit handling of errors returned by concept actions/queries, ensuring they are passed back to `Requesting.respond`.
4. **`collectAs` usage**: Correct application for structuring array results.
5. **`originalFrame` preservation**: Ensuring the original request context is maintained for consistent error responses, especially when an early `where` clause filter results in zero frames.

```typescript
// src/syncs/playlist.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, MusicDiscovery, Playlist } from "@concepts";
import { ID } from "@utils/types.ts"; // Assuming ID is used for generic types

/**
 * @concept Playlist
 * @purpose Enable users to establish and manage collections of items.
 *
 * This file contains synchronizations for the Playlist concept.
 * It orchestrates interactions between Requesting, Sessioning, MusicDiscovery, and Playlist concepts.
 */

// --- Create Playlist ---

/**
 * sync CreatePlaylistRequest
 * Handles the HTTP request for creating a new playlist.
 * It authenticates the user via session and then delegates to Playlist.createPlaylist.
 */
export const CreatePlaylistRequest: Sync = ({ request, session, playlistName, isPublic, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/create", session, playlistName, isPublic },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original request context for error responses

    // 1. Authenticate user from session
    const authenticatedFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (authenticatedFrames.length === 0) {
      // If session is invalid or user not found, return an error frame
      return new Frames({ ...originalFrame, error: "Invalid session or user not found." });
    }
    // `authenticatedFrames` now contains `user` binding.
    return authenticatedFrames;
  },
  then: actions([
    // The Playlist.createPlaylist action handles the check for duplicate playlist names.
    // If it fails, it returns an error which will be caught by CreatePlaylistResponseError sync.
    Playlist.createPlaylist,
    // Ensure bound variables are correctly passed as action arguments
    { user: "user", playlistName: "playlistName", isPublic: "isPublic" },
  ]),
});

/**
 * sync CreatePlaylistResponseSuccess
 * Responds to the client with success after a playlist is successfully created.
 */
export const CreatePlaylistResponseSuccess: Sync = ({ request, playlist }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/create" }, { request }],
    [Playlist.createPlaylist, {}, { playlist }], // Matches successful return from createPlaylist, captures 'playlist' ID
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

// --- Add Item to Playlist ---

/**
 * sync AddItemToPlaylistRequest
 * Handles the HTTP request for adding an item to a playlist.
 * It authenticates the user, ensures the playlist belongs to the user, and ensures the MusicEntity exists
 * (creating it via MusicDiscovery._getEntityFromId if necessary).
 */
export const AddItemToPlaylistRequest: Sync = ({ request, session, playlistName, itemExternalId, itemType, user, musicEntity, itemAddError }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/add", session, playlistName, itemExternalId, itemType },
    { request },
  ]),
  where: async (frames) => {
    const originalRequestFrame = frames[0]; // Capture original request context for error responses

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }
    // currentFrames now contains `user` and all original `Requesting.request` bindings.

    // 2. Ensure the playlist belongs to the user and exists.
    // Use _getPlaylistByNameAndUser to retrieve details for the specific playlist.
    const playlistLookupFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { playlist: "pId", items: "playlistItems" });
    if (playlistLookupFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.` });
    }
    // Update currentFrames with playlist data, particularly playlistItems for the next check.
    currentFrames = playlistLookupFrames.map(f => ({...f, ...currentFrames[0], pId: f.pId, playlistItems: f.playlistItems }));

    // 3. Ensure MusicEntity exists locally or fetch/create from Spotify using _getEntityFromId query.
    // `_getEntityFromId` can return either a success frame with `musicEntity` or an error frame.
    const entityResolutionFrames = await currentFrames.query(MusicDiscovery._getEntityFromId, { externalId: currentFrames[0].itemExternalId, type: currentFrames[0].itemType }, { musicEntity, error: "entityLookupError" });
    
    if (entityResolutionFrames.length === 0) { // If _getEntityFromId returned nothing (shouldn't happen with error handling)
      return new Frames({ ...originalRequestFrame, error: `Music entity for external ID '${currentFrames[0].itemExternalId}' could not be retrieved or created.` });
    }
    if (entityResolutionFrames[0].entityLookupError) { // If _getEntityFromId explicitly returned an error
      return new Frames({ ...originalRequestFrame, error: entityResolutionFrames[0].entityLookupError as string });
    }
    // Update currentFrames to include the resolved `musicEntity`
    currentFrames = entityResolutionFrames;

    // 4. Check if item is already in the playlist (pre-condition for addItem)
    // We already have `playlistItems` from the `_getPlaylistByNameAndUser` query.
    const isAlreadyInPlaylist = currentFrames[0].playlistItems.includes(currentFrames[0].itemExternalId);
    if (isAlreadyInPlaylist) {
      return new Frames({ ...originalRequestFrame, error: `Item '${currentFrames[0].itemExternalId}' is already in playlist '${currentFrames[0].playlistName}'.` });
    }

    return currentFrames; // All conditions met, proceed to then clause
  },
  then: actions([
    Playlist.addItem,
    // Pass actual bound variables from the current frame.
    { user: "user", item: "itemExternalId", playlistName: "playlistName" },
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
 * It authenticates the user, ensures the playlist belongs to the user, and that the item is in the playlist.
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
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const playlistLookupFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { playlist: "pId", items: "playlistItems" });
    if (playlistLookupFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.` });
    }
    // Update currentFrames with playlistItems for the next check
    currentFrames = playlistLookupFrames.map(f => ({...f, ...currentFrames[0], pId: f.pId, playlistItems: f.playlistItems }));


    // 3. Ensure the item is actually in the playlist (pre-condition for deleteItem)
    const isItemInPlaylist = currentFrames[0].playlistItems.includes(currentFrames[0].itemExternalId);
    if (!isItemInPlaylist) {
      return new Frames({ ...originalRequestFrame, error: `Item '${currentFrames[0].itemExternalId}' not found in playlist '${currentFrames[0].playlistName}'.` });
    }
    return currentFrames; // All conditions met, proceed
  },
  then: actions([
    Playlist.deleteItem,
    // Pass actual bound variables from the current frame.
    { user: "user", item: "itemExternalId", playlistName: "playlistName" },
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

// --- Delete Playlist ---

/**
 * sync DeletePlaylistRequest
 * Handles the HTTP request for deleting an entire playlist.
 * It authenticates the user and ensures the playlist belongs to them.
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
      return new Frames({ ...originalRequestFrame, error: "Invalid session or user not found." });
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const playlistLookupFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistLookupFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, error: `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.` });
    }
    return currentFrames; // All conditions met, proceed
  },
  then: actions([
    Playlist.deletePlaylist,
    { user: "user", playlistName: "playlistName" },
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
 * Responds to the client with an error if deleting a playlist fails.
 */
export const DeletePlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/delete_playlist" }, { request }],
    [Playlist.deletePlaylist, {}, { error }], // Matches error return from deletePlaylist
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
    const playlistResults = await currentFrames.query(Playlist._getUserPlaylists, { user: currentFrames[0].user }, { playlistName, isPublic });
    
    // 3. Handle no playlists found case for a valid user
    if (playlistResults.length === 0) {
      return new Frames({ ...originalRequestFrame, [playlists]: [] });
    }
    
    // 4. Collect the playlist details into a single 'playlists' array.
    // collectAs groups by non-collected variables. Since 'playlistName' and 'isPublic' are properties
    // of each playlist, collecting them will effectively group all playlists for the given user.
    return playlistResults.collectAs([playlistName, isPublic], playlists);
  },
  then: actions([Requesting.respond, { request, playlists: "playlists" }]), // Pass actual bound variable
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
      return new Frames({ ...originalRequestFrame, [items]: [], error: "Invalid session or user not found." });
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const playlistLookupFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistLookupFrames.length === 0) {
      return new Frames({ ...originalRequestFrame, [items]: [], error: `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.` });
    }

    // 3. Query for playlist items (which are externalIds as per concept spec and PlaylistDoc type)
    const itemResults = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { item });
    
    // 4. Handle no items found case for a valid user and playlist
    if (itemResults.length === 0) {
      return new Frames({ ...originalRequestFrame, [items]: [] });
    }
    
    // 5. Collect the items (externalIds) into a single 'items' array.
    return itemResults.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items: "items" }]), // Pass actual bound variable
});

```
