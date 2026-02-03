'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createDemoCheckpoint } from '@/lib/demo-service'

export async function clearDemoActivity() {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  if (!isDemo) {
    throw new Error('This action is only available in Demo Mode.')
  }
  
  const supabase = await createAdminClient()

  // Clear the audit log first
  const { error: rpcError } = await supabase.rpc('clear_demo_activity_log' as any)
  if (rpcError) {
    console.error('Failed to clear audit log:', rpcError)
    throw new Error('Failed to clear audit log.')
  }

  // Then, reset all track ratings to 0
  const { error: updateError } = await supabase
    .from('tracks')
    .update({ rating: 0 })
    .neq('rating', 0) // Only update tracks that have a rating

  if (updateError) {
    console.error('Failed to reset track ratings:', updateError)
    throw new Error('Failed to reset track ratings.')
  }

  revalidatePath('/admin')
  revalidatePath('/playlist/[slug]', 'layout')
  redirect('/admin')
}

export async function saveDemoCheckpoint() {
  await createDemoCheckpoint()
  revalidatePath('/admin')
  redirect('/admin')
}

export async function resetDemoDatabase() {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  if (!isDemo) {
    throw new Error('This action is only available in Demo Mode.')
  }
  
  const supabase = await createAdminClient()
  const { error } = await supabase.rpc('reset_demo_db' as any, { 
      p_demo_admin_email: process.env.DEMO_ADMIN_EMAIL,
      p_demo_user_email: process.env.DEMO_USER_EMAIL
  })

  if (error) {
    console.error('Failed to reset demo database:', error)
    throw new Error('Failed to reset demo database.')
  }

  revalidatePath('/admin')
  redirect('/admin')
}

export async function enableDemoMode() {
  const cookieStore = await cookies()
  
  // Set the site mode cookie first
  cookieStore.set('site_mode', 'demo', {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 // 1 day
  })

  // Set the tour cookie
  cookieStore.set('start_tour', 'true', {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 5 // 5 minutes expiry
  })

  // Create a Supabase client that is now aware of the 'demo' cookie
  const supabase = await createClient()

  // Sign in the generic demo user
  const email = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD

  if (!email || !password) {
    // If credentials aren't set, redirect to login to show an error or let them log in manually
    redirect('/login?error=Demo user not configured')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('Demo login failed:', error)
    // Redirect to login with a specific error if sign-in fails
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }
  
  // Redirect to the homepage after successful login
  redirect('/?tour=true')
}

export async function disableDemoMode() {
  const cookieStore = await cookies()
  
  const supabase = await createClient()
  await supabase.auth.signOut()

  cookieStore.delete('site_mode')
  
  redirect('/login')
}

export async function goToDemoLogin() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  redirect('/login/demo')
}

export async function checkDemoExpiration() {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  if (!isDemo) {
    return false // Not in demo mode, so not expired
  }
  
  const supabase = await createAdminClient()
  // NOTE: Keep timeout value in sync with manageDemoState
  const { data: needsReset, error } = await supabase.rpc('check_demo_timeout' as any, { timeout_minutes: 4 })

  if (error) {
    console.error('Failed to check demo expiration:', error)
    return false // Assume not expired on error to prevent accidental logout
  }

  return needsReset || false
}

export async function registerDemoActivity() {
  'use server'
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  if (!isDemo) {
    return // Not in demo mode
  }
  
  const supabase = await createAdminClient()
  await supabase.rpc('register_demo_activity' as any)
}

