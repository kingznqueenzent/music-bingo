'use client'

import Link from 'next/link'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { StaffHeaderActions } from '@/components/layout/StaffHeaderActions'

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[10000] bg-[#121212]/90 backdrop-blur-sm border-b border-white/5 transform-gpu contain-layout pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-12">
        <Link
          href="/lyricgrid"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity touch-manipulation min-h-11 min-w-0"
          aria-label="LyricGrid home"
        >
          <LyricGridLogo size={28} />
          <span className="text-[#00FFFF] font-black text-base tracking-wider truncate">
            LyricGrid
          </span>
        </Link>

        <StaffHeaderActions
          loginFrom="/host"
          menuButtonClassName="inline-flex items-center justify-center gap-2 min-h-10 min-w-10 sm:min-w-0 sm:h-10 sm:px-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/60 hover:text-[#00FFFF] hover:border-[#00FFFF]/35 hover:bg-[#00FFFF]/5 active:bg-[#00FFFF]/10 transition-colors touch-manipulation"
        />
      </div>
    </header>
  )
}
