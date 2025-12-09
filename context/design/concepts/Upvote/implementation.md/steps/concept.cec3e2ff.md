---
timestamp: 'Mon Dec 08 2025 17:32:18 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251208_173218.89d28b94.md]]'
content_id: cec3e2ffc8059df359a87b736cf2b04b3b4df353c44caa1cad7bfd580b6a232e
---

# concept: Upvote \[User, Item]

**Purpose**: Enable users to upvote items. \
**Principle**: After a user upovtes items, they are able to view whether or not they upvoted that item.

**State**

* a set of **Votes** with
  * a **user** User
  * an **item** Item

**Actions**

* `upvote(user: User, item: Item)`
  * *Requires*: The user has not already upvoted the item.
  * *Effects*: Adds a Vote associating the user and the item.
* `unvote(user: User, item: Item)`
  * *Requires*: The user has previously upvoted the item.
  * *Effects*: Removes the Vote associating the user and the item.
* `_hasUpvoted(user: User, item: Item): boolean`
  * *Effects*: Returns `true` if the user has upvoted the item, otherwise `false`.
* `_getUpvoteCount(item: Item): number`
  * *Effects*: Returns the total number of upvotes for the item.
* `_getUpvotedItems(user: User): Item[]`
  * *Effects*: Returns all items the user has upvoted.
* `_getUpvoters(item: Item): User[]`
  * *Effects*: Returns all users who have upvoted the item.
