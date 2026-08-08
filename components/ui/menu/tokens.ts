/** Shared LyricGrid menu / modal design tokens. */
export const MENU_TOKENS = {
  zOverlay: 10040,
  zPanel: 10050,
  surface: '#1A1A1A',
  surfaceElevated: '#1E1E1E',
  dark: '#121212',
  accent: '#00FFFF',
  radiusPanel: '1rem',
  radiusItem: '0.75rem',
  /** 48px touch target */
  itemMinClass: 'min-h-12',
  borderClass: 'border-white/10',
  shadowClass: 'shadow-2xl shadow-black/50',
  titleClass: 'text-xs font-semibold uppercase tracking-[0.18em] text-[#00FFFF]/90',
  subtitleClass: 'text-sm text-white/45',
  itemBaseClass:
    'flex w-full items-center gap-3 px-4 py-3 min-h-12 rounded-xl text-base font-medium transition-colors touch-manipulation border border-transparent',
  itemActiveClass: 'bg-[#00FFFF]/12 text-[#00FFFF] border-[#00FFFF]/25',
  itemIdleClass: 'text-white/80 hover:text-white hover:bg-white/5 active:bg-white/10',
} as const

export const MENU_MD_QUERY = '(min-width: 768px)'
