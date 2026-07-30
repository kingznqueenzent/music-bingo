import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, isAdminCookieValue } from '@/lib/admin-access'

/** Server component guard — redirects to /login when host cookie is missing. */
export async function requireAdminSession(redirectPath: string): Promise<void> {
  const jar = await cookies()
  if (!isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value)) {
    redirect(`/login?from=${encodeURIComponent(redirectPath)}`)
  }
}
