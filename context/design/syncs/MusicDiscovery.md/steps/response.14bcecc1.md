---
timestamp: 'Mon Dec 08 2025 18:09:36 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251208_180936.f46b701c.md]]'
content_id: 14bcecc1863c42386ae8f0a1b1c534a1ebca939b93a2fed9a80926eb6d3d3380
---

# response:

Based on the "API Synchronizations and Relationships in Noted" document and the principles of Concept Design (especially Independence, Separation of Concerns, and Composition by Synchronization), here's a breakdown of necessary synchronizations.

The core idea is that any operation requiring:

1. **Authentication/Authorization**: Deriving `User` from `Session`, or checking user permissions/ownership.
2. **Cross-Concept Orchestration**: An action in one concept triggering or relying on another concept (e.g., `Playlist.addItem` needing `MusicDiscovery` to ensure `MusicEntity` existence).
3. **Complex Request/Response Flow**: Gathering data from multiple sources for a single response.

...should be handled by an **explicit synchronization file** (`.sync.ts`).
Conversely, simple, often public, read-only queries that don't involve complex cross-cutting concerns can be **included as passthrough routes**.

***

### 1. Synchronizations to be INCLUDED (as explicit `.sync.ts` files)

These synchronizations handle the core business logic, authentication, and cross-concept interactions that cannot be encapsulated within a single concept's action or a simple passthrough.

**A. User Authentication & Session Management:**

* **User Registration:** Handle `Requesting.request` for `/register` by calling `UserAuthentication.register`, then `Sessioning.create`, and finally `Requesting.respond`. This will involve 3-4 syncs for the request, register success, register error, session creation, and final response.
* **User Login:** Handle `Requesting.request` for `/login` by calling `UserAuthentication.authenticate`, then `Sessioning.create`, and finally `Requesting.respond`. Similar to registration, multiple syncs will manage the flow.
* **User Logout:** Handle `Requesting.request` for `/logout` by getting the `user` from the `session` and then calling `Sessioning.delete`. Also respond to the request.

**B. Music Discovery & Entity Resolution:**

* **Authenticated Music Search:** When `Requesting.request` for `/music/search` occurs, it must first authenticate the user (using `Sessioning._getUser`) and then call `MusicDiscovery.search` (which handles the Spotify API call, local `MusicEntity` creation/update, and `SearchResult` management). Finally, `Requesting.respond` with the results.
* **Loading Music Entity Details (if separate from search):** If there's an endpoint to get full entity details (e.g., `/music/entity/:id`), this would involve `Requesting.request`, possibly authentication, and then calling `MusicDiscovery.loadEntityDetails`.

**C. Playlist Management:**

* **Add Item to Playlist:** When `Requesting.request` for `/playlist/add` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Call `MusicDiscovery.loadEntityDetails` with the `externalId` to ensure the `MusicEntity` exists locally or is fetched from Spotify.
  3. Call `Playlist.addItem` using the resolved `MusicEntity.externalId` and the authenticated user.
  4. `Requesting.respond` to the client.
* **Delete Item from Playlist:** When `Requesting.request` for `/playlist/delete` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Call `Playlist.deleteItem` with the authenticated user and `externalId`.
  3. `Requesting.respond` to the client.
* **Create Playlist:** When `Requesting.request` for `/playlist/create` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Call `Playlist.createPlaylist` with the authenticated user and playlist name.
  3. `Requesting.respond` to the client.
* **Get User Playlists:** When `Requesting.request` for `/playlist/my` (or similar) occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Call `Playlist._getUserPlaylists` (if such a query existed, for now let's assume it's implied by `_getPlaylistItems` and the `user` filter) or query `Playlist` state for playlists associated with the user.
  3. `Requesting.respond` with the playlist data.
* **Get Playlist Items:** When `Requesting.request` for `/playlist/:name/items` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Call `Playlist._getPlaylistItems` with the authenticated user and playlist name.
  3. `Requesting.respond` with the `externalId`s. (Frontend would then fetch `MusicEntity` details).

**D. Review Management:**

* **Post Review:** When `Requesting.request` for `/review/post` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Call `MusicDiscovery.loadEntityDetails` with the `itemExternalId` to ensure the `MusicEntity` exists locally.
  3. Call `Review.postReview` using the authenticated user and the *internal ID* of the `MusicEntity` (or `externalId` if the concept is designed to take it, but the spec says `Item`).
  4. `Requesting.respond` to the client.
* **Update Review:** When `Requesting.request` for `/review/update` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Authorize: Check if the authenticated user is the `author` of the `review`.
  3. Call `Review.updateReview`.
  4. `Requesting.respond` to the client.
* **Delete Review:** When `Requesting.request` for `/review/delete` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Authorize: Check if the authenticated user is the `author` of the `review`.
  3. Call `Review.deleteReview`.
  4. `Requesting.respond` to the client.

**E. Review Comment Management:**

* **Add Comment:** When `Requesting.request` for `/review/comment/add` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Call `Review.addComment` with the `reviewId`, authenticated `user` as `commenter`, and `comment` text.
  3. `Requesting.respond` to the client.
