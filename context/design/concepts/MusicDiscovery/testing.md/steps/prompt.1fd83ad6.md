---
timestamp: 'Mon Dec 01 2025 22:12:22 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251201_221222.36c6b05e.md]]'
content_id: 1fd83ad639da32066054fbc0922ce2fe276b52dc2e25da2641a64a34e123af18
---

# prompt: this is my terminal output below

1. User searches for a track ... FAILED (792ms)
2. User queries their search results ...
   \------- output -------
   User user:Alice queries their current search results.
   \----- output end -----
3. User queries their search results ... FAILED (24ms)
4. User clears their search results ...
   \------- output -------
   User user:Alice clears their search results.
   \----- output end -----
5. User clears their search results ... FAILED (68ms)
6. User queries their search results after clearing (expect empty) ...
   \------- output -------
   User user:Alice queries search results again.
   Search results for user:Alice are now empty.
   \----- output end -----
7. User queries their search results after clearing (expect empty) ... ok (17ms)
   \------- output -------
   \--- MusicDiscovery Principle Test End ---
   \----- output end -----
   MusicDiscovery Principle: User searches, items are cached, search is cleared ... FAILED (due to 3 failed steps) (1s)
   Action: search with invalid query or type ...
   Should return error for empty query ... ok (0ms)
   Should return error for unsupported type ... ok (0ms)
   Action: search with invalid query or type ... ok (557ms)
   Action: loadTrack caches track and details ...
   ERRORS

MusicDiscovery Principle: User searches, items are cached, search is cleared ... 1. User searches for a track => ./src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:21:13
error: AssertionError: Expected actual: true not to be: true: Search failed unexpectedly: Failed to search Spotify: Updating the path '\_id' would create a conflict at '\_id'
throw new AssertionError(
^
at assertNotEquals (https://jsr.io/@std/assert/1.0.7/not\_equals.ts:33:9)
at file:///Users/laragomez/Desktop/6.1040/noted\_backend/src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:26:7
at eventLoopTick (ext:core/01\_core.js:179:7)
at async innerWrapped (ext:cli/40\_test.js:181:5)
at async exitSanitizer (ext:cli/40\_test.js:97:27)
at async Object.outerWrapped \[as fn] (ext:cli/40\_test.js:124:14)
at async TestContext.step (ext:cli/40\_test.js:511:22)
at async file:///Users/laragomez/Desktop/6.1040/noted\_backend/src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:21:5

MusicDiscovery Principle: User searches, items are cached, search is cleared ... 2. User queries their search results => ./src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:57:13
error: AssertionError: Values are not equal: Query should return items from previous search.

```
[Diff] Actual / Expected
```

* false

- true

throw new AssertionError(message);
^
at assertEquals (https://jsr.io/@std/assert/1.0.7/equals.ts:51:9)
at file:///Users/laragomez/Desktop/6.1040/noted\_backend/src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:61:7
at eventLoopTick (ext:core/01\_core.js:179:7)
at async innerWrapped (ext:cli/40\_test.js:181:5)
at async exitSanitizer (ext:cli/40\_test.js:97:27)
at async Object.outerWrapped \[as fn] (ext:cli/40\_test.js:124:14)
at async TestContext.step (ext:cli/40\_test.js:511:22)
at async file:///Users/laragomez/Desktop/6.1040/noted\_backend/src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:57:5

MusicDiscovery Principle: User searches, items are cached, search is cleared ... 3. User clears their search results => ./src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:66:13
error: AssertionError: Values are not equal: Cached music items should still exist in the main collection.

```
[Diff] Actual / Expected
```

* false

- true

throw new AssertionError(message);
^
at assertEquals (https://jsr.io/@std/assert/1.0.7/equals.ts:51:9)
at file:///Users/laragomez/Desktop/6.1040/noted\_backend/src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:74:7
at eventLoopTick (ext:core/01\_core.js:179:7)
at async innerWrapped (ext:cli/40\_test.js:181:5)
at async exitSanitizer (ext:cli/40\_test.js:97:27)
at async Object.outerWrapped \[as fn] (ext:cli/40\_test.js:124:14)
at async TestContext.step (ext:cli/40\_test.js:511:22)
at async file:///Users/laragomez/Desktop/6.1040/noted\_backend/src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:66:5

FAILURES

MusicDiscovery Principle: User searches, items are cached, search is cleared ... 1. User searches for a track => ./src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:21:13
MusicDiscovery Principle: User searches, items are cached, search is cleared ... 2. User queries their search results => ./src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:57:13
MusicDiscovery Principle: User searches, items are cached, search is cleared ... 3. User clears their search results => ./src/concepts/MusicDiscovery/MusicDiscoveryConcept.test.ts:66:13

FAILED | 1 passed (3 steps) | 1 failed (3 steps) (2s)

error: MongoExpiredSessionError: Cannot use a session that has ended
at applySession (file:///Users/laragomez/Desktop/6.1040/noted\_backend/node\_modules/.deno/mongodb@7.0.0/node\_modules/mongodb/lib/sessions.js:749:16)
at Connection.prepareCommand (file:///Users/laragomez/Desktop/6.1040/noted\_backend/node\_modules/.deno/mongodb@7.0.0/node\_modules/mongodb/lib/cmap/connection.js:192:62)
at Connection.sendCommand (file:///Users/laragomez/Desktop/6.1040/noted\_backend/node\_modules/.deno/mongodb@7.0.0/node\_modules/mongodb/lib/cmap/connection.js:284:30)
at sendCommand.next (<anonymous>)
at Connection.command (file:///Users/laragomez/Desktop/6.1040/noted\_backend/node\_modules/.deno/mongodb@7.0.0/node\_modules/mongodb/lib/cmap/connection.js:344:26)
at Server.command (file:///Users/laragomez/Desktop/6.1040/noted\_backend/node\_modules/.deno/mongodb@7.0.0/node\_modules/mongodb/lib/sdam/server.js:208:40)
at Object.runMicrotasks (ext:core/01\_core.js:693:26)
at processTicksAndRejections (ext:deno\_node/\_next\_tick.ts:59:10)
at runNextTicks (ext:deno\_node/\_next\_tick.ts:76:3)
at eventLoopTick (ext:core/01\_core.js:186:21)
