# Development Plan Update: Alpha


| Deadline | Deliverable | Owner |
|----------|-------------|-------|
| 11/25 | **Checkpoint: Alpha** - Search, reviews, Friend, Feed, Listen Later/Favorites, and profile completed end-to-end | All |
| 11/29 | Polish user auth, add necessary syncs via Request | Angela |
| 11/29 | Polish reviews, add ability to open in Spotify, add necessary syncs via Request | Olivia |
| 11/29 | Polish Listen Later and Favorites, add necessary syncs via Request | Lara/Victor |
| 11/30 | Polish Profile, add necessary syncs via Request | Angela |
| 11/30 | Polish feed, add necessary syncs via Request | Olivia |
| 12/1 | Polish Search (allow search for more than just tracks) | Lara |
| 12/1-12/2 | Attempt stretch goal of recommendations | All |
| 12/2 | **Checkpoint: Beta** - All features completed and tested | All |
| 12/4 | Polish and finalize UI formatting across Noted | All |
| 12/4 | Finalize work on stretch goals if time allows (recommendation system) | All |
| 12/5 | Complete user testing | All |
| 12/7 | Implement user testing feedback and complete user demo | All |
| 12/8 | Final Project Report | All |


## Updates to Risks and Mitigation

Integration with Spotify API required the implementation of a new concept, but we did not experience any limitations because the concept caches recent searches. We also have fallbacks in case the API becomes unavailable. 

OAuth (Spotify API authentication) still poses a risk if we implement the recommendations, so the same risk and mitigation strategy will be kept in mind for the Beta checkpoint. 

> Authentication is handled via Spotify’s OAuth feature, which reduces the complexity of managing credentials internally, but failures in the OAuth flow could prevent users from logging in. To mitigate this, we will provide clear error messages and a fallback guest/demo mode so users can still interact with the app’s main functionality.

We were able to avoid issues associated with displaying the feed by keeping the main functionality of the app independent from the feed. 


