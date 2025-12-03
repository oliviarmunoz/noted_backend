---
timestamp: 'Mon Dec 01 2025 21:03:36 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_210336.185dfb88.md]]'
content_id: baa1f68a26e04bde2301f13a9748f973e5e725aa05025bfca229be629fd11288
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts"; // Import the Spotify service

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

interface MusicItemOutput {
  id: MusicItemInternal;
  externalId: SpotifyExternalId;
  name: string;
  uri: string;
  imageUrl?: string;
  externalUrl?: string;
  type: "track" | "album" | "artist";
}

interface TrackOutput extends MusicItemOutput {
  durationMs: number;
  albumExternalId: SpotifyExternalId;
  artistExternalId: SpotifyExternalId;
}

interface AlbumOutput extends MusicItemOutput {
  releaseDate?: string;
  artistExternalId: SpotifyExternalId;
  totalTracks: number;
}

interface ArtistOutput extends MusicItemOutput {
  albums: SpotifyExternalId[];
}

type MusicEntityOutput = TrackOutput | AlbumOutput | ArtistOutput;


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

  constructor(private readonly db: Db) {
    this.musicItems = this.db.collection(PREFIX + "musicItems");
    this.tracks = this.db.collection(PREFIX + "tracks");
    this.albums = this.db.collection(PREFIX + "albums");
    this.artists = this.db.collection(PREFIX + "artists");
    this.users = this.db.collection(PREFIX + "users");

    // Ensure indexes for efficient lookups by externalId and user searchResults
    this.musicItems.createIndex({ externalId: 1 }, { unique: true });
    this.musicItems.createIndex({ uri: 1 }, { unique: true, sparse: true }); // URI might not always be present or unique in practice
    this.tracks.createIndex({ albumExternalId: 1 });
    this.albums.createIndex({ artistExternalId: 1 });
    this.users.createIndex({ _id: 1 }, { unique: true });
  }

  // Helper to map Spotify API object to MusicItemDoc structure and upsert it.
  // Returns the internal ID of the upserted MusicItem.
  private async mapAndUpsertMusicItem(spotifyItem: any, type: MusicItemDoc["type"]): Promise<MusicItemInternal> {
    const externalId = spotifyItem.id;

    // Find existing item by externalId to reuse internal ID if present
    let musicItemDoc = await this.musicItems.findOne({ externalId });
    let internalId: MusicItemInternal;

    if (musicItemDoc) {
      internalId = musicItemDoc._id;
    } else {
      internalId = freshID(); // Generate a new internal ID if not found
    }

    const newMusicItem: MusicItemDoc = {
      _id: internalId,
      externalId: externalId,
      name: spotifyItem.name,
      uri: spotifyItem.uri,
      imageUrl: spotifyItem.album?.images?.[0]?.url || spotifyItem.images?.[0]?.url, // Handles both track (album.images) and album/artist (images)
      externalUrl: spotifyItem.external_urls?.spotify,
      type: type,
    };

    // Upsert the base music item
    await this.musicItems.updateOne(
      { externalId: externalId }, // Find by externalId for updates
      { $set: newMusicItem, $setOnInsert: { _id: internalId } }, // Set _id only on insert
      { upsert: true }
    );
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
          durationMs: trackDetails?.durationMs,
          albumExternalId: trackDetails?.albumExternalId,
          artistExternalId: trackDetails?.artistExternalId,
        } as TrackOutput;
        break;
      }
      case "album": {
        const albumDetails = await this.albums.findOne({ _id: internalId });
        fullItem = {
          ...baseItem,
          id: baseItem._id,
          releaseDate: albumDetails?.releaseDate,
          artistExternalId: albumDetails?.artistExternalId,
          totalTracks: albumDetails?.totalTracks,
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
      const spotifyResults = await spotifyService.search({ query, type });
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
                _id: internalId,
                durationMs: spotifyItem.duration_ms,
                albumExternalId: spotifyItem.album?.id,
                artistExternalId: spotifyItem.artists?.[0]?.id,
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
                artistExternalId: spotifyItem.artists?.[0]?.id,
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
        { upsert: true }
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
      const spotifyTrack = await spotifyService.getTrack(externalId);
      const internalId = await this.mapAndUpsertMusicItem(spotifyTrack, "track");

      await this.tracks.updateOne(
        { _id: internalId },
        {
          $set: {
            _id: internalId,
            durationMs: spotifyTrack.duration_ms,
            albumExternalId: spotifyTrack.album?.id,
            artistExternalId: spotifyTrack.artists?.[0]?.id,
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
      const spotifyAlbum = await spotifyService.getAlbum(externalId);
      const internalId = await this.mapAndUpsertMusicItem(spotifyAlbum, "album");

      await this.albums.updateOne(
        { _id: internalId },
        {
          $set: {
            _id: internalId,
            releaseDate: spotifyAlbum.release_date,
            artistExternalId: spotifyAlbum.artists?.[0]?.id,
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
      const spotifyArtist = await spotifyService.getArtist(externalId);
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


      const spotifyAlbumTracks = await spotifyService.getAlbumTracks(albumId);
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
              artistExternalId: spotifyTrack.artists?.[0]?.id,
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
      const spotifyArtistAlbums = await spotifyService.getArtistAlbums(artistId);
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
              artistExternalId: artistId, // Link to the artistId passed in
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

```typescript
// file: src/utils/spotify.ts
import "jsr:@std/dotenv/load";

const CLIENT_ID = Deno.env.get("CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("CLIENT_SECRET");

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("CLIENT_ID and CLIENT_SECRET must be set in environment variables");
}

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

/**
 * Spotify API Service
 * Handles authentication and API calls to Spotify Web API
 */
export class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

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
   * Search for tracks, albums, artists, or playlists
   */
  async search(params: SpotifySearchParams) {
    const accessToken = await this.getAccessToken();
    const type = params.type || "track";
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    const url = new URL("https://api.spotify.com/v1/search");
    url.searchParams.set("q", params.query);
    url.searchParams.set("type", type);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search for tracks (convenience method)
   */
  async searchTracks(query: string, limit: number = 20, offset: number = 0) {
    return await this.search({ query, type: "track", limit, offset });
  }

  /**
   * Search for albums (convenience method)
   */
  async searchAlbums(query: string, limit: number = 20, offset: number = 0) {
    return await this.search({ query, type: "album", limit, offset });
  }

  /**
   * Search for artists (convenience method)
   */
  async searchArtists(query: string, limit: number = 20, offset: number = 0) {
    return await this.search({ query, type: "artist", limit, offset });
  }

  /**
   * Search across all types (tracks, albums, artists) simultaneously
   * Perfect for when you don't know what type of music the user is searching for
   */
  async searchAll(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    return await this.search({
      query,
      // type: "track,album,artist",
      limit,
      offset,
    });
  }

  /**
   * Get track information by ID
   */
  async getTrack(trackId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get album information by ID
   */
  async getAlbum(albumId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get artist information by ID
   */
  async getArtist(artistId: string) {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get album tracks by album ID
   * @see https://developer.spotify.com/documentation/web-api/reference/get-an-albums-tracks
   */
  async getAlbumTracks(
    albumId: string,
    options?: { market?: string; limit?: number; offset?: number },
  ) {
    const accessToken = await this.getAccessToken();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const url = new URL(`https://api.spotify.com/v1/albums/${albumId}/tracks`);
    if (options?.market) {
      url.searchParams.set("market", options.market);
    }
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get artist's albums by artist ID
   * @see https://developer.spotify.com/documentation/web-api/reference/get-an-artists-albums
   */
  async getArtistAlbums(
    artistId: string,
    options?: { include_groups?: string; market?: string; limit?: number; offset?: number },
  ) {
    const accessToken = await this.getAccessToken();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const url = new URL(`https://api.spotify.com/v1/artists/${artistId}/albums`);
    if (options?.include_groups) {
      url.searchParams.set("include_groups", options.include_groups);
    }
    if (options?.market) {
      url.searchParams.set("market", options.market);
    }
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Export a singleton instance
export const spotifyService = new SpotifyService();

// Example Spotify Service Calls

// spotifyService.searchAll("Need You Now", 10).then(found_tracks => {
//   console.log("Found song:");
//   console.log(found_tracks.tracks.items[0].name, "by", found_tracks.tracks.items[0].artists[0].name);
//   console.log("Spotify URL:", found_tracks.tracks.items[0].external_urls.spotify);
//   console.log("URI:", found_tracks.tracks.items[0].uri);
//   console.log(found_tracks)
// }).catch(error => {
//   console.error("Test failed:", error);
// });

// const lux = spotifyService.searchAlbums("lux rosalia").then(found_albums => {
//   console.log("Found album:");
//   console.log(found_albums.albums.items[0].name, "by", found_albums.albums.items[0].artists[0].name);
//   const lux_id = found_albums.albums.items[0].id;
//   return lux_id
// })
// spotifyService.getAlbumTracks(await lux).then(found_tracks => {
//   for (const track of found_tracks.items) {
//     console.log("track:");
//     console.log(track.name, "by", track.artists[0].name);
//     console.log("Spotify URL:", track.external_urls.spotify);
//     console.log("URI:", track.uri);
//   }
// })

```
