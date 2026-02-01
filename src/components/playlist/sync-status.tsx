'use client'

import { useState, useTransition } from 'react'
import { Database } from '@/lib/database.types'
import { RefreshCw, Clock, Check, AlertCircle } from 'lucide-react'
import { triggerPlaylistSync } from '@/app/playlist/sync-actions'
import { isSpotifyWriteEnabled } from '@/lib/spotify'

type Playlist = Database['public']['Tables']['playlists']['Row']

interface SyncStatusProps {
  playlist: Playlist
  isAdmin: boolean
}

export function SyncStatus({ playlist, isAdmin }: SyncStatusProps) {
  const [isPending, startTransition] = useTransition()
  const [lastSyncLocal, setLastSyncLocal] = useState<string | null>(playlist.sync_timestamp)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleManualSync = async () => {
    if (!isAdmin || !playlist.spotify_id) return

    startTransition(async () => {
      try {
        await triggerPlaylistSync(playlist.id)
        setLastSyncLocal(new Date().toISOString())
        setMessage({ type: 'success', text: 'Playlist synced with Spotify!' })
        setTimeout(() => setMessage(null), 3000)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to sync'
        setMessage({ type: 'error', text: errorMsg })
        setTimeout(() => setMessage(null), 3000)
      }
    })
  }

  if (!playlist.spotify_id) {
    return null
  }

  const lastSyncDate = lastSyncLocal ? new Date(lastSyncLocal) : null
  const lastSyncText = lastSyncDate
    ? lastSyncDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Never'

  return (
    <div className="flex items-center gap-4">
      {/* Sync Status Display */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Clock size={16} />
        <span>Last sync: {lastSyncText}</span>
        {lastSyncDate && lastSyncDate.getTime() > Date.now() - 60000 && (
          <Check size={14} className="text-green-500" />
        )}
      </div>

      {/* Manual Sync Button - Coming Soon */}
      {isAdmin && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/50 bg-white/5 border border-white/10 rounded-lg opacity-60">
          <RefreshCw size={14} />
          Coming Soon
        </div>
      )}

      {/* Feedback Message */}
      {message && (
        <div
          className={`text-xs px-2 py-1 rounded ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-300'
              : 'bg-red-500/10 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
