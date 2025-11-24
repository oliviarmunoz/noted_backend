# API Specification: Spotify Integration

**Purpose:** Provide access to Spotify Web API functionality for searching and retrieving music data.

**Note:** All endpoints require backend authentication using client credentials. The frontend should call these backend endpoints rather than calling Spotify directly.

---

## API Endpoints

### POST /api/Spotify/search

**Description:** Search for tracks, albums, artists, or playlists on Spotify.

**Request Body:**
```json
{
  "query": "string",
  "type": "track" | "album" | "artist" | "playlist" | "track,album,artist",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `query` (required): Search query string
- `type` (optional): Type of content to search. Default: `"track"`. Can be a single type or comma-separated types (e.g., `"track,album,artist"`)
- `limit` (optional): Maximum number of results to return. Default: `20`. Range: 1-50
- `offset` (optional): Index of the first result to return. Default: `0`. Use for pagination

**Success Response Body:**
```json
{
  "tracks": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "artists": [
          {
            "id": "string",
            "name": "string"
          }
        ],
        "album": {
          "id": "string",
          "name": "string",
          "images": [
            {
              "url": "string",
              "height": 640,
              "width": 640
            }
          ]
        },
        "external_urls": {
          "spotify": "string"
        },
        "uri": "string",
        "duration_ms": 0,
        "preview_url": "string | null"
      }
    ],
    "total": 0,
    "limit": 20,
    "offset": 0
  },
  "albums": { ... },
  "artists": { ... },
  "playlists": { ... }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/searchTracks

**Description:** Convenience method to search specifically for tracks.

**Request Body:**
```json
{
  "query": "string",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results to return. Default: `20`. Range: 1-50
- `offset` (optional): Index of the first result to return. Default: `0`

**Success Response Body:**
```json
{
  "tracks": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "artists": [
          {
            "id": "string",
            "name": "string"
          }
        ],
        "album": {
          "id": "string",
          "name": "string",
          "images": [
            {
              "url": "string",
              "height": 640,
              "width": 640
            }
          ]
        },
        "external_urls": {
          "spotify": "string"
        },
        "uri": "string",
        "duration_ms": 0,
        "preview_url": "string | null"
      }
    ],
    "total": 0,
    "limit": 20,
    "offset": 0
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/searchAlbums

**Description:** Convenience method to search specifically for albums.

**Request Body:**
```json
{
  "query": "string",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results to return. Default: `20`. Range: 1-50
- `offset` (optional): Index of the first result to return. Default: `0`

**Success Response Body:**
```json
{
  "albums": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "artists": [
          {
            "id": "string",
            "name": "string"
          }
        ],
        "images": [
          {
            "url": "string",
            "height": 640,
            "width": 640
          }
        ],
        "external_urls": {
          "spotify": "string"
        },
        "uri": "string",
        "release_date": "string",
        "total_tracks": 0
      }
    ],
    "total": 0,
    "limit": 20,
    "offset": 0
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/searchArtists

**Description:** Convenience method to search specifically for artists.

**Request Body:**
```json
{
  "query": "string",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results to return. Default: `20`. Range: 1-50
- `offset` (optional): Index of the first result to return. Default: `0`

**Success Response Body:**
```json
{
  "artists": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "images": [
          {
            "url": "string",
            "height": 640,
            "width": 640
          }
        ],
        "external_urls": {
          "spotify": "string"
        },
        "uri": "string",
        "followers": {
          "total": 0
        },
        "genres": ["string"]
      }
    ],
    "total": 0,
    "limit": 20,
    "offset": 0
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/searchAll

**Description:** Search across tracks, albums, and artists simultaneously. Useful when the type of content is unknown.

