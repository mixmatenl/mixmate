import React, { useState } from 'react'
import { api } from '../api'

const PIN_LENGTH = 4

export default function Login({ onLogin, onBackoffice }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  async function press(digit) {
    if (input.length >= PIN_LENGTH || loading) return
    const next = input + digit
    setInput(next)
    if (next.length === PIN_LENGTH) {
      setLoading(true)
      try {
        await api.verifyPin(next)
        onLogin()
      } catch {
        setShake(true)
        setTimeout(() => { setInput(''); setShake(false); }, 600)
      } finally {
        setTimeout(() => setLoading(false), 600)
      }
    }
  }

  function backspace() {
    if (!loading) setInput(i => i.slice(0, -1))
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center relative">
      <div className="mb-12 text-center">
        <span className="text-white font-bold tracking-[0.3em] text-2xl">MIXMATE</span>
        <p className="text-white/30 text-sm mt-2 tracking-wide">Voer uw PIN in</p>
      </div>

      <div className={`flex gap-5 mb-10 ${shake ? 'animate-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
            i < input.length ? 'bg-white scale-110' : 'bg-white/15'
          }`} />
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', width:'240px' }}>
        {digits.map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? backspace() : d !== '' ? press(d) : null}
            disabled={d === '' || loading}
            style={{
              height: '68px', borderRadius: '14px', fontSize: '22px', fontWeight: '500',
              transition: 'all 0.12s',
              visibility: d === '' ? 'hidden' : 'visible',
              background: d === '⌫' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
              color: d === '⌫' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: d === '' ? 'default' : 'pointer',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Hidden backoffice button — small dot bottom-left */}
      <button
        onClick={onBackoffice}
        className="absolute bottom-6 left-6 w-6 h-6 rounded-full flex items-center justify-center opacity-20 hover:opacity-60 transition-opacity"
        title="Backoffice"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
      </button>

      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-10px)}80%{transform:translateX(10px)}}
        .animate-shake{animation:shake 0.5s ease-in-out}
      `}</style>
    </div>
  )
}
