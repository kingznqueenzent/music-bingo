'use client'

import Link from 'next/link'
import { LyricGridLogo } from '@/components/LyricGridLogo'
import { StaffHeaderActions } from '@/components/layout/StaffHeaderActions'

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 h-12 bg-[#121212] border-b border-white/5 transform-gpu contain-layout md:bg-[#121212]/95 md:backdrop-blur-sm">
      <Link
        href="/lyricgrid"
        className="flex items-center gap-2 hover:opacity-90 transition-opacity touch-manipulation"
        aria-label="LyricGrid home"
      >
        <LyricGridLogo size={28} />
        <span className="text-[#00FFFF] font-black text-sm tracking-wider hidden sm:inline">LyricGrid</span>
      </Link>

      <StaffHeaderActions loginFrom="/host" />
    </header>
  )
}
