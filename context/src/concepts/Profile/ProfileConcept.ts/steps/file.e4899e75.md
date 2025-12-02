---
timestamp: 'Mon Dec 01 2025 21:04:30 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_210430.dc1e5e37.md]]'
content_id: e4899e75fdd496a9119321f5e6d579032b7e8bf5e351a17ade879d16f6b39249
---

# file: src/concepts/Profile/ProfileConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

const PREFIX = "Profile" + ".";

// Generic types for the concept's external dependencies
type User = ID; 

/**
 * state:
 * a set of UserProfiles with
 *  a bio string
 *  an thumbnailUrl string
 *      
 */
interface UserProfileDoc {
  _id: User;
  bio: string;
  thumbnailUrl: string; // Storing as a URL string for an image
}

/**
 * @concept Profile
 * @purpose To store and manage public biographical information and a profile image for users.
 */
export default class ProfileConcept {
  userProfiles: Collection<UserProfileDoc>;

  constructor(private readonly db: Db) {
    this.userProfiles = this.db.collection(PREFIX + "userProfiles");
  }

  async addBio(
    { user, bio }: {
      user: User;
      bio: string;
    },
  ): Promise<Empty | { error: string }> {
    try {
      await this.userProfiles.updateOne(
        { _id: user },
        { $setOnInsert: { bio } }, 
        { upsert: true }
      );
      return {};
    } catch (e) {
      console.error(`Error adding bio for user ${user}:`, e);
      return { error: "Failed to add user bio." };
    }
  }

  /**
   * Action: Updates a user's biographical information.
   *
   * @requires
   * @effects Updates the `bio` for the specified `user`
   */
  async updateBio(
    { user, bio }: {
      user: User;
      bio: string;
    },
  ): Promise<Empty | { error: string }> {
    try {
      await this.userProfiles.updateOne(
        { _id: user },
        { $set: { bio } }, 
      );
      return {};
    } catch (e) {
      console.error(`Error updating bio for user ${user}:`, e);
      return { error: "Failed to update user bio." };
    }
  }

  async addThumbnail(
    { user, thumbnailUrl }: {
      user: User;
      thumbnailUrl: string;
    },
  ): Promise<Empty | { error: string }> {
    try {
      await this.userProfiles.updateOne(
        { _id: user },  
        { $setOnInsert: { thumbnailUrl } }, 
        { upsert: true }
      );
      return {};
    } catch (e) {
      console.error(`Error adding thumbnail for user ${user}:`, e);
      return { error: "Failed to add user thumbnail." };
    }
  }

  async updateThumbnail(
    { user, thumbnailUrl }: { user: User; thumbnailUrl: string; },
  ): Promise<Empty | { error: string }> {
    try {
      await this.userProfiles.updateOne(
        { _id: user },
        { $set: { thumbnailUrl } },
      );
      return {};
    } catch (e) {
      console.error(`Error updating thumbnail for user ${user}:`, e);
      return { error: "Failed to update user thumbnail." };
    }
  }


  /**
   * Query: Retrieves a user's biographical information.
   *
   * @requires
   *
   * @effects Returns the `bio` of the user.
   */
  async _getBio({
    user,
  }: {
    user: User;
  }): Promise<Array<{ bio: string }>> {
    const profile = await this.userProfiles.findOne(
      { _id: user },
      { projection: { bio: 1, _id: 0 } }
    );
    return profile ? [{ bio: profile.bio }] : [];
  }

  /**
   * Query: Retrieves a user's profile thumbnail URL.
   *
   * @effects Returns the `thumbnailUrl` of the user.
   */
  async _getThumbnail({
    user,
  }: {
    user: User;
  }): Promise<Array<{ thumbnailUrl: string }>> {
    const profile = await this.userProfiles.findOne(
      { _id: user },
      { projection: { thumbnailUrl: 1, _id: 0 } }
    );
    return profile ? [{ thumbnailUrl: profile.thumbnailUrl }] : [];
  }

  /**
   * Query: Retrieves a user's complete profile (bio and thumbnail URL).
   *
   * @requires
   *
   * @effects Returns the bio and thumbnail URL for the user.
   */
  async _getProfile({
    user,
  }: {
    user: User;
  }): Promise<Array<{ profile: { bio: string; thumbnailUrl: string } }>> {
    const profile = await this.userProfiles.findOne(
      { _id: user },
      { projection: { bio: 1, thumbnailUrl: 1, _id: 0 } }
    );
    return profile
      ? [{ profile: { bio: profile.bio, thumbnailUrl: profile.thumbnailUrl } }]
      : [];
  }
}

```
