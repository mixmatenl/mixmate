import React, { useState, useEffect, useRef } from 'react'

const STATUS = { IDLE: 'idle', CHECKING: 'checking', UPDATING: 'updating', DONE: 'done', ERROR: 'error' }

function VersionBadge({ info }) {
  if (!info) return null
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
        <div>
          <span className="text-white/70 text-sm font-medium">Versie </span>
          <span className="text-white font-mono text-sm">{info.commit}</span>
        </div>
        {info.date && <span className="text-white/25 text-xs ml-auto">{info.date}</span>}
      </div>
      {info.message && <p className="text-white/40 text-xs pl-5">{info.message}</p>}
    </div>
  )
}

export default function BackofficeUpdate() {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [versionInfo, setVersionInfo] = useState(null)
  const [updatesAvailable, setUpdatesAvailable] = useState(null)
  const [logs, setLogs] = useState([])          // [{type, label/line}]
  const [currentStep, setCurrentStep] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const wsRef = useRef(null)
  const logEndRef = useRef(null)

  useEffect(() => {
    fetch('/api/system/version')
      .then(r => r.json())
      .then(setVersionInfo)
      .catch(() => {})
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function checkUpdates() {
    setStatus(STATUS.CHECKING)
    fetch('/api/system/check-updates')
      .then(r => r.json())
      .then(d => {
        setUpdatesAvailable(d.updates_available)
        setStatus(STATUS.IDLE)
      })
      .catch(() => setStatus(STATUS.IDLE))
  }

  function startUpdate() {
    setStatus(STATUS.UPDATING)
    setLogs([])
    setCurrentStep('')
    setErrorMsg('')

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    const port = import.meta.env.DEV ? '8000' : (window.location.port || '80')
    const ws = new WebSocket(`${proto}://${host}:${port}/ws/system/update`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'step') {
        setCurrentStep(msg.label)
        setLogs(l => [...l, { type: 'step', text: msg.label }])
      } else if (msg.type === 'log') {
        setLogs(l => [...l, { type: 'log', text: msg.line }])
      } else if (msg.type === 'done') {
        setStatus(STATUS.DONE)
        setLogs(l => [...l, { type: 'done', text: 'Update voltooid!' }])
        // Reload version info
        fetch('/api/system/version').then(r => r.json()).then(setVersionInfo).catch(() => {})
      } else if (msg.type === 'error') {
        setStatus(STATUS.ERROR)
        setErrorMsg(msg.message)
        setLogs(l => [...l, { type: 'error', text: msg.message }])
      }
    }
    ws.onerror = () => {
      setStatus(STATUS.ERROR)
      setErrorMsg('Verbinding verbroken')
    }
  }

  const isUpdating = status === STATUS.UPDATING

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-xs tracking-widest uppercase">Over-the-air update</h3>
        {status === STATUS.IDLE && (
          <button
            onClick={checkUpdates}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Controleer op updates
          </button>
        )}
        {status === STATUS.CHECKING && (
          <span className="text-xs text-white/25 flex items-center gap-1.5">
            <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin inline-block" />
            Controleren…
          </span>
        )}
      </div>

      {/* Huidige versie */}
      <VersionBadge info={versionInfo} />

      {/* Update beschikbaar banner */}
      {updatesAvailable === true && status === STATUS.IDLE && (
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
          <p className="text-blue-300 text-sm">Nieuwe versie beschikbaar</p>
        </div>
      )}
      {updatesAvailable === false && status === STATUS.IDLE && (
        <div className="bg-green-500/10 border border-green-400/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-300 text-sm">Software is up-to-date</p>
        </div>
      )}

      {/* Wat doet een update */}
      {status === STATUS.IDLE && logs.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 space-y-1">
          <p className="text-white/40 text-xs font-medium mb-2">Een update voert het volgende uit:</p>
          {[
            'git pull — nieuwste code ophalen',
            'pip install — Python dependencies bijwerken',
            'npm build — frontend opnieuw bouwen',
            'systemctl restart — service herstarten',
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-white/25 text-xs">
              <span className="text-white/15">{i + 1}.</span> {s}
            </div>
          ))}
        </div>
      )}

      {/* Live log output */}
      {logs.length > 0 && (
        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-amber-400 animate-pulse' : status === STATUS.DONE ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/30 text-xs font-mono">
              {isUpdating ? currentStep || 'Bezig…' : status === STATUS.DONE ? 'Voltooid' : 'Fout'}
            </span>
          </div>
          <div className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className={
                log.type === 'step' ? 'text-white/70 font-semibold mt-2 first:mt-0' :
                log.type === 'done' ? 'text-green-400 mt-2' :
                log.type === 'error' ? 'text-red-400' :
                'text-white/30'
              }>
                {log.type === 'step' && <span className="text-white/20 mr-2">›</span>}
                {log.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Actieknoppen */}
      {(status === STATUS.IDLE || status === STATUS.ERROR) && (
        <button
          onClick={startUpdate}
          className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all active:scale-[0.98]"
        >
          {status === STATUS.ERROR ? 'Opnieuw proberen' : 'Update uitvoeren'}
        </button>
      )}

      {isUpdating && (
        <button
          disabled
          className="w-full py-3.5 rounded-xl bg-white/10 text-white/30 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          Update bezig…
        </button>
      )}

      {status === STATUS.DONE && (
        <div className="flex gap-3">
          <button
            onClick={() => { setStatus(STATUS.IDLE); setLogs([]); setUpdatesAvailable(null) }}
            className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 text-sm hover:border-white/20 hover:text-white/60 transition-all"
          >
            Sluiten
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all"
          >
            Pagina herladen
          </button>
        </div>
      )}
    </div>
  )
}
