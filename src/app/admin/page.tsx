import { redirect } from 'next/navigation'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { AdminClientPage } from '@/components/admin/admin-client-page'
import { getAppSettings } from './settings/actions'
import { getSpotifyConnectionStatus } from '@/lib/spotify'

export default async function AdminPage() {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) {
        redirect('/')
    }

    const settings = await getAppSettings()
    const spotifyStatus = await getSpotifyConnectionStatus()

    return <AdminClientPage initialSettings={settings} spotifyStatus={spotifyStatus} />
}
