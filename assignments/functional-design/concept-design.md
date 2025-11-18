# Concepts

## Concept: UserAuthentication [User]

**Purpose**: Limit access to known users. \
**Principle**: If a user registers with a unique username and password, they can later log in using those same credentials to prove their identity and gain access.

### Core State
- **users**: A set of Users, each containing:
    - **username**: String
    - **password**: String

### Core Actions
- `register(username: String, password: String): User` - Registers a new user.
    - *Requires*: No User exists with the given `username`.
    - *Effect*: Creates and returns a new User and associates it with the provided `username` and `password`.
- `login(username: String, password: String): User` - Authenticates an existing user.
    - *Requires*: A User exists with the given `username`, and the `password` matches the stored password for that User.
    - *Effect*: Returns the User associated with the credentials.
- `deleteCredentials(user: User)` - Removes a user's access.
    - *Requires*: `user` exists.
    - *Effect*: Removes the `user` from the set of users; their associated username and password are no longer valid.
- `_getUsername(user: User): String` - Retrieves a username.
    - *Requires*: `user` exists.
    - *Effect*: Returns the username of the user.

## Concept: Sessioning [User]

**Purpose**: Maintain a user's logged-in state across multiple requests without re-sending credentials. \
**Principle**: If a session is created for a user, then that user's identity can be consistently retrieved via the session in subsequent interactions, until the session is deleted.

### Core State
- **sessions**: A set of Sessions, each containing:
    - **user**: User

### Core Actions
- `create(user: User): Session` - Starts a new session.
    - *Effect*: A new session is created; the session is associated with the given `user`; returns the session created.
- `delete(session: Session)` - Ends a session.
    - *Requires*: The given `session` exists.
    - *Effect*: The `session` is removed.
- `_getUser(session: Session): User` - Retrieves the user for a session.
    - *Requires*: The given `session` exists.
    - *Effect*: Returns the `user` associated with the session.

## Concept: UserProfile

**Purpose**: Enables social networking feature to allow profile personalization to display to other users. \
**Principle**: A user will be prompted to create and personalize their profile upon user registration, they are then free to update their profile at any time.

### Core State
- **userProfiles**: A set of UserProfiles, each containing:
    - **user**: User
    - **username**: String
    - **name**: String
    - **bio**: String
    - **profile**: Photo

### Core Actions
- `addUser(user: User, username: String, name: String, bio: String, profile: Photo): UserProfile` - Creates a profile.
    - *Requires*: `username` to be non-empty and unique.
    - *Effect*: Creates a new user profile with the given details and links it to the input user
- `deleteUser(user: User)` - Deletes a profile.
    - *Requires*: A UserProfile exists for the given `user`.
    - *Effect*: Deletes the associated UserProfile.
- `updateUsername(user: User, newUsername: String)` - Updates the unique username.
    - *Requires*: A UserProfile exists for the given `user`, `newUsername` is not already in use.
    - *Effect*: Updates the username of the associated `user`.
- `updateName(user: User, newName: String)` - Updates the display name.
    - *Requires*: A UserProfile exists for the given `user`.
    - *Effect*: Changes the name of the associated `user`.
- `updateBio(user: User, newBio: String)` - Updates the biography.
    - *Requires*: A UserProfile exists for the given `user`.
    - *Effect*: Changes the bio of the associated `user`.
- `updatePicture(user: User, newPicture: Photo)` - Updates the profile photo.
    - *Requires*: A UserProfile exists for the given `user`.
    - *Effect*: Changes the picture of the associated `user`.

## Concept: Friending

**Purpose**: Enable users to establish and manage mutual social connections. \
**Principle**: A user can send a friend request to another user; they may choose to remove this request before the target user takes action; the recipient of a friend request can choose to accept or remove it; once a request is accepted, two users become friends; friendship may be revoked.

### Core State
- **users**: A set of Users, each containing:
    - **friends**: A set of Users
    - **incomingRequests**: A set of Users
    - **outgoingRequests**: A set of Users

### Core Actions
- `sendFriendRequest(user: User, target: User)` - Initiates a friend request.
    - *Requires*: `user` and `target` are not existing friends, `user` has not already sent a request to `target`, `user` and `target` are not the same.
    - *Effect*: `target` is added to the set of the `user`'s outgoing requests; `user` is added to the set of `target`'s incoming requests.
- `acceptFriendRequest(requester: User, target: User)` - Confirms a friendship.
    - *Requires*: `requester` has sent a friend request to `target`, `requester` and `target` are not friends, `requester` and `target` are not the same.
    - *Effect*: `requester` and `target` are added to each other's set of friends, they are both removed from the other's set of incoming/outgoingRequests.
