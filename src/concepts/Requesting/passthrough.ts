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
  "/api/Review/_getItemReviews": "reviews are public",
  "/api/Review/_getUserReviews": "reviews are public unless marked otherwise",
  "/api/Review/_getReviewComments": "comments are public",

  // MusicDiscovery
  "/api/MusicDiscovery/search": "searching is public",
  "/api/MusicDiscovery/loadEntityDetails": "searching is public",
  "/api/MusicDiscovery/_getSearchResults": "searching is public",
  "/api/MusicDiscovery/_getEntityFromUri": "searching is public",

  // UserAuthentication
  "/api/UserAuthentication/_getUserByUsername":
    "allow anyone to get a user by username (public query)",
  "/api/UserAuthentication/_getUsername":
    "allow anyone to get a username by user id (public query)",

  // Session
  "/api/Session/_getUser": "allow anyone to get a user by session id (public query)"
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
  "/api/Playlist/deletePlaylist"
];
