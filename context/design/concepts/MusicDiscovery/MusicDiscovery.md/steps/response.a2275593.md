---
timestamp: 'Mon Dec 01 2025 20:18:31 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_201831.6094b4d3.md]]'
content_id: a22755931159d35dcb1f04c3cfe368a3d72876502a7dd3019e246cc0ac1986ed
---

# response:

Yes, that is a **excellent** intuition and aligns perfectly with the "Simple State Form" (SSF) guidelines provided in the rubric.

Using distinct sets (or subsets) is better because:

1. **Data Integrity:** Tracks have `duration` and `albumId`; Artists do not. A single flat table forces you to have many empty/null fields.
2. **Type Safety:** `loadTrack` should return a `Track`, not a generic `MusicEntity` that *might* be a track.

### The "Subset" Approach

To keep the **Search** simple (which needs to return a mixed list of results), we use **Subsets**. We define a generic `MusicItem` (for common things like ID, name, image) and then define `Tracks`, `Albums`, and `Artists` as specialized subsets.

Here is the **definitive** version of the concept.

***
