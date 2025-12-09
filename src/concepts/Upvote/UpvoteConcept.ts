import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Upvote" + ".";

// Generic types of this concept
type User = ID;
type Item = ID;

/**
 * State: A set of Votes with a user and an item.
 * Each document in the 'votes' collection represents a single upvote relationship.
 */
interface VoteDoc {
  _id: ID; // Unique identifier for this specific vote entry
  user: User;
  item: Item;
}

/**
 * @concept Upvote
 * @purpose Enable users to upvote items.
 * @principle After a user upvotes items, they are able to view whether or not they upvoted that item.
 */
export default class UpvoteConcept {
  votes: Collection<VoteDoc>;

  constructor(private readonly db: Db) {
    this.votes = this.db.collection(PREFIX + "votes");
    // Ensure that a user can only upvote a specific item once.
    // This creates a unique compound index on 'user' and 'item' fields.
    this.votes.createIndex({ user: 1, item: 1 }, { unique: true });
  }

  /**
   * Action: upvote (user: User, item: Item): Empty | { error: string }
   *
   * @requires The user has not already upvoted the item.
   *
   * @effects Adds a Vote associating the user and the item.
   */
  async upvote({ user, item }: { user: User; item: Item }): Promise<Empty | { error: string }> {
    // Check if the user has already upvoted this item to enforce the precondition.
    const existingVote = await this.votes.findOne({ user, item });
    if (existingVote) {
      return { error: "User has already upvoted this item." };
    }

    try {
      // Insert a new vote document. Use freshID for the document's _id.
      await this.votes.insertOne({ _id: freshID(), user, item });
      return {}; // Success, return an empty dictionary
    } catch (e: any) {
      // Catch potential duplicate key error (11000) if a race condition occurs
      if (e.code === 11000) {
        return { error: "User has already upvoted this item (duplicate entry attempt)." };
      }
      console.error("Error during upvote:", e);
      return { error: "An unexpected error occurred while processing the upvote." };
    }
  }

  /**
   * Action: unvote (user: User, item: Item): Empty | { error: string }
   *
   * @requires The user has previously upvoted the item.
   *
   * @effects Removes the Vote associating the user and the item.
   */
  async unvote({ user, item }: { user: User; item: Item }): Promise<Empty | { error: string }> {
    // Check if the user has indeed upvoted this item to enforce the precondition.
    const existingVote = await this.votes.findOne({ user, item });
    if (!existingVote) {
      return { error: "User has not upvoted this item, so cannot unvote it." };
    }

    // Remove the vote document.
    const result = await this.votes.deleteOne({ user, item });
    if (result.deletedCount === 0) {
      return { error: "Failed to remove upvote; vote not found or already removed." };
    }

    return {}; // Success
  }

  /**
   * Query: _hasUpvoted (user: User, item: Item): { hasUpvoted: boolean }[]
   *
   * @effects Returns `true` if the user has upvoted the item, otherwise `false`.
   */
  async _hasUpvoted({ user, item }: { user: User; item: Item }): Promise<{ hasUpvoted: boolean }[]> {
    const vote = await this.votes.findOne({ user, item });
    return [{ hasUpvoted: !!vote }]; // Return an array of dictionaries, as per query specification
  }

  /**
   * Query: _getUpvoteCount (item: Item): { count: number }[]
   *
   * @effects Returns the total number of upvotes for the item.
   */
  async _getUpvoteCount({ item }: { item: Item }): Promise<{ count: number }[]> {
    const count = await this.votes.countDocuments({ item });
    return [{ count }]; // Return an array of dictionaries
  }

  /**
   * Query: _getUpvotedItems (user: User): { item: Item }[]
   *
   * @effects Returns all items the user has upvoted.
   */
  async _getUpvotedItems({ user }: { user: User }): Promise<{ item: Item }[]> {
    // Find all votes by the user and project only the 'item' field.
    // The projection { item: 1, _id: 0 } shapes the output documents to `{ item: Item }`.
    const upvotedItems = await this.votes.find({ user }).project({ item: 1, _id: 0 }).toArray();
    // The cast ensures TypeScript correctly infers the type after projection.
    return upvotedItems as { item: Item }[];
  }

  /**
   * Query: _getUpvoters (item: Item): { user: User }[]
   *
   * @effects Returns all users who have upvoted the item.
   */
  async _getUpvoters({ item }: { item: Item }): Promise<{ user: User }[]> {
    // Find all votes for the item and project only the 'user' field.
    // The projection { user: 1, _id: 0 } shapes the output documents to `{ user: User }`.
    const upvoters = await this.votes.find({ item }).project({ user: 1, _id: 0 }).toArray();
    // The cast ensures TypeScript correctly infers the type after projection.
    return upvoters as { user: User }[];
  }
}