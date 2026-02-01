/**
 * Spotify OAuth Login Endpoint
 * GET /api/auth/spotify/login - Redirects user to Spotify authorization
 */

import { getSpotifyAuthUrl } from '@/lib/spotify'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const authUrl = getSpotifyAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    )
  }
}
