import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSettingsForm } from '@/components/profile/profile-settings-form'
import { ChangePasswordForm } from '@/components/profile/change-password-form'
import { RestartTourButton } from '@/components/tour/restart-tour-button'
import { ArrowLeft, Lock, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { goToDemoLogin } from '../demo/actions'

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const isDemoMode = cookieStore.get('site_mode')?.value === 'demo'
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('display_name, avatar_color')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Manage your account</p>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Profile Settings Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
            <ProfileSettingsForm
              initialDisplayName={profile.display_name || ''}
              initialAvatarColor={profile.avatar_color || '#6366f1'}
            />
          </div>

          {/* Welcome Tour Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle size={20} className="text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Help</h2>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Get a guided tour of the playlist manager features.
            </p>
            <RestartTourButton />
          </div>

          {/* Change Password Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={20} className="text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Security</h2>
            </div>
            <ChangePasswordForm disabled={isDemoMode} />
          </div>
        </div>
        {isDemoMode && (
          <div className="text-center mt-8">
            <form action={goToDemoLogin}>
              <button
                type="submit"
                className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline transition-colors"
              >
                Demo Admin Login
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
