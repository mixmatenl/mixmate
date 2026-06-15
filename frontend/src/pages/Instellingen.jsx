import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import AdminPumpsSimple from './AdminPumpsSimple'
import AdminRecipes from './AdminRecipes'
import AdminIngredients from './AdminIngredients'
import AdminCategories from './AdminCategories'
import AdminGlasses from './AdminGlasses'
import PumpCalibrationWizard from './PumpCalibrationWizard'
import AppUpdate from './AppUpdate'
import WifiSetup from './WifiSetup'
import CloudPairing from './CloudPairing'

const TABS = [
  { to: '/instellingen/pompen',      label: 'Pompen' },
  { to: '/instellingen/kalibratie',  label: 'Kalibratie' },
  { to: '/instellingen/glazen',      label: 'Glazen' },
  { to: '/instellingen/ingredienten',label: 'Ingrediënten' },
  { to: '/instellingen/categorieen', label: 'Categorieën' },
  { to: '/instellingen/recepten',    label: 'Recepten' },
  { to: '/instellingen/update',      label: 'Update' },
]

export default function Instellingen() {
  const [showWifi,    setShowWifi]    = useState(false)
  const [showPairing, setShowPairing] = useState(false)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-1">
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to}
              className={({ isActive }) =>
                `px-4 py-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive ? 'border-[#111] text-[#111]' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
            >{t.label}</NavLink>
          ))}
        </div>
      </div>

      {/* Snelkoppelingen: WiFi + Koppelen */}
      <div className="bg-gray-50 border-b border-gray-200 px-8 py-3 flex gap-3">
        <button
          onClick={() => setShowWifi(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>
          WiFi instellen
        </button>
        <button
          onClick={() => setShowPairing(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Machine koppelen
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <Routes>
            <Route path="pompen"       element={<AdminPumpsSimple />} />
            <Route path="kalibratie"   element={<PumpCalibrationWizard />} />
            <Route path="glazen"       element={<AdminGlasses />} />
            <Route path="ingredienten" element={<AdminIngredients />} />
            <Route path="categorieen"  element={<AdminCategories />} />
            <Route path="recepten"     element={<AdminRecipes />} />
            <Route path="update"       element={<AppUpdate />} />
            <Route path=""             element={<AdminPumpsSimple />} />
          </Routes>
        </div>
      </div>

      {showWifi    && <WifiSetup    onClose={() => setShowWifi(false)} />}
      {showPairing && <CloudPairing onClose={() => setShowPairing(false)} />}
    </div>
  )
}
