---
timestamp: 'Mon Nov 24 2025 21:15:34 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_211534.9e78fb25.md]]'
content_id: c8d4fa77be7faf457cbfcc5807ce9ac84ff262f179bda8b1eb1382487af908cc
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
 *   a name String
 *   a uri String
 *   a imageUrl String
 *   a description String
 *   a releaseDate String
 *   a durationMs Number
 *   a artistName String
 */
export interface MusicEntity {
  _id: MusicEntityID;
  externalId: string;
  type: "track" | "album" | "artist";
  name: string;
  uri: string;
  imageUrl: string;
  description: string;
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
 * a set of Users with
 *   a lastQuery String
 */
interface UserState {
  _id: User;
  lastQuery: string;
}

/**
 * @concept MusicDiscovery [User]
 * @purpose Enable the exploration of a global music catalog and the preservation of search context.
 */
export default class MusicDiscoveryConcept {
  entities: Collection<MusicEntity>;
  searchResults: Collection<SearchResult>;
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

    // Safely extract image
    let imageUrl = "";
    if (item.images && item.images.length > 0) imageUrl = item.images[0].url;
    else if (item.album && item.album.images && item.album.images.length > 0) imageUrl = item.album.images[0].url;

    // Safely extract artist name
    let artistName = "";
    if (item.artists && item.artists.length > 0) artistName = item.artists[0].name;

    // Determine description based on type
    let description = "";
    if (type === 'artist') {
      description = (item.genres || []).join(", ");
    } else {
      description = item.type;
    }

    if (existing) {
      // update details if they exist in this payload
      const updates: Partial<MusicEntity> = {};
      if (imageUrl) updates.imageUrl = imageUrl;
      if (item.release_date) updates.releaseDate = item.release_date;
      // We don't overwrite description if it exists, as loadEntityDetails might have fetched a better one
      
      await this.entities.updateOne({ _id: existing._id }, { $set: updates });
      return existing._id;
    }

    const _id = freshID();

    await this.entities.insertOne({
      _id,
      externalId: item.id,
      type,
      name: item.name,
      uri: item.uri,
      imageUrl,
      description,
      durationMs: item.duration_ms,
      releaseDate: item.release_date,
      artistName
    });

    return _id;
  }

  /**
   * search (user: User, query: String): (musicEntities: MusicEntity[])
   * 
   * **requires** query is not empty
   * **effects** updates lastQuery of user, removes all SearchResults for user, fetches data from external service, creates/updates MusicEntities based on results, creates SearchResults linking user to the new entities
   */
  async search({ user, query }: { user: User; query: string }): Promise<{ musicEntities: MusicEntity[] } | { error: string }> {
    if (!query) return { error: "Query cannot be empty" };

    // Update User State
    await this.users.updateOne(
      { _id: user },
      { $set: { lastQuery: query } },
      { upsert: true }
    );

    let data;
    try {
      // Fetch from Spotify
      data = await spotifyService.searchAll(query, 10);
    } catch (e: any) {
      return { error: `Spotify Error: ${e.message}` };
    }

    // Clear old results for this user
    await this.searchResults.deleteMany({ user });

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
    
    // Return the entities found (Action return, not Query)
    const entities = await this.entities.find({ _id: { $in: resultIds } }).toArray();
    return { musicEntities: entities };
  }

  /**
   * clearSearch (user: User): ()
   * 
   * **effects** removes all SearchResults where owner is user
   */
  async clearSearch({ user }: { user: User }): Promise<Empty> {
    await this.searchResults.deleteMany({ user });
    // Also optional: clear lastQuery from user state? Spec says "removes all SearchResults", doesn't explicitly say clear lastQuery string, but it makes sense.
    // However, adhering strictly to "removes all SearchResults where owner is user"
    return {};
  }

  /**
   * loadEntityDetails (externalId: String, type: String): (music: MusicEntity)
   * 
   * **requires** externalId is valid
   * **effects** fetches detailed info from external service, updates the specific MusicEntity with richer data, and returns the corresponding MusicEntity
   */
  async loadEntityDetails({ externalId, type }: { externalId: string, type: string }): Promise<{ music: MusicEntity } | { error: string }> {
    let musicEntityId: MusicEntityID;
    
    try {
      let data;
      if (type === 'track') data = await spotifyService.getTrack(externalId);
      else if (type === 'album') data = await spotifyService.getAlbum(externalId);
      else if (type === 'artist') data = await spotifyService.getArtist(externalId);
      else return { error: "Invalid type. Must be track, album, or artist." };

      musicEntityId = await this.upsertSpotifyItem(data, type as "track" | "album" | "artist");
    } catch (e: any) {
      return { error: `Spotify Error: ${e.message}` };
    }

    const music = await this.entities.findOne({ _id: musicEntityId });
    if (!music) return { error: "Failed to load entity" };

    return { music };
  }

  // --- QUERIES ---

  /**
   * _getSearchResults (user: User): (musicEntities: MusicEntity[])
   * 
   * **returns** the music entities tied to the search results that correspond to the given user
   */
  async _getSearchResults({ user }: { user: User }): Promise<{ musicEntity: MusicEntity }[]> {
    const results = await this.searchResults.find({ user }).toArray();
    const entityIds = results.map(r => r.entity);

    // Single DB call
    const entities = await this.entities.find({ _id: { $in: entityIds } }).toArray();

    // Return as array of dictionaries with field matching the singular of the requested data,
    // or typically we map to the object itself. 
    // Following the pattern: return array of objects { musicEntity: ... }
    return entities.map(e => ({ musicEntity: e }));
  }

  /**
   * _getEntityFromId (externalId: String): (musicEntity: MusicEntity)
   * 
   * **returns** the music entity with the given external id
   */
  async _getEntityFromId({ externalId }: { externalId: string }): Promise<{ musicEntity: MusicEntity }[]> {
    const entity = await this.entities.findOne({ externalId });
    if (!entity) return [];
    return [{ musicEntity: entity }];
  }

  /**
   * _getEntityFromUri (uri: String): (musicEntity: MusicEntity)
   * 
   * **returns** the music entity with the given external uri
   */
  async _getEntityFromUri({ uri }: { uri: string }): Promise<{ musicEntity: MusicEntity }[]> {
    const entity = await this.entities.findOne({ uri });
    if (!entity) return [];
    return [{ musicEntity: entity }];
  }
}
```
