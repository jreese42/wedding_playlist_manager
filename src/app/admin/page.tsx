import { redirect } from 'next/navigation'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { AdminClientPage } from '@/components/admin/admin-client-page'
import { getAppSettings } from './settings/actions'

export default async function AdminPage() {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) {
        redirect('/')
    }

    const settings = await getAppSettings()

    return <AdminClientPage initialSettings={settings} />
}
