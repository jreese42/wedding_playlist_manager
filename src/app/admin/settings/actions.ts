'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'

export async function getAppSettings() {
    const adminSupabase = createAdminClient()

    const { data: settings, error } = await (adminSupabase as any)
        .from('app_settings')
        .select('key, value, description')
        .order('key', { ascending: true })

    if (error) {
        console.error('Error fetching app settings:', error)
        throw new Error(error.message)
    }

    return settings || []
}

export async function updateAppSettings(updates: Array<{ key: string; value: string }>) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    // Use admin client to bypass RLS for both update and verification
    const adminSupabase = createAdminClient()

    for (const { key, value } of updates) {
        const { error } = await (adminSupabase as any)
            .from('app_settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()

        if (error) {
            console.error(`Failed to update app setting ${key}:`, error)
            throw new Error(error.message)
        }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/')
}
