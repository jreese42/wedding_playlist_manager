'use client'

import { useState } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PlaylistFormProps {
  onSubmit: (name: string, spotifyUri: string) => Promise<void>
  onClose: () => void
  initialName?: string
  initialSpotifyUri?: string
  isLoading?: boolean
  title?: string
}

export function PlaylistForm({
  onSubmit,
  onClose,
  initialName = '',
  initialSpotifyUri = '',
  isLoading = false,
  title = 'Add Playlist'
}: PlaylistFormProps) {
  const [name, setName] = useState(initialName)
  const [spotifyUri, setSpotifyUri] = useState(initialSpotifyUri)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Playlist name is required')
      return
    }

    if (!spotifyUri.trim()) {
      setError('Spotify URI is required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(name, spotifyUri)
      setName('')
      setSpotifyUri('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save playlist')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-white/80">
              Playlist Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting || isLoading}
              placeholder="e.g., Reception Music"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50"
            />
            <p className="text-xs text-white/50">This name will appear in the sidebar</p>
          </div>

          {/* Spotify URI Input */}
          <div className="space-y-2">
            <label htmlFor="spotifyUri" className="text-sm font-medium text-white/80">
              Spotify Playlist URI
            </label>
            <input
              id="spotifyUri"
              type="text"
              value={spotifyUri}
              onChange={(e) => setSpotifyUri(e.target.value)}
              disabled={isSubmitting || isLoading}
              placeholder="e.g., spotify:playlist:37i9dQZF1DX4UtSsGT1Sbe"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50 text-xs"
            />
            <p className="text-xs text-white/50">Find this in Spotify by right-clicking a playlist and selecting "Copy Spotify URI"</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading || !name.trim() || !spotifyUri.trim()}
            className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Saving...' : 'Save Playlist'}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
            className="w-full px-4 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 disabled:opacity-50 transition-all"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  )
}
