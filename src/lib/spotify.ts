import SpotifyWebApi from 'spotify-web-api-node';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:4202';

if (!client_id || !client_secret) {
  console.warn('Missing Spotify environment variables (CLIENT_ID, CLIENT_SECRET)');
}

// Singleton instance for app-level access (read-only)
let spotifyApiInstance: SpotifyWebApi | null = null;

// Singleton instance for user-level access (read/write)
let spotifyUserApiInstance: SpotifyWebApi | null = null;
let spotifyUserToken: string | null = null;

/**
 * Get Spotify client for read-only operations
 * Uses Client Credentials flow (app-level access)
 */
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

/**
 * Get Spotify client for user-level operations (read/write)
 * Uses OAuth 2.0 user token
 */
export async function getSpotifyUserClient() {
  if (!spotifyUserToken) {
    throw new Error(
      'Spotify user token not available. ' +
      'Please go to /api/auth/spotify/login to authorize the app.'
    );
  }

  if (spotifyUserApiInstance) {
    return spotifyUserApiInstance;
  }

  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    accessToken: spotifyUserToken
  });

  spotifyUserApiInstance = spotifyApi;
  return spotifyApi;
}

/**
 * Set the user token (called during OAuth callback)
 */
export function setSpotifyUserToken(token: string) {
  spotifyUserToken = token;
  spotifyUserApiInstance = null; // Reset instance so it's recreated with new token
  console.log('Spotify user token set');
}

/**
 * Check if user-level Spotify access is configured
 */
export function isSpotifyWriteEnabled(): boolean {
  return !!spotifyUserToken;
}

/**
 * Get the authorization URL for OAuth login
 */
export function getSpotifyAuthUrl(): string {
  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private'
  ];
  
  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    redirectUri: redirect_uri
  });

  return spotifyApi.createAuthorizeURL(scopes, 'wedding-playlist-state');
}
