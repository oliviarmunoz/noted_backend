[@sync-background](../background/sync-background.md)

[@friending-concept](../concepts/Friending/Friending.md)

[@music-discovery-concept](../concepts/MusicDiscovery/MusicDiscovery.md)

[@playlist-concept](../concepts/Playlist/Playlist.md)

[@profile-concept](../concepts/Profile/Profile.md)

[@review-concept](../concepts/Review/Review.md)

[@session-concept](../concepts/Session/Session.md)

[@userauth-concept](../concepts/UserAuthentication/UserAuthentication.md)

[@api-syncs](api-syncs.md)

[@sync-design](sync-design.md)

[@example-sync](example-syncs.md)

[@sample-sync](../../src/syncs/sample.sync.ts)

# prompt: provide the implementation for playlist related syncs. do not use helpers and model this after the sample sync file
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

# prompt: I am getting errors from the Playlist._getUserPlaylists and MusicDiscovery.loadEntityDetails calls
# response:

Okay, you're encountering issues with `Playlist._getUserPlaylists` and the error handling for `MusicDiscovery.loadEntityDetails` in your synchronizations. This is due to a couple of factors:

1.  **Missing `_getUserPlaylists` query in `PlaylistConcept`**: The `Playlist` concept you provided doesn't define a `_getUserPlaylists` query. This query is essential for validating playlist ownership and existence in your syncs.
2.  **Incorrect usage of `MusicDiscovery.loadEntityDetails` in `where` clause**: `Frames.query` is primarily designed for calling *queries*, not *actions* that mutate state and have overloaded success/error returns like `loadEntityDetails`. To properly handle the "get or create MusicEntity" logic, we need to either:
    *   Add a dedicated "get-or-create" *query* to `MusicDiscoveryConcept`.
    *   Break down the sync into multiple syncs that chain the action and handle its outcomes.

Given the "API Synchronizations and Relationships in Noted" document which states "MusicEntities should be created on-demand when referenced" and "Backend must: 1. Look up MusicEntity by externalId or uri 2. If not found, fetch from Spotify and create 3. Return MusicEntity", the most robust approach that aligns with the `Frames.query` pattern in `where` clauses is to **add a new query to `MusicDiscoveryConcept` that handles the "get or create" logic**.

Here are the necessary updates:

---

### **1. Update `src/concepts/MusicDiscovery/MusicDiscoveryConcept.ts`**

We need to add a new query `_getOrCreateEntityByExternalId` that encapsulates the logic of checking for an existing entity and, if not found, fetching its details from Spotify and creating it.

