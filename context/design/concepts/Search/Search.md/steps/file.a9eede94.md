---
timestamp: 'Mon Nov 24 2025 18:42:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_184214.52af98fa.md]]'
content_id: a9eede94dec3b240cc5636e308a715a9bd996671c2a032dd79b03239674e6640
---

# file: src/concepts/SpotifySearch/SpotifySearchConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { spotifyService } from "@utils/spotify.ts"; // Import the singleton SpotifyService

// Declare collection prefix
const PREFIX = "SpotifySearch" + ".";

/**
 * SpotifySearchID - internal ID for a search interaction record
 */
type SearchID = ID;
/**
 * ResultInfoID - internal ID for a specific item found in a search result
 */
type ResultInfoID = ID;

/**
 * a set of SearchInteractions with
 *   _id SearchID
 *   query String
 *   searchType String
 *   timestamp Number
 */
interface SearchInteractionDoc {
  _id: SearchID;
  query: string;
  searchType: string;
  timestamp: number;
}

/**
 * a set of SearchResultInfos with
 *   _id ResultInfoID
 *   spotifyId String
 *   itemType String
 *   searchRef SearchID
 */
interface SearchResultInfoDoc {
  _id: ResultInfoID;
  spotifyId: string;
  itemType: string;
  searchRef: SearchID; // Foreign key to SearchInteractionDoc
}

// Type for the `results` part of the search action's return and `_getSearchResults` query
interface SearchResultOutput {
  spotifyId: string;
  itemType: string;
}

export default class SpotifySearchConcept {
  private searchInteractions: Collection<SearchInteractionDoc>;
  private searchResultInfos: Collection<SearchResultInfoDoc>;

  constructor(private readonly db: Db) {
    this.searchInteractions = this.db.collection(PREFIX + "searchInteractions");
    this.searchResultInfos = this.db.collection(PREFIX + "searchResultInfos");
  }

  /**
   * search (query: String, type?: String) : (searchInteractionId: SearchID, results: {spotifyId: String, itemType: String}[])
   *
   * **requires** `query` is not empty.
   *
   * **effects**
   *   creates a new `SearchInteraction` `si` with a fresh `SearchID`;
   *   sets `si.query` to `query`;
   *   sets `si.searchType` to `type` (defaulting to "track,album,artist" if not provided);
   *   sets `si.timestamp` to the current time;
   *   calls `spotifyService.search` with `query` and `type`;
   *   for each item in the `spotifyService` response (up to `limit` items, e.g., 20):
   *       creates a new `SearchResultInfo` `sri` with a fresh `ResultInfoID`;
   *       sets `sri.spotifyId` to the item's Spotify ID;
   *       sets `sri.itemType` to the item's type (e.g., "track", "album", "artist");
   *       sets `sri.searchRef` to `si._id`;
   *       adds `sri` to the set of `SearchResultInfos` entities;
   *   returns `si._id` as `searchInteractionId` and an array of objects `{spotifyId: sri.spotifyId, itemType: sri.itemType}` for all `sri` associated with `si`.
   */
  async search(
    { query, type }: { query: string; type?: string },
  ): Promise<{ searchInteractionId: SearchID; results: SearchResultOutput[] } | { error: string }> {
    if (!query) {
      return { error: "Search query cannot be empty" };
    }

    const searchId = freshID();
    // Default to searching all common types if 'type' is not specified
    const defaultSearchType = "track,album,artist";
    const actualSearchType = type || defaultSearchType;

    try {
      const spotifyResults = await spotifyService.search({
        query,
        type: actualSearchType,
        limit: 20, // Limiting stored results to 20 for each type to avoid excessive state
      });

      const searchInteraction: SearchInteractionDoc = {
        _id: searchId,
        query,
        searchType: actualSearchType,
        timestamp: Date.now(),
      };
      await this.searchInteractions.insertOne(searchInteraction);

      const createdResultInfos: SearchResultOutput[] = [];

      // Helper to process items from different Spotify result categories
      const processItems = async (
        items: any[],
        itemType: string,
      ) => {
        if (!items || items.length === 0) return;
        for (const item of items) {
          const resultInfoId = freshID();
          const resultInfo: SearchResultInfoDoc = {
            _id: resultInfoId,
            spotifyId: item.id,
            itemType: itemType,
            searchRef: searchId,
          };
          await this.searchResultInfos.insertOne(resultInfo);
          createdResultInfos.push({
            spotifyId: item.id,
            itemType: itemType,
          });
        }
      };

      // Process tracks, albums, and artists if they are present in the Spotify response
      if (spotifyResults.tracks?.items) {
        await processItems(spotifyResults.tracks.items, "track");
      }
      if (spotifyResults.albums?.items) {
        await processItems(spotifyResults.albums.items, "album");
      }
      if (spotifyResults.artists?.items) {
        await processItems(spotifyResults.artists.items, "artist");
      }

      return {
        searchInteractionId: searchId,
        results: createdResultInfos,
      };
    } catch (error) {
      console.error("Spotify search action failed:", error);
      // Return a structured error response
      return { error: `Failed to perform Spotify search: ${error.message}` };
    }
  }

