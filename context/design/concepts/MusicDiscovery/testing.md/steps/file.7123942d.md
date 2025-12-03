---
timestamp: 'Mon Dec 01 2025 23:26:19 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_232619.345da438.md]]'
content_id: 7123942d8f31563cf81ce7fbc26b54f884a1783adaec5da47a7005e342966941
---

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts"; // Import the updated Spotify service

// Declare collection prefix, use concept name
const PREFIX = "MusicDiscovery" + ".";

// Generic type parameter of this concept
type User = ID;

// Internal entity IDs for relationships and references
type MusicItem = ID;

// Unified interface for all music entities in the base 'MusicItems' collection
interface MusicItemDoc {
  _id: MusicItem;
  externalId: string; // e.g., Spotify ID
  name: string;
  uri: string; // e.g., spotify:track:xxxx
  imageUrl?: string; // URL for cover art or artist image
  externalUrl?: string; // URL to Spotify web player
  type: "track" | "album" | "artist"; // Discriminator
  // Common fields
}

// Interfaces for subset collections, extending MusicItemDoc
interface TrackDoc extends MusicItemDoc {
  _id: MusicItem; // Can also be referred to as Track
  type: "track";
  durationMs: number;
  albumId?: MusicItem; // Internal ID link to Album
  artistId?: MusicItem; // Internal ID link to primary Artist
}

interface AlbumDoc extends MusicItemDoc {
  _id: MusicItem; // Can also be referred to as Album
  type: "album";
  releaseDate: string;
  artistId?: MusicItem; // Internal ID link to primary Artist
  totalTracks: number;
}

interface ArtistDoc extends MusicItemDoc {
  _id: MusicItem; // Can also be referred to as Artist
  type: "artist";
  albums?: MusicItem[]; // Internal ID links to Albums by this artist, representing "an Albums set of MusicItems"
}

// User-specific data managed by this concept
interface MusicDiscoveryUserDoc {
  _id: User; // The external User ID
  searchResults: MusicItem[]; // Array of internal MusicItem IDs
}

/**
 * @concept MusicDiscovery [User]
 * @purpose allow users to search for and retrieve specific music entities from a global catalog,
 * creating a persistent local cache of discovered content.
 * @principle a user can search for any kind of music item (track, album, artist), and the music
 * information will be fetched from an external provider; this information will then be stored
 * in a catalog; users may clear their search whenever they desire.
 */
export default class MusicDiscoveryConcept {
  musicItems: Collection<MusicItemDoc>;
  tracks: Collection<TrackDoc>;
  albums: Collection<AlbumDoc>;
  artists: Collection<ArtistDoc>;
  users: Collection<MusicDiscoveryUserDoc>; // To store search results for users

  constructor(private readonly db: Db) {
    this.musicItems = this.db.collection(PREFIX + "musicItems");
    this.tracks = this.db.collection(PREFIX + "tracks");
    this.albums = this.db.collection(PREFIX + "albums");
    this.artists = this.db.collection(PREFIX + "artists");
    this.users = this.db.collection(PREFIX + "users");
  }

  // --- Helper methods for data transformation and upsertion ---

  /**
   * Transforms Spotify API track data into internal TrackDoc and upserts it.
   * Also ensures associated album/artist are processed.
   * @param spotifyTrack - Raw Spotify track object
   * @returns The internal ID of the upserted track.
   */
  private async _upsertTrack(spotifyTrack: any): Promise<MusicItem> {
    if (!spotifyTrack?.id) {
      throw new Error("Invalid Spotify track data: missing ID.");
    }
    const existingTrack = await this.tracks.findOne({ externalId: spotifyTrack.id });
    const trackId: MusicItem = existingTrack ? existingTrack._id : freshID() as MusicItem;

    let albumId: MusicItem | undefined;
    if (spotifyTrack.album) {
      albumId = await this._upsertAlbum(spotifyTrack.album);
    }

    let artistId: MusicItem | undefined;
    if (spotifyTrack.artists && spotifyTrack.artists.length > 0) {
      artistId = await this._upsertArtist(spotifyTrack.artists[0]); // Primary artist
    }

    const trackDoc: TrackDoc = {
      _id: trackId,
      externalId: spotifyTrack.id,
      name: spotifyTrack.name,
      uri: spotifyTrack.uri,
      imageUrl: spotifyTrack.album?.images?.[0]?.url,
      externalUrl: spotifyTrack.external_urls?.spotify,
      type: "track",
      durationMs: spotifyTrack.duration_ms || 0, // Default to 0 if not provided
      albumId: albumId,
      artistId: artistId,
    };

    await this.musicItems.updateOne({ _id: trackId }, { $set: trackDoc }, { upsert: true });
    await this.tracks.updateOne({ _id: trackId }, { $set: trackDoc }, { upsert: true });

    return trackId;
  }

