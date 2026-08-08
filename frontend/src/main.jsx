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

  useEffect(() => {
    fetch('/api/system/machine-state')
      .then(r => r.json())
      .then(d => setState(d.state))
      .catch(() => setState('ready'))
  }, [])

  if (state === null) return null

  if (state === 'factory' || state === 'setup') {
    return (
      <DragScrollProvider>
        <VirtualKeyboardProvider>
          <MonteurWizard onComplete={() => setState('setup')} />
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