```typescript
// src/concepts/MusicDiscovery/MusicDiscoveryConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts"; // Assuming spotifyService is already in @utils/spotify.ts

// Collection prefix to ensure namespace separation
const PREFIX = "MusicDiscovery" + ".";

// Generic types
type User = ID;

// Internal entity types
type MusicEntity = ID;
type SearchResult = ID;

type MusicEntityType = "TRACK" | "ALBUM" | "ARTIST"; // Enum values as defined in concept

/**
 * State: A set of MusicEntities
 */
interface MusicEntityDoc {
  _id: MusicEntity;
  externalId: string;
  type: MusicEntityType;
  name: string;
  uri: string;
  imageUrl: string;
  description: string; // Used for genres for artists
  releaseDate: string;
  durationMs: number; // Only for tracks
  artistName: string;
}

/**
 * State: A set of Users with a lastQuery.
 */
interface UserDoc {
  _id: User;
  lastQuery?: string;
}

/**
 * State: A set of SearchResults linking a User to a MusicEntity.
 */
interface SearchResultDoc {
  _id: SearchResult;
  user: User;
  musicEntity: MusicEntity;
}

/**
 * @concept MusicDiscovery
 * @purpose Enable the exploration of a global music catalog and the preservation of search context.
 */
export default class MusicDiscoveryConcept {
  users: Collection<UserDoc>;
  musicEntities: Collection<MusicEntityDoc>;
  searchResults: Collection<SearchResultDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.musicEntities = this.db.collection(PREFIX + "musicEntities");
    this.searchResults = this.db.collection(PREFIX + "searchResults");
  }

  /**
   * Action: Searches for music entities on Spotify, updates user's last query,
   * clears previous search results for the user, and stores new results.
   * @requires query is not empty
   * @effects updates lastQuery of user, removes all SearchResults for user,
   * fetches data from external service, creates/updates MusicEntities based on results,
   * creates SearchResults linking user to the new entities.
   */
  async search({ user, query }: { user: User; query: string }): Promise<{ musicEntities: MusicEntityDoc[] } | { error: string }> {
    if (!query || query.trim() === "") {
      return { error: "Search query cannot be empty." };
    }

    // Ensure user exists (or create a dummy user entry if not strictly part of another concept yet)
    await this.users.updateOne({ _id: user }, { $set: { lastQuery: query } }, { upsert: true });

    // Clear old search results for this user
    await this.searchResults.deleteMany({ user });

    let spotifyResults: any;
    try {
      spotifyResults = await spotifyService.searchAll(query); // Search across tracks, albums, artists
    } catch (e) {
      return { error: `Failed to fetch from Spotify: ${e.message}` };
    }

    const itemsToProcess = [
      ...(spotifyResults.tracks?.items || []),
      ...(spotifyResults.albums?.items || []),
      ...(spotifyResults.artists?.items || []),
    ];

    const createdMusicEntities: MusicEntityDoc[] = [];

    for (const item of itemsToProcess) {
      const externalId = item.id;
      const type: MusicEntityType = item.type?.toUpperCase() as MusicEntityType; // Spotify types are lowercase, convert to uppercase for concept enum

      let musicEntityDoc = await this.musicEntities.findOne({ externalId, type });

      if (!musicEntityDoc) {
        // Create new MusicEntity if it doesn't exist
        const newEntityId = freshID() as MusicEntity;
        musicEntityDoc = {
          _id: newEntityId,
          externalId: externalId,
          type: type,
          name: item.name,
          uri: item.uri,
          imageUrl: item.album?.images?.[0]?.url || item.images?.[0]?.url || "",
          description: item.description || item.genres?.join(", ") || "",
          releaseDate: item.album?.release_date || item.release_date || "",
          durationMs: item.duration_ms || 0,
          artistName: item.artists?.[0]?.name || item.name || "", // Primary artist for tracks/albums, or name for artist itself
        };
        await this.musicEntities.insertOne(musicEntityDoc);
      } else {
        // Optionally update existing entity with fresh data
        const updateDoc = {
          name: item.name,
          uri: item.uri,
          imageUrl: item.album?.images?.[0]?.url || item.images?.[0]?.url || "",
          description: item.description || item.genres?.join(", ") || "",
          releaseDate: item.album?.release_date || item.release_date || "",
          durationMs: item.duration_ms || 0,
          artistName: item.artists?.[0]?.name || item.name || "",
        };
        await this.musicEntities.updateOne({ _id: musicEntityDoc._id }, { $set: updateDoc });
        musicEntityDoc = { ...musicEntityDoc, ...updateDoc }; // Update in memory object for current return
      }

      // Create SearchResult linking user to entity
      await this.searchResults.insertOne({ _id: freshID() as SearchResult, user, musicEntity: musicEntityDoc._id });
      createdMusicEntities.push(musicEntityDoc);
    }

    return { musicEntities: createdMusicEntities };
  }

  /**
   * Action: Removes all SearchResults for a given user.
   * @effects removes all SearchResults where owner is user.
   */
  async clearSearch({ user }: { user: User }): Promise<Empty> {
    await this.searchResults.deleteMany({ user });
    return {};
  }

  /**
   * Action: Fetches detailed info from external service, updates the specific MusicEntity
   * with richer data (dates, popularity, etc.), and returns the corresponding MusicEntity.
   * @requires externalId is valid
   * @effects fetches detailed info from external service, updates the specific MusicEntity
   * with richer data (dates, popularity, etc.), and returns the corresponding MusicEntity
   */
  async loadEntityDetails({ externalId, type }: { externalId: string; type: string }): Promise<{ music: MusicEntityDoc } | { error: string }> {
    const musicEntityType = type.toUpperCase() as MusicEntityType; // Ensure consistent enum
    if (!["TRACK", "ALBUM", "ARTIST"].includes(musicEntityType)) {
      return { error: `Invalid music entity type: ${type}. Must be TRACK, ALBUM, or ARTIST.` };
    }

    let spotifyData: any;
    try {
      if (musicEntityType === "TRACK") {
        spotifyData = await spotifyService.getTrack(externalId);
      } else if (musicEntityType === "ALBUM") {
        spotifyData = await spotifyService.getAlbum(externalId);
      } else if (musicEntityType === "ARTIST") {
        spotifyData = await spotifyService.getArtist(externalId);
      }
    } catch (e) {
      return { error: `Failed to fetch details for external ID ${externalId} from Spotify: ${e.message}` };
    }

    if (!spotifyData || spotifyData.error) {
      return { error: spotifyData?.error?.message || `No entity found on Spotify for ID ${externalId} and type ${type}.` };
    }

    // Find existing entity or create a new one
    let musicEntityDoc = await this.musicEntities.findOne({ externalId, type: musicEntityType });
    if (!musicEntityDoc) {
        musicEntityDoc = {
            _id: freshID() as MusicEntity,
            externalId: externalId,
            type: musicEntityType,
            name: spotifyData.name,
            uri: spotifyData.uri,
            imageUrl: spotifyData.album?.images?.[0]?.url || spotifyData.images?.[0]?.url || "",
            description: spotifyData.description || spotifyData.genres?.join(", ") || "",
            releaseDate: spotifyData.album?.release_date || spotifyData.release_date || "",
            durationMs: spotifyData.duration_ms || 0,
            artistName: spotifyData.artists?.[0]?.name || spotifyData.name || "",
        };
        await this.musicEntities.insertOne(musicEntityDoc);
    } else {
        // Update existing entity with potentially richer data from direct fetch
        const updateFields: Partial<MusicEntityDoc> = {
            name: spotifyData.name,
            uri: spotifyData.uri,
            imageUrl: spotifyData.album?.images?.[0]?.url || spotifyData.images?.[0]?.url || "",
            description: spotifyData.description || spotifyData.genres?.join(", ") || "",
            releaseDate: spotifyData.album?.release_date || spotifyData.release_date || "",
            durationMs: spotifyData.duration_ms || 0,
            artistName: spotifyData.artists?.[0]?.name || spotifyData.name || "",
        };
        await this.musicEntities.updateOne({ _id: musicEntityDoc._id }, { $set: updateFields });
        musicEntityDoc = { ...musicEntityDoc, ...updateFields };
    }

    return { music: musicEntityDoc };
  }

  /**
   * Query: Returns the music entities tied to the search results that correspond to the given user.
   */
  async _getSearchResults({ user }: { user: User }): Promise<MusicEntityDoc[]> {
    const results = await this.searchResults.find({ user }).toArray();
    const entityIds = results.map((r) => r.musicEntity);
    return await this.musicEntities.find({ _id: { $in: entityIds } }).toArray();
  }

  /**
   * Query: Returns the music entity with the given external id.
   * This query is enhanced to *also* ensure the entity exists by calling loadEntityDetails if not found locally.
   */
  async _getEntityFromId({ externalId, type }: { externalId: string; type: MusicEntityType }): Promise<Array<{ musicEntity: MusicEntityDoc }> | Array<{ error: string }>> {
    // Attempt to find locally first
    const existingEntity = await this.musicEntities.findOne({ externalId, type });
    if (existingEntity) {
      return [{ musicEntity: existingEntity }];
    }

    // If not found locally, attempt to load (and implicitly create/update) details from Spotify
    const loadedEntity = await this.loadEntityDetails({ externalId, type });
    if ('error' in loadedEntity) {
        return [{ error: loadedEntity.error }];
    }
    return [{ musicEntity: loadedEntity.music }];
  }

  /**
   * Query: Returns the music entity with the given external uri.
   */
  async _getEntityFromUri({ uri }: { uri: string }): Promise<Array<{ musicEntity: MusicEntityDoc }>> {
    const entity = await this.musicEntities.findOne({ uri });
    return entity ? [{ musicEntity: entity }] : [];
  }
}
```

