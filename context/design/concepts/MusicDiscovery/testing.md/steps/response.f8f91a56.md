---
timestamp: 'Mon Dec 01 2025 23:31:57 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_233157.6551ed73.md]]'
content_id: f8f91a564dbdddda3cdf267ba0af8caf777ca57bf290526f394e3963da71e321
---

# response:

The TypeScript error `Property 'items' does not exist on type '{ items: MusicItemDoc[]; } | { error: string; }'. Property 'items' does not exist on type '{ error: string; }'.` occurs because the `search` action (and other actions returning `{ item: T } | { error: string }`) can return either a successful result object or an error object. When you try to access `.items` (or `.track`, `.album`, etc.) directly after calling such an action, TypeScript correctly identifies that the `error` branch of the union type does not have this property.

To fix this, we need to explicitly narrow the type of the `searchResult` (or `result` for other actions) to the successful variant using a type guard before accessing its properties. A common way to do this is to check for the presence of the `error` property.

We will update the `src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts` file to include these type guards.

***
