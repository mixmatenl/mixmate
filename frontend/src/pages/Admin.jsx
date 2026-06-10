import React, { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api'
import AdminPumps from './AdminPumps'
import AdminRecipes from './AdminRecipes'
import AdminIngredients from './AdminIngredients'

function AdminNav() {
  const links = [
    { to: '/admin/pumps', label: 'Pompen' },
    { to: '/admin/ingredients', label: 'Ingrediënten' },
    { to: '/admin/recipes', label: 'Recepten' },
  ]
  return (
    <div className="flex gap-1 mb-8 border-b border-brand-gray-800">
      {links.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) =>
            `px-4 py-3 text-sm font-medium tracking-wide transition-colors border-b-2 -mb-px ${
              isActive
                ? 'border-white text-white'
                : 'border-transparent text-brand-gray-400 hover:text-white'
            }`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </div>
  )
}

export default function Admin() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold tracking-tight text-white mb-8">Beheer</h1>
      <AdminNav />
      <Routes>
        <Route path="pumps" element={<AdminPumps />} />
        <Route path="ingredients" element={<AdminIngredients />} />
        <Route path="recipes" element={<AdminRecipes />} />
        <Route path="" element={<AdminPumps />} />
      </Routes>
    </div>
  )
}
