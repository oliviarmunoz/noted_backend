---
timestamp: 'Mon Nov 24 2025 20:14:56 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_201456.7df8f783.md]]'
content_id: 2ff795430b18569c1be70880aa76ae4a8914792e13425750a092df2126253ef0
---

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts";

const PREFIX = "MusicDiscovery.";

type User = ID;
type MusicEntityID = ID;

/**
 * a set of MusicEntities with
 *   an externalId String
 *   a type of TRACK or ALBUM or ARTIST
 *   ...
 */
interface MusicEntity {
  _id: MusicEntityID;
  externalId: string;
  type: "track" | "album" | "artist";
  name: string;
  uri: string;
  imageUrl: string;
  description: string; // usually artist genres or album type
  releaseDate?: string;
  durationMs?: number;
  artistName?: string; 
}

/**
 * a set of SearchResults with
 *   a User
 *   a MusicEntity
 */
interface SearchResult {
  _id: ID;
  user: User;
  entity: MusicEntityID;
}

/**
 * a set of AlbumTracks with
 *   an album MusicEntity
 *   a track MusicEntity
 *   an order Number
 */
interface AlbumTrack {
  _id: ID;
  albumId: MusicEntityID; // Reference to our internal ID
  trackId: MusicEntityID; // Reference to our internal ID
  order: number;
}

interface UserState {
    _id: User;
    lastQuery: string;
}

export default class MusicDiscoveryConcept {
  entities: Collection<MusicEntity>;
  searchResults: Collection<SearchResult>;
  albumTracks: Collection<AlbumTrack>;
  users: Collection<UserState>;

