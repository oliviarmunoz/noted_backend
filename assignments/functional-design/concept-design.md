# Concepts

## Concept: UserAuthentication [User]

**Purpose**: Limit access to known users. \
**Principle**: If a user registers with a unique username and password, they can later log in using those same credentials to prove their identity and gain access. If desired, a user can delete their credentials, thus making them invalid for authentication.

**State**

- a set of **Users** with
  - a **username** String
  - a **password** String

**Actions**

- `register(username: String, password: String): (user: User)`
  - _Requires_: No User exists with the given `username`.
  - _Effects_: Creates and returns a new User and associates it with the provided `username` and `password`.
- `login(username: String, password: String): (user: User)`
  - _Requires_: A User exists with the given `username`, and the `password` matches the stored password for that User.
  - _Effects_: Returns the User associated with the credentials.
- `deleteCredentials(user: User)`
  - _Requires_: `user` exists.
  - _Effects_: Removes user from the set of all Users.
- `_getUsername(user: User): String`
  - _Requires_: `user` exists.
  - _Effects_: Returns the username of the user.

## Concept: Sessioning [User]

**Purpose**: Maintain a user's logged-in state across multiple requests without re-sending credentials. \
**Principle**: If a session is created for a user, then that user's identity can be consistently retrieved via the session in subsequent interactions, until the session is deleted.

**State**

- a set of **Sessions** with
  - a **user** User

**Actions**

- `create(user: User): (session: Session)`
  - _Requires_: There is no preexisting session for the user.
  - _Effects_: A new session is created and associated with the given `user`; returns the session created.
- `delete(session: Session): ()`
  - _Requires_: The given `session` exists.
  - _Effects_: The `session` is removed.
- `_getUser(session: Session): (user: User)`
  - _Requires_: The given `session` exists.
  - _Effects_: Returns the `user` associated with the session.

## Concept: UserProfile [User]

**Purpose**: Allows profile personalization to display to other users to enable social interaction. \
**Principle**: A user will be prompted to create and personalize their profile upon user registration, they are then free to update their profile at any time.

**State**

- A set of **UserProfiles** with
  - a **user** User
  - a **name** String
  - a **bio** String

**Actions**

- `addUser(user: User, name: String, bio: String): (userProfile: UserProfile)`
  - _Effects_: Creates a new user profile with the given details and links it to the input user
- `deleteUser(user: User)`
  - _Requires_: A UserProfile exists for the given `user`.
  - _Effects_: Deletes the associated UserProfile.
- `updateName(user: User, newName: String)`
  - _Requires_: A UserProfile exists for the given `user`.
  - _Effects_: Changes the name of the associated `user`.
- `updateBio(user: User, newBio: String)`
  - _Requires_: A UserProfile exists for the given `user`.
  - _Effects_: Changes the bio of the associated `user`.

## Concept: Friending [User]

**Purpose**: Enable users to establish and manage mutual social connections. \
**Principle**: A user can send a friend request to another user; request can be revoked by the sender before the target user takes action; the recipient of a friend request can choose to accept or remove it; once a request is accepted, two users become friends; friendship may be revoked.

**State**

- a set of **Users** with
  - a set of **Friends** Users
  - a set of **incomingRequests** Users
  - a set of **outgoingRequests** Users

**Actions**

- `sendFriendRequest(user: User, target: User): ()`
  - _Requires_: `user` and `target` are not existing friends, `user` has not already sent a request to `target`,`target` has not already sent a request to `user`, `user` and `target` are not the same.
  - _Effects_: `target` is added to the set of the `user`'s outgoing requests; `user` is added to the set of `target`'s incoming requests.
- `acceptFriendRequest(requester: User, target: User): ()`
  - _Requires_: `requester` has sent a friend request to `target`, `requester` and `target` are not friends, `requester` and `target` are not the same.
  - _Effects_: `requester` and `target` are added to each other's set of friends, they are both removed from the other's set of incoming/outgoingRequests.
- `removeFriendRequest(requester: User, target: User): ()`
  - _Requires_: `requester` has sent a friend request to `target`, `requester` and `target` are not friends, `requester` and `target` are not the same.
  - _Effects_: `requester` is removed from the `target`'s set of incomingRequests, `target` is removed from the `requester`'s set of outgoingRequests.
