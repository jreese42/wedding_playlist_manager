/**
 * Spotify OAuth Callback Endpoint
 * GET /api/auth/spotify/callback — Handles OAuth redirect from Spotify
 * 
 * Persists tokens to the database for long-lived access.
 * Only accessible to admin users.
 */

import SpotifyWebApi from 'spotify-web-api-node'
import { saveSpotifyTokens } from '@/lib/spotify'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { NextRequest, NextResponse } from 'next/server'

const client_id = process.env.SPOTIFY_CLIENT_ID
const client_secret = process.env.SPOTIFY_CLIENT_SECRET
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback'

export async function GET(request: NextRequest) {
  try {
    // Admin-only guard
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) {
      return NextResponse.redirect(
        new URL('/?auth_error=Unauthorized%3A+Only+admins+can+connect+Spotify', request.url)
      )
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Spotify auth error:', error)
      return NextResponse.redirect(
        new URL(`/admin?spotify_error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin?spotify_error=No+code+provided', request.url)
      )
    }

    // Exchange code for access token
    const spotifyApi = new SpotifyWebApi({
      clientId: client_id,
      clientSecret: client_secret,
      redirectUri: redirect_uri,
    })

    const data = await spotifyApi.authorizationCodeGrant(code)
    const accessToken = data.body['access_token']
    const refreshToken = data.body['refresh_token']
    const expiresIn = data.body['expires_in']

    if (!accessToken || !refreshToken) {
      throw new Error('No access token or refresh token received')
    }

    // Fetch the Spotify user profile to store display name
    spotifyApi.setAccessToken(accessToken)
    const me = await spotifyApi.getMe()
    const spotifyUserId = me.body.id
    const spotifyDisplayName = me.body.display_name || me.body.id

    // Persist tokens to database
    await saveSpotifyTokens(
      accessToken,
      refreshToken,
      expiresIn,
      spotifyUserId,
      spotifyDisplayName
    )

    console.log(`✓ Spotify OAuth successful for ${spotifyDisplayName}`)

    // Redirect back to admin with success message
    return NextResponse.redirect(
      new URL(`/admin?spotify_success=Connected+as+${encodeURIComponent(spotifyDisplayName)}`, request.url)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(
        `/admin?spotify_error=${encodeURIComponent('Failed to authenticate: ' + errorMsg)}`,
        request.url
      )
    )
  }
}
