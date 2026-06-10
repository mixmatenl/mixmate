import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import AdminPumpsSimple from './AdminPumpsSimple'
import AdminRecipes from './AdminRecipes'
import AdminIngredients from './AdminIngredients'
import AdminCategories from './AdminCategories'
import AdminGlasses from './AdminGlasses'
import PumpCalibrationWizard from './PumpCalibrationWizard'

const TABS = [
  { to: '/instellingen/pompen', label: 'Pompen' },
  { to: '/instellingen/kalibratie', label: 'Kalibratie' },
  { to: '/instellingen/glazen', label: 'Glazen' },
  { to: '/instellingen/ingredienten', label: 'Ingrediënten' },
  { to: '/instellingen/categorieen', label: 'Categorieën' },
  { to: '/instellingen/recepten', label: 'Recepten' },
]

export default function Instellingen() {
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
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <Routes>
            <Route path="pompen" element={<AdminPumpsSimple />} />
            <Route path="kalibratie" element={<PumpCalibrationWizard />} />
            <Route path="glazen" element={<AdminGlasses />} />
            <Route path="ingredienten" element={<AdminIngredients />} />
            <Route path="categorieen" element={<AdminCategories />} />
            <Route path="recepten" element={<AdminRecipes />} />
            <Route path="" element={<AdminPumpsSimple />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
