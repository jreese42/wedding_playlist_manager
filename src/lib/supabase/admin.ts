import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '../database.types'

// Note: This client should ONLY be used in server-side contexts (API routes, Server Actions)
// It bypasses RLS and has full access to the database.
export async function createAdminClient() {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  const serviceRoleKey = isDemo 
    ? process.env.DEMO_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('Service Role Key is not defined')
  }
  
  const supabaseUrl = isDemo
    ? process.env.NEXT_PUBLIC_DEMO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
