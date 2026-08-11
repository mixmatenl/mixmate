import React, { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

const PORTAL_URL = 'https://portaal.mixmate.nl'

function QRCanvas({ url }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, url, {
        width: 140,
        margin: 2,
        color: { dark: '#1c1c1e', light: '#ffffff' },
      })
    }
  }, [url])
  return <canvas ref={ref} style={{ borderRadius: 12, display: 'block' }} />
}

export default function BlockedOverlay() {
  const [state, setState] = useState({ blocked: false, amount: 0 })
  const timerRef = useRef(null)

  useEffect(() => {
    function poll() {
      fetch('/api/machine/blocked')
        .then(r => r.json())
        .then(d => setState({ blocked: !!d.blocked, amount: d.amount || 0 }))
        .catch(() => {})
        .finally(() => { timerRef.current = setTimeout(poll, 2000) })
    }
    poll()
    return () => clearTimeout(timerRef.current)
  }, [])

  if (!state.blocked) return null

  const { amount } = state
  const amountStr = amount > 0
    ? `€ ${amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: '#f2f2f7',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      gap: 0,
    }}>
      {/* Slot icoon */}
      <div style={{
        width: 96, height: 96, borderRadius: 28,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2.5"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Hoofdtekst */}
      <div style={{ textAlign: 'center', maxWidth: 460, padding: '0 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#aeaeb2', textTransform: 'uppercase', marginBottom: 12 }}>
          MIXMATE
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1c1c1e', letterSpacing: -0.5, lineHeight: 1.25, marginBottom: 16 }}>
          Machine geblokkeerd vanwege openstaande betalingen
        </div>

        {amountStr && (
          <div style={{
            display: 'inline-block',
            background: '#fff', border: '1.5px solid #ff3b30',
            borderRadius: 16, padding: '12px 28px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#ff3b30', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Openstaand bedrag
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#ff3b30', letterSpacing: -1 }}>
              {amountStr}
            </div>
          </div>
        )}

        <div style={{ fontSize: 15, color: '#3a3a3c', lineHeight: 1.6 }}>
          {amountStr
            ? `Voldoe ${amountStr} om de machine te ontgrendelen.`
            : 'Voldoe de openstaande betalingen om de machine te ontgrendelen.'}
        </div>
      </div>

      {/* Portaal kaart met QR */}
      <div style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 20,
        padding: '20px 28px',
        display: 'flex', alignItems: 'center', gap: 24,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <QRCanvas url={PORTAL_URL} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e', marginBottom: 4 }}>
            Bekijk uw facturen online
          </div>
          <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: 8 }}>
            Log in op het portaal om alle<br />openstaande facturen te bekijken.
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#007aff' }}>
            portaal.mixmate.nl
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aeaeb2', marginTop: 20 }}>
        Vragen? Neem contact op via <span style={{ color: '#007aff' }}>info@mixmate.nl</span>
      </div>
    </div>
  )
}
