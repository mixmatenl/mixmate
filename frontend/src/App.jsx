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
import SetupWizard from './pages/SetupWizard'
import MonteurWizard from './pages/MonteurWizard'
import { VirtualKeyboardProvider } from './components/VirtualKeyboard'
import { DragScrollProvider } from './components/DragScroll'
import { api } from './api'

const SESSION_KEY  = 'mixmate_auth'

function AdminNotificationToast() {
  const [notif, setNotif] = useState(null)

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const r = await fetch('/api/system/admin-notification')
        const d = r.ok ? await r.json() : null
        if (alive) setNotif(d)
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 10000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  if (!notif) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9000, maxWidth: 480, width: 'calc(100% - 48px)',
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0,122,255,0.4)', borderRadius: 20,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>🛠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#4da6ff', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>MIXMATE ondersteuning</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.4 }}>{notif.message}</div>
      </div>
      <button
        onClick={async () => {
          await fetch('/api/system/admin-notification/dismiss', { method: 'POST' })
          setNotif(null)
        }}
        style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10,
          color: 'rgba(255,255,255,0.6)', fontSize: 13, padding: '7px 12px',
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}
      >
        Sluiten
      </button>
    </div>
  )
}

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
  const [machineState, setMachineState] = useState(null)  // null=laden, 'factory'|'setup'|'ready'
  const [showSplash, setShowSplash] = useState(() =>
    !sessionStorage.getItem('mixmate_splash_shown')
  )
  const [standby, setStandby] = useState(false)
  const [demo,    setDemo]    = useState(false)
  const [view, setView] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === '1' ? 'app' : 'login'
  )
  const [offline, setOffline] = useState(false)

  // Verbindingsbewaking — herlaad zodra backend weer reageert
  useEffect(() => {
    let timer
    async function ping() {
      try {
        await fetch('/api/system/machine-state', { cache: 'no-store' })
        if (offline) window.location.reload()
      } catch {
        setOffline(true)
      }
      timer = setTimeout(ping, 3000)
    }
    timer = setTimeout(ping, 5000)
    return () => clearTimeout(timer)
  }, [offline])

  // Machine state ophalen bij start
  useEffect(() => {
    api.getMachineState()
      .then(r => setMachineState(r.state))
      .catch(() => setMachineState('factory'))
  }, [])
  const demoFromBackend = useRef(false)
  const demoExitedAt    = useRef(0)
  const [demoSlideIndex, setDemoSlideIndex] = useState(0)

  function logout() { sessionStorage.removeItem(SESSION_KEY); setView('login') }

  function handleStandby() {
    setStandby(true)
  }

  // Poll backend demo status — synchroniseer met portaal
  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const s = await api.getDemoStatus()
        if (cancelled) return
        if (s.slideshow_active && !demo && Date.now() - demoExitedAt.current > 3000) {
          demoFromBackend.current = true
          setDemo(true)
        } else if (!s.slideshow_active && demo && demoFromBackend.current) {
          demoFromBackend.current = false
          setDemo(false)
        }
        if (s.slideshow_active && s.slide_index !== undefined) {
          setDemoSlideIndex(s.slide_index)
        }
      } catch {}
    }
    poll()
    const iv = setInterval(poll, demo ? 800 : 3000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [demo])

  async function exitDemo() {
    demoExitedAt.current = Date.now()
    if (demoFromBackend.current) {
      demoFromBackend.current = false
      api.exitDemoSlideshow().catch(() => {})
    }
    setDemo(false)
  }

  // Wacht tot machine state bekend is
  if (machineState === null) return null

  // Factory mode: Monteurswizard voor installatie op locatie
  if (machineState === 'factory') {
    return (
      <DragScrollProvider>
        <VirtualKeyboardProvider>
          <MonteurWizard onComplete={() => setMachineState('setup')} />
        </VirtualKeyboardProvider>
      </DragScrollProvider>
    )
  }

  // Setup mode: installatiewizard tonen
  if (machineState === 'setup') {
    return (
      <DragScrollProvider>
        <VirtualKeyboardProvider>
          <SetupWizard onComplete={() => setMachineState('ready')} />
        </VirtualKeyboardProvider>
      </DragScrollProvider>
    )
  }

  // Ready mode: normaal splash + login
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
        <Layout onLogout={logout} onStandby={handleStandby} onStartDemo={() => setDemo(true)}>
          <AnimatedRoutes onStandby={handleStandby} />
        </Layout>
      </VirtualKeyboardProvider>
    )
  }

  return (
    <DragScrollProvider>
      {appContent}
      {standby && <StandbyScreen onWake={() => setStandby(false)} />}
      {demo && !standby && <DemoMode onExit={exitDemo} slideIndex={demoSlideIndex} />}
      <BlockedOverlay />
      <FlushOverlay />
      <AdminNotificationToast />
      {offline && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#fff',
        }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>⏳</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Verbinding verbroken</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Opnieuw verbinden…</p>
        </div>
      )}
    </DragScrollProvider>
  )
}
