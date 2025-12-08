---
timestamp: 'Sun Dec 07 2025 18:12:37 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251207_181237.a04ccd00.md]]'
content_id: 4b79ca61f1f219c646ba7a661ee729aee3606fc33ce8be068071e3af44ac80c3
---

# response:

```typescript
// src/syncs/playlist.sync.ts

import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, MusicDiscovery, Playlist } from "@concepts";
import { ID } from "@utils/types.ts"; // Import ID type if used in patterns

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
 * when
 *   Requesting.request (path: "/playlist/create", session, playlistName, isPublic) : (request)
 * where
 *   in Sessioning: user of session is u
 *   in Playlist: no playlist with playlistName exists for u
 * then
 *   Playlist.createPlaylist (user: u, playlistName, isPublic)
 */
export const CreatePlaylistRequest: Sync = ({ request, session, playlistName, isPublic, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/create", session, playlistName, isPublic },
    { request },
  ]),
  where: async (frames) => {
    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...frames[0], error: "Invalid session or user not found." });
    }

    // 2. Check if a playlist with this name already exists for the user
    // The query returns an array of objects, each with a 'playlistName' field.
    const existingPlaylists = await frames.query(Playlist._getUserPlaylists, { user }, { playlistName: "existingPlaylistName", isPublic: "existingIsPublic" });
    const hasConflict = existingPlaylists.some(p => p.existingPlaylistName === frames[0].playlistName);

    if (hasConflict) {
      return new Frames({ ...frames[0], error: `Playlist '${frames[0].playlistName}' already exists for this user.` });
    }

    return frames; // Proceed only if user exists and no conflict
  },
  then: actions([
    Playlist.createPlaylist,
    { user: "user", playlistName: "playlistName", isPublic: "isPublic" },
  ]),
});

/**
 * sync CreatePlaylistResponseSuccess
 * when
 *   Requesting.request (path: "/playlist/create") : (request)
 *   Playlist.createPlaylist () : ()
 * then
 *   Requesting.respond (request, status: "success")
 */
export const CreatePlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/create" }, { request }],
    [Playlist.createPlaylist, {}, {}], // Success returns empty object
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync CreatePlaylistResponseError
 * when
 *   Requesting.request (path: "/playlist/create") : (request)
 *   Playlist.createPlaylist () : (error)
 * then
 *   Requesting.respond (request, error)
 */
export const CreatePlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/create" }, { request }],
    [Playlist.createPlaylist, {}, { error }], // Error returns error object
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Add Item to Playlist ---

/**
 * sync AddItemToPlaylistRequest
 * when
 *   Requesting.request (path: "/playlist/add", session, playlistName, itemExternalId) : (request)
 * where
 *   in Sessioning: user of session is u
 *   in Playlist: playlistName exists for u AND itemExternalId is NOT in playlist
 *   in MusicDiscovery: MusicEntity with externalId itemExternalId exists or is loaded
 * then
 *   Playlist.addItem (user: u, item: itemExternalId, playlistName)
 */
export const AddItemToPlaylistRequest: Sync = ({ request, session, playlistName, itemExternalId, user, musicEntityDetails }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/add", session, playlistName, itemExternalId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames({ ...originalFrame, error: "Invalid session or user not found." });

    // 2. Ensure the playlist belongs to the user and exists.
    const userPlaylists = await frames.query(Playlist._getUserPlaylists, { user }, { playlistName: "pName", isPublic: "pIsPublic" });
    const hasPlaylist = userPlaylists.some(p => p.pName === frames[0].playlistName);
    if (!hasPlaylist) {
      return new Frames({ ...originalFrame, error: `Playlist '${frames[0].playlistName}' not found or does not belong to user.` });
    }

    // 3. Ensure MusicEntity exists locally or fetch from Spotify
    let entityFrames = await frames.query(MusicDiscovery._getEntityFromId, { externalId: itemExternalId }, { musicEntity: musicEntityDetails });
    if (entityFrames.length === 0) { // If entity not found locally, try to load details from Spotify
      entityFrames = await frames.query(MusicDiscovery.loadEntityDetails, { externalId: itemExternalId, type: "track" }, { music: musicEntityDetails }); // Assuming type "track" as a default
    }
    if (entityFrames.length === 0 || entityFrames[0].musicEntityDetails?.error) {
      return new Frames({ ...originalFrame, error: entityFrames[0]?.musicEntityDetails?.error || "Failed to load music entity details from Spotify." });
    }
    // Update frames with musicEntityDetails
    frames = new Frames({ ...originalFrame, ...entityFrames[0] });

    // 4. Check if item is already in the playlist (pre-condition for addItem)
    const playlistItems = await frames.query(Playlist._getPlaylistItems, { user, playlistName }, { item: "existingItem" });
    const isAlreadyInPlaylist = playlistItems.some(i => i.existingItem === frames[0].itemExternalId);
    if (isAlreadyInPlaylist) {
      return new Frames({ ...originalFrame, error: `Item '${frames[0].itemExternalId}' is already in playlist '${frames[0].playlistName}'.` });
    }

    return frames;
  },
  then: actions([
    Playlist.addItem,
    { user: "user", item: "itemExternalId", playlistName: "playlistName" }, // Pass itemExternalId as 'item'
  ]),
});

/**
 * sync AddItemToPlaylistResponseSuccess
 * when
 *   Requesting.request (path: "/playlist/add") : (request)
 *   Playlist.addItem () : ()
 * then
 *   Requesting.respond (request, status: "success")
 */
export const AddItemToPlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/add" }, { request }],
    [Playlist.addItem, {}, {}], // Success returns empty object
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync AddItemToPlaylistResponseError
 * when
 *   Requesting.request (path: "/playlist/add") : (request)
 *   Playlist.addItem () : (error)
 * then
 *   Requesting.respond (request, error)
 */
export const AddItemToPlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/add" }, { request }],
    [Playlist.addItem, {}, { error }], // Error returns error object
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Delete Item from Playlist ---

/**
 * sync DeleteItemFromPlaylistRequest
 * when
 *   Requesting.request (path: "/playlist/delete", session, playlistName, itemExternalId) : (request)
 * where
 *   in Sessioning: user of session is u
 *   in Playlist: playlistName exists for u AND itemExternalId is in playlist
 * then
 *   Playlist.deleteItem (user: u, item: itemExternalId, playlistName)
 */
export const DeleteItemFromPlaylistRequest: Sync = ({ request, session, playlistName, itemExternalId, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/delete", session, playlistName, itemExternalId },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames({ ...originalFrame, error: "Invalid session or user not found." });

    // 2. Ensure the playlist belongs to the user and exists.
    const userPlaylists = await frames.query(Playlist._getUserPlaylists, { user }, { playlistName: "pName", isPublic: "pIsPublic" });
    const hasPlaylist = userPlaylists.some(p => p.pName === frames[0].playlistName);
    if (!hasPlaylist) {
      return new Frames({ ...originalFrame, error: `Playlist '${frames[0].playlistName}' not found or does not belong to user.` });
    }

    // 3. Ensure the item is actually in the playlist (pre-condition for deleteItem)
    const playlistItems = await frames.query(Playlist._getPlaylistItems, { user, playlistName }, { item: "existingItem" });
    const isItemInPlaylist = playlistItems.some(i => i.existingItem === frames[0].itemExternalId);
    if (!isItemInPlaylist) {
      return new Frames({ ...originalFrame, error: `Item '${frames[0].itemExternalId}' not found in playlist '${frames[0].playlistName}'.` });
    }
    return frames;
  },
  then: actions([
    Playlist.deleteItem,
    { user: "user", item: "itemExternalId", playlistName: "playlistName" }, // Pass itemExternalId as 'item'
  ]),
});

/**
 * sync DeleteItemFromPlaylistResponseSuccess
 * when
 *   Requesting.request (path: "/playlist/delete") : (request)
 *   Playlist.deleteItem () : ()
 * then
 *   Requesting.respond (request, status: "success")
 */
export const DeleteItemFromPlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/delete" }, { request }],
    [Playlist.deleteItem, {}, {}], // Success returns empty object
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
});

/**
 * sync DeleteItemFromPlaylistResponseError
 * when
 *   Requesting.request (path: "/playlist/delete") : (request)
 *   Playlist.deleteItem () : (error)
 * then
 *   Requesting.respond (request, error)
 */
export const DeleteItemFromPlaylistResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/delete" }, { request }],
    [Playlist.deleteItem, {}, { error }], // Error returns error object
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Get User Playlists ---

/**
 * sync GetUserPlaylistsRequest
 * when
 *   Requesting.request (path: "/playlist/my", session) : (request)
 * where
 *   in Sessioning: user of session is u
 *   in Playlist: getUserPlaylists(u) returns (playlistName, isPublic) as pl
 * then
 *   Requesting.respond (request, playlists: pl)
 */
export const GetUserPlaylistsRequest: Sync = ({ request, session, user, playlistName, isPublic, playlists }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/my", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    
    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // If no valid session/user, return an empty list of playlists immediately.
      return new Frames({ ...originalFrame, [playlists]: [] });
    }

    // 2. Query for user's playlists
    const playlistResults = await frames.query(Playlist._getUserPlaylists, { user }, { playlistName, isPublic });
    
    // 3. Handle no playlists found case for a valid user
    if (playlistResults.length === 0) {
      return new Frames({ ...originalFrame, [playlists]: [] });
    }
    
    // 4. Collect the playlist details into a single 'playlists' array
    return playlistResults.collectAs([playlistName, isPublic], playlists);
  },
  then: actions([Requesting.respond, { request, playlists: "playlists" }]),
});

// --- Get Playlist Items ---

/**
 * sync GetPlaylistItemsRequest
 * when
 *   Requesting.request (path: "/playlist/:playlistName/items", session, playlistName) : (request)
 * where
 *   in Sessioning: user of session is u
 *   in Playlist: playlistName exists for u
 *   in Playlist: getPlaylistItems(u, playlistName) returns (item: externalId) as it
 * then
 *   Requesting.respond (request, items: it)
 */
export const GetPlaylistItemsRequest: Sync = ({ request, session, playlistName, user, item, items }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/:playlistName/items", session, playlistName },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    
    // 1. Authenticate user from session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [items]: [] });
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const userPlaylists = await frames.query(Playlist._getUserPlaylists, { user }, { playlistName: "pName", isPublic: "pIsPublic" });
    const hasPlaylist = userPlaylists.some(p => p.pName === frames[0].playlistName);
    if (!hasPlaylist) {
      return new Frames({ ...originalFrame, error: `Playlist '${frames[0].playlistName}' not found or does not belong to user.` });
    }

    // 3. Query for playlist items (which are externalIds as per concept spec)
    const itemResults = await frames.query(Playlist._getPlaylistItems, { user, playlistName }, { item });
    
    // 4. Handle no items found case for a valid user and playlist
    if (itemResults.length === 0) {
      return new Frames({ ...originalFrame, [items]: [] });
    }
    
    // 5. Collect the items (externalIds) into a single 'items' array.
    // The query result already has the shape { item: ID }, so collectAs will correctly structure it.
    return itemResults.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items: "items" }]),
});
```
