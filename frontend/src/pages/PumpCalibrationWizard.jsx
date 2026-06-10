import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const STEP = { SELECT: 'select', PREPARE: 'prepare', RUNNING: 'running', MEASURE: 'measure', DONE: 'done' }

function StepDot({ n, active, done }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      done ? 'bg-[#111] text-white' : active ? 'bg-[#111] text-white ring-4 ring-[#111]/10' : 'bg-gray-100 text-gray-400'
    }`}>
      {done ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : n}
    </div>
  )
}

export default function PumpCalibrationWizard() {
  const [pumps, setPumps] = useState([])
  const [step, setStep] = useState(STEP.SELECT)
  const [selectedPump, setSelectedPump] = useState(null)
  const [seconds, setSeconds] = useState(5)
  const [progress, setProgress] = useState(null)
  const [finalWeight, setFinalWeight] = useState(null)
  const [measuredMl, setMeasuredMl] = useState('')
  const [useLoadcell, setUseLoadcell] = useState(false)
  const [savedMlPerSec, setSavedMlPerSec] = useState(null)
  const [error, setError] = useState('')
  const wsRef = useRef(null)

  useEffect(() => {
    api.getPumpsSimple().then(setPumps).catch(() => {})
  }, [])

  const stepIndex = { [STEP.SELECT]: 0, [STEP.PREPARE]: 1, [STEP.RUNNING]: 2, [STEP.MEASURE]: 3, [STEP.DONE]: 4 }
  const currentIdx = stepIndex[step] ?? 0

  function selectPump(pump) {
    setSelectedPump(pump)
    setStep(STEP.PREPARE)
    setError('')
    setProgress(null)
    setFinalWeight(null)
    setMeasuredMl('')
    setSavedMlPerSec(null)
  }

  function startCalibration() {
    setStep(STEP.RUNNING)
    setError('')
    setProgress(null)

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    const port = import.meta.env.DEV ? '8000' : (window.location.port || '80')
    const ws = new WebSocket(`${proto}://${host}:${port}/ws/calibrate/${selectedPump.id}`)
    wsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify({ action: 'start', seconds }))
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'progress') {
        setProgress(msg)
      } else if (msg.type === 'done') {
        const measuredG = msg.weight_g
        setFinalWeight(measuredG)
        // If loadcell detected weight, use it automatically
        if (measuredG > 0.5) {
          setUseLoadcell(true)
          setMeasuredMl(measuredG.toFixed(1))
        } else {
          setUseLoadcell(false)
          setMeasuredMl('')
        }
        setStep(STEP.MEASURE)
      } else if (msg.type === 'saved') {
        setSavedMlPerSec(msg.ml_per_second)
        setStep(STEP.DONE)
      } else if (msg.type === 'error') {
        setError(msg.message)
        setStep(STEP.PREPARE)
      }
    }
    ws.onerror = () => { setError('Verbinding mislukt'); setStep(STEP.PREPARE) }
  }

  function saveMeasurement() {
    const ml = parseFloat(measuredMl)
    if (!ml || ml <= 0) return
    wsRef.current?.send(JSON.stringify({ action: 'save', measured_ml: ml }))
  }

  function reset() {
    setStep(STEP.SELECT)
    setSelectedPump(null)
    setProgress(null)
    setError('')
  }

  const pct = progress ? Math.round((progress.elapsed / seconds) * 100) : (step === STEP.MEASURE || step === STEP.DONE) ? 100 : 0

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-gray-800 font-semibold text-lg">Pompkalibratie</h2>
        <p className="text-gray-400 text-sm">Stel nauwkeurig in hoeveel ml elke pomp per seconde pompt</p>
      </div>

      {/* Stappen indicator */}
      {step !== STEP.SELECT && (
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: 'Pomp kiezen' },
            { n: 2, label: 'Voorbereiding' },
            { n: 3, label: 'Draaien' },
            { n: 4, label: 'Meten' },
            { n: 5, label: 'Klaar' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div className="flex flex-col items-center gap-1">
                <StepDot n={s.n} active={currentIdx === i} done={currentIdx > i} />
                <span className={`text-xs hidden sm:block ${currentIdx === i ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>{s.label}</span>
              </div>
              {i < arr.length - 1 && <div className={`flex-1 h-px mb-4 ${currentIdx > i ? 'bg-[#111]' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Stap 1: Pomp selecteren */}
      {step === STEP.SELECT && (
        <div className="space-y-3">
          <p className="text-gray-500 text-sm">Kies de pomp die je wilt kalibreren:</p>
          {pumps.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8 border border-dashed border-gray-200 rounded-2xl">
              Geen pompen gevonden. Voeg eerst pompen toe in de backoffice.
            </p>
          )}
          <div className="space-y-2">
            {[...pumps].sort((a, b) => a.slot - b.slot).map(pump => (
              <button key={pump.id} onClick={() => selectPump(pump)}
                className="w-full flex items-center gap-4 px-5 py-4 border border-gray-200 rounded-2xl bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left group">
                <div className={`w-3 h-3 rounded-full shrink-0 ${pump.enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                <div className="flex-1">
                  <p className="text-gray-800 font-medium text-sm">
                    Pomp {pump.slot}
                    {pump.ingredient && <span className="text-gray-400 font-normal ml-2">— {pump.ingredient.name}</span>}
                    {!pump.ingredient && <span className="text-gray-300 font-normal ml-2 italic">Geen ingrediënt</span>}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stap 2: Voorbereiding */}
      {step === STEP.PREPARE && selectedPump && (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-3">
            <p className="text-blue-800 font-semibold text-sm">
              Kalibratie voor Pomp {selectedPump.slot}
              {selectedPump.ingredient && ` — ${selectedPump.ingredient.name}`}
            </p>
            <ol className="space-y-2">
              {[
                'Zet een lege maatbeker of glas onder de slang van deze pomp',
                'Zorg dat er voldoende vloeistof in het reservoir zit',
                'De pomp draait automatisch voor de ingestelde tijd',
                'Daarna meet je hoeveel ml er uitkwam',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-blue-700">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Looptijd</span>
              <span className="text-gray-800 font-bold">{seconds} seconden</span>
            </div>
            <input type="range" min="3" max="15" value={seconds} onChange={e => setSeconds(parseInt(e.target.value))}
              className="w-full accent-[#111]" />
            <div className="flex justify-between text-xs text-gray-300">
              <span>3s (snel)</span><span>15s (nauwkeurig)</span>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

          <div className="flex gap-3">
            <button onClick={reset} className="px-5 py-3 border border-gray-200 rounded-xl text-gray-400 text-sm hover:border-gray-300 hover:text-gray-600 transition-all">
              ← Terug
            </button>
            <button onClick={startCalibration}
              className="flex-1 py-3 bg-[#111] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-all active:scale-[0.98]">
              Start kalibratie
            </button>
          </div>
        </div>
      )}

      {/* Stap 3: Pomp draait */}
      {step === STEP.RUNNING && (
        <div className="space-y-5">
          <div className="border border-gray-200 rounded-2xl p-6 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mx-auto">
              <svg className="w-8 h-8 text-green-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-800 tabular-nums">
                {progress ? progress.elapsed.toFixed(1) : '0.0'}
                <span className="text-xl text-gray-400 ml-1">s</span>
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {progress && progress.weight_g > 0 ? `Gewicht: ${progress.weight_g}g` : 'Pomp draait…'}
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#111] rounded-full transition-all duration-100" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-gray-300 text-xs">Laat de maatbeker op zijn plek staan</p>
          </div>
        </div>
      )}

      {/* Stap 4: Meten */}
      {step === STEP.MEASURE && (
        <div className="space-y-5">
          {useLoadcell && finalWeight > 0.5 ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-green-700 font-medium text-sm">Weegschaal heeft {finalWeight.toFixed(1)}g gemeten</p>
                <p className="text-green-600 text-xs mt-0.5">Dit wordt gebruikt als ml-waarde (1g ≈ 1ml voor water/alcohol)</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
              <p className="text-amber-700 text-sm">Weegschaal niet actief. Meet handmatig met een maatbeker.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">Hoeveel ml zit er in de maatbeker?</label>
            <div className="flex gap-3">
              <input type="number" step="0.5" value={measuredMl} onChange={e => setMeasuredMl(e.target.value)}
                autoFocus
                placeholder="bijv. 7.5"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-lg font-bold bg-gray-50 focus:outline-none focus:border-gray-400" />
              <div className="flex items-center text-gray-400 pr-1 text-sm">ml</div>
            </div>
            {measuredMl && parseFloat(measuredMl) > 0 && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-gray-500 text-sm">Berekende snelheid</span>
                <span className="text-gray-800 font-bold text-sm">{(parseFloat(measuredMl) / seconds).toFixed(2)} ml/sec</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(STEP.PREPARE)} className="px-5 py-3 border border-gray-200 rounded-xl text-gray-400 text-sm hover:border-gray-300 hover:text-gray-600 transition-all">
              Herhalen
            </button>
            <button onClick={saveMeasurement} disabled={!measuredMl || parseFloat(measuredMl) <= 0}
              className="flex-1 py-3 bg-[#111] text-white text-sm font-bold rounded-xl hover:bg-[#333] disabled:opacity-40 transition-all active:scale-[0.98]">
              Opslaan
            </button>
          </div>
        </div>
      )}

      {/* Stap 5: Klaar */}
      {step === STEP.DONE && selectedPump && (
        <div className="space-y-5">
          <div className="border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-gray-800 font-semibold">Kalibratie opgeslagen</p>
                <p className="text-gray-400 text-sm">
                  Pomp {selectedPump.slot}
                  {selectedPump.ingredient && ` — ${selectedPump.ingredient.name}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-xs mb-1">Gemeten volume</p>
                <p className="text-gray-800 font-bold">{parseFloat(measuredMl).toFixed(1)} ml</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-gray-400 text-xs mb-1">Nieuwe snelheid</p>
                <p className="text-gray-800 font-bold">{savedMlPerSec} ml/sec</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-500 text-sm font-medium hover:border-gray-300 transition-all">
              Andere pomp kalibreren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
