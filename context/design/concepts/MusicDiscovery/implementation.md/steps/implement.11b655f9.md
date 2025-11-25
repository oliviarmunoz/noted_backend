---
timestamp: 'Mon Nov 24 2025 21:14:30 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_211430.06c85a97.md]]'
content_id: 11b655f959d643df97af2970e9904259265784daf45720e69c81460aae4f08f7
---

# implement: MusicDiscovery concept

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

    // Update User State
    await this.users.updateOne(
        { _id: user },
        { $set: { lastQuery: query } },
        { upsert: true }
    );

    // Fetch from Spotify
    // We catch errors here to prevent the concept from crashing if Spotify is down
    let data;
    try {
        // Clear old results
        await this.searchResults.deleteMany({ user }); 
        data = await spotifyService.searchAll(query, 10);
    } catch (e: any) {
        return { error: `Spotify Error: ${e.message}`};
    }

    // Process and Store Entities
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

    // Link to User
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
   * clearSearch (user: User)
   * requires true
   * effects removes all SearchResults for user; clears lastQuery
   */
  async clearSearch({ user }: { user: User }): Promise<Empty> {
    await this.searchResults.deleteMany({ user });
    await this.users.updateOne({ _id: user }, { $unset: { lastQuery: "" } });
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
    const entityIds = results.map(r => r.entity);
    
    // Single DB call
    const entities = await this.entities.find({ _id: { $in: entityIds } }).toArray();
    
    // Map back to preserve order if necessary, or just return
    return entities.map(e => ({ entity: e as MusicEntity }));
  }

  /**
   * _getEntityFromId (externalId: String)
   * 
   * **returns** specific details of an entity
   */
  async _getEntityFromId({ externalId }: { externalId: string }): Promise<Array<{ entity: MusicEntity }>> {
      const entity = await this.entities.findOne({ externalId });
      if (!entity) return [];
      return [{ entity }];
  }

  /**
   * _getEntityFromUri (externalId: String)
   * 
   * **returns** specific details of an entity
   */
  async _getEntityFromUri({ uri }: { uri: string }): Promise<Array<{ entity: MusicEntity }>> {
      const entity = await this.entities.findOne({ uri });
      if (!entity) return [];
      return [{ entity }];
  }
}
```
