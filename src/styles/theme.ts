export type ThemeMode = 'light' | 'dark' | 'system';

export const lightTheme = {
  bgBase: 'bg-gray-50',
  bgCard: 'bg-white',
  bgSection: 'bg-white',
  bgAccent: 'bg-gray-50',
  bgMuted: 'bg-gray-100',
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-700',
  textMuted: 'text-gray-500',
  textAccent: 'text-green-600',
  border: 'border-gray-100',
  borderStrong: 'border-gray-200',
  borderAccent: 'border-green-200',
  btnPrimary: 'bg-green-600 text-white hover:bg-green-700',
  btnSecondary: 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200',
  btnGhost: 'text-gray-600 hover:bg-gray-100',
  btnDanger: 'bg-red-50 text-red-600 hover:bg-red-100',
  tabActive: 'text-green-600',
  tabInactive: 'text-gray-400',
  tabIndicator: 'bg-green-600',
  navBg: 'bg-white',
  navActive: 'text-green-600',
  navInactive: 'text-gray-400',
  headerBg: 'bg-white',
  headerBorder: 'border-green-600',
  tagBg: 'bg-gray-100 text-gray-700',
  badgeSuccess: 'bg-green-100 text-green-700',
  badgeWarning: 'bg-yellow-100 text-yellow-700',
  badgeError: 'bg-red-100 text-red-700',
  badgeInfo: 'bg-blue-100 text-blue-700',
  heroGradient: 'from-green-600 via-green-500 to-emerald-400',
  heroBadge: 'bg-yellow-400 text-yellow-900',
  progressBg: 'bg-gray-200',
  progressFill: 'bg-green-500',
};

export const darkTheme = {
  bgBase: 'bg-slate-950',
  bgCard: 'bg-slate-900',
  bgSection: 'bg-slate-900',
  bgAccent: 'bg-slate-800/50',
  bgMuted: 'bg-slate-800',
  textPrimary: 'text-slate-100',
  textSecondary: 'text-slate-300',
  textMuted: 'text-slate-500',
  textAccent: 'text-amber-400',
  border: 'border-slate-800',
  borderStrong: 'border-slate-700',
  borderAccent: 'border-amber-600',
  btnPrimary: 'bg-amber-500 text-slate-900 hover:bg-amber-400',
  btnSecondary: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-600/30',
  btnGhost: 'text-slate-400 hover:bg-slate-800',
  btnDanger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
  tabActive: 'text-amber-400',
  tabInactive: 'text-slate-500',
  tabIndicator: 'bg-amber-400',
  navBg: 'bg-slate-900',
  navActive: 'text-amber-400',
  navInactive: 'text-slate-500',
  headerBg: 'bg-slate-900',
  headerBorder: 'border-amber-500',
  tagBg: 'bg-slate-800 text-slate-300',
  badgeSuccess: 'bg-green-500/20 text-green-400',
  badgeWarning: 'bg-yellow-500/20 text-yellow-400',
  badgeError: 'bg-red-500/20 text-red-400',
  badgeInfo: 'bg-blue-500/20 text-blue-400',
  heroGradient: 'from-slate-800 via-slate-900 to-slate-950',
  heroBadge: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900',
  progressBg: 'bg-slate-700',
  progressFill: 'bg-amber-500',
};

export type ThemeColors = typeof lightTheme | typeof darkTheme;

export function getTheme(isDark: boolean) {
  return isDark ? darkTheme : lightTheme;
}

export const BOTTOM_NAV_ITEMS = [
  { id: 'home', href: '/', icon: '🏠', label: 'トップ', match: /^\/$/ },
  { id: 'races', href: '/races', icon: '🏇', label: 'レース', match: /^\/races/ },
  { id: 'timeline', href: '/timeline', icon: '📰', label: 'TL', match: /^\/timeline/ },
  { id: 'dojo', href: '/dojo', icon: '📚', label: '道場', match: /^\/dojo/ },
  { id: 'rankings', href: '/rankings', icon: '🏆', label: 'ランキング', match: /^\/(rankings|contest)/ },
] as const;

export const transitions = {
  default: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-100 ease-in-out',
  slow: 'transition-all duration-300 ease-in-out',
};