  /**
   * _getTrackDetails (trackId: String) : (details: Object)
   *
   * **requires** `trackId` is a valid Spotify track ID string.
   *
   * **effects** calls `spotifyService.getTrack(trackId)` and returns the full JSON response from Spotify as `details`. If the ID is invalid or not found, returns `{error: "Track not found"}`.
   */
  async _getTrackDetails(
    { trackId }: { trackId: string },
  ): Promise<object[] | { error: string }> {
    try {
      const details = await spotifyService.getTrack(trackId);
      return [details]; // Queries must return an array of dictionaries
    } catch (error) {
      console.error("Failed to get track details:", error);
      return { error: `Track not found or Spotify API error: ${error.message}` };
    }
  }

  /**
   * _getAlbumDetails (albumId: String) : (details: Object)
   *
   * **requires** `albumId` is a valid Spotify album ID string.
   *
   * **effects** calls `spotifyService.getAlbum(albumId)` and returns the full JSON response from Spotify as `details`. If the ID is invalid or not found, returns `{error: "Album not found"}`.
   */
  async _getAlbumDetails(
    { albumId }: { albumId: string },
  ): Promise<object[] | { error: string }> {
    try {
      const details = await spotifyService.getAlbum(albumId);
      return [details]; // Queries must return an array of dictionaries
    } catch (error) {
      console.error("Failed to get album details:", error);
      return { error: `Album not found or Spotify API error: ${error.message}` };
    }
  }

  /**
   * _getArtistDetails (artistId: String) : (details: Object)
   *
   * **requires** `artistId` is a valid Spotify artist ID string.
   *
   * **effects** calls `spotifyService.getArtist(artistId)` and returns the full JSON response from Spotify as `details`. If the ID is invalid or not found, returns `{error: "Artist not found"}`.
   */
  async _getArtistDetails(
    { artistId }: { artistId: string },
  ): Promise<object[] | { error: string }> {
    try {
      const details = await spotifyService.getArtist(artistId);
      return [details]; // Queries must return an array of dictionaries
    } catch (error) {
      console.error("Failed to get artist details:", error);
      return { error: `Artist not found or Spotify API error: ${error.message}` };
    }
  }

  /**
   * _getAlbumTracks (albumId: String) : (tracks: Object[])
   *
   * **requires** `albumId` is a valid Spotify album ID string.
   *
   * **effects** calls `spotifyService.getAlbumTracks(albumId)` and returns an array of track objects from Spotify as `tracks`. If the ID is invalid or not found, returns `{error: "Album not found or has no tracks"}`.
   */
  async _getAlbumTracks(
    { albumId }: { albumId: string },
  ): Promise<{ tracks: object[] }[] | { error: string }> {
    try {
      const response = await spotifyService.getAlbumTracks(albumId);
      // The Spotify API returns { items: [...] } so we extract the array
      // Queries must return an array of dictionaries, so we wrap the extracted array in an object
      return [{ tracks: response.items }];
    } catch (error) {
      console.error("Failed to get album tracks:", error);
      return {
        error: `Album not found, has no tracks, or Spotify API error: ${error.message}`,
      };
    }
  }

  /**
   * _getSearchResults (searchInteractionId: SearchID) : (results: {spotifyId: String, itemType: String}[])
   *
   * **requires** a `SearchInteraction` with `searchInteractionId` exists.
   *
   * **effects** returns an array of objects `{spotifyId: sri.spotifyId, itemType: sri.itemType}` for all `SearchResultInfo` `sri` where `sri.searchRef` is `searchInteractionId`. Returns an empty array if no such search interaction or results are found.
   */
  async _getSearchResults(
    { searchInteractionId }: { searchInteractionId: SearchID },
  ): Promise<{ results: SearchResultOutput[] }[] | { error: string }> {
    try {
      const results = await this.searchResultInfos.find({
        searchRef: searchInteractionId,
      }).toArray();

      const outputResults: SearchResultOutput[] = results.map((r) => ({
        spotifyId: r.spotifyId,
        itemType: r.itemType,
      }));

      // Queries return an array of dictionaries, so we wrap the array of results in an object, then in an array
      return [{ results: outputResults }];
    } catch (error) {
      console.error("Failed to retrieve search results:", error);
      return { error: `Failed to get search results: ${error.message}` };
    }
  }
}
```
