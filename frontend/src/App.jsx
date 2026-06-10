import React, { useState, useEffect, useRef } from 'react'
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
function PageTransition({ children, routeKey }) {
  const [visible, setVisible] = useState(false)
  const prev = useRef(null)

  useEffect(() => {
    if (prev.current === routeKey) return
    prev.current = routeKey
    setVisible(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    return () => cancelAnimationFrame(raf)
  }, [routeKey])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(7px)',
      transition: visible
        ? 'opacity 0.32s ease, transform 0.32s cubic-bezier(0.22,1,0.36,1)'
        : 'none',
    }}>
      {children}
    </div>
  )
}

function AnimatedRoutes({ onStandby }) {
  const location = useLocation()
  return (
    <PageTransition routeKey={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Dashboard onStandby={onStandby} />} />
        <Route path="/instellingen/*" element={<Instellingen />} />
        <Route path="/rapporten" element={<Rapporten />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
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
