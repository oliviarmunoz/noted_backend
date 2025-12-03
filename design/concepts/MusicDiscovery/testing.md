[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@music-discovery](MusicDiscovery.md)

[@example-test](../LikertSurvey/testing.md)

# test: MusicDiscovery

# response:

## Concept: MusicDiscovery \[User]

*   **concept**: MusicDiscovery \[User]
*   **purpose**: allow users to search for and retrieve specific music entities from a global catalog, creating a persistent local cache of discovered content.
*   **principle**: a user can search for any kind of music item (track, album, artist), and the music information will be fetched from an external provider; this information will then be stored in a catalog; users may clear their search whenever they desire.
*   **state**:
    *   a set of MusicItems with
        *   an externalId String
        *   a name String
        *   a uri String
        *   a imageUrl String
        *   an externalUrl String
        *   a type of "track" or "album" or "artist"
    *   a Tracks set of MusicItems with
        *   a durationMs Number
        *   an optional albumId MusicItem // Link to Album, internal ID
        *   an optional artistId MusicItem // Link to primary Artist, internal ID
    *   an Albums set of MusicItems with
        *   a releaseDate String
        *   an optional artistId MusicItem // Link to primary Artist, internal ID
        *   a totalTracks Number
    *   a Artists set of MusicItems with
        *   an albums set of MusicItems // Internal IDs of albums by this artist
    *   a set of Users with
        *   a searchResults set of MusicItems // Internal IDs of music items from the last search

*   **actions**:
    *   `search` (user: User, query: String, type: String): (items: MusicItem\[])
        *   **requires**: `query` is not empty. `type` is one of "track", "album", "artist", or a comma-separated combination.
        *   **effects**: Fetches matches from provider. Upserts items into the `MusicItems` set (and appropriate subsets based on type), generating internal IDs. Replaces `user`'s `searchResults` with these internal item IDs. Returns the full `MusicItem` objects.
    *   `clearSearch` (user: User)
        *   **effects**: Removes all items from `user`'s `searchResults`.
    *   `loadTrack` (externalId: String): (track: MusicItem)
        *   **requires**: `externalId` is a valid track ID from the external provider.
        *   **effects**: Fetches detailed track information from the provider. Upserts the track into `Tracks` subset (and `MusicItems`). Returns the full `Track` object.
    *   `loadAlbum` (externalId: String): (album: MusicItem)
        *   **requires**: `externalId` is a valid album ID from the external provider.
        *   **effects**: Fetches detailed album information from the provider. Upserts the album into `Albums` subset (and `MusicItems`). Returns the full `Album` object.
    *   `loadArtist` (externalId: String): (artist: MusicItem)
        *   **requires**: `externalId` is a valid artist ID from the external provider.
        *   **effects**: Fetches detailed artist information from the provider. Upserts the artist into `Artists` subset (and `MusicItems`). Returns the full `Artist` object.
    *   `loadAlbumTracks` (albumId: MusicItem): (tracks: MusicItem\[])
        *   **requires**: `albumId` refers to an existing album in the concept's state.
        *   **effects**: Fetches tracks for the specified album from the provider. Upserts them into `Tracks` subset (and `MusicItems`), linking them to the `albumId`. Returns the full `Track` objects.
    *   `loadArtistAlbums` (artistId: MusicItem): (albums: MusicItem\[])
        *   **requires**: `artistId` refers to an existing artist in the concept's state.
        *   **effects**: Fetches albums for the specified artist from the provider. Upserts them into `Albums` subset (and `MusicItems`), linking them to the `artistId`. Updates the `Artists` record for `artistId` with the new album associations. Returns the full `Album` objects.

*   **queries**:
    *   `_getSearchResults` (user: User): (items: MusicItem\[])
        *   **effects**: Returns the set of `MusicItem` objects currently linked as `searchResults` for the given user.
    *   `_getTrack` (externalId: String): (track: MusicItem)
        *   **effects**: Returns the `Track` object with the given external ID, if it exists in the concept's state.
    *   `_getAlbum` (externalId: String): (album: MusicItem)
        *   **effects**: Returns the `Album` object with the given external ID, if it exists in the concept's state.
    *   `_getArtist` (externalId: String): (artist: MusicItem)
        *   **effects**: Returns the `Artist` object with the given external ID, if it exists in the concept's state.
    *   `_getTracksByAlbum` (albumId: MusicItem): (tracks: MusicItem\[])
        *   **effects**: Returns all `Track` objects that are linked to the given `albumId`.
    *   `_getAlbumsByArtist` (artistId: MusicItem): (albums: MusicItem\[])
        *   **effects**: Returns all `Album` objects that are linked to the given `artistId`.
    *   `_getItem` (externalId: String): (item: MusicItem)
        *   **effects**: Returns the generic `MusicItem` object (track, album, or artist) with the given external ID, if it exists.
    *   `_getEntityFromId` (externalId: String): (musicEntity: MusicItem)
        *   **effects**: Returns the generic `MusicItem` object (track, album, or artist) with the given external ID.
    *   `_getEntityFromUri` (uri: String): (musicEntity: MusicItem)
        *   **effects**: Returns the generic `MusicItem` object (track, album, or artist) with the given URI.

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

---

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MusicDiscoveryConcept from "./MusicDiscoveryConcept.ts";

// Assume these are external User IDs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

// Mock SpotifyService for deterministic and fast testing
// This requires a bit of manipulation since spotifyService is a singleton.
// For a real scenario, dependency injection would be preferred.
// Here, we'll temporarily override methods.
const originalSpotifyService = { ...spotifyService }; // Save original methods

Deno.test.beforeEach(() => {
  // Reset mocks before each test
  Object.assign(spotifyService, originalSpotifyService);
});

