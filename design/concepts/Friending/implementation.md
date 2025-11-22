[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@friending-concept](./Friending.md)

[@example-implementation](../LikertSurvey/implementation.md)

# implement: Friending
# response:

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
        *   requires: user and target are not existing friends, user has not already sent a request to target, target has not sent a request to user.
        *   effects: target is added to the set of the user's outgoing requests; user is added to the set of target's incoming requests.
    *   acceptFriendRequest (requester: User, target: User)
        *   requires: requester has sent a friend request to target, requester and target are not friends
        *   effects: requester and target are added to each other's set of friends, they are both removed from the other's set of incoming/outgoingRequests
    *   removeFriendRequest (requester: User, target: User)
        *   requires: requester has sent a friend request to target, requester and target are not friends
        *   effects: requester is removed from the target's set of incomingRequests, target is removed the requester's set of outgoingRequests
    *   removeFriend (user: User, friend: User): ()
        *   requires: user and friend are friends with each other
        *   effects: user and friends are both removed from each other's set of friends
*   **queries**:
    *   \_getFriends (user: User): (friend: User)
    *   \_getIncomingRequests (user: User): (requester: User)
    *   \_getOutgoingRequests (user: User): (target: User)

# file: src/friending/FriendingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Friending" + ".";

// Generic type parameter for the concept's external dependency
type User = ID;

/**
 * State: A set of Users with their social connections.
 *
 * Each document represents a User and stores their
 * friends, incoming friend requests, and outgoing friend requests.
 */
interface UserDoc {
  _id: User; // The ID of the user (generic parameter)
  friends: User[];
  incomingRequests: User[];
  outgoingRequests: User[];
}

/**
 * @concept Friending
 * @purpose enable users to establish and manage mutual social connections
 * @principle a user can send a friend request to another user; they may choose to
 *   remove this request before the target user takes action; the recipient of a
 *   friend request can choose to accept or remove it; once a request is accepted,
 *   two users become friends; friendship may be revoked.
 */
