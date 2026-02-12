/**
 * Spotify API Integration
 * 
 * Hybrid approach:
 * - spotify-web-api-node: OAuth token exchange/refresh + search (unchanged endpoints)
 * - spotifyFetch(): Raw fetch wrapper for playlist /items endpoints (Feb 2026 API)
 * 
 * Token management: DB-backed via spotify_tokens table (single admin account)
 */

import SpotifyWebApi from 'spotify-web-api-node'
import { createAdminClient } from './supabase/admin'

const client_id = process.env.SPOTIFY_CLIENT_ID
const client_secret = process.env.SPOTIFY_CLIENT_SECRET
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback'

if (!client_id || !client_secret) {
  console.warn('Missing Spotify environment variables (CLIENT_ID, CLIENT_SECRET)')
}

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// ============================================================
// Token Management (DB-backed)
// ============================================================

interface SpotifyTokenRow {
  access_token: string
  refresh_token: string
  expires_at: string
  spotify_user_id: string | null
  spotify_display_name: string | null
}

/**
 * Get a valid access token from the DB, auto-refreshing if expired.
 * Returns null if no tokens are stored (admin hasn't connected Spotify yet).
 */
async function getValidAccessToken(): Promise<string | null> {
  const supabase = await createAdminClient()

  const { data: tokens, error } = await supabase
    .from('spotify_tokens')
    .select('*')
    .eq('id', 1)
    .single()

  if (error || !tokens) {
    return null // No tokens stored — Spotify not connected
  }

  const t = tokens as unknown as SpotifyTokenRow

  // Check if token is expired (with 5-minute buffer)
  const expiresAt = new Date(t.expires_at)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    return t.access_token // Still valid
  }

  // Token expired — refresh it
  console.log('Spotify access token expired, refreshing...')
  try {
    return await refreshAccessToken(t.refresh_token)
  } catch (err) {
    console.error('Failed to refresh Spotify token:', err)
    return null
  }
}

/**
 * Refresh the access token using the stored refresh token.
 * Updates the DB row and returns the new access token.
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
  })
  spotifyApi.setRefreshToken(refreshToken)

  const data = await spotifyApi.refreshAccessToken()
  const newAccessToken = data.body['access_token']
  const expiresIn = data.body['expires_in']
  const newRefreshToken = data.body['refresh_token'] || refreshToken

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const supabase = await createAdminClient()
  await supabase
    .from('spotify_tokens')
    .update({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  console.log('Spotify token refreshed successfully')
  return newAccessToken
}

/**
 * Store OAuth tokens in the database (called from OAuth callback).
 */
export async function saveSpotifyTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  spotifyUserId?: string,
  spotifyDisplayName?: string
) {
  const supabase = await createAdminClient()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  const { error } = await supabase
    .from('spotify_tokens')
    .upsert({
      id: 1,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      spotify_user_id: spotifyUserId || null,
      spotify_display_name: spotifyDisplayName || null,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Failed to save Spotify tokens:', error)
    throw new Error('Failed to save Spotify tokens')
  }
  console.log('Spotify tokens saved to database')
}

/**
 * Remove stored tokens (disconnect Spotify).
 */
export async function clearSpotifyTokens() {
  const supabase = await createAdminClient()
  await supabase.from('spotify_tokens').delete().eq('id', 1)
  console.log('Spotify tokens cleared')
}

/**
 * Get the current Spotify connection status for UI display.
 */
export async function getSpotifyConnectionStatus(): Promise<{
  connected: boolean
  displayName: string | null
  spotifyUserId: string | null
  expiresAt: string | null
}> {
  const supabase = await createAdminClient()

  const { data: tokens, error } = await supabase
    .from('spotify_tokens')
    .select('spotify_display_name, spotify_user_id, expires_at')
    .eq('id', 1)
    .single()

  if (error || !tokens) {
    return { connected: false, displayName: null, spotifyUserId: null, expiresAt: null }
  }

  const t = tokens as any
  return {
    connected: true,
    displayName: t.spotify_display_name,
    spotifyUserId: t.spotify_user_id,
    expiresAt: t.expires_at,
  }
}

// ============================================================
// Spotify API Clients
// ============================================================

/**
 * Get a SpotifyWebApi instance with the admin's valid OAuth token.
 * Used for search and metadata operations that still work with the old library.
 * Returns null if Spotify is not connected.
 */
export async function getSpotifyClient(): Promise<SpotifyWebApi | null> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) return null

  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
  })
  spotifyApi.setAccessToken(accessToken)
  return spotifyApi
}

