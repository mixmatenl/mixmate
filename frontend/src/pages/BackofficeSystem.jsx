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
        <span className="text-2xl">{icon}</span>
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
      <span className="text-2xl">{icon}</span>
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
        icon="📶"
        onClick={onShowWifi}
      />

      <ActionButton
        label="Machine koppelen"
        description="Toon de koppelcode voor het MIXMATE portaal."
        icon="🔗"
        onClick={onShowPairing}
      />

      <ConfirmButton
        label="Herstart"
        description="Start de machine opnieuw op. Duurt ongeveer 30 seconden."
        icon="🔄"
        danger={false}
        onConfirm={reboot}
      />

      <ConfirmButton
        label="Afsluiten"
        description="Zet de machine volledig uit."
        icon="⏻"
        danger={true}
        onConfirm={shutdown}
      />
    </div>
  )
}
