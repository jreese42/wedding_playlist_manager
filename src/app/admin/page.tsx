import { redirect } from 'next/navigation'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { AdminClientPage } from '@/components/admin/admin-client-page'

export default async function AdminPage() {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) {
        redirect('/')
    }

    return <AdminClientPage />
}
