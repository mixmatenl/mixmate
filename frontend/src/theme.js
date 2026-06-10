const THEME_KEY = 'mixmate-theme'

export function getTheme() {
  const t = localStorage.getItem(THEME_KEY)
  return t === 'light' || t === 'dark' ? t : 'dark'
}

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem(THEME_KEY, t)
  return t
}

export function toggleTheme() {
  return applyTheme(getTheme() === 'dark' ? 'light' : 'dark')
}
