import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '../database.types'

export async function createClient(cookieOptionsModifier?: (name: string, options: CookieOptions) => CookieOptions) {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('site_mode')?.value === 'demo'

  const supabaseUrl = isDemo 
    ? process.env.NEXT_PUBLIC_DEMO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!
    
  const supabaseKey = isDemo
    ? process.env.NEXT_PUBLIC_DEMO_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

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
            cookiesToSet.forEach(({ name, value, options }) => {
              const modifiedOptions = cookieOptionsModifier ? cookieOptionsModifier(name, options) : options
              cookieStore.set(name, value, {
                ...modifiedOptions,
                // Ensure client can read the cookie for hydration
                httpOnly: false, 
              })
            })
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
