---
timestamp: 'Mon Dec 01 2025 22:13:59 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_221359.8d5eb55c.md]]'
content_id: 14e24f43f2532a8dbc467d7c61c19be3f7246221d5a2c0d1150afb1f6b932812
---

# response:

The errors you're seeing are primarily due to a MongoDB issue where you're attempting to update the `_id` field in a way that conflicts with its immutability, even in an upsert. This causes your actions to fail, which then cascades into your tests failing when they assert for successful outcomes or non-empty query results.

The TypeScript errors (`Property 'items' does not exist on type ...`) are secondary. They occur because when an action *fails* (due to the MongoDB error), its return type becomes `{ error: string }`, and your subsequent code tries to access properties like `items` or `track` that only exist on the *success* return type. My previous response addressed this with explicit type casting (`as { ... }`), but the core problem remains the underlying action failure.

Let's fix the core MongoDB upsert logic in `MusicDiscoveryConcept.ts` and ensure the tests are correctly structured to handle the expected success/error paths using the compact casting strategy you requested.

***

### **1. Update `src/musicdiscovery/MusicDiscoveryConcept.ts`**

The `MongoServerError` about `_id` conflict happens in `mapAndUpsertMusicItem`. We'll refactor it to explicitly `updateOne` or `insertOne` based on whether the item already exists, making `_id` handling clearer and avoiding the conflict. Also, the `this.users.createIndex({ _id: 1 }, { unique: true });` line in the constructor is still redundant as `_id` is automatically indexed and unique. I will explicitly remove this.

