'use client'

import { useState, useTransition } from 'react'
import { updateAppSettings } from '@/app/admin/settings/actions'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface AppSetting {
  key: string
  value: string | null
  description: string | null
}

interface AdminSettingsClientProps {
  initialSettings: AppSetting[]
}

export function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  // Create a map of settings from the array
  const settingMap = initialSettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value || '' }), {} as Record<string, string>)

  // Define the setting config first so we can ensure all keys are initialized
  const settingConfig = [
    {
      key: 'page_title',
      label: 'Browser Tab Title',
      description: 'The title shown in the browser tab and page header'
    },
    {
      key: 'homepage_text',
      label: 'Homepage Main Text',
      description: 'The main heading text displayed on the homepage'
    },
    {
      key: 'homepage_subtitle',
      label: 'Homepage Subtitle',
      description: 'The subtitle text displayed below the main heading on the homepage'
    }
  ]

  // Initialize settings with all keys, using values from settingMap or defaults to empty string
  const [settings, setSettings] = useState<Record<string, string>>(
    settingConfig.reduce((acc, { key }) => ({ ...acc, [key]: settingMap[key] || '' }), {})
  )
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    setMessage(null)

    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value
    }))

    startTransition(async () => {
      try {
        await updateAppSettings(updates)
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } catch (error) {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to save settings'
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Settings Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md space-y-6">
        {settingConfig.map(({ key, label, description }) => (
          <div key={key} className="space-y-2">
            <label htmlFor={key} className="text-sm font-medium text-white">
              {label}
            </label>
            <p className="text-xs text-white/60">{description}</p>
            <textarea
              id={key}
              value={settings[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              disabled={isPending}
              rows={key === 'homepage_subtitle' ? 2 : 3}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50 font-mono text-sm"
            />
          </div>
        ))}
      </div>

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

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}
