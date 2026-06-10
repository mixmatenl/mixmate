import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Backoffice from './pages/Backoffice'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import Instellingen from './pages/Instellingen'
import Rapporten from './pages/Rapporten'

const SESSION_KEY = 'mixmate_auth'

export default function App() {
  const [view, setView] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === '1' ? 'app' : 'login'
  )

  if (view === 'backoffice') return <Backoffice onClose={() => setView('login')} />
  if (view === 'login') return (
    <Login
      onLogin={() => { sessionStorage.setItem(SESSION_KEY, '1'); setView('app') }}
      onBackoffice={() => setView('backoffice')}
    />
  )

  function logout() { sessionStorage.removeItem(SESSION_KEY); setView('login') }

  return (
    <Layout onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/instellingen/*" element={<Instellingen />} />
        <Route path="/rapporten" element={<Rapporten />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
