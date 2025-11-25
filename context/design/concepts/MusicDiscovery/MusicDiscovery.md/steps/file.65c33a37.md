---
timestamp: 'Mon Nov 24 2025 20:29:39 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_202939.f05900cc.md]]'
content_id: 65c33a37f6c92831b431745c68c9efe22519d0d0452e9cd1d32f84b43ae02fca
---

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
