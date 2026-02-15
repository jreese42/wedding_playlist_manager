/**
 * Spotify OAuth Callback Endpoint
 * GET /api/auth/spotify/callback — Handles OAuth redirect from Spotify
 * 
 * Persists tokens to the database for long-lived access.
 * Only accessible to admin users.
 */

import { saveSpotifyTokens } from '@/lib/spotify'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { NextRequest, NextResponse } from 'next/server'

const client_id = process.env.SPOTIFY_CLIENT_ID!
const client_secret = process.env.SPOTIFY_CLIENT_SECRET!
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI!

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin

  try {
    // Admin-only guard
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/?auth_error=Unauthorized', baseUrl))
    }

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('[Spotify Callback] Auth error from Spotify:', error)
      return NextResponse.redirect(
        new URL(`/admin?spotify_error=${encodeURIComponent(error)}`, baseUrl)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin?spotify_error=No+code+provided', baseUrl)
      )
    }

    console.log('[Spotify Callback] Exchanging code for token...')
    console.log('[Spotify Callback] redirect_uri:', redirect_uri)

    // Exchange code for access token using raw fetch (spotify-web-api-node is abandoned)
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('[Spotify Callback] Token exchange failed:', tokenData)
      const errMsg = tokenData.error_description || tokenData.error || 'Token exchange failed'
      return NextResponse.redirect(
        new URL(`/admin?spotify_error=${encodeURIComponent(errMsg)}`, baseUrl)
      )
    }

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in

    if (!accessToken || !refreshToken) {
      return NextResponse.redirect(
        new URL('/admin?spotify_error=No+tokens+received', baseUrl)
      )
    }

    // Fetch the Spotify user profile
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const profile = await profileResponse.json()
    const spotifyUserId = profile.id
    const spotifyDisplayName = profile.display_name || profile.id

    // Persist tokens to database
    await saveSpotifyTokens(
      accessToken,
      refreshToken,
      expiresIn,
      spotifyUserId,
      spotifyDisplayName
    )

    console.log(`✓ Spotify OAuth successful for ${spotifyDisplayName}`)

    return NextResponse.redirect(
      new URL(`/admin?spotify_success=Connected+as+${encodeURIComponent(spotifyDisplayName)}`, baseUrl)
    )
  } catch (error: any) {
    console.error('[Spotify Callback] Unhandled error:', error)
    const errorMsg = error?.message || String(error)
    return NextResponse.redirect(
      new URL(`/admin?spotify_error=${encodeURIComponent(errorMsg)}`, baseUrl)
    )
  }
}