**Request Body:**
```json
{
  "query": "string",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `query` (required): Search query string
- `limit` (optional): Maximum number of results to return. Default: `20`. Range: 1-50
- `offset` (optional): Index of the first result to return. Default: `0`

**Success Response Body:**
```json
{
  "tracks": { ... },
  "albums": { ... },
  "artists": { ... }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/getTrack

**Description:** Get detailed information about a specific track by its Spotify ID.

**Request Body:**
```json
{
  "trackId": "string"
}
```

**Parameters:**
- `trackId` (required): Spotify track ID (e.g., `"11EX5yhxr9Ihl3IN1asrfK"`)

**Success Response Body:**
```json
{
  "id": "string",
  "name": "string",
  "artists": [
    {
      "id": "string",
      "name": "string",
      "external_urls": {
        "spotify": "string"
      }
    }
  ],
  "album": {
    "id": "string",
    "name": "string",
    "images": [
      {
        "url": "string",
        "height": 640,
        "width": 640
      }
    ],
    "external_urls": {
      "spotify": "string"
    }
  },
  "external_urls": {
    "spotify": "string"
  },
  "uri": "string",
  "duration_ms": 0,
  "preview_url": "string | null",
  "popularity": 0
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/getAlbum

**Description:** Get detailed information about a specific album by its Spotify ID.

**Request Body:**
```json
{
  "albumId": "string"
}
```

**Parameters:**
- `albumId` (required): Spotify album ID

**Success Response Body:**
```json
{
  "id": "string",
  "name": "string",
  "artists": [
    {
      "id": "string",
      "name": "string"
    }
  ],
  "images": [
    {
      "url": "string",
      "height": 640,
      "width": 640
    }
  ],
  "external_urls": {
    "spotify": "string"
  },
  "uri": "string",
  "release_date": "string",
  "total_tracks": 0,
  "tracks": {
    "items": [
      {
        "id": "string",
        "name": "string",
        "artists": [
          {
            "id": "string",
            "name": "string"
          }
        ],
        "duration_ms": 0,
        "uri": "string"
      }
    ]
  }
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/getArtist

**Description:** Get detailed information about a specific artist by their Spotify ID.

**Request Body:**
```json
{
  "artistId": "string"
}
```

**Parameters:**
- `artistId` (required): Spotify artist ID

**Success Response Body:**
```json
{
  "id": "string",
  "name": "string",
  "images": [
    {
      "url": "string",
      "height": 640,
      "width": 640
    }
  ],
  "external_urls": {
    "spotify": "string"
  },
  "uri": "string",
  "followers": {
    "total": 0
  },
  "genres": ["string"],
  "popularity": 0
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Spotify/getAlbumTracks

**Description:** Get all tracks from a specific album by its Spotify ID.

**Request Body:**
```json
{
  "albumId": "string",
  "market": "US",
  "limit": 20,
  "offset": 0
}
```

**Parameters:**
- `albumId` (required): Spotify album ID
- `market` (optional): ISO 3166-1 alpha-2 country code (e.g., `"US"`, `"GB"`). Used for market-specific content availability
- `limit` (optional): Maximum number of tracks to return. Default: `20`. Range: 1-50
- `offset` (optional): Index of the first track to return. Default: `0`. Use for pagination

**Success Response Body:**
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "artists": [
        {
          "id": "string",
          "name": "string"
        }
      ],
      "duration_ms": 0,
      "external_urls": {
        "spotify": "string"
      },
      "uri": "string",
      "track_number": 0,
      "disc_number": 0
    }
  ],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

## Notes

- All endpoints use POST method to match the pattern of other concept endpoints
- Authentication is handled server-side using client credentials flow
- Access tokens are automatically cached and refreshed by the backend service
- All Spotify IDs can be extracted from URIs (format: `spotify:track:ID` or `spotify:album:ID`)
- The `external_urls.spotify` field contains the web player URL for opening tracks/albums/artists in Spotify
- Search queries support advanced syntax (e.g., `track:name artist:artistName`)
- Rate limiting: Spotify API has rate limits. The backend handles token caching to minimize requests

