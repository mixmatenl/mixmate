import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import MonitorDisplay from './pages/MonitorDisplay'
import MonteurWizard from './pages/MonteurWizard'
import { VirtualKeyboardProvider } from './components/VirtualKeyboard'
import { DragScrollProvider } from './components/DragScroll'
import './index.css'

const kioskZoom = new URLSearchParams(window.location.search).get('zoom')
if (kioskZoom) document.documentElement.style.zoom = kioskZoom

const isMonitor = window.location.pathname === '/monitor'

function MonitorRoot() {
  const [state, setState] = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const r = await fetch('/api/system/machine-state')
        const d = await r.json()
        if (cancelled) return
        const s = d.state || 'ready'
        setState(s)

        // Alleen wizard tonen als factory/setup na 1,5s nog steeds klopt
        if (s === 'factory' || s === 'setup') {
          setTimeout(async () => {
            if (cancelled) return
            try {
              const r2 = await fetch('/api/system/machine-state')
              const d2 = await r2.json()
              if (!cancelled) setConfirmed(d2.state === s)
            } catch { setConfirmed(false) }
          }, 1500)
        } else {
          setConfirmed(true)
        }
      } catch {
        if (!cancelled) { setState('ready'); setConfirmed(true) }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  if (state === null || !confirmed) return null

  if (state === 'factory' || state === 'setup') {
    return (
      <DragScrollProvider>
        <VirtualKeyboardProvider>
          <MonteurWizard onComplete={() => setState('ready')} />
        </VirtualKeyboardProvider>
      </DragScrollProvider>
    )
  }

  return <MonitorDisplay />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  isMonitor ? <MonitorRoot /> : (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
)
