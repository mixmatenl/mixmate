import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  const [showSplash, setShowSplash] = useState(() =>
    !sessionStorage.getItem('mixmate_splash_shown')
  )
  const [standby, setStandby] = useState(false)
  const [view, setView] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === '1' ? 'app' : 'login'
  )

  function logout() { sessionStorage.removeItem(SESSION_KEY); setView('login') }

  let content
  if (showSplash) {
    content = <SplashScreen onDone={() => { sessionStorage.setItem('mixmate_splash_shown', '1'); setShowSplash(false) }} />
  } else if (standby) {
    content = <StandbyScreen onWake={() => setStandby(false)} />
  } else if (view === 'backoffice') {
    content = <VirtualKeyboardProvider><Backoffice onClose={() => setView('login')} /></VirtualKeyboardProvider>
  } else if (view === 'login') {
    content = (
      <VirtualKeyboardProvider>
        <Login
          onLogin={() => { sessionStorage.setItem(SESSION_KEY, '1'); setView('app') }}
          onBackoffice={() => setView('backoffice')}
        />
      </VirtualKeyboardProvider>
    )
  } else {
    content = (
      <VirtualKeyboardProvider>
        <Layout onLogout={logout} onStandby={() => setStandby(true)}>
          <Routes>
            <Route path="/" element={<Dashboard onStandby={() => setStandby(true)} />} />
            <Route path="/instellingen/*" element={<Instellingen />} />
            <Route path="/rapporten" element={<Rapporten />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </VirtualKeyboardProvider>
    )
  }

  return <DragScrollProvider>{content}</DragScrollProvider>
}
