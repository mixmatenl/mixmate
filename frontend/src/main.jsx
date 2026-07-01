import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Kiosk zoom: ?zoom=2 in de URL schaalt de hele UI op (zonder Wayland window-grootte te wijzigen)
const kioskZoom = new URLSearchParams(window.location.search).get('zoom')
if (kioskZoom) document.documentElement.style.zoom = kioskZoom

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
