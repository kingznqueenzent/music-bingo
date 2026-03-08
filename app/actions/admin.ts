'use server'

function cleanEnv(value: string | undefined): string {
  if (value == null) return ''
  return value
    .replace(/\r\n/g, '')
    .replace(/\r/g, '')
    .replace(/\s/g, '')
    .replace(/^["']+|["']+$/g, '')
    .toLowerCase()
    .trim()
}

export async function verifyAdmin(email: string, secret: string): Promise<{ ok: boolean; error?: string }> {
  const ADMIN_EMAIL = cleanEnv(process.env.ADMIN_EMAIL)
  const ADMIN_SECRET = (process.env.ADMIN_SECRET ?? '').replace(/\r/g, '').replace(/^["'\s]+|["'\s]+$/g, '').trim()

  if (!ADMIN_EMAIL || !ADMIN_SECRET) {
    return {
      ok: false,
      error: 'Admin not configured. Set ADMIN_EMAIL and ADMIN_SECRET in .env.local, then restart the dev server (stop and run npm run dev again).',
    }
  }

  const inputEmail = (email ?? '').replace(/\s/g, '').toLowerCase().trim()
  const inputSecret = (secret ?? '').trim()

  if (!inputEmail || inputEmail !== ADMIN_EMAIL) {
    return { ok: false, error: 'Invalid email. Use the exact address from .env.local line 14 (ADMIN_EMAIL).' }
  }
  if (inputSecret !== ADMIN_SECRET) {
    return { ok: false, error: 'Invalid secret. Use the exact password from .env.local line 15 (ADMIN_SECRET). Restart dev server after changing .env.local.' }
  }
  return { ok: true }
}
