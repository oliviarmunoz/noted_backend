# Development Plan

## Feature Timeline & Milestones

| Deadline | Deliverable | Owner |
|----------|-------------|-------|
| 11/19 | Initial concept implementation with testing for concepts designed in functional design | Victor |
| 11/19 | User authentication fully implemented (login + signup) with frontend integration | Angela |
| 11/21 | Implement full search UI + connect to Spotify API | Victor |
| 11/23 | Ability to add/remove songs from Listen Later and Favorites; both pages fully functional | Lara |
| 11/25 | Create, edit, delete, and view reviews linked to specific music | Olivia |
| 11/25 | Initial user profile page showing basic user info (username, bio, picture) | Victor |
| 11/25 | **Checkpoint: Alpha** - Search, reviews, Listen Later/Favorites, and basic profile are fully functional end-to-end | All |
| 11/29 | Friend request system: add/remove friends | Lara |
| 11/30 | Feed displays reviews from friends | Angela |
| 11/30 | User profile is updated to show dynamic recent activity and public favorites | Olivia |
| 12/2 | **Checkpoint: Beta** - All features complete; major addition since Alpha is friends & feed | All |
| 12/4 | Polish and finalize UI formatting across Noted | All |
| 12/4 | Finalize work on stretch goals if time allows (recommendation system) | All |
| 12/5 | Complete user testing | All |
| 12/7 | Implement user testing feedback and complete user demo | All |
| 12/8 | Final Project Report | All |

## Risks and Mitigation

In developing Noted, we anticipate several potential challenges that could impact the app’s functionality. One major risk is integration with the Spotify API, which could fail, return incomplete data, or hit rate limits. To mitigate this, we will validate API responses and cache recent searches to reduce repeated requests. If the API becomes unavailable, we will preload a set of songs into the system so users can continue using the app’s core features. Authentication is handled via Spotify’s OAuth feature, which reduces the complexity of managing credentials internally, but failures in the OAuth flow could prevent users from logging in. To mitigate this, we will provide clear error messages and a fallback guest/demo mode so users can still interact with the app’s main functionality. Finally, the social feed could experience performance issues or slow loading if friends post a large volume of reviews. To address this, we will load feed items in batches and optimize database queries, ensuring the feed remains responsive. If necessary, we will limit the number of feed items displayed or show only the most recent activity to maintain a smooth user experience.