---

### **2. Update `src/concepts/Playlist/PlaylistConcept.ts`**

We need to properly define the `Playlist` type (ID), the `PlaylistDoc` interface, and add the missing queries `_getUserPlaylists` and `_getPlaylistByNameAndUser`.

```typescript
// src/concepts/Playlist/PlaylistConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Playlist" + ".";

// Generic types of this concept
type User = ID;
type Item = ID; // Item here represents the externalId of a MusicEntity

// Internal entity type for Playlists
type Playlist = ID;

/**
 * State: A set of Playlists with a playlistName, isPublic flag, user, and items.
 */
interface PlaylistDoc {
  _id: Playlist; // MongoDB document ID for the playlist
  playlistName: string;
  isPublic: boolean;
  user: User;
  items: Item[]; // Stores external IDs (Spotify IDs) of MusicEntities
}

/**
 * @concept Playlist
 * @purpose Enable users to establish and manage collections of items.
 */
export default class PlaylistConcept {
  public readonly playlists: Collection<PlaylistDoc>;

  constructor(private readonly db: Db) {
    this.playlists = this.db.collection<PlaylistDoc>(PREFIX + "playlists");
  }

  /**
   * Action: Creates a new Playlist.
   * @requires `playlistName` to not already exist for the `user`.
   * @effects Creates a new Playlist with the given information, associated with the user, and returns its ID.
   */
  async createPlaylist({ user, playlistName, isPublic }: { user: User; playlistName: string; isPublic: boolean }): Promise<{ playlist: Playlist } | { error: string }> {
    const existingPlaylist = await this.playlists.findOne({ user, playlistName });
    if (existingPlaylist) {
      return { error: `Playlist '${playlistName}' already exists for user '${user}'.` };
    }
    const newPlaylistId = freshID() as Playlist;
    await this.playlists.insertOne({ _id: newPlaylistId, user, playlistName, isPublic, items: [] });
    return { playlist: newPlaylistId };
  }

  /**
   * Action: Adds an item (MusicEntity external ID) to a user's playlist.
   * @requires `playlistName` must exist and be associated with the `user`.
   * @effects Adds the `item` (external ID) to the playlist's items array.
   */
  async addItem({ user, item, playlistName }: { user: User; item: Item; playlistName: string }): Promise<Empty | { error: string }> {
    // Find the playlist and ensure it belongs to the user
    const playlistDoc = await this.playlists.findOne({ user, playlistName });
    if (!playlistDoc) {
      return { error: `Playlist '${playlistName}' not found or does not belong to user.` };
    }

    // Check if the item already exists in the playlist to prevent duplicates
    if (playlistDoc.items.includes(item)) {
      return { error: `Item '${item}' is already in playlist '${playlistName}'.` };
    }

    // Add the item to the playlist
    await this.playlists.updateOne(
      { _id: playlistDoc._id },
      { $push: { items: item } },
    );
    return {};
  }

  /**
   * Action: Removes an item (MusicEntity external ID) from a user's playlist.
   * @requires `playlistName` must exist and be associated with the `user`.
   * @effects Removes the first occurrence of `item` (external ID) from the playlist's items array.
   */
  async deleteItem({ user, item, playlistName }: { user: User; item: Item; playlistName: string }): Promise<Empty | { error: string }> {
    // Find the playlist and ensure it belongs to the user
    const playlistDoc = await this.playlists.findOne({ user, playlistName });
    if (!playlistDoc) {
      return { error: `Playlist '${playlistName}' not found or does not belong to user.` };
    }

    // Check if the item actually exists in the playlist
    if (!playlistDoc.items.includes(item)) {
      return { error: `Item '${item}' not found in playlist '${playlistName}'.` };
    }

    // Remove the item from the playlist
    await this.playlists.updateOne(
      { _id: playlistDoc._id },
      { $pull: { items: item } },
    );
    return {};
  }

  /**
   * Query: Retrieves a list of playlists (name and public status) for a given user.
   * @effects Returns a list of objects, each containing `playlistName` and `isPublic`.
   */
  async _getUserPlaylists({ user }: { user: User }): Promise<Array<{ playlistName: string; isPublic: boolean }>> {
    const playlists = await this.playlists.find({ user }).project({ playlistName: 1, isPublic: 1, _id: 0 }).toArray();
    return playlists;
  }

  /**
   * Query: Retrieves the full playlist document for a given user and playlist name.
   * @effects Returns an array containing the playlist details if found, otherwise an empty array.
   */
  async _getPlaylistByNameAndUser({ user, playlistName }: { user: User; playlistName: string }): Promise<Array<{ playlist: Playlist; isPublic: boolean; items: Item[] }>> {
    const playlistDoc = await this.playlists.findOne({ user, playlistName });
    if (!playlistDoc) {
      return [];
    }
    return [{ playlist: playlistDoc._id, isPublic: playlistDoc.isPublic, items: playlistDoc.items }];
  }

  /**
   * Query: Retrieves all item external IDs within a specific playlist for a given user.
   * @requires `playlistName` must exist and be associated with the `user`.
   * @effects Returns a list of objects, each containing an `item` (external ID).
   */
  async _getPlaylistItems({ user, playlistName }: { user: User; playlistName: string }): Promise<Array<{ item: Item }>> {
    const playlistDoc = await this.playlists.findOne({ user, playlistName });
    if (!playlistDoc) {
      return []; // Playlist not found or doesn't belong to user
    }
    return playlistDoc.items.map(item => ({ item }));
  }
}
```

