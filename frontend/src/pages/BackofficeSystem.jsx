import React, { useState } from 'react'

function ConfirmButton({ label, description, icon, danger, onConfirm }) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConfirm() {
    setDone(true)
    await onConfirm()
  }

  if (done) return (
    <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-4 flex items-center gap-3">
      <span className="text-white/60 text-sm font-medium">Bezig…</span>
    </div>
  )

  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-white">{icon}</span>
        <div>
          <p className="text-white text-base font-semibold">{label}</p>
          <p className="text-white/60 text-sm mt-0.5">{description}</p>
        </div>
      </div>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
            danger
              ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:text-red-200'
              : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
          }`}
        >
          {label}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-white/70 text-sm text-center font-medium">Weet je het zeker?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:border-white/40 hover:text-white/80 transition-all"
            >
              Annuleer
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                danger
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              Ja, {label.toLowerCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({ label, description, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-white/15 transition-all text-left"
    >
      <span className="text-white">{icon}</span>
      <div>
        <p className="text-white text-base font-semibold">{label}</p>
        <p className="text-white/60 text-sm mt-0.5">{description}</p>
      </div>
      <svg className="ml-auto text-white/30" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}

export default function BackofficeSystem({ onShowWifi, onShowPairing }) {
  async function reboot() {
    await fetch('/api/system/restart', { method: 'POST' })
  }

  async function shutdown() {
    await fetch('/api/system/shutdown', { method: 'POST' })
  }

  return (
    <div className="space-y-5 max-w-xl">
      <h3 className="text-white font-bold text-lg">Systeem beheer</h3>

      <ActionButton
        label="WiFi instellen"
        description="Verbind de machine met een ander WiFi netwerk."
        icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>}
        onClick={onShowWifi}
      />

      <ActionButton
        label="Machine koppelen"
        description="Toon de koppelcode voor het MIXMATE portaal."
        icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
        onClick={onShowPairing}
      />

      <ConfirmButton
        label="Herstart"
        description="Start de machine opnieuw op. Duurt ongeveer 30 seconden."
        icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>}
        danger={false}
        onConfirm={reboot}
      />

      <ConfirmButton
        label="Afsluiten"
        description="Zet de machine volledig uit."
        icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>}
        danger={true}
        onConfirm={shutdown}
      />
    </div>
  )
}
