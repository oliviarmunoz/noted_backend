---
timestamp: 'Mon Dec 01 2025 17:58:52 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_175852.1a024701.md]]'
content_id: 5d44f0e4d45b77ddf88976824e8bea88bf7db7bfd0e238a6c71b12dd3e51d6ca
---

# response:

You are absolutely right to question this. The feedback is highlighting a specific nuance in Concept Design:

1. **"Granular Queries" are actually Actions:** In this specific design methodology, if asking for data results in fetching from an external API and saving it to your database (caching), it is technically an **Action** (because it modifies state), not a **Query** (which only reads existing state).
2. **Stateless vs. State:** The feedback wants you to move away from "User typed X, remember X" (UI state) and toward "The System knows about Artists and Albums" (Domain state).
3. **The Code Location:** While keeping `utils/spotify.ts` is good coding practice for cleaning up headers/auth, the **Logic** of "Get Album tracks" must exist as an action in the Concept.

Here is the corrected approach. I have removed `lastQuery` (as it is UI state), removed the user-specific `SearchResults` (making this a true "Catalog" concept), and added the specific actions requested.

### 1. Update the Spotify Utility

We need to add the specific methods to the utility to support the granular actions requested (getting specific albums, tracks, etc).
