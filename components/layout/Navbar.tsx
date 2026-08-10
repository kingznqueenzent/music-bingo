'use client'

import Link from 'next/link'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { StaffHeaderActions } from '@/components/layout/StaffHeaderActions'

/** Compact shell header — matches the intended LyricGrid admin chrome. */
export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[10000] h-12 bg-[#121212]/90 backdrop-blur-sm border-b border-white/5 transform-gpu contain-layout pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-12">
        <Link
          href="/lyricgrid"
          className="text-[#00FF66] font-black text-lg tracking-wider flex items-center gap-2 min-h-11 touch-manipulation"
          aria-label="LyricGrid home"
        >
          <LyricGridLogo size={22} />
          <span className="truncate">LyricGrid</span>
        </Link>

        <StaffHeaderActions
          loginFrom="/host"
          showAdminLabel={false}
          loginClassName="text-xs text-white/50 hover:text-[#00FF66]/90 transition-colors min-h-11 inline-flex items-center px-2"
          menuButtonClassName="h-9 w-9 min-h-9 min-w-9 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-[#00FF66] hover:border-[#00FF66]/30 transition-colors touch-manipulation"
        />
      </div>
    </header>
  )
}
