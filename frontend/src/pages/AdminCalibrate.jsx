import React, { useState, useRef } from 'react'

const STATUS = { IDLE: 'idle', RUNNING: 'running', DONE: 'done', SAVED: 'saved', ERROR: 'error' }

export default function AdminCalibrate({ pump, onSaved, onClose }) {
  const [seconds, setSeconds] = useState(5)
  const [status, setStatus] = useState(STATUS.IDLE)
  const [progress, setProgress] = useState(null)
  const [measuredMl, setMeasuredMl] = useState('')
  const [error, setError] = useState('')
  const wsRef = useRef(null)

  function start() {
    setStatus(STATUS.RUNNING)
    setProgress(null)
    setError('')
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    const port = import.meta.env.DEV ? '8000' : (window.location.port || '80')
    const ws = new WebSocket(`${proto}://${host}:${port}/ws/calibrate/${pump.id}`)
    wsRef.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ action: 'start', seconds }))
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'progress') setProgress(msg)
      else if (msg.type === 'done') { setStatus(STATUS.DONE); setMeasuredMl(String(msg.suggested_ml)) }
      else if (msg.type === 'saved') { setStatus(STATUS.SAVED); onSaved && onSaved(msg.ml_per_second) }
      else if (msg.type === 'error') { setStatus(STATUS.ERROR); setError(msg.message) }
    }
    ws.onerror = () => { setStatus(STATUS.ERROR); setError('Verbinding mislukt') }
  }

  function save() {
    const ml = parseFloat(measuredMl)
    if (!ml || ml <= 0) return
    wsRef.current?.send(JSON.stringify({ action: 'save', measured_ml: ml }))
  }

  const pct = progress && status === STATUS.RUNNING
    ? Math.round((progress.elapsed / seconds) * 100)
    : status === STATUS.DONE || status === STATUS.SAVED ? 100 : 0

  const btn = "w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
  const btnPrimary = `${btn} bg-[#111] text-white hover:bg-[#333]`
  const btnSecondary = `${btn} border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-gray-800 font-semibold text-lg">Kalibratie</h2>
            <p className="text-gray-400 text-sm mt-0.5">Slot {pump.slot} — {pump.ingredient?.name ?? 'Niet toegewezen'}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors text-xl leading-none">✕</button>
        </div>

        {status === STATUS.IDLE && (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm leading-relaxed">
              Zet een maatbeker onder de pomp. De pomp draait voor het opgegeven aantal seconden. Daarna vul je in hoeveel ml er uitkwam.
            </p>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>Looptijd</span><span className="font-medium text-gray-600">{seconds}s</span>
              </div>
              <input type="range" min="1" max="30" value={seconds} onChange={e => setSeconds(parseInt(e.target.value))} className="w-full accent-gray-800" />
            </div>
            <button onClick={start} className={btnPrimary}>Start pomp</button>
          </div>
        )}

        {status === STATUS.RUNNING && (
          <div className="space-y-4">
            <div className="text-center py-3">
              <div className="text-5xl font-bold text-gray-800">{progress ? progress.elapsed.toFixed(1) : '0.0'}<span className="text-2xl text-gray-400">s</span></div>
              <div className="text-gray-400 text-sm mt-1">{progress ? `${progress.weight_g}g` : 'Tara bezig…'}</div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gray-800 rounded-full transition-all duration-100" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-gray-400 text-xs text-center">Pomp draait…</p>
          </div>
        )}

        {status === STATUS.DONE && (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">Pomp heeft {seconds}s gedraaid. Hoeveel ml zit er in de maatbeker?</p>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Gemeten hoeveelheid (ml)</label>
              <input type="number" step="0.5" value={measuredMl} onChange={e => setMeasuredMl(e.target.value)} autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm bg-gray-50 focus:outline-none focus:border-gray-400" />
              {measuredMl && parseFloat(measuredMl) > 0 && (
                <p className="text-gray-400 text-xs mt-1.5">= {(parseFloat(measuredMl) / seconds).toFixed(2)} ml/sec</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStatus(STATUS.IDLE)} className={btnSecondary}>Opnieuw</button>
              <button onClick={save} disabled={!measuredMl || parseFloat(measuredMl) <= 0} className={`${btnPrimary} disabled:opacity-40`}>Opslaan</button>
            </div>
          </div>
        )}

        {status === STATUS.SAVED && (
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold">Opgeslagen</p>
            <p className="text-gray-400 text-sm">{(parseFloat(measuredMl) / seconds).toFixed(2)} ml/sec</p>
            <button onClick={onClose} className={btnPrimary}>Sluiten</button>
          </div>
        )}

        {status === STATUS.ERROR && (
          <div className="space-y-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={() => setStatus(STATUS.IDLE)} className={btnSecondary}>Probeer opnieuw</button>
          </div>
        )}
      </div>
    </div>
  )
}