```typescript
// file: src/musicdiscovery/MusicDiscoveryConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// --- Spotify API related interfaces (moved from spotify.ts) ---
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifySearchParams {
  query: string;
  type?: "track" | "album" | "artist" | "playlist" | string; // string allows comma-separated types like "track,album,artist"
  limit?: number;
  offset?: number;
}
// --- End Spotify API related interfaces ---

// Collection prefix to ensure namespace separation
const PREFIX = "MusicDiscovery" + ".";

// Generic types for the concept's external dependencies
type User = ID;

// Internal entity IDs (generated for our concept's state)
type MusicItemInternal = ID;

// Spotify's external IDs are just strings
type SpotifyExternalId = string;

/**
 * State: A set of MusicItems with common properties.
 * This will be the primary collection for all music entities (tracks, albums, artists).
 */
interface MusicItemDoc {
  _id: MusicItemInternal; // Our internal ID for the item
  externalId: SpotifyExternalId; // Spotify's ID for the item
  name: string;
  uri: string;
  imageUrl?: string;
  externalUrl?: string;
  type: "track" | "album" | "artist"; // Spotify item type
}

/**
 * State: A Tracks subset of MusicItems.
 * Each document in this collection will have the same _id as its corresponding MusicItemDoc.
 */
interface TrackDoc {
  _id: MusicItemInternal; // Same as MusicItemDoc._id
  durationMs: number;
  albumExternalId: SpotifyExternalId; // Spotify external ID of the album
  artistExternalId: SpotifyExternalId; // Spotify external ID of the primary artist
}

/**
 * State: An Albums subset of MusicItems.
 * Each document in this collection will have the same _id as its corresponding MusicItemDoc.
 */
interface AlbumDoc {
  _id: MusicItemInternal; // Same as MusicItemDoc._id
  releaseDate?: string;
  artistExternalId: SpotifyExternalId; // Spotify external ID of the primary artist
  totalTracks: number;
}

/**
 * State: A Artists subset of MusicItems.
 * Each document in this collection will have the same _id as its corresponding MusicItemDoc.
 */
interface ArtistDoc {
  _id: MusicItemInternal; // Same as MusicItemDoc._id
  albums: SpotifyExternalId[]; // List of Spotify external Album IDs associated with this artist
}

/**
 * State: A set of Users with a searchResults set of MusicItems.
 */
interface UserDoc {
  _id: User;
  searchResults: MusicItemInternal[]; // List of our internal MusicItem IDs
}

// --- Output Types for Actions and Queries ---
// These interfaces represent the structure of data returned by actions/queries
// to external callers, combining base and type-specific fields.

export interface MusicItemOutput {
  id: MusicItemInternal;
  externalId: SpotifyExternalId;
  name: string;
  uri: string;
  imageUrl?: string;
  externalUrl?: string;
  type: "track" | "album" | "artist";
}

export interface TrackOutput extends MusicItemOutput {
  durationMs: number;
  albumExternalId: SpotifyExternalId;
  artistExternalId: SpotifyExternalId;
}

export interface AlbumOutput extends MusicItemOutput {
  releaseDate?: string;
  artistExternalId: SpotifyExternalId;
  totalTracks: number;
}

export interface ArtistOutput extends MusicItemOutput {
  albums: SpotifyExternalId[];
}

export type MusicEntityOutput = TrackOutput | AlbumOutput | ArtistOutput;


/**
 * @concept MusicDiscovery
 * @purpose allow users to search for and retrieve specific music entities from a global catalog,
 *          creating a persistent local cache of discovered content.
 * @principle a user can search for any kind of music item (track, album, artist),
 *             and the music information will be fetched from an external provider;
 *             this information will then be stored in a catalog;
 *             users may clear their search whenever they desire.
 */
export default class MusicDiscoveryConcept {
  musicItems: Collection<MusicItemDoc>;
  tracks: Collection<TrackDoc>;
  albums: Collection<AlbumDoc>;
  artists: Collection<ArtistDoc>;
  users: Collection<UserDoc>;

  // --- Internal Spotify API state and methods ---
  private spotifyClientId: string;
  private spotifyClientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private readonly db: Db) {
    this.musicItems = this.db.collection(PREFIX + "musicItems");
    this.tracks = this.db.collection(PREFIX + "tracks");
    this.albums = this.db.collection(PREFIX + "albums");
    this.artists = this.db.collection(PREFIX + "artists");
    this.users = this.db.collection(PREFIX + "users");

    // Load Spotify credentials directly
    this.spotifyClientId = Deno.env.get("CLIENT_ID") || "";
    this.spotifyClientSecret = Deno.env.get("CLIENT_SECRET") || "";

    if (!this.spotifyClientId || !this.spotifyClientSecret) {
      throw new Error("CLIENT_ID and CLIENT_SECRET must be set in environment variables for MusicDiscoveryConcept");
    }

    // Ensure indexes for efficient lookups by externalId and user searchResults
    this.musicItems.createIndex({ externalId: 1 }, { unique: true });
    this.musicItems.createIndex({ uri: 1 }, { unique: true, sparse: true }); // URI might not always be present or unique in practice
    this.tracks.createIndex({ albumExternalId: 1 });
    this.albums.createIndex({ artistExternalId: 1 });
    // REMOVED: this.users.createIndex({ _id: 1 }, { unique: true }); // _id is unique and indexed by default by MongoDB.
  }

  /**
   * Private: Get or refresh Spotify access token.
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    const authString = btoa(`${this.spotifyClientId}:${this.spotifyClientSecret}`);

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + authString,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
    }

    const data: SpotifyTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  /**
   * Private: Make a generic Spotify API GET request.
   */
  private async spotifyApiGet(endpoint: string, params?: URLSearchParams): Promise<any> {
    const accessToken = await this.getAccessToken();
    const url = new URL(`https://api.spotify.com/v1/${endpoint}`);
    if (params) {
      url.search = params.toString();
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // Attempt to parse error body for more details
      const errorBody = await response.text();
      throw new Error(`Spotify API error for ${endpoint}: ${response.statusText} - ${errorBody}`);
    }
    return await response.json();
  }

  /**
   * Private: Search for tracks, albums, artists, or playlists on Spotify.
   */
  private async spotifySearch(params: SpotifySearchParams) {
    const type = params.type || "track";
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    const queryParams = new URLSearchParams();
    queryParams.set("q", params.query);
    queryParams.set("type", type);
    queryParams.set("limit", limit.toString());
    queryParams.set("offset", offset.toString());

    return await this.spotifyApiGet("search", queryParams);
  }

  /**
   * Private: Get track information by ID from Spotify.
   */
  private async spotifyGetTrack(trackId: string) {
    return await this.spotifyApiGet(`tracks/${trackId}`);
  }

  /**
   * Private: Get album information by ID from Spotify.
   */
  private async spotifyGetAlbum(albumId: string) {
    return await this.spotifyApiGet(`albums/${albumId}`);
  }

  /**
   * Private: Get artist information by ID from Spotify.
   */
  private async spotifyGetArtist(artistId: string) {
    return await this.spotifyApiGet(`artists/${artistId}`);
  }

  /**
   * Private: Get album tracks by album ID from Spotify.
   */
  private async spotifyGetAlbumTracks(albumId: string, options?: { market?: string; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    queryParams.set("limit", (options?.limit || 20).toString());
    queryParams.set("offset", (options?.offset || 0).toString());
    if (options?.market) {
      queryParams.set("market", options.market);
    }
    return await this.spotifyApiGet(`albums/${albumId}/tracks`, queryParams);
  }

  /**
   * Private: Get artist's albums by artist ID from Spotify.
   */
  private async spotifyGetArtistAlbums(artistId: string, options?: { include_groups?: string; market?: string; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    queryParams.set("limit", (options?.limit || 20).toString());
    queryParams.set("offset", (options?.offset || 0).toString());
    if (options?.include_groups) {
      queryParams.set("include_groups", options.include_groups);
    }
    if (options?.market) {
      queryParams.set("market", options.market);
    }
    return await this.spotifyApiGet(`artists/${artistId}/albums`, queryParams);
  }
  // --- End Internal Spotify API state and methods ---


  /**
   * Helper to map Spotify API object to MusicItemDoc structure and upsert it.
   * Returns the internal ID of the upserted MusicItem.
   */
  private async mapAndUpsertMusicItem(spotifyItem: any, type: MusicItemDoc["type"]): Promise<MusicItemInternal> {
    const externalId = spotifyItem.id;

    // Try to find an existing item by its externalId (Spotify ID)
    const existingMusicItem = await this.musicItems.findOne({ externalId });
    let internalId: MusicItemInternal;

    const baseItemData = {
        externalId: externalId,
        name: spotifyItem.name,
        uri: spotifyItem.uri,
        imageUrl: spotifyItem.album?.images?.[0]?.url || spotifyItem.images?.[0]?.url || '',
        externalUrl: spotifyItem.external_urls?.spotify || '',
        type: type,
    };

    if (existingMusicItem) {
      // If found, reuse its internal ID and update the existing document
      internalId = existingMusicItem._id;
      await this.musicItems.updateOne(
        { _id: internalId }, // Query by the existing internal ID
        { $set: baseItemData }, // Update only the mutable fields
      );
    } else {
      // If not found, create a new internal ID and insert a new document
      internalId = freshID();
      await this.musicItems.insertOne({
        _id: internalId,
        ...baseItemData,
      });
    }
    return internalId;
  }

  // Helper to retrieve a MusicItemDoc and its specific type data, combining them into an Output type.
  private async getFullMusicItem(internalId: MusicItemInternal): Promise<MusicItemOutput | null> {
    const baseItem = await this.musicItems.findOne({ _id: internalId });
    if (!baseItem) return null;

    let fullItem: MusicItemOutput;

    switch (baseItem.type) {
      case "track": {
        const trackDetails = await this.tracks.findOne({ _id: internalId });
        fullItem = {
          ...baseItem,
          id: baseItem._id,
          durationMs: trackDetails?.durationMs || 0, // Default to 0 if not found
          albumExternalId: trackDetails?.albumExternalId || '',
          artistExternalId: trackDetails?.artistExternalId || '',
        } as TrackOutput;
        break;
      }
      case "album": {
        const albumDetails = await this.albums.findOne({ _id: internalId });
        fullItem = {
          ...baseItem,
          id: baseItem._id,
          releaseDate: albumDetails?.releaseDate,
          artistExternalId: albumDetails?.artistExternalId || '',
          totalTracks: albumDetails?.totalTracks || 0, // Default to 0 if not found
        } as AlbumOutput;
        break;
      }
      case "artist": {
        const artistDetails = await this.artists.findOne({ _id: internalId });
        fullItem = {
          ...baseItem,
          id: baseItem._id,
          albums: artistDetails?.albums || [],
        } as ArtistOutput;
        break;
      }
      default:
        fullItem = { ...baseItem, id: baseItem._id };
    }
    return fullItem;
  }

  /**
   * search (user: User, query: String, type: String): (items: MusicItem[])
   * @requires query is not empty.
   * @effects Fetches matches from provider. Upserts items into the `MusicItems` set
   *          (and appropriate subsets based on type). Replaces `user`'s `searchResults` with these items.
   *          Returns the items.
   */
  async search({ user, query, type }: { user: User; query: string; type: string }): Promise<{ items: MusicItemOutput[] } | { error: string }> {
    if (!query) {
      return { error: "Query cannot be empty." };
    }
    const supportedSearchTypes = ["track", "album", "artist", "playlist"]; // Spotify supports playlist in search
    if (!supportedSearchTypes.includes(type)) {
      return { error: `Invalid search type: ${type}. Must be one of ${supportedSearchTypes.join(', ')}.` };
    }

    try {
      const spotifyResults = await this.spotifySearch({ query, type });
      let itemsToReturn: MusicItemOutput[] = [];
      let newSearchResults: MusicItemInternal[] = [];

      const resultKey = type === "track" ? "tracks" : type === "album" ? "albums" : type === "artist" ? "artists" : null;
      const spotifyItems = resultKey ? spotifyResults[resultKey]?.items || [] : [];

      for (const spotifyItem of spotifyItems) {
        const internalId = await this.mapAndUpsertMusicItem(spotifyItem, type as MusicItemDoc["type"]);
        newSearchResults.push(internalId);

        // Upsert specific type details into respective collections
        if (type === "track") {
          await this.tracks.updateOne(
            { _id: internalId },
            {
              $set: {
                // _id field is immutable, so it should not be set here on existing documents.
                // However, upsert:true with $set { _id: internalId } on sub-collections
                // is often used to ensure the _id exists and matches the parent.
                // It's technically okay here as internalId is the primary key for subsets.
                _id: internalId, 
                durationMs: spotifyItem.duration_ms,
                albumExternalId: spotifyItem.album?.id || '',
                artistExternalId: spotifyItem.artists?.[0]?.id || '',
              },
            },
            { upsert: true }
          );
        } else if (type === "album") {
          await this.albums.updateOne(
            { _id: internalId },
            {
              $set: {
                _id: internalId,
                releaseDate: spotifyItem.release_date,
                artistExternalId: spotifyItem.artists?.[0]?.id || '',
                totalTracks: spotifyItem.total_tracks,
              },
            },
            { upsert: true }
          );
        } else if (type === "artist") {
          await this.artists.updateOne(
            { _id: internalId },
            { $set: { _id: internalId, albums: [] } }, // Initialize albums as empty, to be filled by loadArtistAlbums
            { upsert: true }
          );
        }
        
        const fullItem = await this.getFullMusicItem(internalId);
        if (fullItem) {
          itemsToReturn.push(fullItem);
        }
      }

      // Ensure user exists before updating searchResults
      await this.users.updateOne(
        { _id: user },
        { $set: { searchResults: newSearchResults } },
        { upsert: true } // If user doesn't exist, create them with empty search results (or populate)
      );

      return { items: itemsToReturn };
    } catch (e: any) {
      return { error: `Failed to search Spotify: ${e.message}` };
    }
  }

  /**
   * clearSearch (user: User)
   * @effects Removes all items from `user`'s `searchResults`.
   */
  async clearSearch({ user }: { user: User }): Promise<Empty> {
    await this.users.updateOne(
      { _id: user },
      { $set: { searchResults: [] } },
      { upsert: true }
    );
    return {};
  }

  /**
   * loadTrack (externalId: String): (track: Track)
   * @requires externalId is a valid track ID.
   * @effects Fetches details. Upserts into `Tracks` subset. Returns the track.
   */
  async loadTrack({ externalId }: { externalId: SpotifyExternalId }): Promise<{ track: TrackOutput } | { error: string }> {
    try {
      const spotifyTrack = await this.spotifyGetTrack(externalId);
      const internalId = await this.mapAndUpsertMusicItem(spotifyTrack, "track");

      await this.tracks.updateOne(
        { _id: internalId },
        {
          $set: {
            _id: internalId,
            durationMs: spotifyTrack.duration_ms,
            albumExternalId: spotifyTrack.album?.id || '',
            artistExternalId: spotifyTrack.artists?.[0]?.id || '',
          },
        },
        { upsert: true }
      );
      const track = await this.getFullMusicItem(internalId) as TrackOutput;
      return { track };
    } catch (e: any) {
      return { error: `Failed to load track ${externalId}: ${e.message}` };
    }
  }

  /**
   * loadAlbum (externalId: String): (album: Album)
   * @requires externalId is a valid album ID.
   * @effects Fetches details. Upserts into `Albums` subset. Returns the album.
   */
  async loadAlbum({ externalId }: { externalId: SpotifyExternalId }): Promise<{ album: AlbumOutput } | { error: string }> {
    try {
      const spotifyAlbum = await this.spotifyGetAlbum(externalId);
      const internalId = await this.mapAndUpsertMusicItem(spotifyAlbum, "album");

      await this.albums.updateOne(
        { _id: internalId },
        {
          $set: {
            _id: internalId,
            releaseDate: spotifyAlbum.release_date,
            artistExternalId: spotifyAlbum.artists?.[0]?.id || '',
            totalTracks: spotifyAlbum.total_tracks,
          },
        },
        { upsert: true }
      );
      const album = await this.getFullMusicItem(internalId) as AlbumOutput;
      return { album };
    } catch (e: any) {
      return { error: `Failed to load album ${externalId}: ${e.message}` };
    }
  }

  /**
   * loadArtist (externalId: String): (artist: Artist)
   * @requires externalId is a valid artist ID.
   * @effects Fetches details. Upserts into `Artists` subset. Returns the artist.
   */
  async loadArtist({ externalId }: { externalId: SpotifyExternalId }): Promise<{ artist: ArtistOutput } | { error: string }> {
    try {
      const spotifyArtist = await this.spotifyGetArtist(externalId);
      const internalId = await this.mapAndUpsertMusicItem(spotifyArtist, "artist");

      await this.artists.updateOne(
        { _id: internalId },
        { $set: { _id: internalId, albums: [] } }, // Initialize albums as empty, to be filled by loadArtistAlbums
        { upsert: true }
      );
      const artist = await this.getFullMusicItem(internalId) as ArtistOutput;
      return { artist };
    } catch (e: any) {
      return { error: `Failed to load artist ${externalId}: ${e.message}` };
    }
  }

  /**
   * loadAlbumTracks (albumId: String): (tracks: Track[])
   * @requires albumId refers to a valid album.
   * @effects Fetches tracks for the album. Upserts them into `Tracks` subset (linking them to the `albumId`).
   *          Returns the tracks.
   */
  async loadAlbumTracks({ albumId }: { albumId: SpotifyExternalId }): Promise<{ tracks: TrackOutput[] } | { error: string }> {
    try {
      // Ensure the album itself exists in our system, load it if not
      let albumMusicItem = await this.musicItems.findOne({ externalId: albumId, type: "album" });
      if (!albumMusicItem) {
        const loadedAlbumResult = await this.loadAlbum({ externalId: albumId });
        if ("error" in loadedAlbumResult) {
          return { error: `Album ${albumId} not found and could not be loaded: ${loadedAlbumResult.error}` };
        }
        albumMusicItem = await this.musicItems.findOne({ externalId: albumId, type: "album" }); // Re-fetch after loading
      }
      if (!albumMusicItem) {
        return { error: `Failed to ensure album ${albumId} exists in the system.` };
      }


      const spotifyAlbumTracks = await this.spotifyGetAlbumTracks(albumId);
      let tracksToReturn: TrackOutput[] = [];

      for (const spotifyTrack of spotifyAlbumTracks.items) {
        const internalId = await this.mapAndUpsertMusicItem(spotifyTrack, "track");
        await this.tracks.updateOne(
          { _id: internalId },
          {
            $set: {
              _id: internalId,
              durationMs: spotifyTrack.duration_ms,
              albumExternalId: albumId, // Link to the `albumId` argument
              artistExternalId: spotifyTrack.artists?.[0]?.id || '',
            },
          },
          { upsert: true }
        );
        const track = await this.getFullMusicItem(internalId) as TrackOutput;
        tracksToReturn.push(track);
      }
      return { tracks: tracksToReturn };
    } catch (e: any) {
      return { error: `Failed to load tracks for album ${albumId}: ${e.message}` };
    }
  }

  /**
   * loadArtistAlbums (artistId: String): (albums: Album[])
   * @requires artistId refers to a valid artist.
   * @effects Fetches albums for the artist. Upserts them into `Albums` subset.
   *          Updates the `ArtistDoc` for the given artist with the new albums. Returns the albums.
   */
  async loadArtistAlbums({ artistId }: { artistId: SpotifyExternalId }): Promise<{ albums: AlbumOutput[] } | { error: string }> {
    try {
      // Ensure the artist itself exists in our system, load it if not
      let artistMusicItem = await this.musicItems.findOne({ externalId: artistId, type: "artist" });
      let internalArtistId: MusicItemInternal;
      if (!artistMusicItem) {
        const loadedArtistResult = await this.loadArtist({ externalId: artistId });
        if ("error" in loadedArtistResult) {
          return { error: `Artist ${artistId} not found and could not be loaded: ${loadedArtistResult.error}` };
        }
        internalArtistId = loadedArtistResult.artist.id;
      } else {
        internalArtistId = artistMusicItem._id;
      }

      // Fetch albums using Spotify API
      const spotifyArtistAlbums = await this.spotifyGetArtistAlbums(artistId);
      let albumsToReturn: AlbumOutput[] = [];
      let newArtistAlbumsExternalIds: SpotifyExternalId[] = [];

      for (const spotifyAlbum of spotifyArtistAlbums.items) {
        const internalId = await this.mapAndUpsertMusicItem(spotifyAlbum, "album");
        await this.albums.updateOne(
          { _id: internalId },
          {
            $set: {
              _id: internalId,
              releaseDate: spotifyAlbum.release_date,
              artistExternalId: spotifyAlbum.artists?.[0]?.id || '',
              totalTracks: spotifyAlbum.total_tracks,
            },
          },
          { upsert: true }
        );
        newArtistAlbumsExternalIds.push(spotifyAlbum.id); // Collect external IDs for updating ArtistDoc
        const album = await this.getFullMusicItem(internalId) as AlbumOutput;
        albumsToReturn.push(album);
      }

      // Update the artist's albums list in the ArtistDoc using $addToSet to avoid duplicates
      await this.artists.updateOne(
        { _id: internalArtistId },
        { $addToSet: { albums: { $each: newArtistAlbumsExternalIds } } },
        { upsert: true } // If the artist was just loaded, the ArtistDoc might need to be created/updated
      );

      return { albums: albumsToReturn };
    } catch (e: any) {
      return { error: `Failed to load albums for artist ${artistId}: ${e.message}` };
    }
  }


  // --- Queries ---

  /**
   * _getSearchResults (user: User): (items: MusicItem[])
   * @effects Returns the set of `MusicItems` currently linked to the user.
   */
  async _getSearchResults({ user }: { user: User }): Promise<MusicItemOutput[]> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc || userDoc.searchResults.length === 0) {
      return [];
    }

    const fullItems = await Promise.all(userDoc.searchResults.map(id => this.getFullMusicItem(id)));
    return fullItems.filter(item => item !== null) as MusicItemOutput[];
  }

  /**
   * _getTrack (externalId: String): (track: Track)
   * @requires Item exists in `Tracks` subset.
   * @effects Returns the track.
   */
  async _getTrack({ externalId }: { externalId: SpotifyExternalId }): Promise<TrackOutput[]> {
    const item = await this.musicItems.findOne({ externalId, type: "track" });
    if (!item) return [];
    const track = await this.getFullMusicItem(item._id);
    return track ? [track as TrackOutput] : [];
  }

  /**
   * _getAlbum (externalId: String): (album: Album)
   * @requires Item exists in `Albums` subset.
   * @effects Returns the album.
   */
  async _getAlbum({ externalId }: { externalId: SpotifyExternalId }): Promise<AlbumOutput[]> {
    const item = await this.musicItems.findOne({ externalId, type: "album" });
    if (!item) return [];
    const album = await this.getFullMusicItem(item._id);
    return album ? [album as AlbumOutput] : [];
  }

  /**
   * _getArtist (externalId: String): (artist: Artist)
   * @requires Item exists in `Artists` subset.
   * @effects Returns the artist.
   */
  async _getArtist({ externalId }: { externalId: SpotifyExternalId }): Promise<ArtistOutput[]> {
    const item = await this.musicItems.findOne({ externalId, type: "artist" });
    if (!item) return [];
    const artist = await this.getFullMusicItem(item._id);
    return artist ? [artist as ArtistOutput] : [];
  }

  /**
   * _getTracksByAlbum (albumId: String): (tracks: Track[])
   * @effects Returns all items in `Tracks` where the `albumId` matches.
   */
  async _getTracksByAlbum({ albumId }: { albumId: SpotifyExternalId }): Promise<TrackOutput[]> {
    const trackDocs = await this.tracks.find({ albumExternalId: albumId }).toArray();
    const internalTrackIds = trackDocs.map(doc => doc._id);
    const musicItems = await this.musicItems.find({ _id: { $in: internalTrackIds }, type: "track" }).toArray();

    const results: TrackOutput[] = [];
    for (const item of musicItems) {
        const trackDetails = trackDocs.find(doc => doc._id === item._id);
        if (trackDetails) {
            results.push({
                ...item,
                id: item._id,
                durationMs: trackDetails.durationMs,
                albumExternalId: trackDetails.albumExternalId,
                artistExternalId: trackDetails.artistExternalId,
            } as TrackOutput);
        }
    }
    return results;
  }

  /**
   * _getAlbumsByArtist (artistId: String): (albums: Album[])
   * @effects Returns all items in `Albums` where the `artistId` matches.
   */
  async _getAlbumsByArtist({ artistId }: { artistId: SpotifyExternalId }): Promise<AlbumOutput[]> {
    // Get the ArtistDoc to retrieve the list of associated album external IDs
    const artistBaseItem = await this.musicItems.findOne({ externalId: artistId, type: "artist" });
    if (!artistBaseItem) return [];
    const artistDetailDoc = await this.artists.findOne({ _id: artistBaseItem._id });
    if (!artistDetailDoc || artistDetailDoc.albums.length === 0) {
      return [];
    }

    // Now find the album MusicItemDocs using the external album IDs stored in the ArtistDoc
    const albumExternalIds = artistDetailDoc.albums;
    const albumMusicItems = await this.musicItems.find({ externalId: { $in: albumExternalIds }, type: "album" }).toArray();

    const results: AlbumOutput[] = [];
    for (const item of albumMusicItems) {
      const albumDetails = await this.albums.findOne({ _id: item._id });
      if (albumDetails) {
        results.push({
          ...item,
          id: item._id,
          releaseDate: albumDetails.releaseDate,
          artistExternalId: albumDetails.artistExternalId,
          totalTracks: albumDetails.totalTracks,
        } as AlbumOutput);
      }
    }
    return results;
  }

  /**
   * _getItem (externalId: String): (item: MusicItem)
   * @effects Returns the generic `MusicItem` (useful if you don't know the type yet).
   */
  async _getItem({ externalId }: { externalId: SpotifyExternalId }): Promise<MusicItemOutput[]> {
    const item = await this.musicItems.findOne({ externalId });
    if (!item) return [];
    const fullItem = await this.getFullMusicItem(item._id); // Return the full item with type-specific details if available
    return fullItem ? [fullItem] : [];
  }

  /**
   * _getEntityFromId (externalId: String): (musicEntity: MusicEntity)
   * @effects Returns the `MusicEntity` with the given external id.
   * Alias for _getItem to comply with query signature return type requirements (array of dictionary).
   */
  async _getEntityFromId({ externalId }: { externalId: SpotifyExternalId }): Promise<MusicEntityOutput[]> {
    // getFullMusicItem returns a union type which matches MusicEntityOutput
    const item = await this._getItem({ externalId });
    return item as MusicEntityOutput[]; 
  }

  /**
   * _getEntityFromUri (uri: String): (musicEntity: MusicEntity)
   * @effects Returns the `MusicEntity` with the given external uri.
   * Alias for _getItem but using URI for lookup.
   */
  async _getEntityFromUri({ uri }: { uri: string }): Promise<MusicEntityOutput[]> {
    const item = await this.musicItems.findOne({ uri });
    if (!item) return [];
    const fullItem = await this.getFullMusicItem(item._id);
    return fullItem ? [fullItem as MusicEntityOutput] : [];
  }
}
```

***

### **2. Update `src/musicdiscovery/MusicDiscoveryConcept.test.ts`**

I'll apply the compact casting strategy consistently for error cases (which was the last type issue you reported). The fix to `mapAndUpsertMusicItem` should resolve the underlying runtime errors that were causing the `AssertionError` failures.

```typescript
// file: src/musicdiscovery/MusicDiscoveryConcept.test.ts

