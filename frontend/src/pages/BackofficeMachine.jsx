import React, { useEffect, useState } from 'react'
import { api } from '../api'

const MODELS = [
  {
    id: 'MATE.1',
    label: 'MATE.1',
    description: 'Standaard model — peristaltische pompen, geen CO₂ of valves',
    features: ['Peristaltische pompen', 'Weegschaal'],
    co2: false,
  },
  {
    id: 'MATE.1 CO2',
    label: 'MATE.1 CO₂',
    description: 'Met koolzuurinstallatie en valve-aansturing',
    features: ['Peristaltische pompen', 'CO₂ installatie', 'Valves', 'Weegschaal'],
    co2: true,
  },
  {
    id: 'MATE.1 PRO',
    label: 'MATE.1 PRO',
    description: 'Volledig model — alle functies inclusief CO₂ en professionele afwerking',
    features: ['Peristaltische pompen', 'CO₂ installatie', 'Valves', 'Weegschaal', 'Pro hardware'],
    co2: true,
  },
]

export default function BackofficeMachine() {
  const [current, setCurrent]   = useState(null)  // huidige model string
  const [selected, setSelected] = useState(null)  // geselecteerd in UI
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null)

  useEffect(() => {
    api.getMachineInfo().then(d => {
      setCurrent(d.model || null)
      setSelected(d.model || null)
    }).catch(() => {})
  }, [])

  async function save() {
    if (!selected) return
    setSaving(true)
    setMsg(null)
    try {
      await api.setMachineModel(selected)
      setCurrent(selected)
      setMsg({ type: 'ok', text: `Machine ingesteld als ${selected}` })
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Opslaan mislukt' })
    } finally {
      setSaving(false)
    }
  }

  const changed = selected !== current

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h3 className="text-white font-bold text-lg mb-1">Machine model</h3>
        <p className="text-white/50 text-sm">
          Selecteer het model van deze machine. Dit bepaalt welke functies beschikbaar zijn
          en welke software-updates geïnstalleerd mogen worden.
        </p>
      </div>

      {/* Model kaarten */}
      <div className="space-y-3">
        {MODELS.map(m => {
          const isSelected = selected === m.id
          const isCurrent  = current === m.id
          return (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${
                isSelected
                  ? 'border-white bg-white/10'
                  : 'border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className={`font-bold text-base ${isSelected ? 'text-white' : 'text-white/80'}`}>
                      {m.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                        Huidig
                      </span>
                    )}
                    {m.co2 && (
                      <span className="text-[10px] font-bold text-cyan-400/90 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        CO₂
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mb-3 ${isSelected ? 'text-white/70' : 'text-white/45'}`}>
                    {m.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.features.map(f => (
                      <span key={f} className={`text-xs px-2.5 py-1 rounded-lg border ${
                        isSelected
                          ? 'bg-white/10 text-white/80 border-white/20'
                          : 'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Radio indicator */}
                <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? 'border-white' : 'border-white/30'
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Opslaan */}
      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={!selected || !changed || saving}
          className="px-6 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Opslaan…' : 'Model opslaan'}
        </button>
        {!current && (
          <p className="text-amber-400 text-sm font-medium">⚠ Nog geen model ingesteld</p>
        )}
        {msg && (
          <p className={`text-sm font-medium ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {msg.text}
          </p>
        )}
      </div>

      {/* Info blok */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
          Wat bepaalt het machine model?
        </p>
        <div className="space-y-2 text-white/50 text-sm">
          <p>• <span className="text-white/75 font-medium">CO₂ en valves</span> — alleen zichtbaar en bedienbaar op MATE.1 CO₂ en MATE.1 PRO</p>
          <p>• <span className="text-white/75 font-medium">Software-updates</span> — toekomstige versies kunnen exclusief zijn voor bepaalde modellen</p>
          <p>• <span className="text-white/75 font-medium">Opgeslagen in .env</span> — blijft behouden na een software-update</p>
        </div>
      </div>
    </div>
  )
}
