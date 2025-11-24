import "jsr:@std/dotenv/load";

const client_id = Deno.env.get("CLIENT_ID"); 
const client_secret = Deno.env.get("CLIENT_SECRET");

async function getToken() {
    const authString = btoa(`${client_id}:${client_secret}`);

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        body: new URLSearchParams({
        'grant_type': 'client_credentials',
        }),
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + authString,
        },
    });

    return await response.json();
}

async function getTrackInfo(access_token: String, uri: String) {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${uri}`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + access_token },
  });

  return await response.json();
}

async function searchSong(access_token: String, songName: String, artistName?: string) {
    let query = `track:${songName}`;
    if (artistName) {
        query += ` artist:${artistName}`;
    }

    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
    )}&type=track&limit=10`;

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + access_token },
    })

    const track = await response.json();
    const name = track.tracks.items[0].name
    const artist = track.tracks.items[0].artists[0].name
    const uri = track.tracks.items[0].uri.split(":").at(-1);

    return track
}

getToken().then(response => {
  searchSong(response.access_token, "Need You Now", "Lady A").then(found_tracks => {
    console.log("Found song:");
    console.log(found_tracks.tracks.items[0].name, "by", found_tracks.tracks.items[0].artists[0].name);
    console.log("Spotify URL:", found_tracks.tracks.items[0].external_urls.spotify);
    console.log("URI:", found_tracks.tracks.items[0].uri);
  })
});