- `removeFriendRequest(requester: User, target: User)` - Cancels or rejects a request.
    - *Requires*: `requester` has sent a friend request to `target`, `requester` and `target` are not friends, `requester` and `target` are not the same.
    - *Effect*: `requester` is removed from the `target`'s set of incomingRequests, `target` is removed from the `requester`'s set of outgoingRequests.
- `removeFriend(user: User, friend: User)` - Ends a friendship.
    - *Requires*: `user` and `friend` are friends with each other, `user` and `friend` are not the same.
    - *Effect*: `user` and `friend` are both removed from each other's set of friends.

## Concept: Review [User, Item]

**Purpose**: Enable users to provide qualitative and quantitative feedback on items. \
**Principle**: A user creates a review for an item containing a numerical rating and an optional written entry; modify the entry and rating for this review if needed; the user can also delete their review; each review can optionally create comments from other users associated with it and delete those comments.

### Core State
- **reviews**: A set of Reviews, each containing:
    - **item**: Item
    - **user**: User
    - **rating**: Number (1-5)
    - **date**: Date
    - **notes**: String (optional)
    - **comments**: A list of Comments, each containing:
        - **commentId**: Id
        - **commenter**: User
        - **notes**: String

### Core Actions
- `postReview(item: Item, user: User, ratingNumber: Number, notes: String): reviewId` - Creates a new review.
    - *Requires*: `ratingNumber` to be an integer in the range [1,5].
    - *Effect*: Creates a review with the given information.
- `updateReview(review: Review, ratingNumber: Number, notes: String)` - Edits an existing review.
    - *Requires*: `review` exists, `ratingNumber` is between 1 and 5.
    - *Effect*: Updates the `ratingNumber` or `notes` of the associated `review`.
- `deleteReview(review: Review)` - Deletes a review.
    - *Requires*: `review` exists.
    - *Effect*: Removes the associated `review`.
- `addComment(review: reviewId, commenter: User, comment: String): commentId` - Adds a comment to a review.
    - *Requires*: `review` exists.
    - *Effect*: Adds a comment by the input user to the list of comments of the associated `review`.
- `deleteComment(review: Review, comment: commentId)` - Deletes a comment.
    - *Requires*: `reviewId` to be in the set of reviews, `commentId` to be in list of comments of the associated review.
    - *Effect*: Deletes the comment from the list.
- `_getReviewByItemAndUser(item: Item, user: User): Review` - Finds a specific review.
    - *Requires*: `review` exists.
    - *Effect*: Returns the reviews that the given `user` has authored for an `item`.
- `_getItemReviews(item: Item): Review[]` - Gets all reviews for an item.
    - *Effect*: Returns reviews associated with that `item`.
- `_getUserReviews(user: User): Review[]` - Gets all reviews by a user.
    - *Effect*: Returns reviews associated with the given `user`.

### Note:
Users can comment on reviews (either their own or another users’) .

## Concept: Playlist [User, Item]

**Purpose**: Enable users to establish and manage collections of items. \
**Principle**: A user can create a playlist; add items to a playlist; remove items from a playlist; and retrieve the items in a playlist.

### Core State
- **playlists**: A set of Playlists, each containing:
    - **playlistName**: String
    - **isPublic**: Flag
    - **user**: User
    - **items**: A set of Items

### Core Actions
- `addItem(user: User, item: musicId, playlist: playlistName)` - Adds an item to a playlist.
    - *Requires*: `User` to exist, `musicId` to be a valid song or album, `playlistName` to be in set of playlists associated with a `user`.
    - *Effect*: Adds the `item` to the playlist.
- `deleteItem(user: User, item: musicId, playlist: playlistName)` - Removes an item from a playlist.
    - *Requires*: `User` to exist, `musicId` to be a valid song or album, `playlistName` to be in set of playlists associated with a `user`.
    - *Effect*: Removes the `item` from the playlist.
- `createPlaylist(user: User, playlistName: String)` - Creates a new empty playlist.
    - *Requires*: `User` to exist, `playlistName` to not already exist in set of playlists associated with the `user`.
    - *Effect*: Creates a new playlist object with the given information.
- `getPlaylistItems(user: User, playlistName: String): Item[]` - Retrieves items in a playlist.
    - *Requires*: `User` to exist, `playlistName` to be in set of playlists associated with a `user`.
    - *Effect*: Returns all items in this playlist.

### Note:
This concept will be used to implement the “Listen Later” and “Favorites” playlist. The user should only be able to add and remove items, while the backend will create those playlists upon user creation.

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