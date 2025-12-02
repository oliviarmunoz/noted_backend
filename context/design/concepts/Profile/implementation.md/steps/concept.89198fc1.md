---
timestamp: 'Mon Dec 01 2025 20:48:12 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_204812.692e9279.md]]'
content_id: 89198fc19c2b2acae4d31ae975580b92cc1b53cfcf9a38838559d90ee4f85615
---

# concept: Profile

* **concept**: Profile \[User]
* **purpose**: To store and manage public biographical information and a profile image for users.
* **principle**: If a user updates their bio and uploads a profile picture, then other users can view this information on their profile page.
* **state**:
  * A set of `UserProfiles` (identified by the `User` ID) with
    * a `bio` of type `String`
    * a `thumbnailUrl` of type `String`
* **actions**:
  * `updateBio (user: User, bio: String)`
    * **requires**: `user` must be a valid user identifier (existence is assumed to be managed by a `UserAuthentication` or similar concept, or the action implicitly creates the profile).
    * **effects**: Sets or updates the `bio` for the specified `user`. If no profile exists for the `user`, a new one is created.
  * `updateThumbnail (user: User, thumbnailUrl: String)`
    * **requires**: `user` must be a valid user identifier.
    * **effects**: Sets or updates the `thumbnailUrl` for the specified `user`. If no profile exists for the `user`, a new one is created.
  * `deleteProfile (user: User)`
    * **requires**: A profile for the given `user` must exist.
    * **effects**: Deletes the profile associated with the `user`.
* **queries**:
  * `_getBio (user: User): (bio: String)`
    * **requires**: A profile for the `user` exists.
    * **effects**: Returns the `bio` of the user.
  * `_getThumbnail (user: User): (thumbnailUrl: String)`
    * **requires**: A profile for the `user` exists.
    * **effects**: Returns the `thumbnailUrl` of the user.
  * `_getProfile (user: User): (profile: {bio: String, thumbnailUrl: String})`
    * **requires**: A profile for the `user` exists.
    * **effects**: Returns the bio and thumbnail URL for the user.
