import React, { useState } from 'react'

function ConfirmButton({ label, description, icon, danger, onConfirm }) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConfirm() {
    setDone(true)
    await onConfirm()
  }

  if (done) return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-3">
      <span className="text-white/40 text-sm">Bezig…</span>
    </div>
  )

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-white/80 text-sm font-medium">{label}</p>
          <p className="text-white/30 text-xs">{description}</p>
        </div>
      </div>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
            danger
              ? 'bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30'
              : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/20'
          }`}
        >
          {label}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-white/40 text-xs text-center">Weet je het zeker?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/30 text-sm hover:border-white/20 transition-all"
            >
              Annuleer
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
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

export default function BackofficeSystem() {
  async function reboot() {
    await fetch('/api/system/reboot', { method: 'POST' })
  }

  async function shutdown() {
    await fetch('/api/system/shutdown', { method: 'POST' })
  }

  return (
    <div className="space-y-5 max-w-xl">
      <h3 className="text-white/60 text-xs tracking-widest uppercase">Systeem beheer</h3>

      <ConfirmButton
        label="Herstart"
        description="Start de Raspberry Pi opnieuw op. De app is daarna binnen 30 seconden weer beschikbaar."
        icon="🔄"
        danger={false}
        onConfirm={reboot}
      />

      <ConfirmButton
        label="Afsluiten"
        description="Zet de Raspberry Pi volledig uit. Je moet hem daarna handmatig aanzetten."
        icon="⏻"
        danger={true}
        onConfirm={shutdown}
      />
    </div>
  )
}
