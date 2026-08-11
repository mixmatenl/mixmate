import React, { useEffect, useState, useRef } from 'react'

export default function BlockedOverlay() {
  const [state, setState] = useState({ blocked: false, reason: '' })
  const timerRef = useRef(null)

  useEffect(() => {
    function poll() {
      fetch('/api/machine/blocked')
        .then(r => r.json())
        .then(d => setState({ blocked: !!d.blocked, reason: d.reason || '' }))
        .catch(() => {})
        .finally(() => { timerRef.current = setTimeout(poll, 2000) })
    }
    poll()
    return () => clearTimeout(timerRef.current)
  }, [])

  const { blocked, reason } = state

  if (!blocked) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: '#f2f2f7',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
    }}>
      {/* Slot icoon */}
      <div style={{
        width: 88, height: 88, borderRadius: 26,
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2.5"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>

      {/* Tekst */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 2,
          color: '#aeaeb2', textTransform: 'uppercase', marginBottom: 10,
        }}>
          MIXMATE
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1c1c1e', letterSpacing: -0.4, marginBottom: 8 }}>
          Machine geblokkeerd
        </div>
        <div style={{ fontSize: 14, color: '#8e8e93', lineHeight: 1.5 }}>
          {reason || 'Vraag een medewerker om de machine te deblokkeren.'}
        </div>
        {reason && (
          <div style={{ fontSize: 13, color: '#aeaeb2', marginTop: 8 }}>
            Neem contact op via{' '}
            <span style={{ color: '#007aff' }}>info@mixmate.nl</span>
          </div>
        )}
      </div>
    </div>
  )
}
