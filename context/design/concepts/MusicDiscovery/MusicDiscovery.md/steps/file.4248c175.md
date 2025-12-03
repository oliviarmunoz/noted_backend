---
timestamp: 'Mon Dec 01 2025 17:37:50 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_173750.dc5a604a.md]]'
content_id: 4248c1750c5ab12ef9790435da6df6cf53264abe9439297dc65cc8173aa00ecc
---

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.ts

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts";

const PREFIX = "MusicDiscovery.";

// Types
type User = ID;
type MusicEntity = ID;
type EntityType = "TRACK" | "ALBUM" | "ARTIST";

interface UserState {
  _id: User;
  lastQuery?: string;
}

interface MusicEntityState {
  _id: MusicEntity;
  externalId: string; // The Spotify ID
  type: EntityType;
  name: string;
  uri: string;
  imageUrl: string;
  description?: string;
  releaseDate?: string;
  artistName?: string;
  durationMs?: number;
}

interface SearchResultState {
  _id: ID;
  user: User;
  entity: MusicEntity;
}

export default class MusicDiscoveryConcept {
  users: Collection<UserState>;
  entities: Collection<MusicEntityState>;
  searchResults: Collection<SearchResultState>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.entities = this.db.collection(PREFIX + "entities");
    this.searchResults = this.db.collection(PREFIX + "searchResults");
  }

  /**
   * Helper to map Spotify raw data to our MusicEntity shape
   */
  private mapSpotifyToEntity(item: any, type: EntityType): Omit<MusicEntityState, "_id"> {
    let imageUrl = "";
    if (item.images && item.images.length > 0) {
      imageUrl = item.images[0].url;
    } else if (item.album && item.album.images && item.album.images.length > 0) {
      imageUrl = item.album.images[0].url;
    }

    let artistName = "";
    if (item.artists && item.artists.length > 0) {
      artistName = item.artists[0].name;
    }

    return {
      externalId: item.id,
      type,
      name: item.name,
      uri: item.uri,
      imageUrl,
      artistName,
      releaseDate: item.release_date || (item.album ? item.album.release_date : undefined),
      durationMs: item.duration_ms,
      description: "", // Populated if we fetch details specifically
    };
  }

  /**
   * search (user: User, query: String): (musicEntities: MusicEntity[])
   * 
   * **requires** query is not empty
   * **effects** updates lastQuery; fetches/caches entities; updates SearchResults
   */
  async search(
    { user, query }: { user: User; query: string }
  ): Promise<{ musicEntities: MusicEntityState[] } | { error: string }> {
    if (!query || query.trim() === "") {
      return { error: "Query cannot be empty" };
    }

    try {
      // 1. Update User State
      await this.users.updateOne(
        { _id: user },
        { $set: { lastQuery: query } },
        { upsert: true }
      );

      // 2. Fetch from External Service
      const results = await spotifyService.searchAll(query, 10);
      const incomingEntities: { data: Omit<MusicEntityState, "_id">; type: EntityType }[] = [];

      if (results.tracks?.items) {
        results.tracks.items.forEach((item: any) => 
          incomingEntities.push({ data: this.mapSpotifyToEntity(item, "TRACK"), type: "TRACK" }));
      }
      if (results.albums?.items) {
        results.albums.items.forEach((item: any) => 
          incomingEntities.push({ data: this.mapSpotifyToEntity(item, "ALBUM"), type: "ALBUM" }));
      }
      if (results.artists?.items) {
        results.artists.items.forEach((item: any) => 
          incomingEntities.push({ data: this.mapSpotifyToEntity(item, "ARTIST"), type: "ARTIST" }));
      }

      // 3. Upsert Entities into DB (Cache layer)
      // We need to return the full objects with our internal IDs
      const finalEntities: MusicEntityState[] = [];

      for (const entry of incomingEntities) {
        // Check if exists by externalId
        const existing = await this.entities.findOne({ externalId: entry.data.externalId });
        
        let entityId: MusicEntity;
        
        if (existing) {
          entityId = existing._id;
          // Optional: Update cache if needed, for now we assume immutable or lazy update
          finalEntities.push(existing);
        } else {
          entityId = freshID();
          const newEntity: MusicEntityState = {
            _id: entityId,
            ...entry.data
          };
          await this.entities.insertOne(newEntity);
          finalEntities.push(newEntity);
        }
      }

      // 4. Update SearchResults (Clear old -> Insert new)
      await this.searchResults.deleteMany({ user });

      if (finalEntities.length > 0) {
        const searchResultDocs = finalEntities.map(entity => ({
          _id: freshID(),
          user,
          entity: entity._id
        }));
        await this.searchResults.insertMany(searchResultDocs);
      }

      return { musicEntities: finalEntities };

    } catch (e: any) {
      return { error: `Search failed: ${e.message}` };
    }
  }

  /**
   * clearSearch (user: User): ()
   * 
   * **effects** sets lastQuery to null; removes all SearchResults for user
   */
  async clearSearch({ user }: { user: User }): Promise<Empty> {
    await this.users.updateOne(
      { _id: user },
      { $unset: { lastQuery: "" } }
    );
    await this.searchResults.deleteMany({ user });
    return {};
  }

  /**
   * loadEntityDetails (externalId: String, type: String): (musicEntity: MusicEntity)
   * 
   * **requires** externalId is valid
   * **effects** fetches detailed info; updates MusicEntity; returns it
   */
  async loadEntityDetails(
    { externalId, type }: { externalId: string; type: string }
  ): Promise<{ musicEntity: MusicEntityState } | { error: string }> {
    try {
      let rawData: any;
      const entityType = type.toUpperCase() as EntityType;

      // Fetch specific details based on type
      if (entityType === "TRACK") {
        rawData = await spotifyService.getTrack(externalId);
      } else if (entityType === "ALBUM") {
        rawData = await spotifyService.getAlbum(externalId);
      } else if (entityType === "ARTIST") {
        rawData = await spotifyService.getArtist(externalId);
      } else {
        return { error: "Invalid entity type" };
      }

      const mappedData = this.mapSpotifyToEntity(rawData, entityType);
      
      // Update existing or insert new
      const existing = await this.entities.findOne({ externalId });
      let finalDoc: MusicEntityState;

      if (existing) {
        await this.entities.updateOne(
          { _id: existing._id },
          { $set: mappedData }
        );
        finalDoc = { ...existing, ...mappedData };
      } else {
        finalDoc = {
          _id: freshID(),
          ...mappedData
        };
        await this.entities.insertOne(finalDoc);
      }

      return { musicEntity: finalDoc };

    } catch (e: any) {
      return { error: `Failed to load details: ${e.message}` };
    }
  }

  // Queries

  /**
   * _getSearchResults (user: User): (musicEntities: MusicEntity[])
   */
  async _getSearchResults({ user }: { user: User }): Promise<{ musicEntities: MusicEntityState[] }[]> {
    const results = await this.searchResults.find({ user }).toArray();
    
    // Manual join to get the actual entities
    const entities: MusicEntityState[] = [];
    for (const res of results) {
      const entity = await this.entities.findOne({ _id: res.entity });
      if (entity) {
        entities.push(entity);
      }
    }

    // Queries must return an array of objects matching the return signature
    // The signature says (musicEntities: MusicEntity[]), so we wrap the result
    return [{ musicEntities: entities }];
  }

  /**
   * _getEntityByExternalId (externalId: String): (musicEntity: MusicEntity)
   */
  async _getEntityByExternalId(
    { externalId }: { externalId: string }
  ): Promise<{ musicEntity: MusicEntityState }[]> {
    const entity = await this.entities.findOne({ externalId });
    if (!entity) {
      return [];
    }
    return [{ musicEntity: entity }];
  }
}
```
