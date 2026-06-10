import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 2500)
    const t2 = setTimeout(() => onDone(), 3000)
    return () => [t1, t2].forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '32px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
    }}>
      {/* Shaker SVG */}
      <svg width="120" height="160" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="45" y="8" width="30" height="14" rx="7" stroke="white" strokeWidth="4" fill="none"/>
        <path d="M35 28 Q35 22 45 22 L75 22 Q85 22 85 28 L85 38 Q85 44 75 44 L45 44 Q35 44 35 38 Z"
          stroke="white" strokeWidth="4" fill="none"/>
        <path d="M40 44 L30 130 Q30 138 40 138 L80 138 Q90 138 90 130 L80 44 Z"
          stroke="white" strokeWidth="4" fill="none"/>
        <line x1="33" y1="60" x2="87" y2="60" stroke="white" strokeWidth="3" strokeOpacity="0.4"/>
        <path d="M94 50 Q108 60 104 75 Q100 90 94 95" stroke="white" strokeWidth="3.5"
          fill="none" strokeLinecap="round"/>
        <path d="M100 68 Q112 76 108 88" stroke="white" strokeWidth="3"
          fill="none" strokeLinecap="round" strokeOpacity="0.5"/>
      </svg>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          color: 'white', fontSize: '52px', fontWeight: '800',
          letterSpacing: '10px', fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1,
        }}>
          MIXMATE
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '6px',
          marginTop: '10px', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '400',
        }}>
          COCKTAIL MACHINE
        </div>
      </div>
    </div>
  )
}
