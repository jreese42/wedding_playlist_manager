import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlaylistManagementClient } from '@/components/playlists/playlist-management-client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function PlaylistsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    redirect('/auth/signin')
  }

  // Fetch all playlists
  const { data: playlists, error: playlistsError } = await supabase
    .from('playlists')
    .select('*')
    .order('display_order', { ascending: true })

  if (playlistsError) {
    console.error('Error fetching playlists:', playlistsError)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Manage Playlists</h1>
          <p className="text-white/60">Create, edit, and organize your tracked playlists</p>
        </div>

        {/* Management Client */}
        <PlaylistManagementClient initialPlaylists={playlists || []} />
      </div>
    </div>
  )
}
