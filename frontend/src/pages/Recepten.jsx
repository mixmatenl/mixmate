import React from 'react'
import { useNavigate } from 'react-router-dom'
import AdminRecipes from './AdminRecipes'

export default function Recepten() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <AdminRecipes />
      </div>
    </div>
  )
}
