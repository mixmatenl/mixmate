import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Backoffice from './pages/Backoffice'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import Instellingen from './pages/Instellingen'
import Rapporten from './pages/Rapporten'
import SplashScreen from './pages/SplashScreen'
import StandbyScreen from './pages/StandbyScreen'
import { VirtualKeyboardProvider } from './components/VirtualKeyboard'
import { DragScrollProvider } from './components/DragScroll'

const SESSION_KEY = 'mixmate_auth'

/* ── Pagina fade wrapper ─────────────────────────────────────────────── */
// Elke route-wissel geeft een nieuwe key → component remount → CSS animatie speelt
function FadePage({ children }) {
  return (
    <div className="page-fade" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {children}
    </div>
  )
}

function AnimatedRoutes({ onStandby }) {
  const location = useLocation()
  return (
    <Routes location={location}>
      <Route path="/" element={<FadePage key="dashboard"><Dashboard onStandby={onStandby} /></FadePage>} />
      <Route path="/instellingen/*" element={<FadePage key="instellingen"><Instellingen /></FadePage>} />
      <Route path="/rapporten" element={<FadePage key="rapporten"><Rapporten /></FadePage>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() =>
    !sessionStorage.getItem('mixmate_splash_shown')
  )
  const [standby, setStandby] = useState(false)
  const [view, setView] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === '1' ? 'app' : 'login'
  )

  function logout() { sessionStorage.removeItem(SESSION_KEY); setView('login') }

  if (showSplash) return (
    <DragScrollProvider>
      <SplashScreen onDone={() => {
        sessionStorage.setItem('mixmate_splash_shown', '1')
        setShowSplash(false)
      }} />
    </DragScrollProvider>
  )

  let appContent
  if (view === 'backoffice') {
    appContent = <VirtualKeyboardProvider><Backoffice onClose={() => setView('login')} /></VirtualKeyboardProvider>
  } else if (view === 'login') {
    appContent = (
      <VirtualKeyboardProvider>
        <Login
          onLogin={() => { sessionStorage.setItem(SESSION_KEY, '1'); setView('app') }}
          onBackoffice={() => setView('backoffice')}
        />
      </VirtualKeyboardProvider>
    )
  } else {
    appContent = (
      <VirtualKeyboardProvider>
        <Layout onLogout={logout} onStandby={() => setStandby(true)}>
          <AnimatedRoutes onStandby={() => setStandby(true)} />
        </Layout>
      </VirtualKeyboardProvider>
    )
  }

  return (
    <DragScrollProvider>
      {appContent}
      {standby && <StandbyScreen onWake={() => setStandby(false)} />}
    </DragScrollProvider>
  )
}
