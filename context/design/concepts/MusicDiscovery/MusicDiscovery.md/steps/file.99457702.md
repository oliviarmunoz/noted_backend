---
timestamp: 'Mon Dec 01 2025 17:58:52 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_175852.1a024701.md]]'
content_id: 994577020b19dc377cf34d1fd76b8023987cf485c1c99719e8648e1cb9e4cb80
---

# file: src/utils/spotify.ts

```typescript
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
        "Authorization": "Basic " + authString,
      },
    });
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  private async fetch(endpoint: string, params?: Record<string, string>) {
    const token = await this.getAccessToken();
    const url = new URL("https://api.spotify.com/v1" + endpoint);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    
    const res = await fetch(url.toString(), {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`Spotify Error: ${res.statusText}`);
    return await res.json();
  }

  // --- Granular Endpoints needed for the Concept ---

  async search(query: string, type: string) {
    return this.fetch("/search", { q: query, type, limit: "10" });
  }

  async getArtist(id: string) {
    return this.fetch(`/artists/${id}`);
  }

  async getArtistAlbums(id: string) {
    // include_groups=album,single to avoid duplicates/compilations if desired
    return this.fetch(`/artists/${id}/albums`, { limit: "20", include_groups: "album,single" });
  }

  async getAlbum(id: string) {
    return this.fetch(`/albums/${id}`);
  }

  async getAlbumTracks(id: string) {
    return this.fetch(`/albums/${id}/tracks`, { limit: "50" });
  }

  async getTrack(id: string) {
    return this.fetch(`/tracks/${id}`);
  }
}

export const spotifyService = new SpotifyService();
```

### 2. The Revised Concept

We drop `lastQuery`. The Concept is now a **Lazy-Loading Catalog**. It stores music entities. If a user asks for something, the Concept checks if it has it; if not, it fetches it from Spotify, saves it to State, and returns it.