  constructor(private readonly db: Db) {
    this.entities = this.db.collection(PREFIX + "entities");
    this.searchResults = this.db.collection(PREFIX + "searchResults");
    this.albumTracks = this.db.collection(PREFIX + "albumTracks");
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Helper to upsert a spotify item into our local MusicEntities state
   */
  private async upsertSpotifyItem(item: any, type: "track" | "album" | "artist"): Promise<MusicEntityID> {
    const existing = await this.entities.findOne({ externalId: item.id });
    
    if (existing) {
      // update details if they exist in this payload
      const updates: Partial<MusicEntity> = {};
      if (item.images && item.images.length > 0) updates.imageUrl = item.images[0].url;
      if (item.album && item.album.images && item.album.images.length > 0) updates.imageUrl = item.album.images[0].url;
      if (item.release_date) updates.releaseDate = item.release_date;
      
      await this.entities.updateOne({ _id: existing._id }, { $set: updates });
      return existing._id;
    }

    const _id = freshID();
    
    // Extract image safely
    let imageUrl = "";
    if (item.images && item.images.length > 0) imageUrl = item.images[0].url;
    else if (item.album && item.album.images && item.album.images.length > 0) imageUrl = item.album.images[0].url;

    // Extract artist name safely
    let artistName = "";
    if (item.artists && item.artists.length > 0) artistName = item.artists[0].name;

    await this.entities.insertOne({
      _id,
      externalId: item.id,
      type,
      name: item.name,
      uri: item.uri,
      imageUrl,
      description: type === 'artist' ? (item.genres || []).join(", ") : item.type,
      durationMs: item.duration_ms,
      releaseDate: item.release_date,
      artistName
    });

    return _id;
  }

  /**
   * search (user: User, query: String)
   * 
   * **requires** query is not empty
   * **effects** fetches from Spotify, updates cache, links results to user
   */
  async search({ user, query }: { user: User; query: string }): Promise<Empty> {
    if (!query) return { error: "Query cannot be empty" };

    // 1. Update User State
    await this.users.updateOne(
        { _id: user },
        { $set: { lastQuery: query } },
        { upsert: true }
    );

    // 2. Clear old results
    await this.searchResults.deleteMany({ user });

    // 3. Fetch from Spotify
    // We catch errors here to prevent the concept from crashing if Spotify is down
    let data;
    try {
        data = await spotifyService.searchAll(query, 10);
    } catch (e: any) {
        return { error: `Spotify Error: ${e.message}`};
    }

    // 4. Process and Store Entities
    const resultIds: MusicEntityID[] = [];

    if (data.tracks?.items) {
        for (const item of data.tracks.items) {
            resultIds.push(await this.upsertSpotifyItem(item, "track"));
        }
    }
    if (data.albums?.items) {
        for (const item of data.albums.items) {
            resultIds.push(await this.upsertSpotifyItem(item, "album"));
        }
    }
    if (data.artists?.items) {
        for (const item of data.artists.items) {
            resultIds.push(await this.upsertSpotifyItem(item, "artist"));
        }
    }

    // 5. Link to User
    const resultDocs = resultIds.map(entityId => ({
        _id: freshID(),
        user,
        entity: entityId
    }));

    if (resultDocs.length > 0) {
        await this.searchResults.insertMany(resultDocs);
    }

    return {};
  }

  /**
   * loadAlbumTracks (albumExternalId: String)
   * 
   * **requires** albumExternalId is valid on Spotify
   * **effects** fetches tracks, caches them, and creates AlbumTrack relations
   */
  async loadAlbumTracks({ albumExternalId }: { albumExternalId: string }): Promise<Empty> {
    // 1. Ensure the album exists in our DB (it likely does if we clicked it from search, but maybe not)
    // We need its internal ID. If we don't have it, we must fetch the album summary first.
    let album = await this.entities.findOne({ externalId: albumExternalId });
    if (!album) {
        // Fallback: Fetch album details if we don't have the album cached yet
        try {
            const albumData = await spotifyService.getAlbum(albumExternalId);
            const newId = await this.upsertSpotifyItem(albumData, "album");
            album = await this.entities.findOne({ _id: newId });
        } catch (e: any) {
            return { error: `Could not fetch album: ${e.message}` };
        }
    }
    
    if (!album) return { error: "Album not found" };

    // 2. Fetch Tracks
    let trackData;
    try {
        trackData = await spotifyService.getAlbumTracks(albumExternalId, { limit: 50 });
    } catch (e: any) {
        return { error: `Spotify API Error: ${e.message}` };
    }

    // 3. Process Tracks
    if (trackData.items) {
        // Remove existing relations to avoid duplicates or stale order
        await this.albumTracks.deleteMany({ albumId: album._id });

        let order = 0;
        for (const item of trackData.items) {
            // Album tracks result usually doesn't have the album image, 
            // but we can assume it belongs to the album we just fetched.
            // We pass it to upsert. 
            const trackId = await this.upsertSpotifyItem(item, "track");
            
            await this.albumTracks.insertOne({
                _id: freshID(),
                albumId: album._id,
                trackId: trackId,
                order: order++
            });
        }
    }

    return {};
  }

  /**
   * loadEntityDetails (externalId: String, type: String)
   * 
   * **purpose** Fetch full details (like popularity, full dates) that might be missing from search summaries
   */
  async loadEntityDetails({ externalId, type }: { externalId: string, type: string }): Promise<Empty> {
    try {
        let data;
        if (type === 'track') data = await spotifyService.getTrack(externalId);
        else if (type === 'album') data = await spotifyService.getAlbum(externalId);
        else if (type === 'artist') data = await spotifyService.getArtist(externalId);
        else return { error: "Invalid type" };

        await this.upsertSpotifyItem(data, type as "track" | "album" | "artist");
    } catch (e: any) {
        return { error: `Spotify Error: ${e.message}` };
    }
    return {};
  }

  // --- QUERIES ---

  /**
   * _getSearchResults (user: User)
   * 
   * **returns** the cached results for the user
   */
  async _getSearchResults({ user }: { user: User }): Promise<Array<{ entity: MusicEntity }>> {
    const results = await this.searchResults.find({ user }).toArray();
    
    // Join with entities
    const entities = await Promise.all(results.map(async (r) => {
        const entity = await this.entities.findOne({ _id: r.entity });
        return entity;
    }));

    // Filter out any nulls (if integrity was lost) and return structure
    return entities
        .filter(e => e !== null)
        .map(e => ({ entity: e as MusicEntity }));
  }

  /**
   * _getAlbumTracks (albumExternalId: String)
   * 
   * **returns** ordered list of tracks for the album
   */
  async _getAlbumTracks({ albumExternalId }: { albumExternalId: string }): Promise<Array<{ track: MusicEntity, order: number }>> {
    const album = await this.entities.findOne({ externalId: albumExternalId });
    if (!album) return [];

    const tracksRel = await this.albumTracks.find({ albumId: album._id }, { sort: { order: 1 } }).toArray();

    const result = await Promise.all(tracksRel.map(async (rel) => {
        const track = await this.entities.findOne({ _id: rel.trackId });
        return { track, order: rel.order };
    }));

    return result
        .filter(r => r.track !== null)
        .map(r => ({ track: r.track as MusicEntity, order: r.order }));
  }

  /**
   * _getEntity (externalId: String)
   * 
   * **returns** specific details of an entity
   */
  async _getEntity({ externalId }: { externalId: string }): Promise<Array<{ entity: MusicEntity }>> {
      const entity = await this.entities.findOne({ externalId });
      if (!entity) return [];
      return [{ entity }];
  }
}
```