  /**
   * Transforms Spotify API album data into internal AlbumDoc and upserts it.
   * Also ensures associated artist is processed.
   * @param spotifyAlbum - Raw Spotify album object
   * @returns The internal ID of the upserted album.
   */
  private async _upsertAlbum(spotifyAlbum: any): Promise<MusicItem> {
    if (!spotifyAlbum?.id) {
      throw new Error("Invalid Spotify album data: missing ID.");
    }
    const existingAlbum = await this.albums.findOne({ externalId: spotifyAlbum.id });
    const albumId: MusicItem = existingAlbum ? existingAlbum._id : freshID() as MusicItem;

    let artistId: MusicItem | undefined;
    if (spotifyAlbum.artists && spotifyAlbum.artists.length > 0) {
      artistId = await this._upsertArtist(spotifyAlbum.artists[0]); // Primary artist
    }

    const albumDoc: AlbumDoc = {
      _id: albumId,
      externalId: spotifyAlbum.id,
      name: spotifyAlbum.name,
      uri: spotifyAlbum.uri,
      imageUrl: spotifyAlbum.images?.[0]?.url,
      externalUrl: spotifyAlbum.external_urls?.spotify,
      type: "album",
      releaseDate: spotifyAlbum.release_date || "unknown",
      artistId: artistId,
      totalTracks: spotifyAlbum.total_tracks || 0, // Default to 0 if not provided
    };

    await this.musicItems.updateOne({ _id: albumId }, { $set: albumDoc }, { upsert: true });
    await this.albums.updateOne({ _id: albumId }, { $set: albumDoc }, { upsert: true });

    return albumId;
  }

  /**
   * Transforms Spotify API artist data into internal ArtistDoc and upserts it.
   * @param spotifyArtist - Raw Spotify artist object
   * @returns The internal ID of the upserted artist.
   */
  private async _upsertArtist(spotifyArtist: any): Promise<MusicItem> {
    if (!spotifyArtist?.id) {
      throw new Error("Invalid Spotify artist data: missing ID.");
    }
    const existingArtist = await this.artists.findOne({ externalId: spotifyArtist.id });
    const artistId: MusicItem = existingArtist ? existingArtist._id : freshID() as MusicItem;

    const artistDoc: ArtistDoc = {
      _id: artistId,
      externalId: spotifyArtist.id,
      name: spotifyArtist.name,
      uri: spotifyArtist.uri,
      imageUrl: spotifyArtist.images?.[0]?.url,
      externalUrl: spotifyArtist.external_urls?.spotify,
      type: "artist",
      albums: [], // Initialize empty, populated by loadArtistAlbums action
    };

    await this.musicItems.updateOne({ _id: artistId }, { $set: artistDoc }, { upsert: true });
    await this.artists.updateOne({ _id: artistId }, { $set: artistDoc }, { upsert: true });

    return artistId;
  }

  /**
   * Helper to retrieve a generic MusicItem by its internal ID.
   */
  private async _getMusicItemById(musicItemId: MusicItem): Promise<MusicItemDoc | null> {
    return await this.musicItems.findOne({ _id: musicItemId });
  }

  // --- Actions ---