export default class FriendingConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Helper to ensure a user document exists or create a minimal one.
   * This is crucial because Users are generic parameters and their primary existence
   * is managed by another concept (e.g., UserAuthentication). FriendingConcept
   * only stores their connection-related state.
   * If a user document doesn't exist, this function creates it with empty arrays
   * for friends, incomingRequests, and outgoingRequests.
   */
  private async ensureUserExists(userId: User): Promise<void> {
    await this.users.updateOne(
      { _id: userId },
      {
        $setOnInsert: {
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
        },
      },
      { upsert: true }, // Create the document if it doesn't exist
    );
  }

  /**
   * sendFriendRequest (user: User, target: User): Empty | {error: string}
   *
   * @requires user and target are not existing friends, user has not already sent a request to target, target has not sent a request to user.
   *
   * @effects target is added to the set of the user's outgoing requests; user is added to the set of target's incoming requests
   */
  async sendFriendRequest({ user, target }: { user: User; target: User }): Promise<Empty | { error: string }> {
    if (user === target) {
      return { error: "Cannot send a friend request to self." };
    }

    // Ensure documents for both users exist in this concept's state
    await this.ensureUserExists(user);
    await this.ensureUserExists(target);

    // Fetch the current state of both users
    const userDoc = await this.users.findOne({ _id: user });
    const targetDoc = await this.users.findOne({ _id: target });

    // These checks act as safeguards, though ensureUserExists should prevent nulls
    if (!userDoc || !targetDoc) {
      return { error: "Failed to retrieve user documents after creation/update attempt." };
    }

    // Precondition checks:
    // 1. Users are not already friends
    if (userDoc.friends.includes(target) || targetDoc.friends.includes(user)) {
      return { error: "Users are already friends." };
    }
    // 2. User has not already sent a request to target
    if (userDoc.outgoingRequests.includes(target) || targetDoc.incomingRequests.includes(user)) {
      return { error: `User ${user} has already sent a friend request to ${target}.` };
    }
    // 3. Target has not already sent a request to user (prevent duplicate active requests)
    if (targetDoc.outgoingRequests.includes(user) || userDoc.incomingRequests.includes(target)) {
      return { error: `Target ${target} has already sent a friend request to ${user}. Consider accepting it instead.` };
    }


    // Effects: Update outgoing requests for 'user' and incoming for 'target'
    await this.users.updateOne(
      { _id: user },
      { $addToSet: { outgoingRequests: target } }, // Add target to user's outgoing requests
    );
    await this.users.updateOne(
      { _id: target },
      { $addToSet: { incomingRequests: user } }, // Add user to target's incoming requests
    );

    return {}; // Success
  }

  /**
   * acceptFriendRequest (requester: User, target: User): Empty | {error: string}
   *
   * @requires requester has sent a friend request to target, requester and target are not friends
   *
   * @effects requester and target are added to each other's set of friends, they are both removed from the other's set of incoming/outgoingRequests
   */
  async acceptFriendRequest({ requester, target }: { requester: User; target: User }): Promise<Empty | { error: string }> {
    if (requester === target) {
      return { error: "Cannot send a friend request to self." };
    }

    // Ensure documents for both users exist
    await this.ensureUserExists(requester);
    await this.ensureUserExists(target);

    // Fetch current state
    const requesterDoc = await this.users.findOne({ _id: requester });
    const targetDoc = await this.users.findOne({ _id: target });

    if (!requesterDoc || !targetDoc) {
      return { error: "Failed to retrieve user documents." };
    }

    // Precondition checks:
    // 1. Requester must have sent a friend request to target
    if (!targetDoc.incomingRequests.includes(requester) || !requesterDoc.outgoingRequests.includes(target)) {
      return { error: "No pending friend request from requester to target." };
    }
    // 2. Requester and target are not already friends
    if (requesterDoc.friends.includes(target) || targetDoc.friends.includes(requester)) {
      return { error: "Users are already friends." };
    }

    // Effects:
    // Add to friends, pull from outgoing requests for requester
    await this.users.updateOne(
      { _id: requester },
      { $addToSet: { friends: target }, $pull: { outgoingRequests: target } },
    );
    // Add to friends, pull from incoming requests for target
    await this.users.updateOne(
      { _id: target },
      { $addToSet: { friends: requester }, $pull: { incomingRequests: requester } },
    );

    return {}; // Success
  }

  /**
   * removeFriendRequest (requester: User, target: User): Empty | {error: string}
   *
   * @requires requester has sent a friend request to target, requester and target are not friends
   *
   * @effects requester is removed from the target's set of incomingRequests, target is removed the requester's set of outgoingRequests
   */
  async removeFriendRequest({ requester, target }: { requester: User; target: User }): Promise<Empty | { error: string }> {
    if (requester === target) {
      return { error: "Cannot send a friend request to self." };
    }

    // Ensure documents for both users exist
    await this.ensureUserExists(requester);
    await this.ensureUserExists(target);

    // Fetch current state
    const requesterDoc = await this.users.findOne({ _id: requester });
    const targetDoc = await this.users.findOne({ _id: target });

    if (!requesterDoc || !targetDoc) {
      return { error: "Failed to retrieve user documents." };
    }

    // Precondition checks:
    // 1. Requester must have sent a friend request to target
    if (!targetDoc.incomingRequests.includes(requester) || !requesterDoc.outgoingRequests.includes(target)) {
      return { error: "No pending friend request from requester to target." };
    }
    // 2. Requester and target are not already friends
    if (requesterDoc.friends.includes(target) || targetDoc.friends.includes(requester)) {
      return { error: "Users are already friends. Use removeFriend instead." };
    }

    // Effects:
    // Remove target from requester's outgoing requests
    await this.users.updateOne(
      { _id: requester },
      { $pull: { outgoingRequests: target } },
    );
    // Remove requester from target's incoming requests
    await this.users.updateOne(
      { _id: target },
      { $pull: { incomingRequests: requester } },
    );

    return {}; // Success
  }

  /**
   * removeFriend (user: User, friend: User): Empty | {error: string}
   *
   * @requires user and friend are friends with each other
   *
   * @effects user and friends are both removed from each other's set of friends
   */
  async removeFriend({ user, friend }: { user: User; friend: User }): Promise<Empty | { error: string }> {
    if (user === friend) {
      return { error: "Cannot be friends with self." };
    }

    // Ensure documents for both users exist
    await this.ensureUserExists(user);
    await this.ensureUserExists(friend);

    // Fetch current state
    const userDoc = await this.users.findOne({ _id: user });
    const friendDoc = await this.users.findOne({ _id: friend });

    if (!userDoc || !friendDoc) {
      return { error: "Failed to retrieve user documents." };
    }

    // Precondition check:
    // 1. User and friend are friends with each other (mutual friendship)
    if (!userDoc.friends.includes(friend) || !friendDoc.friends.includes(user)) {
      return { error: "Users are not friends with each other." };
    }

    // Effects:
    // Remove friend from user's friends list
    await this.users.updateOne(
      { _id: user },
      { $pull: { friends: friend } },
    );
    // Remove user from friend's friends list
    await this.users.updateOne(
      { _id: friend },
      { $pull: { friends: user } },
    );

    return {}; // Success
  }

  /**
   * Query: Retrieves the list of friends for a given user.
   * _getFriends (user: User): (friend: User)
   * @returns An array of dictionaries, each with a 'friend' field holding a User ID.
   */
  async _getFriends({ user }: { user: User }): Promise<{ friend: User }[]> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [];
    }
    return userDoc.friends.map((friendId) => ({ friend: friendId }));
  }

  /**
   * Query: Retrieves the list of incoming friend requests for a given user.
   * _getIncomingRequests (user: User): (requester: User)
   * @returns An array of dictionaries, each with a 'requester' field holding a User ID.
   */
  async _getIncomingRequests({ user }: { user: User }): Promise<{ requester: User }[]> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [];
    }
    return userDoc.incomingRequests.map((requesterId) => ({ requester: requesterId }));
  }

  /**
   * Query: Retrieves the list of outgoing friend requests for a given user.
   * _getOutgoingRequests (user: User): (target: User)
   * @returns An array of dictionaries, each with a 'target' field holding a User ID.
   */
  async _getOutgoingRequests({ user }: { user: User }): Promise<{ target: User }[]> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [];
    }
    return userDoc.outgoingRequests.map((targetId) => ({ target: targetId }));
  }
}
```