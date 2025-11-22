[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

# concept: Friending \[User]

*   **concept**: Friending \[User]

*   **purpose**: enable users to establish and manage mutual social connections

*   **principle**: a user can send a friend request to another user; they may choose to remove this request before the target user takes action; the recipient of a friend request can choose to accept or remove it; once a request is accepted, two users become friends; friendship may be revoked.

*   **state**:
    *   a set of Users with
        *   a set of friends Users
        *   a set of incomingRequests Users
        *   a set of outgoingRequests Users

*   **actions**:
    *   sendFriendRequest (user: User, target: User)
        *   requires: user and target are not existing friends, user has not already sent a request to target, user and target are not the same
        *   effects: target is added to the set of the user's outgoing requests; user is added to the set of target's incoming requests

    *   acceptFriendRequest (requester: User, target: User)
        *   requires: requester has sent a friend request to target, requester and target are not friends, requester and target are not the same
        *   effects: requester and target are added to each other's set of friends, they are both removed from the other's set of incoming/outgoingRequests

    *   removeFriendRequest (requester: User, target: User)
        *   requires: requester has sent a friend request to target, requester and target are not friends, requester and target are not the same
        *   effects: requester is removed from the target's set of incomingRequests, target is removed the requester's set of outgoingRequests

    *   removeFriend (user: User, friend: User): ()
        *   requires: user and friend are friends with each other, user and friend are not the same
        *   effects: user and friends are both removed from each other's set of friends