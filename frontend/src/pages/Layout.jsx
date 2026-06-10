import React, { useRef, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'DASHBOARD', exact: true },
  { to: '/instellingen', label: 'INSTELLINGEN' },
  { to: '/rapporten', label: 'RAPPORTEN' },
]

export default function Layout({ children, onLogout, onStandby }) {
  return (
    <div className="h-screen bg-[#F2F2F2] flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="bg-[#111111] h-16 flex items-center px-8 gap-12 shrink-0 z-30 shadow-lg">
        <span className="text-white font-bold tracking-[0.28em] text-base select-none">MIMATE OS</span>
        <nav className="flex gap-10">
          {NAV.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `text-xs font-semibold tracking-[0.18em] transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-white/35 hover:text-white/65'
                }`
              }
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

  // Bereken positie van het actieve item
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
    <aside className="w-52 bg-[#1a1a1a] flex flex-col shrink-0 h-full select-none">
      {/* Categorieën */}
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-4 min-h-0" style={{ touchAction: 'pan-y' }}>
        <p className="text-white/30 text-[10px] font-semibold tracking-[0.25em] uppercase mb-5 px-2">
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
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '10px',
            transition: 'top 0.28s cubic-bezier(0.22,1,0.36,1), height 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
            pointerEvents: 'none',
          }} />

          <ul className="space-y-0.5 relative">
            {categories.map(cat => (
              <li key={cat.value} ref={el => { if (el) itemRefs.current[cat.value] = el }}>
                <button
                  onClick={() => onSelect(cat.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    active === cat.value
                      ? 'text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Standby + uitloggen */}
      <div className="shrink-0 px-5 pb-8 pt-4 border-t border-white/5 space-y-1">
        <button
          onClick={onStandby}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/5 text-sm transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v6"/>
            <path d="M6.8 5.8A8 8 0 1 0 17.2 5.8"/>
          </svg>
          Stand-by
        </button>
        <button
          onClick={onLogout}
          className="w-full text-left px-3 py-2 text-white/20 hover:text-white/50 text-sm transition-colors duration-150"
        >
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
