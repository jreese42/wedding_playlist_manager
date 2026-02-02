'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, Music, Settings, LogOut, LogIn, Edit2 } from 'lucide-react'
import { useMobileMenu } from '@/lib/mobile-menu-context'
import { getMobileSidebarData } from './mobile-sidebar-actions'

interface Playlist {
  id: string
  title: string
}

export function MobileSidebar() {
  const { isOpen, setIsOpen } = useMobileMenu()
  const [user, setUser] = useState<any>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data once on mount, not just when sidebar opens
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMobileSidebarData()
        setUser(data.user)
        setPlaylists(data.playlists)
        setIsAdmin(data.isAdmin)
      } catch (error) {
        console.error('Error fetching mobile sidebar data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsOpen(false)
  }

  return (
    <div
      className={`md:hidden fixed left-0 top-0 h-screen w-64 max-h-screen bg-zinc-950 text-white z-50 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="space-y-4 py-4 pt-20">
        {/* Wedding Music Section */}
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Wedding Music
          </h2>
          <div className="space-y-1">
            <Link href="/">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium"
              >
                <Home className="h-4 w-4" />
                Home
              </button>
            </Link>
          </div>
        </div>

        {/* Dynamic Playlists Section */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="px-4 text-lg font-semibold tracking-tight">
              Playlists
            </h2>
            <Link href="/playlists">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white" 
                title="Manage playlists"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </Link>
          </div>
          <div className="space-y-1">
            {isLoading ? (
              <p className="px-4 py-2 text-xs text-zinc-500">Loading playlists...</p>
            ) : !playlists || playlists.length === 0 ? (
              <p className="px-4 py-2 text-xs text-zinc-500">No playlists yet. Click the edit button to add one.</p>
            ) : (
              playlists.map((playlist) => (
                <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium"
                  >
                    <Music className="h-4 w-4" />
                    {playlist.title}
                  </button>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Admin
            </h2>
            <div className="space-y-1">
              <Link href="/admin">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Account Section */}
        {user && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Account
            </h2>
            <div className="space-y-1">
              <Link href="/settings">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium"
                >
                  <Settings className="h-4 w-4" />
                  Profile
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Sign In/Out */}
        <div className="px-3 py-2 mt-auto">
          <div className="space-y-1">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
              <Link href="/login">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full justify-start flex items-center gap-2 px-4 py-2 hover:bg-zinc-800 rounded-md transition-colors text-sm font-medium"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
