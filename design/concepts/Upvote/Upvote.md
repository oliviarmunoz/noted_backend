[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@concept-rubric](../../background/detailed/concept-rubric.md)

[@concept-state](../../background/detailed/concept-state.md)

# concept: Upvote [User, Item]

**Purpose**: Enable users to upvote items. \
**Principle**: After a user upovtes items, they are able to view whether or not they upvoted that item.

**State**

- a set of **Votes** with
  - a **user** User
  - an **item** Item

**Actions**

- `upvote(user: User, item: Item)`
  - _Requires_: The user has not already upvoted the item.
  - _Effects_: Adds a Vote associating the user and the item.
- `unvote(user: User, item: Item)`
  - _Requires_: The user has previously upvoted the item.
  - _Effects_: Removes the Vote associating the user and the item.
- `_hasUpvoted(user: User, item: Item): boolean`
  - _Effects_: Returns `true` if the user has upvoted the item, otherwise `false`.
- `_getUpvoteCount(item: Item): number`
  - _Effects_: Returns the total number of upvotes for the item.
- `_getUpvotedItems(user: User): Item[]`
  - _Effects_: Returns all items the user has upvoted.
- `_getUpvoters(item: Item): User[]`
  - _Effects_: Returns all users who have upvoted the item.