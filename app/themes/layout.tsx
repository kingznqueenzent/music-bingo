import { requireAdminSession } from '@/lib/admin-guard-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Browse Themes — LyricGrid',
  description: 'Pick a theme to host a music bingo game from the LyricGrid catalog.',
}

export default async function ThemesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession('/themes')
  return children
}
