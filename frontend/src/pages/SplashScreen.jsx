import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('intro') // intro → shaking → textIn → fadeOut

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shaking'), 400)
    const t2 = setTimeout(() => setPhase('textIn'), 1200)
    const t3 = setTimeout(() => setPhase('fadeOut'), 3000)
    const t4 = setTimeout(() => onDone(), 3600)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '32px',
      opacity: phase === 'fadeOut' ? 0 : 1,
      transition: phase === 'fadeOut' ? 'opacity 0.6s ease-in-out' : 'none',
    }}>

      {/* Shaker SVG */}
      <div style={{
        animation: phase === 'shaking'
          ? 'shake 0.15s ease-in-out infinite'
          : phase === 'textIn' || phase === 'fadeOut'
            ? 'shakerDrop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards'
            : 'none',
        opacity: phase === 'intro' ? 0 : 1,
        transition: 'opacity 0.4s',
        transformOrigin: 'center bottom',
      }}>
        <svg width="120" height="160" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cap top */}
          <rect x="45" y="8" width="30" height="14" rx="7" stroke="white" strokeWidth="4" fill="none"/>
          {/* Cap middle */}
          <path d="M35 28 Q35 22 45 22 L75 22 Q85 22 85 28 L85 38 Q85 44 75 44 L45 44 Q35 44 35 38 Z"
            stroke="white" strokeWidth="4" fill="none"/>
          {/* Body */}
          <path d="M40 44 L30 130 Q30 138 40 138 L80 138 Q90 138 90 130 L80 44 Z"
            stroke="white" strokeWidth="4" fill="none"/>
          {/* Divider line */}
          <line x1="33" y1="60" x2="87" y2="60" stroke="white" strokeWidth="3" strokeOpacity="0.4"/>
          {/* Swirl */}
          <path d="M94 50 Q108 60 104 75 Q100 90 94 95" stroke="white" strokeWidth="3.5"
            fill="none" strokeLinecap="round"/>
          <path d="M100 68 Q112 76 108 88" stroke="white" strokeWidth="3"
            fill="none" strokeLinecap="round" strokeOpacity="0.5"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{
        textAlign: 'center',
        opacity: phase === 'textIn' || phase === 'fadeOut' ? 1 : 0,
        transform: phase === 'textIn' || phase === 'fadeOut' ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        <div style={{
          color: 'white',
          fontSize: '52px',
          fontWeight: '800',
          letterSpacing: '10px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1,
        }}>
          MIXMATE
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '13px',
          letterSpacing: '6px',
          marginTop: '10px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: '400',
        }}>
          COCKTAIL MACHINE
        </div>
      </div>

      {/* Dots loader */}
      <div style={{
        display: 'flex', gap: '8px',
        opacity: phase === 'textIn' || phase === 'fadeOut' ? 1 : 0,
        transition: 'opacity 0.5s ease 0.3s',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes shake {
          0%   { transform: rotate(-12deg) translateX(-4px); }
          25%  { transform: rotate(12deg)  translateX(4px);  }
          50%  { transform: rotate(-10deg) translateX(-3px); }
          75%  { transform: rotate(10deg)  translateX(3px);  }
          100% { transform: rotate(-12deg) translateX(-4px); }
        }
        @keyframes shakerDrop {
          0%   { transform: rotate(0deg) translateY(-10px); }
          60%  { transform: rotate(0deg) translateY(6px);   }
          100% { transform: rotate(0deg) translateY(0px);   }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1);    }
          50%       { opacity: 1;   transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}
