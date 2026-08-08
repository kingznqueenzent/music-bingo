'use client'

import Link from 'next/link'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { StaffHeaderActions } from '@/components/layout/StaffHeaderActions'

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[10000] bg-[#121212] border-b border-white/5 transform-gpu contain-layout md:bg-[#121212]/95 md:backdrop-blur-sm pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 h-14">
        <Link
          href="/lyricgrid"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity touch-manipulation min-h-11 min-w-0"
          aria-label="LyricGrid home"
        >
          <LyricGridLogo size={32} />
          <span className="text-[#00FFFF] font-black text-base tracking-wider hidden sm:inline truncate">
            LyricGrid
          </span>
        </Link>

        <StaffHeaderActions loginFrom="/host" />
      </div>
    </header>
  )
}
