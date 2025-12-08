/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Review
  "/api/Review/_getReviewByItemAndUser": "reviews are public",
  "/api/Review/_getReviewAuthor": "reviews are public",
  "/api/Review/_getItemReviews": "reviews are public",
  "/api/Review/_getUserReviews": "reviews are public unless marked otherwise",
  "/api/Review/_getReviewComments": "comments are public",

  // MusicDiscovery
  "/api/MusicDiscovery/_getSearchResults": "searching is public",
  "/api/MusicDiscovery/_getEntityFromUri": "searching is public",
  "/api/MusicDiscovery/_getEntityFromId": "searching is public",
  "/api/MusicDiscovery/_getEntity": "searching is public",

  // UserAuthentication
  "/api/UserAuthentication/_getUserByUsername":
    "allow anyone to get a user by username (public query)",
  "/api/UserAuthentication/_getUsername":
    "allow anyone to get a username by user id (public query)",

  // Session
  "/api/Session/_getUser":
    "allow anyone to get a user by session id (public query)",

  // Profile
  "/api/Profile/_getBio": "bios are publicly displayed on the profile",
  "/api/Profile/_getThumbnail":
    "thumbnails are publicly displayed on the profile",
  "/api/Profile/_getProfile": "profiles are public",

  // Friending
  "/api/Friending/_getFriends": "friends are a public query",
  "/api/Friending/_getIncomingRequests": "friend requests are a public query",
  "/api/Friending/_getOutgoingRequests": "friend requests are a public query",

  // Playlist
  "/api/Playlist/_getPlaylistItems":
    "allow anyone to get all items from a playlist",
  "/api/Playlist/_getUserPlaylists": "allow anyone to get a user's playlists",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  "/api/Session/create",
  "/api/Session/delete",

  "/api/UserAuthentication/register",
  "/api/UserAuthentication/authenticate",

  "/api/Playlist/createPlaylist",
  "/api/Playlist/deletePlaylist",
  "/api/Playlist/addItem",
  "/api/Playlist/deleteItem",
  "/api/Playlist/addItemToFriend",

  "/api/Profile/updateBio",
  "/api/Profile/updateThumbnail",
  "/api/Profile/deleteProfile",

  "/api/Friending/ensureUserExists",
  "/api/Friending/sendFriendRequest",
  "/api/Friending/acceptFriendRequest",
  "/api/Friending/removeFriendRequest",
  "/api/Friending/removeFriend",

  "/api/Review/postReview",
  "/api/Review/updateReview",
  "/api/Review/deleteReview",
  "/api/Review/addComment",
  "/api/Review/deleteComment",

  "/api/MusicDiscovery/upsertSpotifyItem",
  "/api/MusicDiscovery/clearSearch",
  "/api/MusicDiscovery/search",
  "/api/MusicDiscovery/loadEntityDetails",
];