---

### **3. Update `src/syncs/playlist.sync.ts`**

Now that the concepts have the necessary queries and actions are updated to return errors, we can refine the syncs. Pay close attention to variable names matching the destructured parameters and how errors are propagated.

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
 * The Playlist.createPlaylist action itself handles the unique name check and returns an error if needed.
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
      return new Frames({ ...originalFrame, error: "Invalid session or user not found." });
    }
    return authenticatedFrames; // Proceed with frames that have 'user' bound
  },
  then: actions([
    // The Playlist.createPlaylist action handles the check for duplicate playlist names.
    // If it fails, it returns an error which will be caught by CreatePlaylistResponseError sync.
    Playlist.createPlaylist,
    { user, playlistName, isPublic }, // Pass actual bound variables
  ]),
});

/**
 * sync CreatePlaylistResponseSuccess
 * Responds to the client with success after a playlist is successfully created.
 */
export const CreatePlaylistResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/playlist/create" }, { request }],
    [Playlist.createPlaylist, {}, {}], // Matches successful (empty) return from createPlaylist
  ),
  then: actions([Requesting.respond, { request, status: "success" }]),
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
 * It authenticates the user, ensures the playlist exists, and ensures the MusicEntity exists
 * (creating it via MusicDiscovery._getEntityFromId if necessary).
 */
