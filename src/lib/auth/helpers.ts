'use server'

import { createClient } from '@/lib/supabase/server'

export async function checkIfAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return false
  }
  
  return true
}
