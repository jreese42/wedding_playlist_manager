import { checkIfAdmin } from '@/lib/auth/helpers'
import { redirect } from 'next/navigation'
import { AdminSettingsClient } from '@/components/admin/admin-settings-client'
import { ArrowLeft, Settings } from 'lucide-react'
import Link from 'next/link'
import { getAppSettings } from './actions'

export default async function AdminSettingsPage() {
  const isAdmin = await checkIfAdmin()
  if (!isAdmin) {
    redirect('/')
  }

  const settings = await getAppSettings()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Back to Admin
          </Link>
          <div className="flex items-center gap-3">
            <Settings size={32} className="text-indigo-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Application Settings</h1>
              <p className="text-white/60">Configure app-wide settings for the bride</p>
            </div>
          </div>
        </div>

        {/* Settings Client */}
        <AdminSettingsClient initialSettings={settings} />
      </div>
    </div>
  )
}
