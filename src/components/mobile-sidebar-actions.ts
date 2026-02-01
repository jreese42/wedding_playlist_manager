'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMobileSidebarData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch playlists
  const { data: playlists = [] } = await supabase
    .from('playlists')
    .select('id, title')
    .order('display_order', { ascending: true })

  // Check if admin
  const isAdmin = user && user.email === process.env.ADMIN_EMAIL

  return {
    user,
    playlists: playlists || [],
    isAdmin: !!isAdmin,
  }
}
