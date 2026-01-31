import SpotifyWebApi from 'spotify-web-api-node';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

if (!client_id || !client_secret) {
  console.warn('Missing Spotify environment variables');
}

// Singleton instance to prevent creating multiple token requests in development
let spotifyApiInstance: SpotifyWebApi | null = null;

export async function getSpotifyClient() {
  if (spotifyApiInstance) {
     // Ensure token is still valid (basic check, or just refresh every time for safety in this simple script)
     // For a robust app, we'd check expiration. For this "admin trigger", getting a new token is fine.
  }

  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
  });

  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApiInstance = spotifyApi;
    return spotifyApi;
  } catch (error) {
    console.error('Error retrieving access token', error);
    throw new Error('Failed to connect to Spotify');
  }
}
