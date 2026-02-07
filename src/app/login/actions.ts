'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function login(prevState: { error: string }, formData: FormData) {
  const remember = formData.get('remember') === 'on'
  
  const supabase = await createClient((name, options) => {
    // Only modify auth cookies
    if (name.startsWith('sb-')) {
      if (remember) {
        return {
          ...options,
          maxAge: 60 * 60 * 24 * 365, // 1 year
        }
      } else {
        // Remove maxAge and expires for session cookie
        const { maxAge, expires, ...rest } = options
        return rest
      }
    }
    return options
  })

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  const cookieStore = await cookies()

  console.log('[logout] Signing out user')
  await supabase.auth.signOut()

  // Clear demo mode cookie if present
  if (cookieStore.get('site_mode')) {
    cookieStore.delete('site_mode')
  }

  console.log('[logout] User signed out, revalidating paths')
  revalidatePath('/', 'layout')
  revalidatePath('/')
  console.log('[logout] Redirecting to /login')
  redirect('/login')
}
