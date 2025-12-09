---
timestamp: 'Mon Dec 08 2025 20:28:17 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251208_202817.a96ffc8b.md]]'
content_id: 16eb533e60d14d2ef3cef1c7e89c4e59839c802e574db515219f611dfb6a9644
---

# trace:

The following trace demonstrates how the **principle** of the `Upvote` concept ("After a user upvotes items, they are able to view whether or not they upvoted that item.") is fulfilled by a sequence of actions and queries.

1. **Given**: Two users, `userAlice` and `userBob`, and three items `itemPost1`, `itemPost2`, `itemPost3`.

2. **Action**: `userAlice` upvotes `itemPost1`.
   ```
   Upvote.upvote({ user: "user:Alice", item: "item:Post1" })
   ```

3. **Result**: The upvote is successfully recorded.
   ```
   {}
   ```

4. **Action**: `userAlice` upvotes `itemPost2`.
   ```
   Upvote.upvote({ user: "user:Alice", item: "item:Post2" })
   ```

5. **Result**: The upvote is successfully recorded.
   ```
   {}
   ```

6. **Query**: `userAlice` checks if she has upvoted `itemPost1`.
   ```
   Upvote._hasUpvoted({ user: "user:Alice", item: "item:Post1" })
   ```

7. **Result**: Returns `[{ hasUpvoted: true }]`. This confirms `userAlice` can see her upvote on `itemPost1`.

8. **Query**: `userAlice` checks if she has upvoted `itemPost3` (which she has not).
   ```
   Upvote._hasUpvoted({ user: "user:Alice", item: "item:Post3" })
   ```

9. **Result**: Returns `[{ hasUpvoted: false }]`. This confirms `userAlice` can see she has not upvoted `itemPost3`.

10. **Query**: `userAlice` retrieves all items she has upvoted.
    ```
    Upvote._getUpvotedItems({ user: "user:Alice" })
    ```

11. **Result**: Returns `[{ item: "item:Post1" }, { item: "item:Post2" }]`. This demonstrates `userAlice` can view the items she has upvoted.

This sequence directly illustrates the principle: after `userAlice` performs `upvote` actions, she can use `_hasUpvoted` and `_getUpvotedItems` queries to confirm her upvoting status for specific items and see a list of all items she has upvoted.
