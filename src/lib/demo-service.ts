import { createAdminClient } from "@/lib/supabase/admin"

export async function manageDemoState() {
    try {
        const supabase = await createAdminClient()
        
        // Check if we need to reset
        const { data: needsReset, error } = await supabase.rpc('check_demo_timeout' as any, { timeout_minutes: 4 })
        
        if (error) {
            console.warn('Demo management functions not found or error:', error.message)
            return
        }

        if (needsReset) {
            await supabase.rpc('reset_demo_db' as any, { 
                p_demo_admin_email: process.env.DEMO_ADMIN_EMAIL,
                p_demo_user_email: process.env.DEMO_USER_EMAIL
            })
        }
        // Note: We don't call register_demo_activity here because we only want to track
        // actual user interactions (clicks, scrolls, typing), not page loads.
        // The client-side DemoBanner handles activity tracking.
    } catch (err) {
        console.error('Failed to manage demo state:', err)
    }
}

export async function createDemoCheckpoint() {
    const supabase = await createAdminClient()
    const { error } = await supabase.rpc('create_demo_checkpoint' as any)
    if (error) throw error
}