* **Delete Comment:** When `Requesting.request` for `/review/comment/delete` occurs:
  1. Authenticate the user (`Sessioning._getUser`).
  2. Authorize: Check if the authenticated user is the `commenter` of the specific `comment`.
  3. Call `Review.deleteComment`.
  4. `Requesting.respond` to the client.

**F. Friending Management:**

* **Send Friend Request:** `Requesting.request` for `/friends/request/send` -> Auth -> `Friending.sendFriendRequest`.
* **Accept Friend Request:** `Requesting.request` for `/friends/request/accept` -> Auth (as `target`) -> `Friending.acceptFriendRequest`.
* **Cancel Outgoing Friend Request:** `Requesting.request` for `/friends/request/cancel` -> Auth (as `requester`) -> `Friending.removeFriendRequest`.
* **Reject Incoming Friend Request:** `Requesting.request` for `/friends/request/reject` -> Auth (as `target`) -> `Friending.removeFriendRequest`.
* **Remove Friend:** `Requesting.request` for `/friends/remove` -> Auth -> `Friending.removeFriend`.

**G. Profile Management:**

* **Update User Bio/Thumbnail:** `Requesting.request` for `/profile/update/bio` or `/profile/update/thumbnail` -> Auth (ensure `user` matches session) -> `Profile.updateBio` or `Profile.updateThumbnail`.

***

### 2. Passthrough Routes to be INCLUDED (in `src/concepts/Requesting/passthrough.ts`)

These routes directly map to concept queries, typically read-only and potentially public or not requiring complex user-session derivation.

* `/api/MusicDiscovery/_getEntityFromId`: To fetch details of a MusicEntity by its Spotify ID. (Public read)
* `/api/MusicDiscovery/_getEntityFromUri`: To fetch details of a MusicEntity by its Spotify URI. (Public read)
* `/api/Profile/_getBio`: To get a user's bio. (Can be public for profile viewing)
* `/api/Profile/_getThumbnail`: To get a user's thumbnail. (Can be public for profile viewing)
* `/api/Profile/_getProfile`: To get a user's combined bio and thumbnail. (Can be public for profile viewing)
* `/api/Review/_getItemReviews`: To get all reviews for a specific item. (Public read)
* `/api/Review/_getReviewComments`: To get all comments for a specific review. (Public read)
* `/api/UserAuthentication/_getUsername`: To get a username by user ID. (Useful for display, often public)
* `/api/UserAuthentication/_getUserByUsername`: To get a user ID by username. (Useful for lookups, often public)

***

### 3. Actions and Queries to be EXCLUDED from Passthrough

All actions and queries not explicitly listed above as "Passthrough Inclusions" should be **excluded from direct passthrough**. This is because they either:

* Involve state mutation.
* Require authentication/authorization.
* Need to interact with other concepts to fulfill the request.
* Their direct arguments (e.g., `user` for queries) would need to be implicitly derived from the session context, which is handled by explicit `Requesting` syncs.

Examples of queries that should be excluded from direct passthrough (and thus need explicit `Requesting` syncs to retrieve and respond with their results):

* `MusicDiscovery._getSearchResults` (requires a `user` argument, which needs to come from the `session`).
* `Sessioning._getUser` (this is an internal query used by other syncs for authentication; not typically an exposed API endpoint).
* `Playlist._getPlaylistItems` (if accessing *user's own* playlist, requires user from session).
* `Review._getReviewByItemAndUser` (requires `user` and `item` arguments, `user` from session).
* `Review._getUserReviews` (requires `user` argument, which needs to come from the `session`).
* Queries that would retrieve friend lists or friend requests (`Friending` concept does not explicitly list queries, but if it did, they would need authentication).

***

### Key Synchronization Requirements (Internal Logic)

These are not exposed API endpoints but define crucial cross-concept behaviors that syncs should ensure:

* **Cascade Delete Review Comments:** When `Review.delete(review)` occurs, the comments nested within that review are implicitly deleted as per the `Review` concept's state structure. If comments were a separate collection, an explicit sync would be needed to `Review.deleteComment(review, commentId)` for each associated comment.
* **Friendship Bidirectional Consistency:** The `Friending` concept's `acceptFriendRequest` and `removeFriend` actions are designed to handle both sides of the relationship atomically. The syncs calling these actions don't need to explicitly manage the bidirectional aspect; the concept's action handles it.
* **MusicEntity Resolution during Playlist/Review Operations:** The explicit syncs for `Playlist.addItem` and `Review.postReview` handle calling `MusicDiscovery.loadEntityDetails` to ensure `MusicEntity` existence and provide its resolved internal ID.
* **Search Result Cleanup:** The `MusicDiscovery.search` action itself is specified to handle clearing old `SearchResults` for a user before creating new ones.

This comprehensive set of synchronizations ensures that the application's functionality is robust, secure (with authentication/authorization), and maintains data consistency across independent concepts.
