import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'DASHBOARD', exact: true },
  { to: '/instellingen', label: 'INSTELLINGEN' },
  { to: '/rapporten', label: 'RAPPORTEN' },
]

export default function Layout({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#111111] h-16 flex items-center px-8 gap-12 shrink-0 z-30 shadow-lg">
        <span className="text-white font-bold tracking-[0.25em] text-lg select-none">MIXMATE</span>
        <nav className="flex gap-10">
          {NAV.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `text-sm font-semibold tracking-[0.15em] transition-colors ${
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  )
}

/* Sidebar used by Dashboard */
export function Sidebar({ categories, active, onSelect, onLogout }) {
  return (
    <aside className="w-52 bg-[#1E1E1E] flex flex-col shrink-0">
      <div className="px-6 pt-8 pb-4">
        <p className="text-white/40 text-xs font-semibold tracking-[0.2em] uppercase mb-5">Categorie</p>
        <ul className="space-y-1">
          {categories.map(cat => (
            <li key={cat.value}>
              <button
                onClick={() => onSelect(cat.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active === cat.value
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto px-6 pb-8">
        <button
          onClick={onLogout}
          className="text-white/25 hover:text-white/60 text-sm transition-colors"
        >
          Uitloggen
        </button>
      </div>
    </aside>
  )
}
