import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../database.types'

export async function createClient() {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  const supabaseUrl = isDemo 
    ? process.env.NEXT_PUBLIC_DEMO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!
    
  const supabaseKey = isDemo
    ? process.env.DEMO_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                // Ensure client can read the cookie for hydration
                httpOnly: false, 
              })
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