  /**
   * @action search (user: User, query: String, type: String): (items: MusicItem[])
   * @requires `query` is not empty. `type` is one of "track", "album", "artist", or a comma-separated combination.
   * @effects Fetches matches from provider. Upserts items into the `MusicItems` set
   *          (and appropriate subsets based on type), generating internal IDs.
   *          Replaces `user`'s `searchResults` with these internal item IDs. Returns the full `MusicItem` objects.
   */
  async search({ user, query, type }: { user: User; query: string; type: string }): Promise<{ items: MusicItemDoc[] } | { error: string }> {
    if (!query) {
      return { error: "Query cannot be empty." };
    }
    // Basic validation for type, Spotify API handles more complex combinations
    const validTypes = ["track", "album", "artist", "playlist"];
    const typesArray = type.split(",").map(t => t.trim().toLowerCase());
    if (!typesArray.every(t => validTypes.includes(t))) {
      // return { error: `Invalid search type(s): ${type}. Must be one of ${validTypes.join(", ")}.` }; // Simplified check, Spotify is more robust
    }

    let spotifyResults: any;
    try {
      // Use spotifyService.smartSearch for broader searches if type is not specific (i.e. if it's "track,album,artist")
      if (type === "track,album,artist" || type === "all") {
        spotifyResults = await spotifyService.smartSearch(query);
      } else {
        spotifyResults = await spotifyService.search({ query, type });
      }
    } catch (e: unknown) { // Explicitly type 'e' as unknown
      return { error: `Failed to search Spotify: ${(e instanceof Error ? e.message : String(e))}` };
    }

    const upsertedItemIds: MusicItem[] = [];
    const returnedItems: MusicItemDoc[] = [];

    // Process tracks
    if (spotifyResults.tracks?.items) {
      for (const track of spotifyResults.tracks.items) {
        try {
          const trackId = await this._upsertTrack(track);
          const item = await this._getMusicItemById(trackId);
          if (item) returnedItems.push(item);
          upsertedItemIds.push(trackId);
        } catch (e) {
          console.warn(`Failed to upsert track ${track?.id}: ${e}`);
        }
      }
    }

    // Process albums
    if (spotifyResults.albums?.items) {
      for (const album of spotifyResults.albums.items) {
        try {
          const albumId = await this._upsertAlbum(album);
          const item = await this._getMusicItemById(albumId);
          if (item) returnedItems.push(item);
          upsertedItemIds.push(albumId);
        } catch (e) {
          console.warn(`Failed to upsert album ${album?.id}: ${e}`);
        }
      }
    }

    // Process artists
    if (spotifyResults.artists?.items) {
      for (const artist of spotifyResults.artists.items) {
        try {
          const artistId = await this._upsertArtist(artist);
          const item = await this._getMusicItemById(artistId);
          if (item) returnedItems.push(item);
          upsertedItemIds.push(artistId);
        } catch (e) {
          console.warn(`Failed to upsert artist ${artist?.id}: ${e}`);
        }
      }
    }

    // Update user's search results
    await this.users.updateOne(
      { _id: user },
      { $set: { searchResults: upsertedItemIds } },
      { upsert: true },
    );

    return { items: returnedItems };
  }

  /**
   * @action clearSearch (user: User)
   * @effects Removes all items from `user`'s `searchResults`.
   */
  async clearSearch({ user }: { user: User }): Promise<Empty> {
    await this.users.updateOne(
      { _id: user },
      { $set: { searchResults: [] } },
      { upsert: true }, // Ensure user document exists if not already
    );
    return {};
  }

  /**
   * @action loadTrack (externalId: String): (track: MusicItem)
   * @requires `externalId` is a valid track ID from the external provider.
   * @effects Fetches detailed track information from the provider. Upserts the track into `Tracks` subset (and `MusicItems`). Returns the full `Track` object.
   */
  async loadTrack({ externalId }: { externalId: string }): Promise<{ track: TrackDoc } | { error: string }> {
    try {
      const spotifyTrack = await spotifyService.getTrack(externalId);
      const trackId = await this._upsertTrack(spotifyTrack);
      const trackDoc = await this.tracks.findOne({ _id: trackId });
      if (!trackDoc) return { error: "Track not found after upsert." }; // Should not happen
      return { track: trackDoc };
    } catch (e: unknown) { // Explicitly type 'e' as unknown
      return { error: `Failed to load track ${externalId}: ${(e instanceof Error ? e.message : String(e))}` };
    }
  }