import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MusicDiscoveryConcept, { TrackOutput, AlbumOutput, ArtistOutput, AlbumDoc, ArtistDoc } from "./MusicDiscoveryConcept.ts";

// Define a test user ID
const userA = "user:Alice" as ID;

// Known Spotify IDs for testing (can be replaced with actual search results if dynamic)
const TEST_TRACK_EXTERNAL_ID = "0ofHAoxe9vNKpRtgKpk7M7"; // Example: Need You Now by Lady A
const TEST_ALBUM_EXTERNAL_ID = "6Jv0f5i14a3KIEbK3P2vsd"; // Example: Need You Now (album) by Lady A
const TEST_ARTIST_EXTERNAL_ID = "3K7vsHh6A4N7f8grvQ5wOq"; // Example: Lady A artist ID

Deno.test("MusicDiscovery Principle: User searches, items are cached, search is cleared", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("\n--- MusicDiscovery Principle Test Start ---");

    await t.step("1. User searches for a track", async () => {
      console.log(`User ${userA} searches for "Need You Now" (track)`);
      const searchResultUnion = await musicDiscovery.search({ user: userA, query: "Need You Now", type: "track" });

      // Assert it's not an error at runtime, and cast the union type to the success type for compile-time
      assertNotEquals("error" in searchResultUnion, true, `Search failed unexpectedly: ${(searchResultUnion as { error: string }).error}`);
      const searchResult = searchResultUnion as { items: TrackOutput[] }; // Explicitly cast to the success type

      assertEquals(searchResult.items.length > 0, true, "Search should return at least one item.");

      const firstTrack = searchResult.items[0]; // firstTrack is now correctly inferred as TrackOutput
      assertExists(firstTrack.id, "Returned item should have an internal ID.");
      assertEquals(firstTrack.type, "track", "Returned item should be of type 'track'.");
      assertEquals(firstTrack.name.includes("Need You Now"), true, "Track name should contain 'Need You Now'.");
      assertExists(firstTrack.durationMs, "Track should have durationMs.");
      assertExists(firstTrack.albumExternalId, "Track should have albumExternalId.");
      assertExists(firstTrack.artistExternalId, "Track should have artistExternalId.");

      // Verify the item is cached in musicItems
      const cachedMusicItem = await musicDiscovery.musicItems.findOne({ externalId: firstTrack.externalId });
      assertExists(cachedMusicItem, "Music item should be cached in the musicItems collection.");
      assertEquals(cachedMusicItem?.type, "track");

      // Verify the specific track details are cached
      const cachedTrackDetails = await musicDiscovery.tracks.findOne({ _id: cachedMusicItem?._id });
      assertExists(cachedTrackDetails, "Track details should be cached in the tracks collection.");
      assertEquals(cachedTrackDetails?.durationMs, firstTrack.durationMs);

      // Verify the user's search results
      const userDoc = await musicDiscovery.users.findOne({ _id: userA });
      assertExists(userDoc, "User document should exist after search.");
      assertArrayIncludes(userDoc?.searchResults || [], [firstTrack.id], "User's search results should include the found track.");

      console.log(`Found track: ${firstTrack.name} (Internal ID: ${firstTrack.id})`);
    });

    await t.step("2. User queries their search results", async () => {
      console.log(`User ${userA} queries their current search results.`);
      const currentSearchResults = await musicDiscovery._getSearchResults({ user: userA });

      assertEquals(currentSearchResults.length > 0, true, "Query should return items from previous search.");
      assertEquals(currentSearchResults[0].name.includes("Need You Now"), true, "First item should be 'Need You Now'.");
      console.log(`Current search results for ${userA}: ${currentSearchResults.map(item => item.name).join(", ")}`);
    });

    await t.step("3. User clears their search results", async () => {
      console.log(`User ${userA} clears their search results.`);
      await musicDiscovery.clearSearch({ user: userA }); // clearResult is Empty, no error check or destructuring needed.

      const userDocAfterClear = await musicDiscovery.users.findOne({ _id: userA });
      assertEquals(userDocAfterClear?.searchResults.length, 0, "User's search results should be empty after clearing.");

      const cachedMusicItemsCount = await musicDiscovery.musicItems.countDocuments({});
      assertEquals(cachedMusicItemsCount > 0, true, "Cached music items should still exist in the main collection.");
      console.log(`User ${userA}'s search results cleared. Total cached items: ${cachedMusicItemsCount}`);
    });

    await t.step("4. User queries their search results after clearing (expect empty)", async () => {
      console.log(`User ${userA} queries search results again.`);
      const currentSearchResults = await musicDiscovery._getSearchResults({ user: userA });
      assertEquals(currentSearchResults.length, 0, "Search results should be empty after clearing.");
      console.log(`Search results for ${userA} are now empty.`);
    });

    console.log("--- MusicDiscovery Principle Test End ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search with invalid query or type", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    await t.step("Should return error for empty query", async () => {
      const resultUnion = await musicDiscovery.search({ user: userA, query: "", type: "track" });
      assertEquals("error" in resultUnion, true, "Expected an error for empty query, but it succeeded.");
      const errorResult = resultUnion as { error: string }; // Cast to error type
      assertEquals(errorResult.error, "Query cannot be empty.", "Error message mismatch for empty query.");
    });

    await t.step("Should return error for unsupported type", async () => {
      const resultUnion = await musicDiscovery.search({ user: userA, query: "some query", type: "unsupported" });
      assertEquals("error" in resultUnion, true, "Expected an error for unsupported type, but it succeeded.");
      const errorResult = resultUnion as { error: string }; // Cast to error type
      assertEquals(errorResult.error.includes("Invalid search type"), true, "Error message mismatch for invalid type.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadTrack caches track and details", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log(`\nLoading track ${TEST_TRACK_EXTERNAL_ID}...`);
    const loadResultUnion = await musicDiscovery.loadTrack({ externalId: TEST_TRACK_EXTERNAL_ID });

    assertNotEquals("error" in loadResultUnion, true, `Loading track failed unexpectedly: ${(loadResultUnion as { error: string }).error}`);
    const { track } = loadResultUnion as { track: TrackOutput }; // Assert and destructure
    assertExists(track.id, "Track should have an internal ID.");
    assertEquals(track.externalId, TEST_TRACK_EXTERNAL_ID, "External ID should match.");
    assertEquals(track.type, "track", "Loaded item should be of type 'track'.");
    assertEquals(track.name.includes("Need You Now"), true);
    assertExists(track.durationMs);
    assertExists(track.albumExternalId);
    assertExists(track.artistExternalId);

    // Verify cache consistency
    const cachedItem = await musicDiscovery.musicItems.findOne({ externalId: TEST_TRACK_EXTERNAL_ID });
    assertExists(cachedItem, "Base music item should be cached.");
    const cachedTrack = await musicDiscovery.tracks.findOne({ _id: cachedItem?._id });
    assertExists(cachedTrack, "Track specific details should be cached.");
    assertEquals(cachedTrack?.durationMs, track.durationMs);

    console.log(`Successfully loaded track: ${track.name}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadAlbum caches album and details", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log(`\nLoading album ${TEST_ALBUM_EXTERNAL_ID}...`);
    const loadResultUnion = await musicDiscovery.loadAlbum({ externalId: TEST_ALBUM_EXTERNAL_ID });

    assertNotEquals("error" in loadResultUnion, true, `Loading album failed unexpectedly: ${(loadResultUnion as { error: string }).error}`);
    const { album } = loadResultUnion as { album: AlbumOutput }; // Assert and destructure
    assertExists(album.id, "Album should have an internal ID.");
    assertEquals(album.externalId, TEST_ALBUM_EXTERNAL_ID, "External ID should match.");
    assertEquals(album.type, "album", "Loaded item should be of type 'album'.");
    assertEquals(album.name.includes("Need You Now"), true);
    assertExists(album.releaseDate);
    assertExists(album.artistExternalId);
    assertExists(album.totalTracks);

    // Verify cache consistency
    const cachedItem = await musicDiscovery.musicItems.findOne({ externalId: TEST_ALBUM_EXTERNAL_ID });
    assertExists(cachedItem, "Base music item should be cached.");
    const cachedAlbum = await musicDiscovery.albums.findOne({ _id: cachedItem?._id });
    assertExists(cachedAlbum, "Album specific details should be cached.");
    assertEquals((cachedAlbum as AlbumDoc).totalTracks, album.totalTracks);

    console.log(`Successfully loaded album: ${album.name}`);
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadArtist caches artist and details", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log(`\nLoading artist ${TEST_ARTIST_EXTERNAL_ID}...`);
    const loadResultUnion = await musicDiscovery.loadArtist({ externalId: TEST_ARTIST_EXTERNAL_ID });

    assertNotEquals("error" in loadResultUnion, true, `Loading artist failed unexpectedly: ${(loadResultUnion as { error: string }).error}`);
    const { artist } = loadResultUnion as { artist: ArtistOutput }; // Assert and destructure
    assertExists(artist.id, "Artist should have an internal ID.");
    assertEquals(artist.externalId, TEST_ARTIST_EXTERNAL_ID, "External ID should match.");
    assertEquals(artist.type, "artist", "Loaded item should be of type 'artist'.");
    assertEquals(artist.name.includes("Lady A"), true);
    assertExists(artist.albums, "Artist should have an albums array (even if empty).");

    // Verify cache consistency
    const cachedItem = await musicDiscovery.musicItems.findOne({ externalId: TEST_ARTIST_EXTERNAL_ID });
    assertExists(cachedItem, "Base music item should be cached.");
    const cachedArtist = await musicDiscovery.artists.findOne({ _id: cachedItem?._id });
    assertExists(cachedArtist, "Artist specific details should be cached.");
    assertEquals(cachedArtist?.albums.length, 0, "Albums array should be initialized empty."); // To be filled by loadArtistAlbums

    console.log(`Successfully loaded artist: ${artist.name}`);
  } finally {
    await client.close();
  }
});


Deno.test("Action: loadAlbumTracks loads and caches tracks for an album", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log(`\nLoading tracks for album ${TEST_ALBUM_EXTERNAL_ID}...`);
    const loadAlbumTracksResultUnion = await musicDiscovery.loadAlbumTracks({ albumId: TEST_ALBUM_EXTERNAL_ID });

    assertNotEquals("error" in loadAlbumTracksResultUnion, true, `Loading album tracks failed unexpectedly: ${(loadAlbumTracksResultUnion as { error: string }).error}`);
    const { tracks } = loadAlbumTracksResultUnion as { tracks: TrackOutput[] }; // Assert and destructure
    assertEquals(tracks.length > 0, true, "Should load tracks for the album.");
    assertEquals(tracks[0].type, "track", "Loaded items should be tracks.");
    assertEquals(tracks[0].albumExternalId, TEST_ALBUM_EXTERNAL_ID, "Track should be linked to the correct album.");

    // Verify some tracks are cached
    const trackCount = await musicDiscovery.tracks.countDocuments({ albumExternalId: TEST_ALBUM_EXTERNAL_ID });
    assertEquals(trackCount, tracks.length, "All loaded tracks should be cached.");

    console.log(`Successfully loaded ${tracks.length} tracks for album ${TEST_ALBUM_EXTERNAL_ID}`);

    await t.step("Query: _getTracksByAlbum should retrieve cached tracks", async () => {
      const queriedTracks = await musicDiscovery._getTracksByAlbum({ albumId: TEST_ALBUM_EXTERNAL_ID });
      assertEquals(queriedTracks.length, tracks.length, "Query should return all cached tracks for the album.");
      assertArrayIncludes(queriedTracks.map(t => t.externalId), tracks.map(t => t.externalId));
    });

  } finally {
    await client.close();
  }
});

Deno.test("Action: loadArtistAlbums loads and caches albums for an artist", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log(`\nLoading albums for artist ${TEST_ARTIST_EXTERNAL_ID}...`);
    const loadArtistAlbumsResultUnion = await musicDiscovery.loadArtistAlbums({ artistId: TEST_ARTIST_EXTERNAL_ID });

    assertNotEquals("error" in loadArtistAlbumsResultUnion, true, `Loading artist albums failed unexpectedly: ${(loadArtistAlbumsResultUnion as { error: string }).error}`);
    const { albums } = loadArtistAlbumsResultUnion as { albums: AlbumOutput[] }; // Assert and destructure
    assertEquals(albums.length > 0, true, "Should load albums for the artist.");
    assertEquals(albums[0].type, "album", "Loaded items should be albums.");
    assertEquals(albums[0].artistExternalId, TEST_ARTIST_EXTERNAL_ID, "Album should be linked to the correct artist.");

    // Verify some albums are cached
    const albumCount = await musicDiscovery.albums.countDocuments({ artistExternalId: TEST_ARTIST_EXTERNAL_ID });
    assertEquals(albumCount > 0, true, "Some albums should be cached.");
    
    // Verify ArtistDoc is updated with album external IDs
    const artistBaseItem = await musicDiscovery.musicItems.findOne({ externalId: TEST_ARTIST_EXTERNAL_ID, type: "artist" });
    assertExists(artistBaseItem);
    const updatedArtistDoc = await musicDiscovery.artists.findOne({ _id: artistBaseItem._id });
    assertExists(updatedArtistDoc);
    assertEquals((updatedArtistDoc as ArtistDoc).albums.length > 0, true, "ArtistDoc should have updated album list.");
    assertArrayIncludes((updatedArtistDoc as ArtistDoc).albums || [], albums.map(a => a.externalId));

    console.log(`Successfully loaded ${albums.length} albums for artist ${TEST_ARTIST_EXTERNAL_ID}`);

    await t.step("Query: _getAlbumsByArtist should retrieve cached albums", async () => {
      const queriedAlbums = await musicDiscovery._getAlbumsByArtist({ artistId: TEST_ARTIST_EXTERNAL_ID });
      assertEquals(queriedAlbums.length > 0, true, "Query should return cached albums for the artist.");
      assertArrayIncludes(queriedAlbums.map(a => a.externalId), albums.map(a => a.externalId));
    });

  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getTrack, _getAlbum, _getArtist, _getItem, _getEntityFromId, _getEntityFromUri", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Pre-populate data for queries
    const trackLoadUnion = await musicDiscovery.loadTrack({ externalId: TEST_TRACK_EXTERNAL_ID });
    const albumLoadUnion = await musicDiscovery.loadAlbum({ externalId: TEST_ALBUM_EXTERNAL_ID });
    const artistLoadUnion = await musicDiscovery.loadArtist({ externalId: TEST_ARTIST_EXTERNAL_ID });

    // Type guards for the loaded results and destructuring
    assertNotEquals("error" in trackLoadUnion, true, `Track load failed unexpectedly: ${(trackLoadUnion as { error: string }).error}`);
    const { track } = trackLoadUnion as { track: TrackOutput };
    
    assertNotEquals("error" in albumLoadUnion, true, `Album load failed unexpectedly: ${(albumLoadUnion as { error: string }).error}`);
    const { album } = albumLoadUnion as { album: AlbumOutput };
    
    assertNotEquals("error" in artistLoadUnion, true, `Artist load failed unexpectedly: ${(artistLoadUnion as { error: string }).error}`);
    const { artist } = artistLoadUnion as { artist: ArtistOutput };
    
    const trackUri = track.uri;
    const albumUri = album.uri;
    const artistUri = artist.uri;


    await t.step("Query: _getTrack should return a specific track by externalId", async () => {
      const tracks = await musicDiscovery._getTrack({ externalId: TEST_TRACK_EXTERNAL_ID });
      assertEquals(tracks.length, 1);
      assertEquals(tracks[0].externalId, TEST_TRACK_EXTERNAL_ID);
      assertEquals(tracks[0].type, "track");
    });

    await t.step("Query: _getAlbum should return a specific album by externalId", async () => {
      const albums = await musicDiscovery._getAlbum({ externalId: TEST_ALBUM_EXTERNAL_ID });
      assertEquals(albums.length, 1);
      assertEquals(albums[0].externalId, TEST_ALBUM_EXTERNAL_ID);
      assertEquals(albums[0].type, "album");
    });

    await t.step("Query: _getArtist should return a specific artist by externalId", async () => {
      const artists = await musicDiscovery._getArtist({ externalId: TEST_ARTIST_EXTERNAL_ID });
      assertEquals(artists.length, 1);
      assertEquals(artists[0].externalId, TEST_ARTIST_EXTERNAL_ID);
      assertEquals(artists[0].type, "artist");
    });

    await t.step("Query: _getItem should return a generic MusicItem by externalId", async () => {
      const items = await musicDiscovery._getItem({ externalId: TEST_TRACK_EXTERNAL_ID });
      assertEquals(items.length, 1);
      assertEquals(items[0].externalId, TEST_TRACK_EXTERNAL_ID);
      assertExists(items[0].type); // Can be any type
    });

    await t.step("Query: _getEntityFromId should return a MusicEntity by externalId", async () => {
      const entities = await musicDiscovery._getEntityFromId({ externalId: TEST_TRACK_EXTERNAL_ID });
      assertEquals(entities.length, 1);
      assertEquals(entities[0].externalId, TEST_TRACK_EXTERNAL_ID);
      assertEquals(entities[0].type, "track");
    });

    await t.step("Query: _getEntityFromUri should return a MusicEntity by uri", async () => {
      const entities = await musicDiscovery._getEntityFromUri({ uri: trackUri });
      assertEquals(entities.length, 1);
      assertEquals(entities[0].uri, trackUri);
      assertEquals(entities[0].type, "track");
    });

    await t.step("Query: _getEntityFromUri should return empty for non-existent URI", async () => {
      const entities = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:nonexistent" });
      assertEquals(entities.length, 0);
    });

  } finally {
    await client.close();
  }
});
```
