import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export const metadata = {
  title: 'Host Portal — LyricGrid',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[calc(100vh-3rem)] bg-[#121212] flex items-center justify-center text-slate-400">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
