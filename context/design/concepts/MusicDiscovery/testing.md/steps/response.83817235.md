---
timestamp: 'Mon Dec 01 2025 22:57:18 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_225718.0c94f53a.md]]'
content_id: 838172354397fe79ce7f22ddaa82c533b49f11f1da6a28481807c1e678080f40
---

# response:

Okay, I understand. The primary goal is to revert to the per-test database lifecycle as seen in the `LikertSurvey` tests, and to make the search tests more robust by not relying on hardcoded external IDs for results or assuming a specific order.

Here's the rewritten `src/musicdiscovery/MusicDiscoveryConcept.test.ts` to match the `LikertSurvey` style and to dynamically check search results, along with some helper assertion functions for cleaner type narrowing.

I've also commented out excessive `console.log` statements in the concept file to reduce noise during test runs, as these are typically for deep debugging.

***

### **1. Update `src/musicdiscovery/MusicDiscoveryConcept.ts` (Minor log changes, functionality remains the same as previously fixed)**

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
    this.spotifyClientId = Deno.env.get("CLIENT_ID") ?? "";
    this.spotifyClientSecret = Deno.env.get("CLIENT_SECRET") ?? "";

    if (!this.spotifyClientId || !this.spotifyClientSecret) {
      // Throw an error early if credentials are missing
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
      const errorBody = await response.text();
      console.error(`[Spotify API] Failed to get access token (status ${response.status}): ${response.statusText} - ${errorBody}`);
      throw new Error(`Failed to get Spotify access token: ${response.statusText} - ${errorBody}`);
    }

    const data: SpotifyTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    // console.log("[Spotify API] New access token obtained. Expires in:", data.expires_in, "seconds."); // Commented to reduce verbosity
    return this.accessToken;
  }

  /**
   * Private: Make a generic Spotify API GET request.
   */
  private async spotifyApiGet(endpoint: string, params?: URLSearchParams): Promise<any> {
    const accessToken = await this.getAccessToken(); // Ensure token is fresh
    const url = new URL(`https://api.spotify.com/v1/${endpoint}`);
    if (params) {
      url.search = params.toString();
    }
    // console.log(`[Spotify API] Fetching: ${url.toString()}`); // Commented to reduce verbosity

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      // Attempt to parse error body for more details
      const errorBody = await response.text();
      console.error(`[Spotify API] Error for ${endpoint} (status ${response.status}): ${response.statusText} - ${errorBody}`);
      throw new Error(`Spotify API error for ${endpoint}: ${response.statusText} - ${errorBody}`);
    }
    const jsonResponse = await response.json();
    // console.log(`[Spotify API] Success Response for ${endpoint}:`, JSON.stringify(jsonResponse, null, 2)); // Keep this commented unless deep debugging specific Spotify responses
    return jsonResponse;
  }

  /**
   * Private: Search for tracks, albums, artists, or playlists on Spotify.
   */
  private async spotifySearch(params: SpotifySearchParams) {
    const type = params.type ?? "track";
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

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
    queryParams.set("limit", (options?.limit ?? 20).toString());
    queryParams.set("offset", (options?.offset ?? 0).toString());
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
    queryParams.set("limit", (options?.limit ?? 20).toString());
    queryParams.set("offset", (options?.offset ?? 0).toString());
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

    const baseItemData = {
        externalId: externalId,
        name: spotifyItem.name ?? 'Unknown Name', // Use nullish coalescing
        uri: spotifyItem.uri ?? '',
        imageUrl: spotifyItem.album?.images?.[0]?.url ?? spotifyItem.images?.[0]?.url ?? '',
        externalUrl: spotifyItem.external_urls?.spotify ?? '',
        type: type,
    };
    // console.log(`[MusicDiscovery:mapAndUpsert] Prepared baseItemData for ${externalId}:`, baseItemData); // Commented to reduce verbosity

    const existingMusicItem = await this.musicItems.findOne({ externalId });
    let internalId: MusicItemInternal;

    if (existingMusicItem) {
      internalId = existingMusicItem._id;
      await this.musicItems.updateOne(
        { _id: internalId }, // Query by the existing internal ID
        { $set: baseItemData }, // Update only the mutable fields
      );
      // console.log(`[MusicDiscovery:mapAndUpsert] Updated MusicItemDoc for ${externalId} (internal: ${internalId})`); // Commented to reduce verbosity
    } else {
      internalId = freshID();
      await this.musicItems.insertOne({
        _id: internalId,
        ...baseItemData,
      });
      // console.log(`[MusicDiscovery:mapAndUpsert] Inserted new MusicItemDoc for ${externalId} (internal: ${internalId})`); // Commented to reduce verbosity
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
          durationMs: trackDetails?.durationMs ?? 0, // Default to 0 if not found
          albumExternalId: trackDetails?.albumExternalId ?? '',
          artistExternalId: trackDetails?.artistExternalId ?? '',
        } as TrackOutput;
        break;
      }
      case "album": {
        const albumDetails = await this.albums.findOne({ _id: internalId });
        fullItem = {
          ...baseItem,
          id: baseItem._id,
          releaseDate: albumDetails?.releaseDate, // Keep as optional in output
          artistExternalId: albumDetails?.artistExternalId ?? '',
          totalTracks: albumDetails?.totalTracks ?? 0, // Default to 0 if not found
        } as AlbumOutput;
        break;
      }
      case "artist": {
        const artistDetails = await this.artists.findOne({ _id: internalId });
        fullItem = {
          ...baseItem,
          id: baseItem._id,
          albums: artistDetails?.albums ?? [],
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
      // console.log(`[MusicDiscovery:search] Initiating Spotify search for: query='${query}', type='${type}'`); // Commented to reduce verbosity
      const spotifyResults = await this.spotifySearch({ query, type });
      // console.log(`[MusicDiscovery:search] Raw Spotify search results received.`); // Commented to reduce verbosity

      // Defensive check for Spotify API errors within a 200 OK response (less common, but good to have)
      if (spotifyResults?.error) { // Spotify API sometimes includes an error object in a 200 response
        return { error: `Spotify API search returned an error in payload: ${JSON.stringify(spotifyResults.error)}` };
      }
      
      let itemsToReturn: MusicItemOutput[] = [];
      let newSearchResults: MusicItemInternal[] = [];

      const resultKey = type === "track" ? "tracks" : type === "album" ? "albums" : type === "artist" ? "artists" : null;
      // Defensive check for missing expected key (e.g., spotifyResults.tracks)
      const spotifyItems = resultKey && spotifyResults[resultKey] && Array.isArray(spotifyResults[resultKey].items)
        ? spotifyResults[resultKey].items
        : [];
      
      // console.log(`[MusicDiscovery:search] Extracted ${spotifyItems.length} Spotify items for type '${type}'.`); // Commented to reduce verbosity


      for (const spotifyItem of spotifyItems) {
        if (!spotifyItem || typeof spotifyItem !== 'object' || !spotifyItem.id) {
          console.warn("[MusicDiscovery:search] Skipping malformed or incomplete Spotify item in search results:", spotifyItem);
          continue;
        }
        // console.log(`[MusicDiscovery:search] Processing Spotify item: ID=${spotifyItem.id}, Name='${spotifyItem.name ?? 'N/A'}'`); // Commented to reduce verbosity

        const internalId = await this.mapAndUpsertMusicItem(spotifyItem, type as MusicItemDoc["type"]);
        newSearchResults.push(internalId);

        // Upsert specific type details into respective collections
        if (type === "track") {
          await this.tracks.updateOne(
            { _id: internalId },
            {
              $set: {
                _id: internalId, 
                durationMs: spotifyItem.duration_ms ?? 0,
                albumExternalId: spotifyItem.album?.id ?? '',
                artistExternalId: spotifyItem.artists?.[0]?.id ?? '',
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
                releaseDate: spotifyItem.release_date, // Keep as optional (can be null/undefined)
                artistExternalId: spotifyItem.artists?.[0]?.id ?? '',
                totalTracks: spotifyItem.total_tracks ?? 0,
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
      console.error(`[MusicDiscovery:search] Caught error: ${e.message}`);
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
      // console.log(`[MusicDiscovery:loadTrack] Loading track ${externalId}`); // Commented to reduce verbosity
      const spotifyTrack = await this.spotifyGetTrack(externalId);
      const internalId = await this.mapAndUpsertMusicItem(spotifyTrack, "track");

      await this.tracks.updateOne(
        { _id: internalId },
        {
          $set: {
            _id: internalId,
            durationMs: spotifyTrack.duration_ms ?? 0,
            albumExternalId: spotifyTrack.album?.id ?? '',
            artistExternalId: spotifyTrack.artists?.[0]?.id ?? '',
          },
        },
        { upsert: true }
      );
      const track = await this.getFullMusicItem(internalId) as TrackOutput;
      return { track };
    } catch (e: any) {
      console.error(`[MusicDiscovery:loadTrack] Caught error: ${e.message}`);
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
      // console.log(`[MusicDiscovery:loadAlbum] Loading album ${externalId}`); // Commented to reduce verbosity
      const spotifyAlbum = await this.spotifyGetAlbum(externalId);
      const internalId = await this.mapAndUpsertMusicItem(spotifyAlbum, "album");

      await this.albums.updateOne(
        { _id: internalId },
        {
          $set: {
            _id: internalId,
            releaseDate: spotifyAlbum.release_date,
            artistExternalId: spotifyAlbum.artists?.[0]?.id ?? '',
            totalTracks: spotifyAlbum.total_tracks ?? 0,
          },
        },
        { upsert: true }
      );
      const album = await this.getFullMusicItem(internalId) as AlbumOutput;
      return { album };
    } catch (e: any) {
      console.error(`[MusicDiscovery:loadAlbum] Caught error: ${e.message}`);
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
      // console.log(`[MusicDiscovery:loadArtist] Loading artist ${externalId}`); // Commented to reduce verbosity
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
      console.error(`[MusicDiscovery:loadArtist] Caught error: ${e.message}`);
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
      // console.log(`[MusicDiscovery:loadAlbumTracks] Loading tracks for album ${albumId}`); // Commented to reduce verbosity
      // Ensure the album itself exists in our system, load it if not
      let albumMusicItem = await this.musicItems.findOne({ externalId: albumId, type: "album" });
      if (!albumMusicItem) {
        // console.log(`[MusicDiscovery:loadAlbumTracks] Album ${albumId} not in cache, attempting to load.`); // Commented to reduce verbosity
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
              durationMs: spotifyTrack.duration_ms ?? 0,
              albumExternalId: albumId, // Link to the `albumId` argument
              artistExternalId: spotifyTrack.artists?.[0]?.id ?? '',
            },
          },
          { upsert: true }
        );
        const track = await this.getFullMusicItem(internalId) as TrackOutput;
        tracksToReturn.push(track);
      }
      return { tracks: tracksToReturn };
    } catch (e: any) {
      console.error(`[MusicDiscovery:loadAlbumTracks] Caught error: ${e.message}`);
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
      // console.log(`[MusicDiscovery:loadArtistAlbums] Loading albums for artist ${artistId}`); // Commented to reduce verbosity
      // Ensure the artist itself exists in our system, load it if not
      let artistMusicItem = await this.musicItems.findOne({ externalId: artistId, type: "artist" });
      let internalArtistId: MusicItemInternal;
      if (!artistMusicItem) {
        // console.log(`[MusicDiscovery:loadArtistAlbums] Artist ${artistId} not in cache, attempting to load.`); // Commented to reduce verbosity
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
              artistExternalId: spotifyAlbum.artists?.[0]?.id ?? '',
              totalTracks: spotifyAlbum.total_tracks ?? 0,
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
      console.error(`[MusicDiscovery:loadArtistAlbums] Caught error: ${e.message}`);
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

### **2. Rewrite `src/musicdiscovery/MusicDiscoveryConcept.test.ts`**

This version:

* Removes `beforeAll`/`afterAll`.
* Adds `const [db, client] = await testDb();` and `await client.close();` to each `Deno.test` block.
* Introduces `assertIsSuccess` and `assertIsError` helpers to make type narrowing concise.
* **Crucially**, modifies the "Principle" test to *find* a track that matches the search query ("Need You Now") instead of assuming it's the first in the results. This makes the test resilient to changes in Spotify's API return order.
* For `loadTrack`/`loadAlbum`/`loadArtist` tests, we still use specific `KNOWN_..._ID`s, but the assertions check if the *name* of the loaded item contains the expected string, rather than implicitly relying on the ID itself.

```typescript
// file: src/musicdiscovery/MusicDiscoveryConcept.test.ts

import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MusicDiscoveryConcept, { TrackOutput, AlbumOutput, ArtistOutput, AlbumDoc, ArtistDoc, MusicItemOutput } from "./MusicDiscoveryConcept.ts";
import { Db, MongoClient } from "npm:mongodb";

// Define a test user ID
const userA = "user:Alice" as ID;
// const userB = "user:Bob" as ID; // Not used in current tests, but kept for example

// Known Spotify IDs for testing direct load actions (these are stable for specific items)
const KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW = "0ofHAoxe9vNKpRtgKpk7M7";
const KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW = "6Jv0f5i14a3KIEbK3P2vsd";
const KNOWN_ARTIST_ID_LADY_A = "3K7vsHh6A4N7f8grvQ5wOq";
const EXPECTED_TRACK_NAME = "Need You Now"; // Expected name for the track
const EXPECTED_ALBUM_NAME = "Need You Now"; // Expected name for the album
const EXPECTED_ARTIST_NAME = "Lady A"; // Expected name for the artist


// Helper function for type assertion when expecting a success result
function assertIsSuccess<T>(
  result: T | { error: string },
  errorMessage?: string,
): asserts result is T {
  if ("error" in result) {
    throw new Error(errorMessage || `Expected success, but received error: ${result.error}`);
  }
}

// Helper function for type assertion when expecting an error result
function assertIsError(
  result: any,
  errorMessage?: string,
): asserts result is { error: string } {
  if (!("error" in result)) {
    throw new Error(errorMessage || `Expected error, but received success.`);
  }
}

Deno.test("MusicDiscovery Principle: User searches, items are cached, search is cleared", async (t) => {
  const [db, client] = await testDb(); // Acquire client per test
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("\n--- MusicDiscovery Principle Test Start ---");

    // Declare dynamically found track variable to be used across steps
    let principleTrack: TrackOutput;
    let principleTrackInternalId: ID;

    await t.step("1. User searches for a track containing 'Need You Now'", async () => {
      console.log(`User ${userA} searches for "${EXPECTED_TRACK_NAME}" (type: track)`);
      const searchResultUnion = await musicDiscovery.search({ user: userA, query: EXPECTED_TRACK_NAME, type: "track" });

      assertIsSuccess(searchResultUnion, `Search for "${EXPECTED_TRACK_NAME}" should succeed.`);
      const searchResult = searchResultUnion; // Type is now narrowed to { items: MusicItemOutput[] }

      assertEquals(searchResult.items.length > 0, true, "Search should return at least one item.");

      // CRITICAL FIX: Find an item that actually contains the expected name in its name
      const foundItem = searchResult.items.find(item => item.name.includes(EXPECTED_TRACK_NAME) && item.type === "track");
      assertExists(foundItem, `Should find a track named '${EXPECTED_TRACK_NAME}' in search results. Found items: ${searchResult.items.map(i => i.name).join(', ')}`);
      
      principleTrack = foundItem as TrackOutput; // Assert it's a TrackOutput
      principleTrackInternalId = principleTrack.id;

      console.log(`Principle Track from searchResult (chosen for assertion): ${principleTrack.name} (ID: ${principleTrack.externalId})`);

      assertExists(principleTrack.id, "Returned item should have an internal ID.");
      assertEquals(principleTrack.type, "track", "Returned item should be of type 'track'.");
      assertEquals(principleTrack.name.includes(EXPECTED_TRACK_NAME), true, `Track name should contain '${EXPECTED_TRACK_NAME}'; is '${principleTrack.name}' instead.`);
      assertExists(principleTrack.durationMs, "Track should have durationMs.");
      assertExists(principleTrack.albumExternalId, "Track should have albumExternalId.");
      assertExists(principleTrack.artistExternalId, "Track should have artistExternalId.");

      // Verify the item is cached in musicItems
      const cachedMusicItem = await musicDiscovery.musicItems.findOne({ externalId: principleTrack.externalId });
      assertExists(cachedMusicItem, "Music item should be cached in the musicItems collection.");
      assertEquals(cachedMusicItem?._id, principleTrackInternalId, "Cached item's internal ID should match.");
      assertEquals(cachedMusicItem?.type, "track");

      // Verify the specific track details are cached
      const cachedTrackDetails = await musicDiscovery.tracks.findOne({ _id: principleTrackInternalId });
      assertExists(cachedTrackDetails, "Track details should be cached in the tracks collection.");
      assertEquals(cachedTrackDetails?.durationMs, principleTrack.durationMs);

      // Verify the user's search results
      const userDoc = await musicDiscovery.users.findOne({ _id: userA });
      assertExists(userDoc, "User document should exist after search.");
      assertArrayIncludes(userDoc?.searchResults || [], [principleTrackInternalId], "User's search results should include the found track.");

      console.log(`Found track: ${principleTrack.name} (Internal ID: ${principleTrackInternalId})`);
    });

    await t.step("2. User queries their search results", async () => {
      console.log(`User ${userA} queries their current search results.`);
      const currentSearchResults = await musicDiscovery._getSearchResults({ user: userA });

      assertEquals(currentSearchResults.length > 0, true, "Query should return items from previous search.");
      // Verify that the principleTrack is among the results
      const queriedPrincipleTrack = currentSearchResults.find(item => item.id === principleTrackInternalId);
      assertExists(queriedPrincipleTrack, `The original searched track '${principleTrack.name}' should be in the current search results.`);
      assertEquals(queriedPrincipleTrack.name.includes(EXPECTED_TRACK_NAME), true, `Queried track name should contain '${EXPECTED_TRACK_NAME}'; is '${queriedPrincipleTrack.name}' instead.`);
      console.log(`Current search results for ${userA}: ${currentSearchResults.map(item => item.name).join(", ")}`);
    });

    await t.step("3. User clears their search results", async () => {
      console.log(`User ${userA} clears their search results.`);
      await musicDiscovery.clearSearch({ user: userA });

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
    await client.close(); // Close client for this specific test
  }
});

Deno.test("Action: search with invalid query or type", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    await t.step("Should return error for empty query", async () => {
      const resultUnion = await musicDiscovery.search({ user: userA, query: "", type: "track" });
      assertIsError(resultUnion, "Expected an error for empty query, but it succeeded.");
      assertEquals(resultUnion.error, "Query cannot be empty.", "Error message mismatch for empty query.");
    });

    await t.step("Should return error for unsupported type", async () => {
      const resultUnion = await musicDiscovery.search({ user: userA, query: "some query", type: "unsupported" });
      assertIsError(resultUnion, "Expected an error for unsupported type.");
      assertEquals(resultUnion.error.includes("Invalid search type"), true, "Error message mismatch for invalid type.");
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadTrack caches track and details", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log(`\nLoading track ${KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW}...`);
    const loadResultUnion = await musicDiscovery.loadTrack({ externalId: KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW });

    assertIsSuccess(loadResultUnion, `Loading track ${KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW} failed unexpectedly.`);
    const { track } = loadResultUnion; // Type is now narrowed by assertIsSuccess
    assertExists(track.id, "Track should have an internal ID.");
    assertEquals(track.externalId, KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW, "External ID should match.");
    assertEquals(track.type, "track", "Loaded item should be of type 'track'.");
    assertEquals(track.name.includes(EXPECTED_TRACK_NAME), true, `Track name should contain '${EXPECTED_TRACK_NAME}'; is '${track.name}' instead.`);
    assertExists(track.durationMs);
    assertExists(track.albumExternalId);
    assertExists(track.artistExternalId);

    // Verify cache consistency
    const cachedItem = await musicDiscovery.musicItems.findOne({ externalId: KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW });
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
    console.log(`\nLoading album ${KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW}...`);
    const loadResultUnion = await musicDiscovery.loadAlbum({ externalId: KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW });

    assertIsSuccess(loadResultUnion, `Loading album ${KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW} failed unexpectedly.`);
    const { album } = loadResultUnion; // Type is now narrowed by assertIsSuccess
    assertExists(album.id, "Album should have an internal ID.");
    assertEquals(album.externalId, KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW, "External ID should match.");
    assertEquals(album.type, "album", "Loaded item should be of type 'album'.");
    assertEquals(album.name.includes(EXPECTED_ALBUM_NAME), true, `Album name should contain '${EXPECTED_ALBUM_NAME}'; is '${album.name}' instead.`);
    assertExists(album.releaseDate);
    assertExists(album.artistExternalId);
    assertExists(album.totalTracks);

    // Verify cache consistency
    const cachedItem = await musicDiscovery.musicItems.findOne({ externalId: KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW });
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
    console.log(`\nLoading artist ${KNOWN_ARTIST_ID_LADY_A}...`);
    const loadResultUnion = await musicDiscovery.loadArtist({ externalId: KNOWN_ARTIST_ID_LADY_A });

    assertIsSuccess(loadResultUnion, `Loading artist ${KNOWN_ARTIST_ID_LADY_A} failed unexpectedly.`);
    const { artist } = loadResultUnion; // Type is now narrowed by assertIsSuccess
    assertExists(artist.id, "Artist should have an internal ID.");
    assertEquals(artist.externalId, KNOWN_ARTIST_ID_LADY_A, "External ID should match.");
    assertEquals(artist.type, "artist", "Loaded item should be of type 'artist'.");
    assertEquals(artist.name.includes(EXPECTED_ARTIST_NAME), true, `Artist name should contain '${EXPECTED_ARTIST_NAME}'; is '${artist.name}' instead.`);
    assertExists(artist.albums, "Artist should have an albums array (even if empty).");

    // Verify cache consistency
    const cachedItem = await musicDiscovery.musicItems.findOne({ externalId: KNOWN_ARTIST_ID_LADY_A });
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
    console.log(`\nLoading tracks for album ${KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW}...`);
    const loadAlbumTracksResultUnion = await musicDiscovery.loadAlbumTracks({ albumId: KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW });

    assertIsSuccess(loadAlbumTracksResultUnion, `Loading album tracks failed unexpectedly.`);
    const { tracks } = loadAlbumTracksResultUnion; // Type is now narrowed by assertIsSuccess
    assertEquals(tracks.length > 0, true, "Should load tracks for the album.");
    assertEquals(tracks[0].type, "track", "Loaded items should be tracks.");
    assertEquals(tracks[0].albumExternalId, KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW, "Track should be linked to the correct album.");

    // Verify some tracks are cached
    const trackCount = await musicDiscovery.tracks.countDocuments({ albumExternalId: KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW });
    assertEquals(trackCount, tracks.length, "All loaded tracks should be cached.");

    console.log(`Successfully loaded ${tracks.length} tracks for album ${KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW}`);

    await t.step("Query: _getTracksByAlbum should retrieve cached tracks", async () => {
      const queriedTracks = await musicDiscovery._getTracksByAlbum({ albumId: KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW });
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
    console.log(`\nLoading albums for artist ${KNOWN_ARTIST_ID_LADY_A}...`);
    const loadArtistAlbumsResultUnion = await musicDiscovery.loadArtistAlbums({ artistId: KNOWN_ARTIST_ID_LADY_A });

    assertIsSuccess(loadArtistAlbumsResultUnion, `Loading artist albums failed unexpectedly.`);
    const { albums } = loadArtistAlbumsResultUnion; // Type is now narrowed by assertIsSuccess
    assertEquals(albums.length > 0, true, "Should load albums for the artist.");
    assertEquals(albums[0].type, "album", "Loaded items should be albums.");
    assertEquals(albums[0].artistExternalId, KNOWN_ARTIST_ID_LADY_A, "Album should be linked to the correct artist.");

    // Verify some albums are cached
    const albumCount = await musicDiscovery.albums.countDocuments({ artistExternalId: KNOWN_ARTIST_ID_LADY_A });
    assertEquals(albumCount > 0, true, "Some albums should be cached.");
    
    // Verify ArtistDoc is updated with album external IDs
    const artistBaseItem = await musicDiscovery.musicItems.findOne({ externalId: KNOWN_ARTIST_ID_LADY_A, type: "artist" });
    assertExists(artistBaseItem);
    const updatedArtistDoc = await musicDiscovery.artists.findOne({ _id: artistBaseItem._id });
    assertExists(updatedArtistDoc);
    assertEquals((updatedArtistDoc as ArtistDoc).albums.length > 0, true, "ArtistDoc should have updated album list.");
    assertArrayIncludes((updatedArtistDoc as ArtistDoc).albums || [], albums.map(a => a.externalId));

    console.log(`Successfully loaded ${albums.length} albums for artist ${KNOWN_ARTIST_ID_LADY_A}`);

    await t.step("Query: _getAlbumsByArtist should retrieve cached albums", async () => {
      const queriedAlbums = await musicDiscovery._getAlbumsByArtist({ artistId: KNOWN_ARTIST_ID_LADY_A });
      assertEquals(queriedAlbums.length > 0, true, "Query should return cached albums for the artist.");
      assertArrayIncludes(queriedAlbums.map(a => a.externalId), albums.map(a => a.externalId));
    });
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getTrack, _getAlbum, _getArtist, _getItem, _getEntityFromId, _getEntityFromUri", async (t) => {
  const [db, client] = await testDb(); // Acquire client per test
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Pre-populate data for queries by calling the load actions
    const trackLoadResult = await musicDiscovery.loadTrack({ externalId: KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW });
    assertIsSuccess(trackLoadResult, `Pre-loading track ${KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW} failed.`);
    const { track } = trackLoadResult;
    
    const albumLoadResult = await musicDiscovery.loadAlbum({ externalId: KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW });
    assertIsSuccess(albumLoadResult, `Pre-loading album ${KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW} failed.`);
    const { album } = albumLoadResult;
    
    const artistLoadResult = await musicDiscovery.loadArtist({ externalId: KNOWN_ARTIST_ID_LADY_A });
    assertIsSuccess(artistLoadResult, `Pre-loading artist ${KNOWN_ARTIST_ID_LADY_A} failed.`);
    const { artist } = artistLoadResult;
    
    const trackUri = track.uri;
    // const albumUri = album.uri; // Not used below, can be removed if not needed for future steps
    // const artistUri = artist.uri; // Not used below

    await t.step("Query: _getTrack should return a specific track by externalId", async () => {
      const tracks = await musicDiscovery._getTrack({ externalId: KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW });
      assertEquals(tracks.length, 1);
      assertEquals(tracks[0].externalId, KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW);
      assertEquals(tracks[0].type, "track");
    });

    await t.step("Query: _getAlbum should return a specific album by externalId", async () => {
      const albums = await musicDiscovery._getAlbum({ externalId: KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW });
      assertEquals(albums.length, 1);
      assertEquals(albums[0].externalId, KNOWN_ALBUM_ID_LADY_A_NEED_YOU_NOW);
      assertEquals(albums[0].type, "album");
    });

    await t.step("Query: _getArtist should return a specific artist by externalId", async () => {
      const artists = await musicDiscovery._getArtist({ externalId: KNOWN_ARTIST_ID_LADY_A });
      assertEquals(artists.length, 1);
      assertEquals(artists[0].externalId, KNOWN_ARTIST_ID_LADY_A);
      assertEquals(artists[0].type, "artist");
    });

    await t.step("Query: _getItem should return a generic MusicItem by externalId", async () => {
      const items = await musicDiscovery._getItem({ externalId: KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW });
      assertEquals(items.length, 1);
      assertEquals(items[0].externalId, KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW);
      assertExists(items[0].type); // Can be any type
    });

    await t.step("Query: _getEntityFromId should return a MusicEntity by externalId", async () => {
      const entities = await musicDiscovery._getEntityFromId({ externalId: KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW });
      assertEquals(entities.length, 1);
      assertEquals(entities[0].externalId, KNOWN_TRACK_ID_LADY_A_NEED_YOU_NOW);
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
    await client.close(); // Close client for this specific test
  }
});
```
