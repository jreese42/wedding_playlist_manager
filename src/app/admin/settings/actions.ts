'use server'

import { createClient } from '@/lib/supabase/server'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'

export async function getAppSettings() {
    const supabase = await createClient()

    const { data: settings, error } = await supabase
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

    const supabase = await createClient()

    for (const { key, value } of updates) {
        const { error } = await supabase
            .from('app_settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)

        if (error) {
            console.error('Failed to update app setting:', error)
            throw new Error(error.message)
        }
    }

    revalidatePath('/', 'layout')
}
