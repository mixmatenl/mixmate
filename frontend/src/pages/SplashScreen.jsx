import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [logoVisible, setLogoVisible] = useState(false)
  const [fadeOut,     setFadeOut]     = useState(false)

  useEffect(() => {
    // Logo faded in na 1 frame
    const t0 = requestAnimationFrame(() => setLogoVisible(true))
    // Na 2.8s beginnen uitfaden
    const t1 = setTimeout(() => setFadeOut(true), 2800)
    // Na fade klaar: door
    const t2 = setTimeout(() => onDone(), 3600)
    return () => { cancelAnimationFrame(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? 'opacity 0.8s ease' : 'none',
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 44%, rgba(255,255,255,0.05) 0%, transparent 60%)',
        opacity: logoVisible ? 1 : 0,
        transition: 'opacity 1.5s ease',
      }} />

      <img
        src="/logo.png"
        alt="MIXMATE"
        style={{
          width: '52%', maxWidth: '340px', objectFit: 'contain',
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible ? 'scale(1)' : 'scale(0.92)',
          transition: 'opacity 1.2s ease, transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Subtiele tagline */}
      <p style={{
        marginTop: '32px',
        color: 'rgba(255,255,255,0.2)',
        fontSize: '11px',
        letterSpacing: '4px',
        textTransform: 'uppercase',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 400,
        opacity: logoVisible ? 1 : 0,
        transition: 'opacity 1.2s ease 0.4s',
      }}>
        Your personal bartender
      </p>
    </div>
  )
}
