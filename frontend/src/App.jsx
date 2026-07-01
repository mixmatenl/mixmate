import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Backoffice from './pages/Backoffice'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import Instellingen from './pages/Instellingen'
import Rapporten from './pages/Rapporten'
import SplashScreen from './pages/SplashScreen'
import StandbyScreen from './pages/StandbyScreen'
import FlushOverlay from './components/FlushOverlay'
import BlockedOverlay from './components/BlockedOverlay'
import DemoMode from './pages/DemoMode'
import { VirtualKeyboardProvider } from './components/VirtualKeyboard'
import { DragScrollProvider } from './components/DragScroll'

const SESSION_KEY  = 'mixmate_auth'
const DEMO_KEY     = 'mixmate_demo_enabled'
const DEMO_MIN_KEY = 'mixmate_demo_minutes'
const DEFAULT_DEMO_MINUTES = 5

function AnimatedRoutes({ onStandby }) {
  return (
    <Routes>
      <Route path="/" element={<Dashboard onStandby={onStandby} />} />
      <Route path="/instellingen/*" element={<Instellingen />} />
      <Route path="/rapporten" element={<Rapporten />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() =>
    !sessionStorage.getItem('mixmate_splash_shown')
  )
  const [standby, setStandby] = useState(false)
  const [demo,    setDemo]    = useState(false)
  const [view, setView] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === '1' ? 'app' : 'login'
  )
  const demoTimerRef = useRef(null)

  function logout() { sessionStorage.removeItem(SESSION_KEY); setView('login') }

  // Demo modus inactiviteitstimer — alleen actief als demo ingeschakeld is in instellingen
  useEffect(() => {
    function isDemoEnabled() {
      return localStorage.getItem(DEMO_KEY) === '1'
    }
    function getDemoMs() {
      const min = parseInt(localStorage.getItem(DEMO_MIN_KEY), 10)
      return ((isNaN(min) || min < 1) ? DEFAULT_DEMO_MINUTES : min) * 60 * 1000
    }
    function resetTimer() {
      clearTimeout(demoTimerRef.current)
      if (!isDemoEnabled() || demo || standby || view !== 'app') return
      demoTimerRef.current = setTimeout(() => setDemo(true), getDemoMs())
    }

    const events = ['touchstart', 'touchend', 'mousedown', 'keydown']
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(demoTimerRef.current)
      events.forEach(e => document.removeEventListener(e, resetTimer))
    }
  }, [demo, standby, view])

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
      {demo && !standby && <DemoMode onExit={() => setDemo(false)} />}
      <BlockedOverlay />
      <FlushOverlay />
    </DragScrollProvider>
  )
}