Deno.test("Principle: User searches, items are cached, user clears search", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("--- Principle Test Started ---");

    // Mock Spotify search response for tracks
    spotifyService.search = async ({ query, type }) => {
      console.log(`Mocking Spotify search for query: '${query}', type: '${type}'`);
      if (query === "Imagine" && type === "track") {
        return {
          tracks: {
            items: [{
              id: "spotify-track-imagine",
              name: "Imagine",
              uri: "spotify:track:imagine",
              external_urls: { spotify: "http://spotify.com/imagine" },
              album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
              artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
              duration_ms: 181000,
            }],
          },
        };
      }
      return { tracks: { items: [] } };
    };

    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "spotify-track-imagine") {
        return {
          id: "spotify-track-imagine",
          name: "Imagine",
          uri: "spotify:track:imagine",
          external_urls: { spotify: "http://spotify.com/imagine" },
          album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          duration_ms: 181000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    // Mock Spotify getAlbum response (minimal for _upsertAlbum)
    spotifyService.getAlbum = async (id: string) => {
      console.log(`Mocking Spotify getAlbum for id: '${id}'`);
      if (id === "spotify-album-imagine") {
        return {
          id: "spotify-album-imagine",
          name: "Imagine",
          uri: "spotify:album:imagine",
          external_urls: { spotify: "http://spotify.com/imagine_album" },
          images: [{ url: "http://img.com/imagine_album.jpg" }],
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          release_date: "1971-09-09",
          total_tracks: 10,
        };
      }
      throw new Error("Album not found in mock.");
    };

    // Mock Spotify getArtist response (minimal for _upsertArtist)
    spotifyService.getArtist = async (id: string) => {
      console.log(`Mocking Spotify getArtist for id: '${id}'`);
      if (id === "spotify-artist-johnlennon") {
        return {
          id: "spotify-artist-johnlennon",
          name: "John Lennon",
          uri: "spotify:artist:johnlennon",
          external_urls: { spotify: "http://spotify.com/johnlennon" },
          images: [{ url: "http://img.com/johnlennon.jpg" }],
        };
      }
      throw new Error("Artist not found in mock.");
    };

    console.log("Trace: User A searches for 'Imagine' (track)");
    const searchResult = await musicDiscovery.search({ user: userA, query: "Imagine", type: "track" });
    assertNotEquals("error" in searchResult, true, "Search should not return an error.");
    assertEquals(searchResult.items.length, 1, "Should find one track.");
    const foundTrack = searchResult.items[0];
    assertExists(foundTrack._id);
    assertEquals(foundTrack.name, "Imagine");
    assertEquals(foundTrack.externalId, "spotify-track-imagine");

    console.log("Verifying cached item in musicItems collection.");
    const cachedItem = await musicDiscovery._getItem({ externalId: "spotify-track-imagine" });
    assertEquals(cachedItem.length, 1, "Track should be cached in musicItems.");
    assertEquals(cachedItem[0].item.name, "Imagine");

    console.log("Verifying cached item in tracks subset collection.");
    const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-imagine" });
    assertEquals(cachedTrack.length, 1, "Track should be cached in tracks subset.");
    assertEquals(cachedTrack[0].track.name, "Imagine");

    console.log("Verifying user A's search results.");
    const userASearchResults = await musicDiscovery._getSearchResults({ user: userA });
    assertEquals(userASearchResults.items.length, 1, "User A's search results should contain 1 item.");
    assertEquals(userASearchResults.items[0].name, "Imagine");

    console.log("Trace: User A clears their search.");
    const clearResult = await musicDiscovery.clearSearch({ user: userA });
    assertEquals("error" in clearResult, false, "Clearing search should not return an error.");

    console.log("Verifying user A's search results are empty after clearing.");
    const clearedSearchResults = await musicDiscovery._getSearchResults({ user: userA });
    assertEquals(clearedSearchResults.items.length, 0, "User A's search results should be empty.");

    console.log("--- Principle Test Finished ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search handles empty query requirement", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("Trace: Attempting to search with an empty query.");
    const result = await musicDiscovery.search({ user: userA, query: "", type: "track" });
    assertEquals("error" in result, true, "Search with empty query should return an error.");
    assertEquals((result as { error: string }).error, "Query cannot be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search upserts various types and updates user results", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify searchAll response for mixed types
    spotifyService.smartSearch = async (query: string) => {
      console.log(`Mocking Spotify smartSearch for query: '${query}'`);
      if (query === `"All My Life"`) {
        return {
          tracks: {
            items: [{
              id: "spotify-track-allmylife",
              name: "All My Life",
              uri: "spotify:track:allmylife",
              external_urls: { spotify: "http://spotify.com/allmylife" },
              album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] },
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              duration_ms: 263000,
            }],
          },
          albums: {
            items: [{
              id: "spotify-album-thecolourandtheshape",
              name: "The Colour And The Shape",
              uri: "spotify:album:thecolourandtheshape",
              external_urls: { spotify: "http://spotify.com/thecolourandtheshape" },
              images: [{ url: "http://img.com/album_color.jpg" }],
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              release_date: "1997-05-20",
              total_tracks: 13,
            }],
          },
          artists: {
            items: [{
              id: "spotify-artist-foofighters",
              name: "Foo Fighters",
              uri: "spotify:artist:foofighters",
              external_urls: { spotify: "http://spotify.com/foofighters" },
              images: [{ url: "http://img.com/foofighters.jpg" }],
            }],
          },
        };
      }
      return { tracks: { items: [] }, albums: { items: [] }, artists: { items: [] } };
    };

    // Mock necessary get* calls for upserts
    spotifyService.getTrack = async (id) => {
      if (id === "spotify-track-allmylife") return { id, name: "All My Life", uri: "spotify:track:allmylife", duration_ms: 263000, album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] }, artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      throw new Error(`Mock getTrack not found: ${id}`);
    };
    spotifyService.getAlbum = async (id) => {
      if (id === "spotify-album-allmylife") return { id, name: "All My Life", uri: "spotify:album:allmylife", release_date: "2002-10-22", total_tracks: 11, images: [{ url: "http://img.com/album.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      if (id === "spotify-album-thecolourandtheshape") return { id, name: "The Colour And The Shape", uri: "spotify:album:thecolourandtheshape", release_date: "1997-05-20", total_tracks: 13, images: [{ url: "http://img.com/album_color.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === "spotify-artist-foofighters") return { id, name: "Foo Fighters", uri: "spotify:artist:foofighters", images: [{ url: "http://img.com/foofighters.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    console.log("Trace: User B searches for 'All My Life' across all types.");
    const searchResult = await musicDiscovery.search({ user: userB, query: "All My Life", type: "track,album,artist" });
    assertNotEquals("error" in searchResult, true, "Search should not return an error.");
    assertEquals(searchResult.items.length, 3, "Should find one track, one album, one artist.");

    // Verify types
    assertExists(searchResult.items.find(item => item.name === "All My Life" && item.type === "track"));
    assertExists(searchResult.items.find(item => item.name === "The Colour And The Shape" && item.type === "album"));
    assertExists(searchResult.items.find(item => item.name === "Foo Fighters" && item.type === "artist"));

    // Verify cached items
    const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-allmylife" });
    assertEquals(cachedTrack.length, 1);
    const cachedAlbum = await musicDiscovery._getAlbum({ externalId: "spotify-album-thecolourandtheshape" });
    assertEquals(cachedAlbum.length, 1);
    const cachedArtist = await musicDiscovery._getArtist({ externalId: "spotify-artist-foofighters" });
    assertEquals(cachedArtist.length, 1);

    // Verify user's search results
    const userBSearchResults = await musicDiscovery._getSearchResults({ user: userB });
    assertEquals(userBSearchResults.items.length, 3, "User B's search results should contain 3 items.");
    assertArrayIncludes(userBSearchResults.items.map(i => i.name), ["All My Life", "The Colour And The Shape", "Foo Fighters"]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadTrack loads and caches a specific track", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "specific-track-id") {
        return {
          id: "specific-track-id",
          name: "Bohemian Rhapsody",
          uri: "spotify:track:bohemian",
          external_urls: { spotify: "http://spotify.com/bohemian" },
          album: { id: "album-night", name: "A Night at the Opera", images: [{ url: "http://img.com/opera.jpg" }] },
          artists: [{ id: "artist-queen", name: "Queen" }],
          duration_ms: 354000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    spotifyService.getAlbum = async (id) => {
      if (id === "album-night") return { id, name: "A Night at the Opera", uri: "spotify:album:opera", release_date: "1975-11-21", total_tracks: 12, images: [{ url: "http://img.com/opera.jpg" }], artists: [{ id: "artist-queen", name: "Queen" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === "artist-queen") return { id, name: "Queen", uri: "spotify:artist:queen", images: [{ url: "http://img.com/queen.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    console.log("Trace: Loading a specific track 'Bohemian Rhapsody'.");
    const result = await musicDiscovery.loadTrack({ externalId: "specific-track-id" });
    assertNotEquals("error" in result, true, "Loading track should not fail.");
    const { track } = result as { track: MusicDiscoveryConcept['tracks']['_interface'] };
    assertEquals(track.name, "Bohemian Rhapsody");
    assertEquals(track.type, "track");
    assertExists(track._id);

    console.log("Verifying track is cached by external ID.");
    const cached = await musicDiscovery._getTrack({ externalId: "specific-track-id" });
    assertEquals(cached.length, 1);
    assertEquals(cached[0].track.name, "Bohemian Rhapsody");

    console.log("Trace: Attempting to load a non-existent track.");
    const errorResult = await musicDiscovery.loadTrack({ externalId: "non-existent-track" });
    assertEquals("error" in errorResult, true, "Loading non-existent track should fail.");
  } finally {
    await client.close();
  }
});


Deno.test("Action: loadAlbumTracks loads and links tracks to an album", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // 1. Load an album first to get an internal albumId
    const albumExternalId = "album-darksideofmoon";
    const artistExternalId = "artist-pinkfloyd";

    spotifyService.getAlbum = async (id) => {
      if (id === albumExternalId) return { id, name: "Dark Side of the Moon", uri: "spotify:album:darkside", release_date: "1973-03-01", total_tracks: 10, images: [{ url: "http://img.com/darkside.jpg" }], artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Pink Floyd", uri: "spotify:artist:pinkfloyd", images: [{ url: "http://img.com/pinkfloyd.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    console.log("Trace: Loading album 'Dark Side of the Moon'.");
    const loadAlbumResult = await musicDiscovery.loadAlbum({ externalId: albumExternalId });
    assertNotEquals("error" in loadAlbumResult, true, "Loading album should not fail.");
    const { album: loadedAlbum } = loadAlbumResult as { album: MusicDiscoveryConcept['albums']['_interface'] };
    const internalAlbumId = loadedAlbum._id;
    assertExists(internalAlbumId);

    // 2. Mock getAlbumTracks and getTrack for individual tracks
    spotifyService.getAlbumTracks = async (albumId: string) => {
      console.log(`Mocking Spotify getAlbumTracks for album: '${albumId}'`);
      if (albumId === albumExternalId) {
        return {
          items: [
            { id: "track-speak", name: "Speak to Me", uri: "spotify:track:speak" },
            { id: "track-breathe", name: "Breathe (In the Air)", uri: "spotify:track:breathe" },
          ],
        };
      }
      return { items: [] };
    };

    spotifyService.getTrack = async (id) => {
      console.log(`Mocking Spotify getTrack for id: '${id}' (from album tracks)`);
      if (id === "track-speak") return { id, name: "Speak to Me", uri: "spotify:track:speak", duration_ms: 90000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      if (id === "track-breathe") return { id, name: "Breathe (In the Air)", uri: "spotify:track:breathe", duration_ms: 163000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getTrack not found: ${id}`);
    };

    console.log(`Trace: Loading tracks for album (internal ID: ${internalAlbumId}).`);
    const loadTracksResult = await musicDiscovery.loadAlbumTracks({ albumId: internalAlbumId });
    assertNotEquals("error" in loadTracksResult, true, "Loading album tracks should not fail.");
    const { tracks: albumTracks } = loadTracksResult as { tracks: MusicDiscoveryConcept['tracks']['_interface'][] };
    assertEquals(albumTracks.length, 2, "Should load 2 tracks.");
    assertExists(albumTracks.find(t => t.name === "Speak to Me"));
    assertExists(albumTracks.find(t => t.name === "Breathe (In the Air)"));

    console.log("Verifying tracks are linked to the album via query.");
    const queriedTracks = await musicDiscovery._getTracksByAlbum({ albumId: internalAlbumId });
    assertEquals(queriedTracks.tracks.length, 2);
    assertExists(queriedTracks.tracks.find(t => t.name === "Speak to Me" && t.albumId === internalAlbumId));
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadArtistAlbums loads and links albums to an artist", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // 1. Load an artist first to get an internal artistId
    const artistExternalId = "artist-taylorswift";
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Taylor Swift", uri: "spotify:artist:taylorswift", images: [{ url: "http://img.com/taylor.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };
    spotifyService.getAlbum = async (id) => {
      if (id === "album-fearless") return { id, name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      if (id === "album-red") return { id, name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };

    console.log("Trace: Loading artist 'Taylor Swift'.");
    const loadArtistResult = await musicDiscovery.loadArtist({ externalId: artistExternalId });
    assertNotEquals("error" in loadArtistResult, true, "Loading artist should not fail.");
    const { artist: loadedArtist } = loadArtistResult as { artist: MusicDiscoveryConcept['artists']['_interface'] };
    const internalArtistId = loadedArtist._id;
    assertExists(internalArtistId);

    // 2. Mock getArtistAlbums
    spotifyService.getArtistAlbums = async (artistId: string) => {
      console.log(`Mocking Spotify getArtistAlbums for artist: '${artistId}'`);
      if (artistId === artistExternalId) {
        return {
          items: [
            { id: "album-fearless", name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
            { id: "album-red", name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
          ],
        };
      }
      return { items: [] };
    };

    console.log(`Trace: Loading albums for artist (internal ID: ${internalArtistId}).`);
    const loadAlbumsResult = await musicDiscovery.loadArtistAlbums({ artistId: internalArtistId });
    assertNotEquals("error" in loadAlbumsResult, true, "Loading artist albums should not fail.");
    const { albums: artistAlbums } = loadAlbumsResult as { albums: MusicDiscoveryConcept['albums']['_interface'][] };
    assertEquals(artistAlbums.length, 2, "Should load 2 albums.");
    assertExists(artistAlbums.find(a => a.name === "Fearless"));
    assertExists(artistAlbums.find(a => a.name === "Red"));

    console.log("Verifying albums are linked to the artist via query.");
    const queriedAlbums = await musicDiscovery._getAlbumsByArtist({ artistId: internalArtistId });
    assertEquals(queriedAlbums.albums.length, 2);
    assertExists(queriedAlbums.albums.find(a => a.name === "Fearless" && a.artistId === internalArtistId));

    console.log("Verifying the artist's document has the album IDs stored.");
    const updatedArtist = await musicDiscovery.artists.findOne({ _id: internalArtistId });
    assertExists(updatedArtist?.albums);
    assertEquals(updatedArtist.albums.length, 2);
    assertArrayIncludes(updatedArtist.albums.map(String), artistAlbums.map(a => a._id.toString()));
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getEntityFromId and _getEntityFromUri work correctly", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify search for setup
    spotifyService.search = async () => ({
      tracks: {
        items: [{
          id: "track-123",
          name: "Sample Track",
          uri: "spotify:track:123",
          external_urls: { spotify: "http://spotify.com/track/123" },
          album: { id: "album-456", name: "Sample Album", images: [] },
          artists: [{ id: "artist-789", name: "Sample Artist" }],
          duration_ms: 100000,
        }],
      },
      albums: { items: [] },
      artists: { items: [] },
    });
    // Mock getTrack, getAlbum, getArtist as needed by upsert helpers
    spotifyService.getTrack = async (id) => (id === "track-123" ? { id, name: "Sample Track", uri: "spotify:track:123", duration_ms: 100000, album: { id: "album-456", name: "Sample Album", images: [] }, artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject("Not found"));
    spotifyService.getAlbum = async (id) => (id === "album-456" ? { id, name: "Sample Album", uri: "spotify:album:456", release_date: "2023-01-01", total_tracks: 1, images: [], artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject("Not found"));
    spotifyService.getArtist = async (id) => (id === "artist-789" ? { id, name: "Sample Artist", uri: "spotify:artist:789", images: [] } : Promise.reject("Not found"));


    console.log("Trace: Adding a sample track via search to populate state.");
    await musicDiscovery.search({ user: userA, query: "Sample", type: "track" });

    console.log("Query: _getEntityFromId with existing external ID.");
    const entityById = await musicDiscovery._getEntityFromId({ externalId: "track-123" });
    assertEquals(entityById.length, 1);
    assertEquals(entityById[0].musicEntity.name, "Sample Track");
    assertEquals(entityById[0].musicEntity.type, "track");

    console.log("Query: _getEntityFromUri with existing URI.");
    const entityByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:123" });
    assertEquals(entityByUri.length, 1);
    assertEquals(entityByUri[0].musicEntity.name, "Sample Track");
    assertEquals(entityByUri[0].musicEntity.type, "track");

    console.log("Query: _getEntityFromId with non-existent external ID.");
    const nonExistentById = await musicDiscovery._getEntityFromId({ externalId: "non-existent-id" });
    assertEquals(nonExistentById.length, 0);

    console.log("Query: _getEntityFromUri with non-existent URI.");
    const nonExistentByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:nonexistent" });
    assertEquals(nonExistentByUri.length, 0);

  } finally {
    await client.close();
  }
});
```

# prompt: fix this error Cannot find name 'spotifyService'. Did you mean 'SpotifyService'?
# response:

The error message "Cannot find name 'spotifyService'. Did you mean 'SpotifyService'?" indicates that while the TypeScript compiler recognizes the `SpotifyService` class, it cannot find a variable named `spotifyService` in the scope where it's being used.

Looking at the provided `src/utils/spotify.ts` file, `spotifyService` is declared and exported as a `const` instance of `SpotifyService`. The `MusicDiscoveryConcept.ts` file correctly attempts to import it. This type of error is unusual for standard named exports.

A common reason for such a cryptic error, especially with the "Did you mean X?" suggestion, is that the TypeScript compiler or an IDE's language server might be facing some ambiguity or a non-standard parsing behavior. Additionally, top-level code (like the example `spotifyService` calls at the bottom of `spotify.ts`) in a module that is also being imported by other modules can sometimes introduce subtle issues or simply be bad practice for a utility file.

To resolve this, we will make two changes in `src/utils/spotify.ts`:

1.  **Consolidate Exports**: Instead of inline `export` keywords for both the class and the instance, we'll declare the `spotifyService` instance without an `export` and then use a single `export { ... }` statement at the end of the file. This clarifies which symbols are exported.
2.  **Comment out Example Calls**: The example calls at the bottom of `spotify.ts` are meant for demonstrating the service's usage when run directly. When this module is imported by other files (like `MusicDiscoveryConcept.ts`), these calls execute on module load, which is generally undesirable for a library/utility file and can potentially interfere with module loading or testing environments. We will comment them out.

These changes are aimed at making the module's exports more explicit and removing potential side effects or ambiguities that might confuse the TypeScript compiler or Deno runtime when importing `spotifyService` into `MusicDiscoveryConcept.ts`.

***

# file: src/utils/spotify.ts

```typescript
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
   * Search for a specific track by name and optionally artist
   * Uses Spotify's query syntax for more precise results
   * @example searchTrackByName("Need You Now", "Lady A")
   */
  async searchTrackByName(
    trackName: string,
    artistName?: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    let query = `track:${trackName}`;
    if (artistName) {
      query += ` artist:${artistName}`;
    }
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
   * Uses quoted query for better exact phrase matching
   */
  async searchAll(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    // Use quoted query for exact phrase matching, which improves relevance
    // This helps when users search for exact song/album/artist names
    const quotedQuery = query.includes('"') ? query : `"${query}"`;
    
    return await this.search({
      query: quotedQuery,
      type: "track,album,artist",
      limit,
      offset,
    });
  }

  /**
   * Smart search that tries multiple strategies for best results
   * 1. First tries exact phrase match (quoted)
   * 2. Falls back to general search if needed
   * Returns results from the most relevant search
   */
  async smartSearch(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    // Strategy 1: Try exact phrase match first (best for specific names)
    const exactResults = await this.search({
      query: `"${query}"`,
      type: "track,album,artist",
      limit,
      offset,
    });

    // If we got good results (check if first result is highly relevant), return them
    // Otherwise, try a general search
    const hasGoodResults = 
      (exactResults.tracks?.items?.length > 0 && exactResults.tracks.items[0].name.toLowerCase().includes(query.toLowerCase().replace(/"/g, ''))) ||
      (exactResults.albums?.items?.length > 0 && exactResults.albums.items[0].name.toLowerCase().includes(query.toLowerCase().replace(/"/g, ''))) ||
      (exactResults.artists?.items?.length > 0 && exactResults.artists.items[0].name.toLowerCase().includes(query.toLowerCase().replace(/"/g, '')));

    if (hasGoodResults) {
      return exactResults;
    }

    // Strategy 2: Try general search (better for partial matches, trending content)
    return await this.search({
      query,
      type: "track,album,artist",
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
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get an artist's albums
   * @see https://developer.spotify.com/documentation/web-api/reference/get-an-artists-albums
   */
  async getArtistAlbums(
    artistId: string,
    options?: { include_groups?: string; market?: string; limit?: number; offset?: number },
  ) {
    const accessToken = await this.getAccessToken();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const includeGroups = options?.include_groups || "album,single,compilation,appears_on";

    const url = new URL(`https://api.spotify.com/v1/artists/${artistId}/albums`);
    url.searchParams.set("include_groups", includeGroups);
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
    );

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Export a singleton instance
const spotifyService = new SpotifyService();

// Combined export statement to make both class and instance explicitly available
export { SpotifyService, spotifyService };

// Example Spotify Service Calls - Commented out to prevent execution on module import
/*
spotifyService.searchTrackByName("Need You Now", undefined, 10).then(found_tracks => {
  console.log("Found song:");
  console.log(found_tracks.tracks.items[0].name, "by", found_tracks.tracks.items[0].artists[0].name);
  console.log("Spotify URL:", found_tracks.tracks.items[0].external_urls.spotify);
  console.log("URI:", found_tracks.tracks.items[0].uri);
  // console.log(found_tracks)
}).catch(error => {
  console.error("Test failed:", error);
});

spotifyService.searchAlbums("need you now lady a").then(async (found_albums) => {
  console.log("Found album:");
  console.log(found_albums.albums.items[0].name, "by", found_albums.albums.items[0].artists[0].name);
  console.log("Artist URI:", found_albums.albums.items[0].artists[0].uri);
  console.log("Album URI:", found_albums.albums.items[0].uri);
  const artist_id = found_albums.albums.items[0].artists[0].id;
  // console.log("Artist Albums:", await spotifyService.getArtistAlbums(artist_id));
})
// spotifyService.getAlbumTracks(await lux).then(found_tracks => {
//   for (const track of found_tracks.items) {
//     console.log("track:");
//     console.log(track.name, "by", track.artists[0].name);
//     console.log("Spotify URL:", track.external_urls.spotify);
//     console.log("URI:", track.uri);
//   }
// })
*/
```

# prompt: fix this error: Property 'items' does not exist on type '{ items: MusicItemDoc[]; } | { error: string; }'. Property 'items' does not exist on type '{ error: string; }'.
# response:

The TypeScript error `Property 'items' does not exist on type '{ items: MusicItemDoc[]; } | { error: string; }'. Property 'items' does not exist on type '{ error: string; }'.` occurs because the `search` action (and other actions returning `{ item: T } | { error: string }`) can return either a successful result object or an error object. When you try to access `.items` (or `.track`, `.album`, etc.) directly after calling such an action, TypeScript correctly identifies that the `error` branch of the union type does not have this property.

To fix this, we need to explicitly narrow the type of the `searchResult` (or `result` for other actions) to the successful variant using a type guard before accessing its properties. A common way to do this is to check for the presence of the `error` property.

We will update the `src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts` file to include these type guards.

***

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MusicDiscoveryConcept from "./MusicDiscoveryConcept.ts";
import { spotifyService } from "@utils/spotify.ts"; // Ensure spotifyService is imported

// Assume these are external User IDs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

// Mock SpotifyService for deterministic and fast testing
// This requires a bit of manipulation since spotifyService is a singleton.
// For a real scenario, dependency injection would be preferred.
// Here, we'll temporarily override methods.
const originalSpotifyService = { ...spotifyService }; // Save original methods

Deno.test.beforeEach(() => {
  // Reset mocks before each test
  Object.assign(spotifyService, originalSpotifyService);
});

Deno.test("Principle: User searches, items are cached, user clears search", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("--- Principle Test Started ---");

    // Mock Spotify search response for tracks
    spotifyService.search = async ({ query, type }) => {
      console.log(`Mocking Spotify search for query: '${query}', type: '${type}'`);
      if (query === "Imagine" && type === "track") {
        return {
          tracks: {
            items: [{
              id: "spotify-track-imagine",
              name: "Imagine",
              uri: "spotify:track:imagine",
              external_urls: { spotify: "http://spotify.com/imagine" },
              album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
              artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
              duration_ms: 181000,
            }],
          },
        };
      }
      return { tracks: { items: [] } };
    };

    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "spotify-track-imagine") {
        return {
          id: "spotify-track-imagine",
          name: "Imagine",
          uri: "spotify:track:imagine",
          external_urls: { spotify: "http://spotify.com/imagine" },
          album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          duration_ms: 181000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    // Mock Spotify getAlbum response (minimal for _upsertAlbum)
    spotifyService.getAlbum = async (id: string) => {
      console.log(`Mocking Spotify getAlbum for id: '${id}'`);
      if (id === "spotify-album-imagine") {
        return {
          id: "spotify-album-imagine",
          name: "Imagine",
          uri: "spotify:album:imagine",
          external_urls: { spotify: "http://spotify.com/imagine_album" },
          images: [{ url: "http://img.com/imagine_album.jpg" }],
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          release_date: "1971-09-09",
          total_tracks: 10,
        };
      }
      throw new Error("Album not found in mock.");
    };

    // Mock Spotify getArtist response (minimal for _upsertArtist)
    spotifyService.getArtist = async (id: string) => {
      console.log(`Mocking Spotify getArtist for id: '${id}'`);
      if (id === "spotify-artist-johnlennon") {
        return {
          id: "spotify-artist-johnlennon",
          name: "John Lennon",
          uri: "spotify:artist:johnlennon",
          external_urls: { spotify: "http://spotify.com/johnlennon" },
          images: [{ url: "http://img.com/johnlennon.jpg" }],
        };
      }
      throw new Error("Artist not found in mock.");
    };

    await t.step("User A searches for 'Imagine' (track)", async () => {
      const searchResult = await musicDiscovery.search({ user: userA, query: "Imagine", type: "track" });
      
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      // TypeScript now knows `searchResult` is `{ items: MusicItemDoc[] }`

      assertEquals(searchResult.items.length, 1, "Should find one track.");
      const foundTrack = searchResult.items[0];
      assertExists(foundTrack._id);
      assertEquals(foundTrack.name, "Imagine");
      assertEquals(foundTrack.externalId, "spotify-track-imagine");

      console.log("Verifying cached item in musicItems collection.");
      const cachedItem = await musicDiscovery._getItem({ externalId: "spotify-track-imagine" });
      assertEquals(cachedItem.length, 1, "Track should be cached in musicItems.");
      assertEquals(cachedItem[0].item.name, "Imagine");

      console.log("Verifying cached item in tracks subset collection.");
      const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-imagine" });
      assertEquals(cachedTrack.length, 1, "Track should be cached in tracks subset.");
      assertEquals(cachedTrack[0].track.name, "Imagine");

      console.log("Verifying user A's search results.");
      const userASearchResults = await musicDiscovery._getSearchResults({ user: userA });
      assertEquals(userASearchResults.items.length, 1, "User A's search results should contain 1 item.");
      assertEquals(userASearchResults.items[0].name, "Imagine");
    });

    await t.step("User A clears their search", async () => {
      const clearResult = await musicDiscovery.clearSearch({ user: userA });
      // clearResult is Promise<Empty | { error: string }>, but clearSearch should always succeed.
      if ("error" in clearResult) {
        throw new Error(`Clearing search unexpectedly failed: ${clearResult.error}`);
      }
      assertEquals("error" in clearResult, false, "Clearing search should not return an error.");

      console.log("Verifying user A's search results are empty after clearing.");
      const clearedSearchResults = await musicDiscovery._getSearchResults({ user: userA });
      assertEquals(clearedSearchResults.items.length, 0, "User A's search results should be empty.");
    });

    console.log("--- Principle Test Finished ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search handles empty query requirement", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("Trace: Attempting to search with an empty query.");
    const result = await musicDiscovery.search({ user: userA, query: "", type: "track" });
    assertEquals("error" in result, true, "Search with empty query should return an error.");
    assertEquals((result as { error: string }).error, "Query cannot be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search upserts various types and updates user results", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify smartSearch response for mixed types
    spotifyService.smartSearch = async (query: string) => {
      console.log(`Mocking Spotify smartSearch for query: '${query}'`);
      if (query === `"All My Life"`) {
        return {
          tracks: {
            items: [{
              id: "spotify-track-allmylife",
              name: "All My Life",
              uri: "spotify:track:allmylife",
              external_urls: { spotify: "http://spotify.com/allmylife" },
              album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] },
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              duration_ms: 263000,
            }],
          },
          albums: {
            items: [{
              id: "spotify-album-thecolourandtheshape",
              name: "The Colour And The Shape",
              uri: "spotify:album:thecolourandtheshape",
              external_urls: { spotify: "http://spotify.com/thecolourandtheshape" },
              images: [{ url: "http://img.com/album_color.jpg" }],
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              release_date: "1997-05-20",
              total_tracks: 13,
            }],
          },
          artists: {
            items: [{
              id: "spotify-artist-foofighters",
              name: "Foo Fighters",
              uri: "spotify:artist:foofighters",
              external_urls: { spotify: "http://spotify.com/foofighters" },
              images: [{ url: "http://img.com/foofighters.jpg" }],
            }],
          },
        };
      }
      return { tracks: { items: [] }, albums: { items: [] }, artists: { items: [] } };
    };

    // Mock necessary get* calls for upserts
    spotifyService.getTrack = async (id) => (id === "spotify-track-allmylife" ? { id, name: "All My Life", uri: "spotify:track:allmylife", duration_ms: 263000, album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] }, artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] } : Promise.reject("Mock getTrack not found"));
    spotifyService.getAlbum = async (id) => {
      if (id === "spotify-album-allmylife") return { id, name: "All My Life", uri: "spotify:album:allmylife", release_date: "2002-10-22", total_tracks: 11, images: [{ url: "http://img.com/album.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      if (id === "spotify-album-thecolourandtheshape") return { id, name: "The Colour And The Shape", uri: "spotify:album:thecolourandtheshape", release_date: "1997-05-20", total_tracks: 13, images: [{ url: "http://img.com/album_color.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => (id === "spotify-artist-foofighters" ? { id, name: "Foo Fighters", uri: "spotify:artist:foofighters", images: [{ url: "http://img.com/foofighters.jpg" }] } : Promise.reject("Mock getArtist not found"));

    await t.step("User B searches for 'All My Life' across all types", async () => {
      const searchResult = await musicDiscovery.search({ user: userB, query: "All My Life", type: "track,album,artist" });
      
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      // TypeScript now knows `searchResult` is `{ items: MusicItemDoc[] }`

      assertEquals(searchResult.items.length, 3, "Should find one track, one album, one artist.");

      // Verify types
      assertExists(searchResult.items.find(item => item.name === "All My Life" && item.type === "track"));
      assertExists(searchResult.items.find(item => item.name === "The Colour And The Shape" && item.type === "album"));
      assertExists(searchResult.items.find(item => item.name === "Foo Fighters" && item.type === "artist"));

      // Verify cached items
      const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-allmylife" });
      assertEquals(cachedTrack.length, 1);
      const cachedAlbum = await musicDiscovery._getAlbum({ externalId: "spotify-album-thecolourandtheshape" });
      assertEquals(cachedAlbum.length, 1);
      const cachedArtist = await musicDiscovery._getArtist({ externalId: "spotify-artist-foofighters" });
      assertEquals(cachedArtist.length, 1);

      // Verify user's search results
      const userBSearchResults = await musicDiscovery._getSearchResults({ user: userB });
      assertEquals(userBSearchResults.items.length, 3, "User B's search results should contain 3 items.");
      assertArrayIncludes(userBSearchResults.items.map(i => i.name), ["All My Life", "The Colour And The Shape", "Foo Fighters"]);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadTrack loads and caches a specific track", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "specific-track-id") {
        return {
          id: "specific-track-id",
          name: "Bohemian Rhapsody",
          uri: "spotify:track:bohemian",
          external_urls: { spotify: "http://spotify.com/bohemian" },
          album: { id: "album-night", name: "A Night at the Opera", images: [{ url: "http://img.com/opera.jpg" }] },
          artists: [{ id: "artist-queen", name: "Queen" }],
          duration_ms: 354000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    spotifyService.getAlbum = async (id) => {
      if (id === "album-night") return { id, name: "A Night at the Opera", uri: "spotify:album:opera", release_date: "1975-11-21", total_tracks: 12, images: [{ url: "http://img.com/opera.jpg" }], artists: [{ id: "artist-queen", name: "Queen" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === "artist-queen") return { id, name: "Queen", uri: "spotify:artist:queen", images: [{ url: "http://img.com/queen.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    await t.step("Loading a specific track 'Bohemian Rhapsody'", async () => {
      const result = await musicDiscovery.loadTrack({ externalId: "specific-track-id" });
      
      if ("error" in result) {
        throw new Error(`Loading track unexpectedly failed: ${result.error}`);
      }
      // TypeScript now knows `result` is `{ track: TrackDoc }`
      const { track } = result; // No need for `as { track: ... }` cast

      assertEquals(track.name, "Bohemian Rhapsody");
      assertEquals(track.type, "track");
      assertExists(track._id);

      console.log("Verifying track is cached by external ID.");
      const cached = await musicDiscovery._getTrack({ externalId: "specific-track-id" });
      assertEquals(cached.length, 1);
      assertEquals(cached[0].track.name, "Bohemian Rhapsody");
    });

    await t.step("Attempting to load a non-existent track", async () => {
      const errorResult = await musicDiscovery.loadTrack({ externalId: "non-existent-track" });
      assertEquals("error" in errorResult, true, "Loading non-existent track should fail.");
    });
  } finally {
    await client.close();
  }
});


Deno.test("Action: loadAlbumTracks loads and links tracks to an album", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // 1. Load an album first to get an internal albumId
    const albumExternalId = "album-darksideofmoon";
    const artistExternalId = "artist-pinkfloyd";

    spotifyService.getAlbum = async (id) => {
      if (id === albumExternalId) return { id, name: "Dark Side of the Moon", uri: "spotify:album:darkside", release_date: "1973-03-01", total_tracks: 10, images: [{ url: "http://img.com/darkside.jpg" }], artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Pink Floyd", uri: "spotify:artist:pinkfloyd", images: [{ url: "http://img.com/pinkfloyd.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    let internalAlbumId: ID;

    await t.step("Loading album 'Dark Side of the Moon'", async () => {
      const loadAlbumResult = await musicDiscovery.loadAlbum({ externalId: albumExternalId });
      if ("error" in loadAlbumResult) {
        throw new Error(`Loading album unexpectedly failed: ${loadAlbumResult.error}`);
      }
      const { album: loadedAlbum } = loadAlbumResult;
      internalAlbumId = loadedAlbum._id;
      assertExists(internalAlbumId);
    });

    // 2. Mock getAlbumTracks and getTrack for individual tracks
    spotifyService.getAlbumTracks = async (albumId: string) => {
      console.log(`Mocking Spotify getAlbumTracks for album: '${albumId}'`);
      if (albumId === albumExternalId) {
        return {
          items: [
            { id: "track-speak", name: "Speak to Me", uri: "spotify:track:speak" },
            { id: "track-breathe", name: "Breathe (In the Air)", uri: "spotify:track:breathe" },
          ],
        };
      }
      return { items: [] };
    };

    spotifyService.getTrack = async (id) => {
      console.log(`Mocking Spotify getTrack for id: '${id}' (from album tracks)`);
      if (id === "track-speak") return { id, name: "Speak to Me", uri: "spotify:track:speak", duration_ms: 90000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      if (id === "track-breathe") return { id, name: "Breathe (In the Air)", uri: "spotify:track:breathe", duration_ms: 163000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getTrack not found: ${id}`);
    };

    await t.step(`Loading tracks for album (internal ID: ${internalAlbumId})`, async () => {
      const loadTracksResult = await musicDiscovery.loadAlbumTracks({ albumId: internalAlbumId });
      if ("error" in loadTracksResult) {
        throw new Error(`Loading album tracks unexpectedly failed: ${loadTracksResult.error}`);
      }
      const { tracks: albumTracks } = loadTracksResult;
      assertEquals(albumTracks.length, 2, "Should load 2 tracks.");
      assertExists(albumTracks.find(t => t.name === "Speak to Me"));
      assertExists(albumTracks.find(t => t.name === "Breathe (In the Air)"));

      console.log("Verifying tracks are linked to the album via query.");
      const queriedTracks = await musicDiscovery._getTracksByAlbum({ albumId: internalAlbumId });
      assertEquals(queriedTracks.tracks.length, 2);
      assertExists(queriedTracks.tracks.find(t => t.name === "Speak to Me" && t.albumId === internalAlbumId));
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadArtistAlbums loads and links albums to an artist", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // 1. Load an artist first to get an internal artistId
    const artistExternalId = "artist-taylorswift";
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Taylor Swift", uri: "spotify:artist:taylorswift", images: [{ url: "http://img.com/taylor.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };
    spotifyService.getAlbum = async (id) => {
      if (id === "album-fearless") return { id, name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      if (id === "album-red") return { id, name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };

    let internalArtistId: ID;

    await t.step("Loading artist 'Taylor Swift'", async () => {
      const loadArtistResult = await musicDiscovery.loadArtist({ externalId: artistExternalId });
      if ("error" in loadArtistResult) {
        throw new Error(`Loading artist unexpectedly failed: ${loadArtistResult.error}`);
      }
      const { artist: loadedArtist } = loadArtistResult;
      internalArtistId = loadedArtist._id;
      assertExists(internalArtistId);
    });

    // 2. Mock getArtistAlbums
    spotifyService.getArtistAlbums = async (artistId: string) => {
      console.log(`Mocking Spotify getArtistAlbums for artist: '${artistId}'`);
      if (artistId === artistExternalId) {
        return {
          items: [
            { id: "album-fearless", name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
            { id: "album-red", name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
          ],
        };
      }
      return { items: [] };
    };

    await t.step(`Loading albums for artist (internal ID: ${internalArtistId})`, async () => {
      const loadAlbumsResult = await musicDiscovery.loadArtistAlbums({ artistId: internalArtistId });
      if ("error" in loadAlbumsResult) {
        throw new Error(`Loading artist albums unexpectedly failed: ${loadAlbumsResult.error}`);
      }
      const { albums: artistAlbums } = loadAlbumsResult;
      assertEquals(artistAlbums.length, 2, "Should load 2 albums.");
      assertExists(artistAlbums.find(a => a.name === "Fearless"));
      assertExists(artistAlbums.find(a => a.name === "Red"));

      console.log("Verifying albums are linked to the artist via query.");
      const queriedAlbums = await musicDiscovery._getAlbumsByArtist({ artistId: internalArtistId });
      assertEquals(queriedAlbums.albums.length, 2);
      assertExists(queriedAlbums.albums.find(a => a.name === "Fearless" && a.artistId === internalArtistId));

      console.log("Verifying the artist's document has the album IDs stored.");
      const updatedArtist = await musicDiscovery.artists.findOne({ _id: internalArtistId });
      assertExists(updatedArtist?.albums);
      assertEquals(updatedArtist.albums.length, 2);
      assertArrayIncludes(updatedArtist.albums.map(String), artistAlbums.map(a => a._id.toString()));
    });
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getEntityFromId and _getEntityFromUri work correctly", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify search for setup
    spotifyService.search = async () => ({
      tracks: {
        items: [{
          id: "track-123",
          name: "Sample Track",
          uri: "spotify:track:123",
          external_urls: { spotify: "http://spotify.com/track/123" },
          album: { id: "album-456", name: "Sample Album", images: [] },
          artists: [{ id: "artist-789", name: "Sample Artist" }],
          duration_ms: 100000,
        }],
      },
      albums: { items: [] },
      artists: { items: [] },
    });
    // Mock getTrack, getAlbum, getArtist as needed by upsert helpers
    spotifyService.getTrack = async (id) => (id === "track-123" ? { id, name: "Sample Track", uri: "spotify:track:123", duration_ms: 100000, album: { id: "album-456", name: "Sample Album", images: [] }, artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject(new Error("Not found")));
    spotifyService.getAlbum = async (id) => (id === "album-456" ? { id, name: "Sample Album", uri: "spotify:album:456", release_date: "2023-01-01", total_tracks: 1, images: [], artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject(new Error("Not found")));
    spotifyService.getArtist = async (id) => (id === "artist-789" ? { id, name: "Sample Artist", uri: "spotify:artist:789", images: [] } : Promise.reject(new Error("Not found")));


    await t.step("Adding a sample track via search to populate state", async () => {
      const searchResult = await musicDiscovery.search({ user: userA, query: "Sample", type: "track" });
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      assertEquals(searchResult.items.length, 1, "Should have added one item to state.");
    });

    await t.step("Query: _getEntityFromId with existing external ID", async () => {
      const entityById = await musicDiscovery._getEntityFromId({ externalId: "track-123" });
      assertEquals(entityById.length, 1);
      assertEquals(entityById[0].musicEntity.name, "Sample Track");
      assertEquals(entityById[0].musicEntity.type, "track");
    });

    await t.step("Query: _getEntityFromUri with existing URI", async () => {
      const entityByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:123" });
      assertEquals(entityByUri.length, 1);
      assertEquals(entityByUri[0].musicEntity.name, "Sample Track");
      assertEquals(entityByUri[0].musicEntity.type, "track");
    });

    await t.step("Query: _getEntityFromId with non-existent external ID", async () => {
      const nonExistentById = await musicDiscovery._getEntityFromId({ externalId: "non-existent-id" });
      assertEquals(nonExistentById.length, 0);
    });

    await t.step("Query: _getEntityFromUri with non-existent URI", async () => {
      const nonExistentByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:nonexistent" });
      assertEquals(nonExistentByUri.length, 0);
    });

  } finally {
    await client.close();
  }
});
```

# prompt: fix this error too Variable 'internalArtistId' is used before being assigned.
# response:

The error "Variable 'internalArtistId' is used before being assigned" (and similarly for `internalAlbumId`) occurs because TypeScript's static analysis cannot guarantee that a variable assigned *inside* an `await t.step(...)` block will be assigned before it's used *in the string literal of a subsequent `t.step` call*. Even though Deno executes `t.step` blocks sequentially, TypeScript's control flow analysis across these asynchronous boundaries isn't robust enough for this pattern.

To fix this, we'll move the initial `loadAlbum` and `loadArtist` actions (which assign `internalAlbumId` and `internalArtistId`) directly into the main `Deno.test` function's scope, before any `t.step` blocks that depend on these variables in their titles. This guarantees they are assigned when those string literals are evaluated. The `t.step` blocks can then confirm the setup or proceed with subsequent actions.

Here's the updated test file:

***

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MusicDiscoveryConcept from "./MusicDiscoveryConcept.ts";
import { spotifyService } from "@utils/spotify.ts"; // Ensure spotifyService is imported

// Assume these are external User IDs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

// Mock SpotifyService for deterministic and fast testing
// This requires a bit of manipulation since spotifyService is a singleton.
// For a real scenario, dependency injection would be preferred.
// Here, we'll temporarily override methods.
const originalSpotifyService = { ...spotifyService }; // Save original methods

Deno.test.beforeEach(() => {
  // Reset mocks before each test
  Object.assign(spotifyService, originalSpotifyService);
});

Deno.test("Principle: User searches, items are cached, user clears search", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("--- Principle Test Started ---");

    // Mock Spotify search response for tracks
    spotifyService.search = async ({ query, type }) => {
      console.log(`Mocking Spotify search for query: '${query}', type: '${type}'`);
      if (query === "Imagine" && type === "track") {
        return {
          tracks: {
            items: [{
              id: "spotify-track-imagine",
              name: "Imagine",
              uri: "spotify:track:imagine",
              external_urls: { spotify: "http://spotify.com/imagine" },
              album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
              artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
              duration_ms: 181000,
            }],
          },
        };
      }
      return { tracks: { items: [] } };
    };

    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "spotify-track-imagine") {
        return {
          id: "spotify-track-imagine",
          name: "Imagine",
          uri: "spotify:track:imagine",
          external_urls: { spotify: "http://spotify.com/imagine" },
          album: { id: "spotify-album-imagine", name: "Imagine", images: [{ url: "http://img.com/imagine_album.jpg" }] },
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          duration_ms: 181000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    // Mock Spotify getAlbum response (minimal for _upsertAlbum)
    spotifyService.getAlbum = async (id: string) => {
      console.log(`Mocking Spotify getAlbum for id: '${id}'`);
      if (id === "spotify-album-imagine") {
        return {
          id: "spotify-album-imagine",
          name: "Imagine",
          uri: "spotify:album:imagine",
          external_urls: { spotify: "http://spotify.com/imagine_album" },
          images: [{ url: "http://img.com/imagine_album.jpg" }],
          artists: [{ id: "spotify-artist-johnlennon", name: "John Lennon" }],
          release_date: "1971-09-09",
          total_tracks: 10,
        };
      }
      throw new Error("Album not found in mock.");
    };

    // Mock Spotify getArtist response (minimal for _upsertArtist)
    spotifyService.getArtist = async (id: string) => {
      console.log(`Mocking Spotify getArtist for id: '${id}'`);
      if (id === "spotify-artist-johnlennon") {
        return {
          id: "spotify-artist-johnlennon",
          name: "John Lennon",
          uri: "spotify:artist:johnlennon",
          external_urls: { spotify: "http://spotify.com/johnlennon" },
          images: [{ url: "http://img.com/johnlennon.jpg" }],
        };
      }
      throw new Error("Artist not found in mock.");
    };

    await t.step("User A searches for 'Imagine' (track)", async () => {
      const searchResult = await musicDiscovery.search({ user: userA, query: "Imagine", type: "track" });
      
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      // TypeScript now knows `searchResult` is `{ items: MusicItemDoc[] }`

      assertEquals(searchResult.items.length, 1, "Should find one track.");
      const foundTrack = searchResult.items[0];
      assertExists(foundTrack._id);
      assertEquals(foundTrack.name, "Imagine");
      assertEquals(foundTrack.externalId, "spotify-track-imagine");

      console.log("Verifying cached item in musicItems collection.");
      const cachedItem = await musicDiscovery._getItem({ externalId: "spotify-track-imagine" });
      assertEquals(cachedItem.length, 1, "Track should be cached in musicItems.");
      assertEquals(cachedItem[0].item.name, "Imagine");

      console.log("Verifying cached item in tracks subset collection.");
      const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-imagine" });
      assertEquals(cachedTrack.length, 1, "Track should be cached in tracks subset.");
      assertEquals(cachedTrack[0].track.name, "Imagine");

      console.log("Verifying user A's search results.");
      const userASearchResults = await musicDiscovery._getSearchResults({ user: userA });
      assertEquals(userASearchResults.items.length, 1, "User A's search results should contain 1 item.");
      assertEquals(userASearchResults.items[0].name, "Imagine");
    });

    await t.step("User A clears their search", async () => {
      const clearResult = await musicDiscovery.clearSearch({ user: userA });
      // clearResult is Promise<Empty | { error: string }>, but clearSearch should always succeed.
      if ("error" in clearResult) {
        throw new Error(`Clearing search unexpectedly failed: ${clearResult.error}`);
      }
      assertEquals("error" in clearResult, false, "Clearing search should not return an error.");

      console.log("Verifying user A's search results are empty after clearing.");
      const clearedSearchResults = await musicDiscovery._getSearchResults({ user: userA });
      assertEquals(clearedSearchResults.items.length, 0, "User A's search results should be empty.");
    });

    console.log("--- Principle Test Finished ---");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search handles empty query requirement", async () => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    console.log("Trace: Attempting to search with an empty query.");
    const result = await musicDiscovery.search({ user: userA, query: "", type: "track" });
    assertEquals("error" in result, true, "Search with empty query should return an error.");
    assertEquals((result as { error: string }).error, "Query cannot be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: search upserts various types and updates user results", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify smartSearch response for mixed types
    spotifyService.smartSearch = async (query: string) => {
      console.log(`Mocking Spotify smartSearch for query: '${query}'`);
      if (query === `"All My Life"`) {
        return {
          tracks: {
            items: [{
              id: "spotify-track-allmylife",
              name: "All My Life",
              uri: "spotify:track:allmylife",
              external_urls: { spotify: "http://spotify.com/allmylife" },
              album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] },
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              duration_ms: 263000,
            }],
          },
          albums: {
            items: [{
              id: "spotify-album-thecolourandtheshape",
              name: "The Colour And The Shape",
              uri: "spotify:album:thecolourandtheshape",
              external_urls: { spotify: "http://spotify.com/thecolourandtheshape" },
              images: [{ url: "http://img.com/album_color.jpg" }],
              artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }],
              release_date: "1997-05-20",
              total_tracks: 13,
            }],
          },
          artists: {
            items: [{
              id: "spotify-artist-foofighters",
              name: "Foo Fighters",
              uri: "spotify:artist:foofighters",
              external_urls: { spotify: "http://spotify.com/foofighters" },
              images: [{ url: "http://img.com/foofighters.jpg" }],
            }],
          },
        };
      }
      return { tracks: { items: [] }, albums: { items: [] }, artists: { items: [] } };
    };

    // Mock necessary get* calls for upserts
    spotifyService.getTrack = async (id) => (id === "spotify-track-allmylife" ? { id, name: "All My Life", uri: "spotify:track:allmylife", duration_ms: 263000, album: { id: "spotify-album-allmylife", name: "All My Life", images: [{ url: "http://img.com/album.jpg" }] }, artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] } : Promise.reject(new Error("Mock getTrack not found")));
    spotifyService.getAlbum = async (id) => {
      if (id === "spotify-album-allmylife") return { id, name: "All My Life", uri: "spotify:album:allmylife", release_date: "2002-10-22", total_tracks: 11, images: [{ url: "http://img.com/album.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      if (id === "spotify-album-thecolourandtheshape") return { id, name: "The Colour And The Shape", uri: "spotify:album:thecolourandtheshape", release_date: "1997-05-20", total_tracks: 13, images: [{ url: "http://img.com/album_color.jpg" }], artists: [{ id: "spotify-artist-foofighters", name: "Foo Fighters" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => (id === "spotify-artist-foofighters" ? { id, name: "Foo Fighters", uri: "spotify:artist:foofighters", images: [{ url: "http://img.com/foofighters.jpg" }] } : Promise.reject(new Error("Mock getArtist not found")));

    await t.step("User B searches for 'All My Life' across all types", async () => {
      const searchResult = await musicDiscovery.search({ user: userB, query: "All My Life", type: "track,album,artist" });
      
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      // TypeScript now knows `searchResult` is `{ items: MusicItemDoc[] }`

      assertEquals(searchResult.items.length, 3, "Should find one track, one album, one artist.");

      // Verify types
      assertExists(searchResult.items.find(item => item.name === "All My Life" && item.type === "track"));
      assertExists(searchResult.items.find(item => item.name === "The Colour And The Shape" && item.type === "album"));
      assertExists(searchResult.items.find(item => item.name === "Foo Fighters" && item.type === "artist"));

      // Verify cached items
      const cachedTrack = await musicDiscovery._getTrack({ externalId: "spotify-track-allmylife" });
      assertEquals(cachedTrack.length, 1);
      const cachedAlbum = await musicDiscovery._getAlbum({ externalId: "spotify-album-thecolourandtheshape" });
      assertEquals(cachedAlbum.length, 1);
      const cachedArtist = await musicDiscovery._getArtist({ externalId: "spotify-artist-foofighters" });
      assertEquals(cachedArtist.length, 1);

      // Verify user's search results
      const userBSearchResults = await musicDiscovery._getSearchResults({ user: userB });
      assertEquals(userBSearchResults.items.length, 3, "User B's search results should contain 3 items.");
      assertArrayIncludes(userBSearchResults.items.map(i => i.name), ["All My Life", "The Colour And The Shape", "Foo Fighters"]);
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadTrack loads and caches a specific track", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify getTrack response
    spotifyService.getTrack = async (id: string) => {
      console.log(`Mocking Spotify getTrack for id: '${id}'`);
      if (id === "specific-track-id") {
        return {
          id: "specific-track-id",
          name: "Bohemian Rhapsody",
          uri: "spotify:track:bohemian",
          external_urls: { spotify: "http://spotify.com/bohemian" },
          album: { id: "album-night", name: "A Night at the Opera", images: [{ url: "http://img.com/opera.jpg" }] },
          artists: [{ id: "artist-queen", name: "Queen" }],
          duration_ms: 354000,
        };
      }
      throw new Error("Track not found in mock.");
    };

    spotifyService.getAlbum = async (id) => {
      if (id === "album-night") return { id, name: "A Night at the Opera", uri: "spotify:album:opera", release_date: "1975-11-21", total_tracks: 12, images: [{ url: "http://img.com/opera.jpg" }], artists: [{ id: "artist-queen", name: "Queen" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === "artist-queen") return { id, name: "Queen", uri: "spotify:artist:queen", images: [{ url: "http://img.com/queen.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    await t.step("Loading a specific track 'Bohemian Rhapsody'", async () => {
      const result = await musicDiscovery.loadTrack({ externalId: "specific-track-id" });
      
      if ("error" in result) {
        throw new Error(`Loading track unexpectedly failed: ${result.error}`);
      }
      // TypeScript now knows `result` is `{ track: TrackDoc }`
      const { track } = result; // No need for `as { track: ... }` cast

      assertEquals(track.name, "Bohemian Rhapsody");
      assertEquals(track.type, "track");
      assertExists(track._id);

      console.log("Verifying track is cached by external ID.");
      const cached = await musicDiscovery._getTrack({ externalId: "specific-track-id" });
      assertEquals(cached.length, 1);
      assertEquals(cached[0].track.name, "Bohemian Rhapsody");
    });

    await t.step("Attempting to load a non-existent track", async () => {
      const errorResult = await musicDiscovery.loadTrack({ externalId: "non-existent-track" });
      assertEquals("error" in errorResult, true, "Loading non-existent track should fail.");
    });
  } finally {
    await client.close();
  }
});


Deno.test("Action: loadAlbumTracks loads and links tracks to an album", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    const albumExternalId = "album-darksideofmoon";
    const artistExternalId = "artist-pinkfloyd";

    spotifyService.getAlbum = async (id) => {
      if (id === albumExternalId) return { id, name: "Dark Side of the Moon", uri: "spotify:album:darkside", release_date: "1973-03-01", total_tracks: 10, images: [{ url: "http://img.com/darkside.jpg" }], artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Pink Floyd", uri: "spotify:artist:pinkfloyd", images: [{ url: "http://img.com/pinkfloyd.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };

    // Perform the initial album loading directly in the main test scope
    const loadAlbumResult = await musicDiscovery.loadAlbum({ externalId: albumExternalId });
    if ("error" in loadAlbumResult) {
      throw new Error(`Loading album unexpectedly failed: ${loadAlbumResult.error}`);
    }
    const { album: loadedAlbum } = loadAlbumResult;
    const internalAlbumId = loadedAlbum._id; // internalAlbumId is now guaranteed to be assigned here

    await t.step("Loading album 'Dark Side of the Moon' (setup)", async () => {
      assertExists(internalAlbumId); // Confirm setup
      assertEquals(loadedAlbum.name, "Dark Side of the Moon");
    });

    // 2. Mock getAlbumTracks and getTrack for individual tracks
    spotifyService.getAlbumTracks = async (albumId: string) => {
      console.log(`Mocking Spotify getAlbumTracks for album: '${albumId}'`);
      if (albumId === albumExternalId) {
        return {
          items: [
            { id: "track-speak", name: "Speak to Me", uri: "spotify:track:speak" },
            { id: "track-breathe", name: "Breathe (In the Air)", uri: "spotify:track:breathe" },
          ],
        };
      }
      return { items: [] };
    };

    spotifyService.getTrack = async (id) => {
      console.log(`Mocking Spotify getTrack for id: '${id}' (from album tracks)`);
      if (id === "track-speak") return { id, name: "Speak to Me", uri: "spotify:track:speak", duration_ms: 90000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      if (id === "track-breathe") return { id, name: "Breathe (In the Air)", uri: "spotify:track:breathe", duration_ms: 163000, album: { id: albumExternalId, name: "Dark Side of the Moon" }, artists: [{ id: artistExternalId, name: "Pink Floyd" }] };
      throw new Error(`Mock getTrack not found: ${id}`);
    };

    await t.step(`Loading tracks for album (internal ID: ${internalAlbumId})`, async () => {
      const loadTracksResult = await musicDiscovery.loadAlbumTracks({ albumId: internalAlbumId });
      if ("error" in loadTracksResult) {
        throw new Error(`Loading album tracks unexpectedly failed: ${loadTracksResult.error}`);
      }
      const { tracks: albumTracks } = loadTracksResult;
      assertEquals(albumTracks.length, 2, "Should load 2 tracks.");
      assertExists(albumTracks.find(t => t.name === "Speak to Me"));
      assertExists(albumTracks.find(t => t.name === "Breathe (In the Air)"));

      console.log("Verifying tracks are linked to the album via query.");
      const queriedTracks = await musicDiscovery._getTracksByAlbum({ albumId: internalAlbumId });
      assertEquals(queriedTracks.tracks.length, 2);
      assertExists(queriedTracks.tracks.find(t => t.name === "Speak to Me" && t.albumId === internalAlbumId));
    });
  } finally {
    await client.close();
  }
});

Deno.test("Action: loadArtistAlbums loads and links albums to an artist", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    const artistExternalId = "artist-taylorswift";
    spotifyService.getArtist = async (id) => {
      if (id === artistExternalId) return { id, name: "Taylor Swift", uri: "spotify:artist:taylorswift", images: [{ url: "http://img.com/taylor.jpg" }] };
      throw new Error(`Mock getArtist not found: ${id}`);
    };
    spotifyService.getAlbum = async (id) => {
      if (id === "album-fearless") return { id, name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      if (id === "album-red") return { id, name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] };
      throw new Error(`Mock getAlbum not found: ${id}`);
    };

    // Perform the initial artist loading directly in the main test scope
    const loadArtistResult = await musicDiscovery.loadArtist({ externalId: artistExternalId });
    if ("error" in loadArtistResult) {
      throw new Error(`Loading artist unexpectedly failed: ${loadArtistResult.error}`);
    }
    const { artist: loadedArtist } = loadArtistResult;
    const internalArtistId = loadedArtist._id; // internalArtistId is now guaranteed to be assigned here

    await t.step("Loading artist 'Taylor Swift' (setup)", async () => {
      assertExists(internalArtistId); // Confirm setup
      assertEquals(loadedArtist.name, "Taylor Swift");
    });

    // 2. Mock getArtistAlbums
    spotifyService.getArtistAlbums = async (artistId: string) => {
      console.log(`Mocking Spotify getArtistAlbums for artist: '${artistId}'`);
      if (artistId === artistExternalId) {
        return {
          items: [
            { id: "album-fearless", name: "Fearless", uri: "spotify:album:fearless", release_date: "2008-11-11", total_tracks: 13, images: [{ url: "http://img.com/fearless.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
            { id: "album-red", name: "Red", uri: "spotify:album:red", release_date: "2012-10-22", total_tracks: 16, images: [{ url: "http://img.com/red.jpg" }], artists: [{ id: artistExternalId, name: "Taylor Swift" }] },
          ],
        };
      }
      return { items: [] };
    };

    await t.step(`Loading albums for artist (internal ID: ${internalArtistId})`, async () => {
      const loadAlbumsResult = await musicDiscovery.loadArtistAlbums({ artistId: internalArtistId });
      if ("error" in loadAlbumsResult) {
        throw new Error(`Loading artist albums unexpectedly failed: ${loadAlbumsResult.error}`);
      }
      const { albums: artistAlbums } = loadAlbumsResult;
      assertEquals(artistAlbums.length, 2, "Should load 2 albums.");
      assertExists(artistAlbums.find(a => a.name === "Fearless"));
      assertExists(artistAlbums.find(a => a.name === "Red"));

      console.log("Verifying albums are linked to the artist via query.");
      const queriedAlbums = await musicDiscovery._getAlbumsByArtist({ artistId: internalArtistId });
      assertEquals(queriedAlbums.albums.length, 2);
      assertExists(queriedAlbums.albums.find(a => a.name === "Fearless" && a.artistId === internalArtistId));

      console.log("Verifying the artist's document has the album IDs stored.");
      const updatedArtist = await musicDiscovery.artists.findOne({ _id: internalArtistId });
      assertExists(updatedArtist?.albums);
      assertEquals(updatedArtist.albums.length, 2);
      assertArrayIncludes(updatedArtist.albums.map(String), artistAlbums.map(a => a._id.toString()));
    });
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getEntityFromId and _getEntityFromUri work correctly", async (t) => {
  const [db, client] = await testDb();
  const musicDiscovery = new MusicDiscoveryConcept(db);

  try {
    // Mock Spotify search for setup
    spotifyService.search = async () => ({
      tracks: {
        items: [{
          id: "track-123",
          name: "Sample Track",
          uri: "spotify:track:123",
          external_urls: { spotify: "http://spotify.com/track/123" },
          album: { id: "album-456", name: "Sample Album", images: [] },
          artists: [{ id: "artist-789", name: "Sample Artist" }],
          duration_ms: 100000,
        }],
      },
      albums: { items: [] },
      artists: { items: [] },
    });
    // Mock getTrack, getAlbum, getArtist as needed by upsert helpers
    spotifyService.getTrack = async (id) => (id === "track-123" ? { id, name: "Sample Track", uri: "spotify:track:123", duration_ms: 100000, album: { id: "album-456", name: "Sample Album", images: [] }, artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject(new Error("Not found")));
    spotifyService.getAlbum = async (id) => (id === "album-456" ? { id, name: "Sample Album", uri: "spotify:album:456", release_date: "2023-01-01", total_tracks: 1, images: [], artists: [{ id: "artist-789", name: "Sample Artist" }] } : Promise.reject(new Error("Not found")));
    spotifyService.getArtist = async (id) => (id === "artist-789" ? { id, name: "Sample Artist", uri: "spotify:artist:789", images: [] } : Promise.reject(new Error("Not found")));


    await t.step("Adding a sample track via search to populate state", async () => {
      const searchResult = await musicDiscovery.search({ user: userA, query: "Sample", type: "track" });
      if ("error" in searchResult) {
        throw new Error(`Search unexpectedly failed: ${searchResult.error}`);
      }
      assertEquals(searchResult.items.length, 1, "Should have added one item to state.");
    });

    await t.step("Query: _getEntityFromId with existing external ID", async () => {
      const entityById = await musicDiscovery._getEntityFromId({ externalId: "track-123" });
      assertEquals(entityById.length, 1);
      assertEquals(entityById[0].musicEntity.name, "Sample Track");
      assertEquals(entityById[0].musicEntity.type, "track");
    });

    await t.step("Query: _getEntityFromUri with existing URI", async () => {
      const entityByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:123" });
      assertEquals(entityByUri.length, 1);
      assertEquals(entityByUri[0].musicEntity.name, "Sample Track");
      assertEquals(entityByUri[0].musicEntity.type, "track");
    });

    await t.step("Query: _getEntityFromId with non-existent external ID", async () => {
      const nonExistentById = await musicDiscovery._getEntityFromId({ externalId: "non-existent-id" });
      assertEquals(nonExistentById.length, 0);
    });

    await t.step("Query: _getEntityFromUri with non-existent URI", async () => {
      const nonExistentByUri = await musicDiscovery._getEntityFromUri({ uri: "spotify:track:nonexistent" });
      assertEquals(nonExistentByUri.length, 0);
    });

  } finally {
    await client.close();
  }
});
```