export const AddItemToPlaylistRequest: Sync = ({ request, session, playlistName, itemExternalId, itemType, user, musicEntity, entityLookupError }) => ({
  when: actions([
    Requesting.request,
    { path: "/playlist/add", session, playlistName, itemExternalId, itemType },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture original request context for error responses

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return new Frames({ ...originalFrame, error: "Invalid session or user not found." });
    }
    // `currentFrames` now holds `user` and all original `Requesting.request` bindings.

    // 2. Ensure the playlist belongs to the user and exists.
    // Use the `user` and `playlistName` bindings from the current frame.
    const playlistCheckFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, error: `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.` });
    }
    // `currentFrames` still holds `user` and request bindings. The `playlist: "pId"` binding might be ignored if not explicitly merged.

    // 3. Ensure MusicEntity exists locally or fetch/create from Spotify using _getEntityFromId query
    // _getEntityFromId can return { musicEntity: ... } or { error: ... } or [].
    let entityFrames = await currentFrames.query(MusicDiscovery._getEntityFromId, { externalId: itemExternalId, type: itemType }, { musicEntity, error: entityLookupError });

    if (entityFrames.length === 0) { // No entity found and no explicit error returned by query
        return new Frames({ ...originalFrame, error: `Music entity for external ID '${currentFrames[0].itemExternalId}' could not be retrieved or created.` });
    }
    if (entityFrames[0][entityLookupError]) { // Explicit error from the query
        return new Frames({ ...originalFrame, error: entityFrames[0][entityLookupError] as string });
    }
    // Now `entityFrames` contains the `musicEntity` binding along with previous bindings.
    currentFrames = entityFrames; // Update `currentFrames` to include `musicEntity`

    // 4. Check if item is already in the playlist (pre-condition for addItem)
    // Use the `user` and `playlistName` from the request and the `itemExternalId`.
    const playlistItems = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { item: "existingPlaylistItem" });
    const isAlreadyInPlaylist = playlistItems.some(i => i.existingPlaylistItem === currentFrames[0].itemExternalId);

    if (isAlreadyInPlaylist) {
      return new Frames({ ...originalFrame, error: `Item '${currentFrames[0].itemExternalId}' is already in playlist '${currentFrames[0].playlistName}'.` });
    }

    return currentFrames; // All conditions met, proceed
  },
  then: actions([
    Playlist.addItem,
    { user, item: itemExternalId, playlistName }, // Pass actual bound variables
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
    const originalFrame = frames[0];

    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return new Frames({ ...originalFrame, error: "Invalid session or user not found." });
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const playlistCheckFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, error: `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.` });
    }

    // 3. Ensure the item is actually in the playlist (pre-condition for deleteItem)
    const playlistItems = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { item: "existingItem" });
    const isItemInPlaylist = playlistItems.some(i => i.existingItem === currentFrames[0].itemExternalId);
    if (!isItemInPlaylist) {
      return new Frames({ ...originalFrame, error: `Item '${currentFrames[0].itemExternalId}' not found in playlist '${currentFrames[0].playlistName}'.` });
    }
    return currentFrames; // All conditions met, proceed
  },
  then: actions([
    Playlist.deleteItem,
    { user, item: itemExternalId, playlistName }, // Pass actual bound variables
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
    const originalFrame = frames[0];
    
    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      // If no valid session/user, return an empty list of playlists immediately.
      return new Frames({ ...originalFrame, [playlists]: [] });
    }

    // 2. Query for user's playlists
    const playlistResults = await currentFrames.query(Playlist._getUserPlaylists, { user: currentFrames[0].user }, { playlistName, isPublic });
    
    // 3. Handle no playlists found case for a valid user
    if (playlistResults.length === 0) {
      return new Frames({ ...originalFrame, [playlists]: [] });
    }
    
    // 4. Collect the playlist details into a single 'playlists' array.
    // collectAs groups by non-collected variables. If only 'user' is common, it will consolidate to one frame.
    return playlistResults.collectAs([playlistName, isPublic], playlists);
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
    const originalFrame = frames[0];
    
    // 1. Authenticate user from session
    let currentFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (currentFrames.length === 0) {
      return new Frames({ ...originalFrame, [items]: [] });
    }

    // 2. Ensure the playlist belongs to the user and exists.
    const playlistCheckFrames = await currentFrames.query(Playlist._getPlaylistByNameAndUser, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { playlist: "pId" });
    if (playlistCheckFrames.length === 0) {
      return new Frames({ ...originalFrame, error: `Playlist '${currentFrames[0].playlistName}' not found or does not belong to user.` });
    }

    // 3. Query for playlist items (which are externalIds as per concept spec and PlaylistDoc type)
    const itemResults = await currentFrames.query(Playlist._getPlaylistItems, { user: currentFrames[0].user, playlistName: currentFrames[0].playlistName }, { item });
    
    // 4. Handle no items found case for a valid user and playlist
    if (itemResults.length === 0) {
      return new Frames({ ...originalFrame, [items]: [] });
    }
    
    // 5. Collect the items (externalIds) into a single 'items' array.
    return itemResults.collectAs([item], items);
  },
  then: actions([Requesting.respond, { request, items }]), // Pass actual bound variable
});
```

# redo the syncs for the playlist concept with the current concept definitions (music discovery has not changed), use the example-syncs file to model syncs as well as the sample-sync for implementation
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

# prompt: _getPlaylistByNameAndUser does not exist on playlist. only use existing methods from the documentation for these concepts and generate the syncs related to playlists again
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