  /**
   * @action loadAlbum (externalId: String): (album: MusicItem)
   * @requires `externalId` is a valid album ID from the external provider.
   * @effects Fetches detailed album information from the provider. Upserts the album into `Albums` subset (and `MusicItems`). Returns the full `Album` object.
   */
  async loadAlbum({ externalId }: { externalId: string }): Promise<{ album: AlbumDoc } | { error: string }> {
    try {
      const spotifyAlbum = await spotifyService.getAlbum(externalId);
      const albumId = await this._upsertAlbum(spotifyAlbum);
      const albumDoc = await this.albums.findOne({ _id: albumId });
      if (!albumDoc) return { error: "Album not found after upsert." }; // Should not happen
      return { album: albumDoc };
    } catch (e: unknown) { // Explicitly type 'e' as unknown
      return { error: `Failed to load album ${externalId}: ${(e instanceof Error ? e.message : String(e))}` };
    }
  }

  /**
   * @action loadArtist (externalId: String): (artist: MusicItem)
   * @requires `externalId` is a valid artist ID from the external provider.
   * @effects Fetches detailed artist information from the provider. Upserts the artist into `Artists` subset (and `MusicItems`). Returns the full `Artist` object.
   */
  async loadArtist({ externalId }: { externalId: string }): Promise<{ artist: ArtistDoc } | { error: string }> {
    try {
      const spotifyArtist = await spotifyService.getArtist(externalId);
      const artistId = await this._upsertArtist(spotifyArtist);
      const artistDoc = await this.artists.findOne({ _id: artistId });
      if (!artistDoc) return { error: "Artist not found after upsert." }; // Should not happen
      return { artist: artistDoc };
    } catch (e: unknown) { // Explicitly type 'e' as unknown
      return { error: `Failed to load artist ${externalId}: ${(e instanceof Error ? e.message : String(e))}` };
    }
  }

  /**
   * @action loadAlbumTracks (albumId: MusicItem): (tracks: MusicItem[])
   * @requires `albumId` refers to an existing album in the concept's state.
   * @effects Fetches tracks for the specified album from the provider. Upserts them into `Tracks` subset (and `MusicItems`),
   *          linking them to the `albumId`. Returns the full `Track` objects.
   */
  async loadAlbumTracks({ albumId }: { albumId: MusicItem }): Promise<{ tracks: TrackDoc[] } | { error: string }> {
    const albumDoc = await this.albums.findOne({ _id: albumId });
    if (!albumDoc) {
      return { error: `Album with internal ID ${albumId} not found.` };
    }

    try {
      const spotifyTracksResult = await spotifyService.getAlbumTracks(albumDoc.externalId);
      const upsertedTracks: TrackDoc[] = [];
      for (const spotifyTrack of spotifyTracksResult.items) {
        // The Spotify API's getAlbumTracks returns simplified track objects.
        // We fetch full track details if externalId is present to ensure complete data.
        const fullSpotifyTrack = await spotifyService.getTrack(spotifyTrack.id);
        const trackId = await this._upsertTrack(fullSpotifyTrack);
        const trackDoc = await this.tracks.findOne({ _id: trackId });
        if (trackDoc) upsertedTracks.push(trackDoc);
      }
      return { tracks: upsertedTracks };
    } catch (e: unknown) { // Explicitly type 'e' as unknown
      return { error: `Failed to load tracks for album ${albumId}: ${(e instanceof Error ? e.message : String(e))}` };
    }
  }

  /**
   * @action loadArtistAlbums (artistId: MusicItem): (albums: MusicItem[])
   * @requires `artistId` refers to an existing artist in the concept's state.
   * @effects Fetches albums for the specified artist from the provider. Upserts them into `Albums` subset (and `MusicItems`),
   *          linking them to the `artistId`. Updates the `Artists` record for `artistId` with the new album associations.
   *          Returns the full `Album` objects.
   */
  async loadArtistAlbums({ artistId }: { artistId: MusicItem }): Promise<{ albums: AlbumDoc[] } | { error: string }> {
    const artistDoc = await this.artists.findOne({ _id: artistId });
    if (!artistDoc) {
      return { error: `Artist with internal ID ${artistId} not found.` };
    }

    try {
      const spotifyAlbumsResult = await spotifyService.getArtistAlbums(artistDoc.externalId);
      const upsertedAlbums: AlbumDoc[] = [];
      const albumIds: MusicItem[] = [];

      for (const spotifyAlbum of spotifyAlbumsResult.items) {
        const albumId = await this._upsertAlbum(spotifyAlbum);
        const album = await this.albums.findOne({ _id: albumId });
        if (album) {
          upsertedAlbums.push(album);
          albumIds.push(albumId);
        }
      }

      // Update the artist's document with the albums found
      await this.artists.updateOne(
        { _id: artistId },
        { $set: { albums: albumIds } },
      );

      return { albums: upsertedAlbums };
    } catch (e: unknown) { // Explicitly type 'e' as unknown
      return { error: `Failed to load albums for artist ${artistId}: ${(e instanceof Error ? e.message : String(e))}` };
    }
  }

