import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlaylistCard } from '@/components/home/playlist-card'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// Simple slugify function
const slugify = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// Prevent caching - always revalidate and don't cache
export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (!user || authError) {
    // Redirect unauthenticated users to login
    redirect('/login')
  }
  
  const adminSupabase = await createAdminClient()
  
  // Fetch app settings using admin client (has access to app_settings table)
  const { data: appSettingsArray = [] } = await (adminSupabase as any)
    .from('app_settings')
    .select('key, value')
  
  const appSettings = appSettingsArray.reduce((acc: Record<string, string>, setting: any) => ({
    ...acc,
    [setting.key]: setting.value
  }), {} as Record<string, string>)
  
  // Fetch playlists - use explicit columns to avoid schema cache issues
  const { data: playlists } = await supabase
    .from('playlists')
    .select('id, title, vibe, spotify_id, spotify_title, display_order')
    .order('display_order', { ascending: true })

  const gradients = [
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
    'from-amber-500 to-orange-500',
    'from-lime-500 to-green-500',
    'from-cyan-500 to-blue-500',
    'from-violet-500 to-fuchsia-500',
  ]

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 lg:p-16">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-4 bg-gradient-to-r from-white to-zinc-500 text-transparent bg-clip-text pb-2">
            {appSettings['homepage_text'] || 'Collaborative Playlists'}
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {appSettings['homepage_subtitle'] || 'Your dashboard for collaboratively curating the perfect soundtrack. Click a playlist to start organizing.'}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {playlists && playlists.length > 0 ? (
            playlists.map((playlist, index) => {
              const slug = slugify(playlist.title.split(' ')[0]); // Simple slug from first word
              return (
                <PlaylistCard
                  key={playlist.id}
                  slug={slug}
                  title={playlist.title}
                  vibe={playlist.vibe}
                  gradientClasses={gradients[index % gradients.length]}
                />
              )
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-zinc-400">No playlists yet. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