- `removeFriend(user: User, friend: User): ()`
  - _Requires_: `user` and `friend` are friends with each other, `user` and `friend` are not the same.
  - _Effects_: `user` and `friend` are both removed from each other's set of friends.

## Concept: Review [User, Item]

**Purpose**: Enable users to provide qualitative and quantitative feedback on items. \
**Principle**: A user creates a review for an item containing a numerical rating and an optional written entry; modify the entry and rating for this review if needed; the user can also delete their review; each review can optionally create comments from other users associated with it and delete those comments.

**State**

- a set of **Reviews** with
  - an **item** Item
  - a **user** User
  - a **rating** Number
  - a **date** Date
  - an optional **notes** String
  - a set of **comments** with
    - a **commentId** Id
    - a **commenter** User
    - a **notes** String

**Actions**

- `postReview(item: Item, user: User, ratingNumber: Number, notes: String): (review: Review)`
  - _Requires_: `ratingNumber` is an integer in the range [0,5].
  - _Effects_: Creates and returns a review with the given information.
- `updateReview(review: Review, ratingNumber: Number, notes: String)`
  - _Requires_: `review` exists, `ratingNumber` is an integer in the range [0,5].
  - _Effects_: Updates the `ratingNumber` and `notes` of the associated `review`.
- `deleteReview(review: Review)`
  - _Requires_: `review` exists.
  - _Effects_: Removes the associated `review` from the set of all reviews.
- `addComment(review: Review, commenter: User, comment: String): (commentId: Id)`
  - _Requires_: `review` exists.
  - _Effects_: Adds a comment by the input user to the list of comments of the associated `review`.
- `deleteComment(review: Review, comment: commentId)`
  - _Requires_: `review` to be in the set of reviews, `commentId` to be in list of comments of the associated review.
  - _Effects_: Deletes the comment from the list.
- `_getReviewByItemAndUser(item: Item, user: User): Review`
  - _Requires_: `review` exists.
  - _Effects_: Returns the reviews that the given `user` has authored for an `item`.
- `_getItemReviews(item: Item): Review[]`
  - _Effects_: Returns reviews associated with that `item`.
- `_getUserReviews(user: User): Review[]`
  - _Effects_: Returns reviews associated with the given `user`.
- `_getReviewComments(review: Review): Id[]`
  - _Effects_: Returns all comments associated with the given `review`.

## Concept: Playlist [User, Item]

**Purpose**: Enable users to establish and manage collections of items. \
**Principle**: A user can create a playlist; add items to a playlist; remove items from a playlist; and retrieve the items in a playlist.

**State**

- a set of **Playlists** with
  - a **playlistName** String
  - a **isPublic** Flag
  - a **user** User
  - a set of **items** Items

**Actions**

- `addItem(user: User, item: Item, playlist: playlistName)`
  - _Requires_: `playlistName` to be in set of playlists associated with the `user`.
  - _Effects_: Adds the `item` to the playlist.
- `deleteItem(user: User, item: Item, playlist: playlistName)`
  - _Requires_: `playlistName` is in set of playlists associated with the `user`.
  - _Effects_: Removes the `item` from the playlist.
- `createPlaylist(user: User, playlistName: String)`
  - _Requires_: `playlistName` to not already exist in set of playlists associated with the `user`.
  - _Effects_: Creates a new Playlist with the given information.
- `_getPlaylistItems(user: User, playlistName: String): Item[]`
  - _Requires_: `playlistName` is in set of playlists associated with the `user`.
  - _Effects_: Returns all items in this playlist.

_Note_: This concept will be used to implement the “Listen Later” and “Favorites” playlist. The user should only be able to add and remove items, while the backend will create those playlists upon user creation.

---

# Syncs

## Sync: userCreation

### when `UserAuthentication.register (username)`

### then:

`UserProfile.addUser (username, name, bio, profile): (User)` \
`Playlist.createPlaylist(user: User, playlistName: “Listen Later”)` \
`Playlist.createPlaylist(user: User, playlistName: “Favorites”)`

## Sync: login

### when `UserAuthentication.login (username): (User)`

### then:

`Sessions.create(User)`

## Sync: userDeletion

### when `UserProfile.deleteUser (User)`

### then:

`UserAuthentication.deleteCredentials (User)` \
**For all users:** `Friending.removeFriend(User)`

## Sync: reviewPost

### when `Review.postReview (User, item)`

### then:

`Playlist.deleteItem(User, item, “Listen Later”)`
