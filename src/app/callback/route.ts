/**
 * Root OAuth Callback Handler
 * GET http://localhost:3000?code=... - Processes the OAuth code and stores token
 */

import SpotifyWebApi from 'spotify-web-api-node'
import { setSpotifyUserToken } from '@/lib/spotify'
import { NextRequest, NextResponse } from 'next/server'

const client_id = process.env.SPOTIFY_CLIENT_ID
const client_secret = process.env.SPOTIFY_CLIENT_SECRET
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // If no code or error, this is just a regular page load
    if (!code && !error) {
      return NextResponse.next()
    }

    if (error) {
      console.error('Spotify auth error:', error)
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?auth_error=No code provided', request.url)
      )
    }

    console.log('Processing Spotify OAuth code...')

    // Exchange code for access token
    const spotifyApi = new SpotifyWebApi({
      clientId: client_id,
      clientSecret: client_secret,
      redirectUri: redirect_uri
    })

    const data = await spotifyApi.authorizationCodeGrant(code)
    const accessToken = data.body['access_token']
    const refreshToken = data.body['refresh_token']

    if (!accessToken) {
      throw new Error('No access token received')
    }

    // Store the token for use in the app
    setSpotifyUserToken(accessToken)

    console.log('✓ Spotify OAuth successful')
    console.log(`Token expires in: ${data.body['expires_in']} seconds`)

    // TODO: In production, you'd want to store the refreshToken in a database
    // so the token can be refreshed when it expires
    if (refreshToken) {
      console.log('Refresh token available - consider storing in production')
    }

    // Redirect to home with success message
    return NextResponse.redirect(
      new URL('/?auth_success=true', request.url)
    )
  } catch (error) {
    console.error('OAuth error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent('Failed to authenticate: ' + errorMsg)}`,
        request.url
      )
    )
  }
}
