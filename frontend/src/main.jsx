import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const kioskZoom = new URLSearchParams(window.location.search).get('zoom')
if (kioskZoom) document.documentElement.style.zoom = kioskZoom

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
