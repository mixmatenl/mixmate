import React, { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 10000)
    const t2 = setTimeout(() => onDone(), 10500)
    return () => [t1, t2].forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
    }}>
      <img
        src="/logo.png"
        alt="Mixmate"
        style={{
          width: '60%',
          maxWidth: '400px',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}
