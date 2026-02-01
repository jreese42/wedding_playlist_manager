'use client'

import { useState, useTransition } from 'react'
import { Database } from '@/lib/database.types'
import { createPlaylist, updatePlaylist, deletePlaylist, reorderPlaylists, getAllPlaylists } from '@/app/playlists/actions'
import { PlaylistForm } from './playlist-form'
import { Trash2, Edit2, GripVertical, Plus, AlertCircle } from 'lucide-react'

type Playlist = Database['public']['Tables']['playlists']['Row']

interface PlaylistManagementClientProps {
  initialPlaylists: Playlist[]
}

export function PlaylistManagementClient({ initialPlaylists }: PlaylistManagementClientProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleAdd = async (name: string, spotifyUri: string) => {
    startTransition(async () => {
      try {
        await createPlaylist(name, spotifyUri)
        setIsAddModalOpen(false)
        setSuccess('Playlist added successfully!')
        // Refetch playlists to show the new one
        const updatedPlaylists = await getAllPlaylists()
        setPlaylists(updatedPlaylists)
        setTimeout(() => setSuccess(null), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add playlist')
      }
    })
  }

  const handleUpdate = async (name: string, spotifyUri: string) => {
    if (!editingPlaylist) return

    startTransition(async () => {
      try {
        await updatePlaylist(editingPlaylist.id, name, spotifyUri)
        setEditingPlaylist(null)
        setSuccess('Playlist updated successfully!')
        // Refetch playlists to show updated data
        const updatedPlaylists = await getAllPlaylists()
        setPlaylists(updatedPlaylists)
        setTimeout(() => setSuccess(null), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update playlist')
      }
    })
  }

  const handleDelete = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist? This cannot be undone.')) {
      return
    }

    startTransition(async () => {
      try {
        await deletePlaylist(playlistId)
        setPlaylists(playlists.filter((p) => p.id !== playlistId))
        setSuccess('Playlist deleted successfully!')
        setTimeout(() => setSuccess(null), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete playlist')
      }
    })
  }

  const handleDragStart = (e: React.DragEvent, playlistId: string) => {
    setDraggedId(playlistId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetPlaylist: Playlist) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetPlaylist.id) {
      setDraggedId(null)
      return
    }

    const draggedIndex = playlists.findIndex((p) => p.id === draggedId)
    const targetIndex = playlists.findIndex((p) => p.id === targetPlaylist.id)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    // Reorder locally
    const newPlaylists = [...playlists]
    const [movedPlaylist] = newPlaylists.splice(draggedIndex, 1)
    newPlaylists.splice(targetIndex, 0, movedPlaylist)
    setPlaylists(newPlaylists)
    setDraggedId(null)

    // Save new order to server
    startTransition(async () => {
      try {
        const playlistOrder = newPlaylists.map((p, index) => ({
          id: p.id,
          order: index + 1
        }))
        await reorderPlaylists(playlistOrder)
        setSuccess('Playlists reordered!')
        // Refetch to ensure consistency
        const updatedPlaylists = await getAllPlaylists()
        setPlaylists(updatedPlaylists)
        setTimeout(() => setSuccess(null), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reorder playlists')
        // Revert to original order
        setPlaylists(initialPlaylists)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300">
          <Plus size={18} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Playlist Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition-all"
      >
        <Plus size={20} />
        Add Playlist
      </button>

      {/* Playlists List */}
      {playlists.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-white/60 mb-3">No playlists yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              draggable
              onDragStart={(e) => handleDragStart(e, playlist.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, playlist)}
              className={`bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between transition-all ${
                draggedId === playlist.id ? 'opacity-50 scale-95' : 'hover:bg-white/10'
              } ${draggedId && draggedId !== playlist.id ? 'cursor-move' : ''}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical size={18} className="text-white/40 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                  {playlist.spotify_title && (
                    <p className="text-xs text-white/60 truncate">Spotify: {playlist.spotify_title}</p>
                  )}
                  <p className="text-xs text-white/50 truncate">ID: {playlist.spotify_id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditingPlaylist(playlist)}
                  disabled={isPending}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(playlist.id)}
                  disabled={isPending}
                  className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <PlaylistForm
          title="Add New Playlist"
          onSubmit={handleAdd}
          onClose={() => setIsAddModalOpen(false)}
          isLoading={isPending}
        />
      )}

      {/* Edit Modal */}
      {editingPlaylist && (
        <PlaylistForm
          title="Edit Playlist"
          initialName={editingPlaylist.title}
          initialSpotifyUri={editingPlaylist.spotify_id ? `spotify:playlist:${editingPlaylist.spotify_id}` : ''}
          onSubmit={handleUpdate}
          onClose={() => setEditingPlaylist(null)}
          isLoading={isPending}
        />
      )}
    </div>
  )
}
