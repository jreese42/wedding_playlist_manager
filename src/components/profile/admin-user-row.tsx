'use client'

import { useState, useTransition } from 'react'
import { adminUpdateUserProfile } from '@/app/playlist/actions'
import { AvatarColorPicker } from './avatar-color-picker'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

interface AdminUserRowProps {
  userId: string
  email: string
  displayName: string
  avatarColor: string
}

export function AdminUserRow({ userId, email, displayName, avatarColor }: AdminUserRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(displayName)
  const [editColor, setEditColor] = useState(avatarColor)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setMessage(null)

    startTransition(async () => {
      try {
        await adminUpdateUserProfile(userId, editName, editColor)
        setMessage({ type: 'success', text: 'User updated successfully' })
        setIsEditing(false)
        setTimeout(() => setMessage(null), 2000)
      } catch (error) {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to update user'
        })
      }
    })
  }

  const handleCancel = () => {
    setEditName(displayName)
    setEditColor(avatarColor)
    setIsEditing(false)
    setMessage(null)
  }

  if (isEditing) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-white/60">{email}</p>
            <p className="text-xs text-white/40">ID: {userId.slice(0, 8)}...</p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 text-white/60 hover:text-white transition-colors"
            title="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Display Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50"
          />
        </div>

        <AvatarColorPicker value={editColor} onChange={setEditColor} label="Avatar Color" displayName={editName} />

        {message && (
          <div
            className={`flex items-center gap-2 p-2 rounded text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={14} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={14} className="flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-green-600/70 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 transition-colors text-sm"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-50 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border border-white/20"
          style={{ backgroundColor: avatarColor }}
        >
          {editName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium">{displayName}</p>
          <p className="text-xs text-white/50">{email}</p>
        </div>
      </div>
      <button
        onClick={() => setIsEditing(true)}
        className="px-3 py-1.5 bg-indigo-600/70 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm"
      >
        Edit
      </button>
    </div>
  )
}
