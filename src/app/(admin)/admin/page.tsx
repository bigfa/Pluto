import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv } from '@/lib/env';
import { cookieName, verifySessionToken } from '@/lib/admin/session';

export default async function AdminIndexPage() {
    const env = await getEnv();
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName())?.value;

    if (!token || !env.SESSION_SECRET) {
        redirect('/admin/login');
    }

    const result = await verifySessionToken(env.SESSION_SECRET, token);
    if (!result.ok) {
        redirect('/admin/login');
    }

    redirect('/admin/media');
}
