---
timestamp: 'Mon Dec 01 2025 18:00:30 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_180030.69184e1e.md]]'
content_id: cac9b757eec8610cacdaf111794cf0633cc0475b4ea99ef125f2e308d5403067
---

# file: src/utils/spotify.ts

````typescript
import "jsr:@std/dotenv/load";

const CLIENT_ID = Deno.env.get("CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("CLIENT_SECRET");

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("CLIENT_ID and CLIENT_SECRET must be set in environment variables");
}

/**
 * Spotify API Service
 * strictly handles the HTTP communication. 
 * The Concept handles the logic of what to do with the data.
 */
export class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }
    const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
2. The Revised Concept
We drop `lastQuery`. The Concept is now a **Lazy-Loading Catalog**. It stores music entities. If a user asks for something, the Concept checks if it has it; if not, it fetches it from Spotify, saves it to State, and returns it.

# concept: MusicDiscovery

**purpose** Model a catalog of music entities (artists, albums, tracks) that can be explored and referenced by other parts of the system.

**principle** The system maintains a catalog of music entities. When a user requests information (like searching for a name or listing an artist's albums), the system retrieves the data from an external source, integrates it into the persistent catalog, and returns the entities.

**state**

* a set of MusicEntities with
  * an externalId String
  * a type of TRACK or ALBUM or ARTIST
  * a name String
  * a uri String
  * a imageUrl String
  * a artistName String
  * a description String

* // Note: No user-specific state. This is a shared catalog.

**actions**

* search (query: String, type: String): (items: MusicEntity\[])
  * **requires** query is not empty
  * **effects** fetches matches from external source; upserts matches into `MusicEntities`; returns the matches.

* getArtist (externalId: String): (artist: MusicEntity)
  * **requires** externalId exists
  * **effects** fetches artist details; upserts into `MusicEntities`; returns the artist.

* getArtistAlbums (artistId: String): (albums: MusicEntity\[])
  * **requires** artistId refers to a valid artist
  * **effects** fetches album list for artist; upserts albums into `MusicEntities`; returns the albums.

* getAlbumTracks (albumId: String): (tracks: MusicEntity\[])
  * **requires** albumId refers to a valid album
  * **effects** fetches track list for album; upserts tracks into `MusicEntities`; returns the tracks.

**queries**

* \_getEntity (externalId: String): (entity: MusicEntity)
  * returns the entity from the local catalog if it exists.

# file: src/concepts/MusicDiscovery/MusicDiscoveryConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts";

const PREFIX = "MusicDiscovery.";

type MusicEntity = ID;
type EntityType = "TRACK" | "ALBUM" | "ARTIST";

/**
 * a set of MusicEntities
 */
interface MusicEntityState {
  _id: MusicEntity;
  externalId: string;
  type: EntityType;
  name: string;
  uri: string;
  imageUrl: string;
  artistName?: string;
  description?: string; 
  // We keep the state simple and flat as per Concept Design principles
}

export default class MusicDiscoveryConcept {
  entities: Collection<MusicEntityState>;

  constructor(private readonly db: Db) {
    this.entities = this.db.collection(PREFIX + "entities");
  }

  /**
   * Helper: Maps raw Spotify JSON to our State shape.
   * This keeps the "External" world separate from our "Internal" state.
   */
  private mapToState(item: any, type: EntityType): Omit<MusicEntityState, "_id"> {
    // Image handling: Tracks/Artists/Albums have different image structures in Spotify
    let imageUrl = "";
    const images = item.images || (item.album ? item.album.images : []);
    if (images && images.length > 0) imageUrl = images[0].url;

    // Artist name handling
    let artistName = "";
    if (item.artists && item.artists.length > 0) artistName = item.artists[0].name;

    return {
      externalId: item.id,
      type,
      name: item.name,
      uri: item.uri,
      imageUrl,
      artistName,
      description: "", 
    };
  }

  /**
   * Helper: Upserts (Updates or Inserts) items into the DB.
   * This implements the "Caching" behavior of the concept.
   */
  private async syncToDatabase(
    items: { data: Omit<MusicEntityState, "_id"> }[]
  ): Promise<MusicEntityState[]> {
    const results: MusicEntityState[] = [];

    for (const item of items) {
      const existing = await this.entities.findOne({ externalId: item.data.externalId });
      
      if (existing) {
        // Update existing entry with fresh data
        await this.entities.updateOne(
          { _id: existing._id },
          { $set: item.data }
        );
        results.push({ ...existing, ...item.data });
      } else {
        // Create new entry
        const newItem = { _id: freshID(), ...item.data };
        await this.entities.insertOne(newItem);
        results.push(newItem);
      }
    }
    return results;
  }

  /**
   * search (query: String, type: String): (items: MusicEntity[])
   * 
   * **requires** query is not empty
   * **effects** fetches data, updates catalog, returns items
   */
  async search(
    { query, type }: { query: string; type: string }
  ): Promise<{ items: MusicEntityState[] } | { error: string }> {
    if (!query) return { error: "Query is required" };
    
    // Normalize type
    const searchType = type.toLowerCase();
    if (!["track", "album", "artist"].includes(searchType)) {
      return { error: "Type must be track, album, or artist" };
    }

    try {
      // 1. Fetch from External
      const response = await spotifyService.search(query, searchType);
      
      // 2. Map Response
      const incoming: { data: Omit<MusicEntityState, "_id"> }[] = [];
      const pluralKey = searchType + "s"; // track -> tracks
      
      if (response[pluralKey] && response[pluralKey].items) {
        response[pluralKey].items.forEach((item: any) => {
          incoming.push({ 
            data: this.mapToState(item, searchType.toUpperCase() as EntityType) 
          });
        });
      }

      // 3. Update State
      const items = await this.syncToDatabase(incoming);

      return { items };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * getArtist (externalId: String): (artist: MusicEntity)
   * 
   * **effects** fetches artist details, updates catalog, returns artist
   */
  async getArtist(
    { externalId }: { externalId: string }
  ): Promise<{ artist: MusicEntityState } | { error: string }> {
    try {
      const raw = await spotifyService.getArtist(externalId);
      const mapped = this.mapToState(raw, "ARTIST");
      const [artist] = await this.syncToDatabase([{ data: mapped }]);
      return { artist };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * getArtistAlbums (artistId: String): (albums: MusicEntity[])
   * 
   * **effects** fetches albums for artist, updates catalog, returns albums
   */
  async getArtistAlbums(
    { artistId }: { artistId: string }
  ): Promise<{ albums: MusicEntityState[] } | { error: string }> {
    try {
      const response = await spotifyService.getArtistAlbums(artistId);
      
      const incoming: { data: Omit<MusicEntityState, "_id"> }[] = [];
      if (response.items) {
        response.items.forEach((item: any) => {
          incoming.push({ data: this.mapToState(item, "ALBUM") });
        });
      }

      const albums = await this.syncToDatabase(incoming);
      return { albums };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * getAlbumTracks (albumId: String): (tracks: MusicEntity[])
   * 
   * **effects** fetches tracks for album, updates catalog, returns tracks
   */
  async getAlbumTracks(
    { albumId }: { albumId: string }
  ): Promise<{ tracks: MusicEntityState[] } | { error: string }> {
    try {
      const response = await spotifyService.getAlbumTracks(albumId);
      
      const incoming: { data: Omit<MusicEntityState, "_id"> }[] = [];
      if (response.items) {
        response.items.forEach((item: any) => {
          incoming.push({ data: this.mapToState(item, "TRACK") });
        });
      }

      const tracks = await this.syncToDatabase(incoming);
      return { tracks };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  // --- Queries (Read Only) ---

  /**
   * _getEntity (externalId: String): (entity: MusicEntity)
   */
  async _getEntity(
    { externalId }: { externalId: string }
  ): Promise<{ entity: MusicEntityState }[]> {
    const entity = await this.entities.findOne({ externalId });
    return entity ? [{ entity }] : [];
  }
}
````
