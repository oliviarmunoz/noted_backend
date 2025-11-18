# Problem Framing

## Domain

**Music**: I enjoy listening to music and discovering new songs or albums. I often have thoughts/feelings about pieces of music that I want to write down and easily access. I like to share and talk with my friends about new songs or albums. I want to find a way to share my thoughts on music in an efficient way.

## Problem

**Reviewing Music**: When I come across new music, it is usually spread out across my messages, notes, or playlists. I also have a hard time discovering new music sometimes and am curious about what music my friends like. I would like to have a centralized place where I can review music that I listen to while also learning about music that my friends listen to.

## Evidence

1. [Why Isn’t there a decent, working music-rating app?](https://www.reddit.com/r/LetsTalkMusic/comments/n4sj9e/why_isnt_there_a_decent_working_musicrating_app/): A Reddit post dives deeper into the lack of a social driven music-rating app. Comments agree on the downfalls of existing attempts at this problem, including but not limited to outdated UIs, lacking databases, and unintuitive searches.

2. [There are a few reasons why a widely popular, effective music-rating app doesn’t exist or hasn’t taken off](https://medium.com/@zeynco/why-dont-we-have-decent-music-review-and-rating-apps-2afd3c340d34): Cons of developing a music rating platform include too many songs, platforms already incorporate some feedback through a "liked song" feature, and music preferences are too diverse/subjective. However, most music focused apps are focused on discovery rather than rating and connecting with friends.

3. [Evaluating the Impact of Social Media on Music and Video Distribution](https://www.cachefly.com/news/evaulating-the-impact-of-social-media-on-music-and-video-distribution/): Social media platforms have songs that often blow up and work their way into the playlists of many users, significantly influencing the way in which users discover music. Social media has become one of the main avenues to do so.

4. [Discovering Music Through Friends — A Spotify Case Study](https://medium.com/@cindy.huang/spotify-case-study-discovering-music-through-friend-recommendations-ee21df5c24aa): People prefer to discover music through friends or word of mouth. They are more likely to listen to new music when it has personally been recommended to them through another person.

5. [Why Music Reviews Still Matter](https://stlenox.com/2021/08/01/why-music-reviews-still-matter/):
   Music reviews serve to equal out the playing field in the world of music. In an ideal world, reviews correlate to perceived quality of work, and giving the power back to every day people ensures that.

## Comparables

1. [Rate Your Music](https://rateyourmusic.com/): This website allows users to discover music through browsing personalized music charts and a platform to rate and review songs on a scale of 5. However, the friend feature does not allow users to comment on each others' ratings, and there is not a clear friend feed to see this activity in one place.

2. [Letterboxd](https://letterboxd.com/): An example of a socially driven review app which focuses on movies rather than music. Users can see and comment on their friends' reviews, as well as track films that they are interested in seeing.

3. [RateYourMusic Case Study: an Examination of RYM’s UX Flaws](https://medium.com/@justicedsn/rateyourmusic-case-study-an-examination-of-ryms-ux-flaws-dca7f724462b): The app is hard to use, too minimalist and outdated, and unintuitive to write reviews. This could be drawing away demand for this type of application, and this case study also offers improvements to use.

4. [Beli](https://beliapp.com/): An app dedicated to tracking and sharing your favorite restaurants with your friends. Get access to personalized recs for restaurants. This is another example of a demand for users who want to engage with their friends' reviews in another aspect of their life. There is demand for movies and restaurants, so music is a natural expansion from there.

## Features

- **Rating System**: Easily rate each song from 1 to 5 and jot down your first impressions or detailed thoughts. Your ratings are saved automatically, so you can revisit and edit them anytime.
- **Link to Music**: Open songs directly in Spotify (via a link) so you can listen whenever you want.
- **Social networking**: Check out your friends’ ratings, explore their reviews, and share your thoughts in the comments.
- **Favorites**: Keep track of your favorite albums, artists, and songs. You can access your friends' lists of favorites on their profile page
- **Listen Later**: Add songs to a listen later feature based on friends' reviews and ratings, or just individually. Easy place to also keep track of songs that you have listened to already but may want to hold off on reviewing until later.

## Ethical Analysis

### Stakeholders

- The primary users of this app will be people interested in discovering and reviewing music. The app will help them connect with friends and explore music in an interactive way. To do so, the app should integrate with existing social media platforms so users can easily find and follow friends.
- Artists will be indirectly affected by how their music is rated and discussed. Ethically, it’s important to promote transparency. These artists should have access to all their reviews and how their music is being shared.
- The most common users on this app will be those who listen to a lot of music, so we want these users should have an efficient and enjoyable experience. To accommodate them, we will make rating large amounts of music very efficient. Specifically, when you rate a song, the next song to rate will immediately come up.
- With enough volume, one of the indirect stakeholders might be large music streaming platforms like Spotify or Apple Music. Eventually, we might need to give these streaming platforms access to some public APIs that allow them to show our recommendations on their apps.
- Advertisers might explore our app to see which music is the most popular in various demographics. To allow for users such as these, we can allow quick access to generalized ratings of popular songs by common public demographics such as region or age.

### Time

- Storing music reviews over time can support emotional reflection and wellbeing. Music often evokes strong feelings, and journaling these reactions helps users track moods and personal growth. Short-term, it provides emotional release; long-term, it builds a record of experiences and tastes. We will allow reviews to be private, giving users a safe space to express themselves, and optionally provide simple summaries of listening trends over time.
- A person’s music tastes change over time due to factors like trends, new experiences, and mood shifts. Without a way to track past reviews, users may forget why they chose to rank certain songs. As a result, we want users to easily access their history of reviews so they can gain context for certain ratings. We also want to ensure that our intelligent recommendations are up to date with their current music taste as input.
- Friends change the frequency at which they stay in contact due to life events that come up. By allowing users to view the music their friends have recently reviewed or listened to, the app can help sustain friendships and spark new conversations beyond the platform, offering an easy, low-effort way to reconnect through shared music interests.
- In the short term, users may want to find out what music is trending and going viral instead of relying on old playlists and songs they often listen to. To fulfill this user need, we can provide users with the ability to view trending music or the top songs their friends listened to in a given period of time (past day, week, etc.).
- Users might not want to spend too much time writing reviews for every song they listen to. When users do feel inclined to listen to a song, we want to provide an optional review box in addition to a numerical rating. The review can be anything between a quick reaction with an emoji or a longer paragraph to ensure that reviewing is engaging and natural rather than time-consuming.

### Pervasiveness

- As the user base expands, it’s crucial to consider data privacy and ownership. To do so, we would need to consider what data should be publicly available to large organizations, including sensitive or personal information.
- Because music availability varies by region, the app must comply with local content regulations. Verifying a user’s geographic region (like through IP addresses) will help determine which songs are accessible, ensuring compliance without restricting user experience unnecessarily.
- We would also need to consider the various devices on which this application could be run. For example, we would need to distinguish how our application looks on desktops, phones, and tablets.
- With more and more countries using this application, problems will arise with cultural differences in certain types of music. One way our app might address this would be to separate ratings in different countries, similarly to how music charts are different for each country.
- As the app expands, it would important to make sure our application is accessible in various languages. Translation features are straightforward to implement and could greatly improve the accessibility of our application.

### Values

- New artists are constantly on the rise, and the inclusion of as many artists and music as possible might become an issue. To solve this, we would make sure to use a popular API, such as Spotify’s, to stay updated with the newest trends in music.
- With any social networking feature, there would need to be some sort of moderation of harmful language on content that can be seen by others. To tackle this, we can have a safety detection feature that will moderate users' comments and reviews before they are uploaded.
- Eventually, there might be a few artists who dominate music recommendations because they are widely popular. To avoid popularity bias, we will make sure our recommendation feature includes songs from lesser-known artists when applicable.
- Each user might have different preferences about which of their reviews are visible to others on the platform. To solve this problem, we will have a clear notification when the app is first used of the default visibility settings and how to change them for specific songs.
- Accessibility might be an issue for certain users. To be inclusive of these users, we will make sure our app has visibility settings such as high-contrast colors and different background colors.