  // --- Queries ---

  /**
   * @query _getSearchResults (user: User): (items: MusicItem[])
   * @effects Returns the set of `MusicItem` objects currently linked as `searchResults` for the given user.
   */
  async _getSearchResults({ user }: { user: User }): Promise<{ items: MusicItemDoc[] }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc || userDoc.searchResults.length === 0) {
      return { items: [] };
    }
    const items = await this.musicItems.find({ _id: { $in: userDoc.searchResults } }).toArray();
    return { items: items };
  }

  /**
   * @query _getTrack (externalId: String): (track: MusicItem)
   * @effects Returns the `Track` object with the given external ID, if it exists in the concept's state.
   */
  async _getTrack({ externalId }: { externalId: string }): Promise<{ track: TrackDoc }[]> {
    const track = await this.tracks.findOne({ externalId });
    return track ? [{ track }] : [];
  }

  /**
   * @query _getAlbum (externalId: String): (album: MusicItem)
   * @effects Returns the `Album` object with the given external ID, if it exists in the concept's state.
   */
  async _getAlbum({ externalId }: { externalId: string }): Promise<{ album: AlbumDoc }[]> {
    const album = await this.albums.findOne({ externalId });
    return album ? [{ album }] : [];
  }

  /**
   * @query _getArtist (externalId: String): (artist: MusicItem)
   * @effects Returns the `Artist` object with the given external ID, if it exists in the concept's state.
   */
  async _getArtist({ externalId }: { externalId: string }): Promise<{ artist: ArtistDoc }[]> {
    const artist = await this.artists.findOne({ externalId });
    return artist ? [{ artist }] : [];
  }

  /**
   * @query _getTracksByAlbum (albumId: MusicItem): (tracks: MusicItem[])
   * @effects Returns all `Track` objects that are linked to the given `albumId`.
   */
  async _getTracksByAlbum({ albumId }: { albumId: MusicItem }): Promise<{ tracks: TrackDoc[] }> {
    const tracks = await this.tracks.find({ albumId }).toArray();
    return { tracks: tracks };
  }

  /**
   * @query _getAlbumsByArtist (artistId: MusicItem): (albums: MusicItem[])
   * @effects Returns all `Album` objects that are linked to the given `artistId`.
   */
  async _getAlbumsByArtist({ artistId }: { artistId: MusicItem }): Promise<{ albums: AlbumDoc[] }> {
    const albums = await this.albums.find({ artistId }).toArray();
    return { albums: albums };
  }

  /**
   * @query _getItem (externalId: String): (item: MusicItem)
   * @effects Returns the generic `MusicItem` object (track, album, or artist) with the given external ID, if it exists.
   */
  async _getItem({ externalId }: { externalId: string }): Promise<{ item: MusicItemDoc }[]> {
    const item = await this.musicItems.findOne({ externalId });
    return item ? [{ item }] : [];
  }

  /**
   * @query _getEntityFromId (externalId: String): (musicEntity: MusicItem)
   * @effects Returns the generic `MusicItem` object (track, album, or artist) with the given external ID.
   */
  async _getEntityFromId({ externalId }: { externalId: string }): Promise<{ musicEntity: MusicItemDoc }[]> {
    const item = await this.musicItems.findOne({ externalId });
    return item ? [{ musicEntity: item }] : [];
  }

  /**
   * @query _getEntityFromUri (uri: String): (musicEntity: MusicItem)
   * @effects Returns the generic `MusicItem` object (track, album, or artist) with the given URI.
   */
  async _getEntityFromUri({ uri }: { uri: string }): Promise<{ musicEntity: MusicItemDoc }[]> {
    const item = await this.musicItems.findOne({ uri });
    return item ? [{ musicEntity: item }] : [];
  }
}
```

***
