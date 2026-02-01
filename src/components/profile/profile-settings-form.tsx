'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/playlist/actions'
import { AvatarColorPicker } from './avatar-color-picker'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface ProfileSettingsFormProps {
  initialDisplayName: string
  initialAvatarColor: string
}

export function ProfileSettingsForm({ initialDisplayName, initialAvatarColor }: ProfileSettingsFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [avatarColor, setAvatarColor] = useState(initialAvatarColor)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    startTransition(async () => {
      try {
        await updateProfile(displayName, avatarColor)
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } catch (error) {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to update profile'
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Display Name */}
      <div className="space-y-2">
        <label htmlFor="displayName" className="text-sm font-medium text-white/80">
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isPending}
          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50"
          placeholder="Enter your name"
        />
      </div>

      {/* Avatar Color Picker */}
      <AvatarColorPicker value={avatarColor} onChange={setAvatarColor} displayName={displayName} />

      {/* Messages */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={18} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending || displayName.trim() === initialDisplayName && avatarColor === initialAvatarColor}
        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
