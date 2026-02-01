import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { AdminUserRow } from '@/components/profile/admin-user-row'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const isAdmin = await checkIfAdmin()
  if (!isAdmin) {
    redirect('/')
  }

  const adminClient = await createAdminClient()

  // Fetch all user profiles with their email from auth.users
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, email, display_name, avatar_color, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
  }

  const users = profiles || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
            <Users size={32} className="text-indigo-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">User Management</h1>
              <p className="text-white/60">Manage user profiles and display names</p>
            </div>
          </div>
        </div>

        {/* User Count */}
        <div className="mb-6 text-sm text-white/60">
          Total users: <span className="text-white font-medium">{users.length}</span>
        </div>

        {/* Users List */}
        {users.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
            <p className="text-white/60">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <AdminUserRow
                key={user.id}
                userId={user.id}
                email={user.email || ''}
                displayName={user.display_name || ''}
                avatarColor={user.avatar_color || '#6366f1'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
