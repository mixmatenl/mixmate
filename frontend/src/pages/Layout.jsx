import React, { useRef, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'DASHBOARD', exact: true },
  { to: '/instellingen', label: 'INSTELLINGEN' },
  { to: '/rapporten', label: 'RAPPORTEN' },
]

export default function Layout({ children, onLogout, onStandby }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <header className="h-16 flex items-center px-8 gap-12 shrink-0 z-30 shadow-lg"
        style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)' }}>
        <span className="font-bold tracking-[0.28em] text-base select-none" style={{ color: 'var(--accent)' }}>MIXMATE</span>
        <nav className="flex gap-10">
          {NAV.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="text-xs font-semibold tracking-[0.18em] transition-colors duration-200"
              style={({ isActive }) => ({ color: isActive ? 'var(--text)' : 'var(--text-secondary)' })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {children}
      </div>
    </div>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────────── */
export function Sidebar({ categories, active, onSelect, onLogout, onStandby }) {
  const itemRefs = useRef({})
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 })

  useEffect(() => {
    const el = itemRefs.current[active]
    if (!el) return
    const parent = el.closest('ul')
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    setIndicatorStyle({
      top: elRect.top - parentRect.top,
      height: elRect.height,
      opacity: 1,
    })
  }, [active, categories])

  return (
    <aside className="w-52 flex flex-col shrink-0 h-full select-none"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-6 pt-7 pb-3 shrink-0">
        <span className="font-bold tracking-[0.22em] text-sm" style={{ color: 'var(--accent)' }}>MIXMATE</span>
      </div>

      {/* Categorieën */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-4 min-h-0" style={{ touchAction: 'pan-y' }}>
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase mb-5 px-2"
          style={{ color: 'var(--text-muted)' }}>
          Categorie
        </p>

        <div className="relative">
          {/* Schuivende indicator */}
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            top: `${indicatorStyle.top}px`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
            background: 'var(--accent-bg)',
            borderRadius: '10px',
            transition: 'top 0.28s cubic-bezier(0.22,1,0.36,1), height 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
            pointerEvents: 'none',
          }} />

          <ul className="space-y-0.5 relative">
            {categories.map(cat => (
              <li key={cat.value} ref={el => { if (el) itemRefs.current[cat.value] = el }}>
                <button
                  onClick={() => onSelect(cat.value)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 flex items-center gap-2"
                  style={{ color: active === cat.value ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {cat.icon && <span className="text-sm leading-none">{cat.icon}</span>}
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Standby + uitloggen */}
      <div className="shrink-0 px-5 pb-8 pt-4 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onStandby}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
          Stand-by
        </button>
        <button
          onClick={onLogout}
          className="w-full text-left px-3 py-2 text-sm transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
        >
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
