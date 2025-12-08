[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@example-implementation](../LikertSurvey/implementation.md)

# make a profile concept that takes care of the user's bio and profile picture
# response:

# concept: Profile

*   **concept**: Profile \[User]
*   **purpose**: To store and manage public biographical information and a profile image for users.
*   **principle**: If a user updates their bio and uploads a profile picture, then other users can view this information on their profile page.
*   **state**:
    *   A set of `UserProfiles` (identified by the `User` ID) with
        *   a `bio` `String`
        *   a `photoURL` `String`
*   **actions**:
    *   `setBio (user: User, bio: String)`
        *   **effects**: Sets the `bio` for the specified `user`
    *   `updateBio (user: User, bio: String)`
        *   **effects**: Updates the `bio` for the specified `user`
    *   `updateThumbnail (user: User, thumbnailUrl: String)`
        *   **effects**: Sets or updates the `thumbnailUrl` for the specified `user`
*   **queries**:
    *   `_getBio (user: User): (bio: String)`
        *   **requires**: A profile for the `user` exists.
        *   **effects**: Returns the `bio` of the user.
    *   `_getThumbnail (user: User): (thumbnailUrl: String)`
        *   **requires**: A profile for the `user` exists.
        *   **effects**: Returns the `thumbnailUrl` of the user.
    *   `_getProfile (user: User): (profile: {bio: String, thumbnailUrl: String})`
        *   **requires**: A profile for the `user` exists.
        *   **effects**: Returns the bio and thumbnail URL for the user.