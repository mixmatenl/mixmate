import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import MonitorDisplay from './pages/MonitorDisplay'
import './index.css'

const kioskZoom = new URLSearchParams(window.location.search).get('zoom')
if (kioskZoom) document.documentElement.style.zoom = kioskZoom

const isMonitor = window.location.pathname === '/monitor'

ReactDOM.createRoot(document.getElementById('root')).render(
  isMonitor ? <MonitorDisplay /> : (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
)
