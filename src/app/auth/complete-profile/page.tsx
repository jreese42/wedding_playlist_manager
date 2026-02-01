'use client'

import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/playlist/actions'
import { AvatarColorPicker } from '@/components/profile/avatar-color-picker'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [avatarColor, setAvatarColor] = useState('#6366f1')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!displayName.trim()) {
      setMessage({ type: 'error', text: 'Please enter your name' })
      return
    }

    startTransition(async () => {
      try {
        await updateProfile(displayName, avatarColor)
        setMessage({ type: 'success', text: 'Profile created! Redirecting...' })
        setTimeout(() => router.push('/'), 1500)
      } catch (error) {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to complete profile'
        })
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome!</h1>
          <p className="text-white/60">Let's set up your profile</p>
        </div>

        {/* Setup Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-white/80">
                What's your name?
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isPending}
                autoFocus
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50"
                placeholder="Enter your name"
              />
            </div>

            {/* Avatar Color Picker */}
            <AvatarColorPicker value={avatarColor} onChange={setAvatarColor} label="Choose your avatar color" displayName={displayName} />

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
              disabled={isPending || !displayName.trim()}
              className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Setting up...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
