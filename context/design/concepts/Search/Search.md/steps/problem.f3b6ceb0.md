---
timestamp: 'Mon Nov 24 2025 18:50:21 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251124_185021.26a75bf9.md]]'
content_id: f3b6ceb01dbf46ff4c84eadfa116113dee07f50e093f47cbe3e9e34e30482676
---

# problem: Rate Limiting and Performance

Because `search` performs a synchronous network call to the Spotify API, the action might be slow (hundreds of milliseconds). If multiple concepts synchronize on this action, or if the user spans the search button, we might hit Spotify API rate limits or degrade application performance.
