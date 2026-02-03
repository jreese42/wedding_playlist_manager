import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

export function createClient() {
  // Check for demo mode cookie
  const isDemo = typeof document !== 'undefined' && document.cookie.includes('site_mode=demo')
  
  const supabaseUrl = isDemo 
    ? process.env.NEXT_PUBLIC_DEMO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_URL!
    
  const supabaseKey = isDemo
    ? process.env.NEXT_PUBLIC_DEMO_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  )
}
