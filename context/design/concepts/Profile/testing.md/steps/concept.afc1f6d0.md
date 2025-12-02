---
timestamp: 'Mon Dec 01 2025 21:08:21 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_210821.ab0a1ed2.md]]'
content_id: afc1f6d0b758eeb69a7d1bd4d89517db3190622eaa3bb8bf39c73440fa66e9e1
---

# concept: Profile

* **concept**: Profile \[User]
* **purpose**: To store and manage public biographical information and a profile image for users.
* **principle**: If a user updates their bio and uploads a profile picture, then other users can view this information on their profile page.
* **state**:
  * A set of `UserProfiles` (identified by the `User` ID) with
    * a `bio` `String`
    * a `photoURL` `String`
* **actions**:
  * `setBio (user: User, bio: String)`
    * **effects**: Sets the `bio` for the specified `user`
  * `updateBio (user: User, bio: String)`
    * **effects**: Updates the `bio` for the specified `user`
  * `updateThumbnail (user: User, thumbnailUrl: String)`
    * **effects**: Sets or updates the `thumbnailUrl` for the specified `user`
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