/**
 * Get a Client Credentials client (app-level, no user context).
 * Only for operations that don't require user scope (e.g. search fallback).
 */
export async function getSpotifyClientCredentials(): Promise<SpotifyWebApi> {
  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
  })

  const data = await spotifyApi.clientCredentialsGrant()
  spotifyApi.setAccessToken(data.body['access_token'])
  return spotifyApi
}

/**
 * Check if Spotify write operations are available (admin has connected).
 */
export async function isSpotifyConnected(): Promise<boolean> {
  const token = await getValidAccessToken()
  return token !== null
}

/**
 * Backward-compat alias. Now async and DB-backed.
 */
export async function isSpotifyWriteEnabled(): Promise<boolean> {
  return isSpotifyConnected()
}

/**
 * Get the authorization URL for admin OAuth login.
 */
export function getSpotifyAuthUrl(): string {
  const scopes = [
    'playlist-modify-public',
    'playlist-modify-private',
    'playlist-read-private',
    'playlist-read-collaborative',
  ]

  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    redirectUri: redirect_uri,
  })

  return spotifyApi.createAuthorizeURL(scopes, 'wedding-playlist-state')
}

// ============================================================
// Raw Fetch Wrapper for /items Endpoints (Feb 2026 Spotify API)
// ============================================================

/**
 * Make an authenticated request to the Spotify API.
 * Used for endpoints not supported by spotify-web-api-node (the /items endpoints).
 */
export async function spotifyFetch(
  path: string,
  options: {
    method?: string
    body?: any
    params?: Record<string, string | number>
  } = {}
): Promise<any> {
  const accessToken = await getValidAccessToken()
  if (!accessToken) {
    throw new Error('Spotify not connected. Admin must authenticate via the Admin Dashboard.')
  }

  const { method = 'GET', body, params } = options

  let url = `${SPOTIFY_API_BASE}${path}`
  if (params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value))
    }
    url += `?${searchParams.toString()}`
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`Spotify API error [${response.status}] ${method} ${path}: ${errorBody}`)
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`)
  }

  // 204 No Content or empty body
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null
  }

  return response.json()
}

// ============================================================
// Playlist Items API (Feb 2026 /items endpoints)
// ============================================================

/**
 * Get items from a playlist.
 * Replaces getPlaylistTracks() which used the REMOVED /tracks endpoint.
 */
export async function getPlaylistItems(
  playlistId: string,
  options: { offset?: number; limit?: number } = {}
): Promise<{
  items: Array<{ item: any }>
  total: number
  next: string | null
}> {
  const { offset = 0, limit = 50 } = options
  return spotifyFetch(`/playlists/${playlistId}/items`, {
    params: { offset, limit },
  })
}

/**
 * Add items to a playlist.
 * Replaces addTracksToPlaylist() which used the REMOVED /tracks endpoint.
 */
export async function addItemsToPlaylist(
  playlistId: string,
  uris: string[],
  position?: number
): Promise<{ snapshot_id: string }> {
  const body: any = { uris }
  if (position !== undefined) body.position = position
  return spotifyFetch(`/playlists/${playlistId}/items`, {
    method: 'POST',
    body,
  })
}

/**
 * Remove items from a playlist.
 * Replaces removeTracksFromPlaylist() which used the REMOVED /tracks endpoint.
 */
export async function removeItemsFromPlaylist(
  playlistId: string,
  uris: string[]
): Promise<{ snapshot_id: string }> {
  return spotifyFetch(`/playlists/${playlistId}/items`, {
    method: 'DELETE',
    body: {
      tracks: uris.map((uri) => ({ uri })),
    },
  })
}

/**
 * Replace all items in a playlist (full reorder).
 * Replaces replaceTracksInPlaylist() which used the REMOVED /tracks endpoint.
 */
export async function replacePlaylistItems(
  playlistId: string,
  uris: string[]
): Promise<{ snapshot_id: string }> {
  return spotifyFetch(`/playlists/${playlistId}/items`, {
    method: 'PUT',
    body: { uris },
  })
}
