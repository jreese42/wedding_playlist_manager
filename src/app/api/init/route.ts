/**
 * App initialization endpoint
 * GET /api/init - Initializes periodic sync and other background services
 * 
 * This is called once on app startup to set up the periodic sync service
 */

import { startPeriodicSync } from '@/lib/spotify-periodic-sync'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Flag to track if sync service is already running
let syncServiceRunning = false

export async function GET() {
  try {
    // Auth check: require authenticated admin user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only start if not already running
    if (!syncServiceRunning) {
      syncServiceRunning = true
      // Start periodic sync: every 10 minutes
      startPeriodicSync(10 * 60 * 1000)
    }

    return NextResponse.json({
      success: true,
      message: 'App initialized successfully'
    })
  } catch (error) {
    console.error('Initialization error:', error)
    return NextResponse.json(
      { error: 'Initialization failed' },
      { status: 500 }
    )
  }
}
