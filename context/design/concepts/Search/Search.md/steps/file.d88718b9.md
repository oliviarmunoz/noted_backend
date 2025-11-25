---
timestamp: 'Mon Nov 24 2025 18:50:21 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_185021.26a75bf9.md]]'
content_id: d88718b913d81ad17f613c640e9f0894f255f8199c00bec553f548272fe5e401
---

# file: src/concepts/MusicSearch/MusicSearchConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts";

const PREFIX = "MusicSearch.";

// Generic parameters
type Actor = ID;

// State Types
type ItemType = "TRACK" | "ALBUM" | "ARTIST";

interface ActorState {
  _id: Actor;
  lastQuery: string;
  lastSearchTime: number;
}

interface Item {
  _id: ID;
  owner: Actor;
  type: ItemType;
  externalId: string;
  name: string;
  description: string; // Artist name for tracks, "Artist" for artists, etc.
  uri: string;
  imageUrl: string;
}

export default class MusicSearchConcept {
  actors: Collection<ActorState>;
  items: Collection<Item>;

  constructor(private readonly db: Db) {
    this.actors = this.db.collection(PREFIX + "actors");
    this.items = this.db.collection(PREFIX + "items");
  }

  /**
   * search (actor: Actor, query: String)
   *
   * **requires** query is not empty
   *
   * **effects**
   *   - removes all Items where owner is `actor`
   *   - sets lastQuery of `actor` to `query`
   *   - fetches results from Spotify
   *   - creates new Items for `actor`
   */
  async search(
    { actor, query }: { actor: Actor; query: string },
  ): Promise<{ success: boolean } | { error: string }> {
    if (!query || query.trim() === "") {
      return { error: "Query cannot be empty" };
    }

    try {
      // 1. Update Actor state
      await this.actors.updateOne(
        { _id: actor },
        {
          $set: {
            lastQuery: query,
            lastSearchTime: Date.now(),
          },
        },
        { upsert: true },
      );

      // 2. Clear previous results for this actor (Principle: replacing previous results)
      await this.items.deleteMany({ owner: actor });

      // 3. Perform External Search
      const results = await spotifyService.searchAll(query, 10);
      const newItems: Item[] = [];

      // Helper to map Spotify images
      // deno-lint-ignore no-explicit-any
      const getImage = (images: any[]) => {
        return images && images.length > 0 ? images[0].url : "";
      };

      // 4. Map Results to State
      // Handle Tracks
      if (results.tracks?.items) {
        // deno-lint-ignore no-explicit-any
        results.tracks.items.forEach((track: any) => {
          newItems.push({
            _id: freshID(),
            owner: actor,
            type: "TRACK",
            externalId: track.id,
            name: track.name,
            description: track.artists
              ? track.artists.map((a: any) => a.name).join(", ")
              : "Unknown Artist",
            uri: track.uri,
            imageUrl: getImage(track.album?.images),
          });
        });
      }

      // Handle Albums
      if (results.albums?.items) {
        // deno-lint-ignore no-explicit-any
        results.albums.items.forEach((album: any) => {
          newItems.push({
            _id: freshID(),
            owner: actor,
            type: "ALBUM",
            externalId: album.id,
            name: album.name,
            description: album.artists
              ? "Album • " + album.artists.map((a: any) => a.name).join(", ")
              : "Album",
            uri: album.uri,
            imageUrl: getImage(album.images),
          });
        });
      }

      // Handle Artists
      if (results.artists?.items) {
        // deno-lint-ignore no-explicit-any
        results.artists.items.forEach((artist: any) => {
          newItems.push({
            _id: freshID(),
            owner: actor,
            type: "ARTIST",
            externalId: artist.id,
            name: artist.name,
            description: "Artist",
            uri: artist.uri,
            imageUrl: getImage(artist.images),
          });
        });
      }

      // 5. Insert new state
      if (newItems.length > 0) {
        await this.items.insertMany(newItems);
      }

      return { success: true };
    } catch (e) {
      // In concept design, we capture external failures as errors
      return { error: e instanceof Error ? e.message : "Search failed" };
    }
  }

  /**
   * clearSearch (actor: Actor)
   *
   * **requires** true
   *
   * **effects**
   *   - removes all Items where owner is `actor`
   *   - removes lastQuery of `actor`
   */
  async clearSearch({ actor }: { actor: Actor }): Promise<Empty> {
    await this.items.deleteMany({ owner: actor });
    await this.actors.deleteOne({ _id: actor });
    return {};
  }

  /**
   * _getResults (actor: Actor)
   *
   * **requires** actor exists
   * **effects** returns list of Items currently held in state for actor
   */
  async _getResults({ actor }: { actor: Actor }): Promise<Item[]> {
    return await this.items.find({ owner: actor }).toArray();
  }

  /**
   * _getLastSearch (actor: Actor)
   *
   * **requires** actor exists
   * **effects** returns metadata about the last search performed
   */
  async _getLastSearch(
    { actor }: { actor: Actor },
  ): Promise<Partial<ActorState>[]> {
    const state = await this.actors.findOne({ _id: actor });
    return state ? [state] : [];
  }
}
```
