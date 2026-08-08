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
  titleClass: 'text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40',
  subtitleClass: 'text-xs text-white/35',
  itemBaseClass:
    'flex w-full items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl text-sm font-medium transition-colors touch-manipulation border border-transparent',
  itemActiveClass: 'bg-[#00FFFF]/10 text-[#00FFFF] border-[#00FFFF]/25',
  itemIdleClass: 'text-white/55 hover:text-white hover:bg-white/5 active:bg-white/10',
} as const

export const MENU_MD_QUERY = '(min-width: 768px)'
