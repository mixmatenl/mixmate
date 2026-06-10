import React, { useState, useEffect, useRef } from 'react'

const STATUS = { IDLE: 'idle', CHECKING: 'checking', UPDATING: 'updating', DONE: 'done', ERROR: 'error' }

function ChangelogSection({ changelog }) {
  if (!changelog?.length) return null
  return (
    <div className="bg-white/5 border border-white/15 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/10">
        <p className="text-white/70 text-sm font-semibold">Wat is er nieuw?</p>
      </div>
      <div className="divide-y divide-white/5">
        {changelog.slice(0, 1).map((entry, i) => (
          <div key={i} className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                v{entry.version}
              </span>
              {entry.date && <span className="text-white/35 text-xs">{entry.date}</span>}
            </div>
            {Object.entries(entry.sections).map(([section, items]) => items.length > 0 && (
              <div key={section}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                  section === 'Nieuw'     ? 'text-green-400' :
                  section === 'Verbeterd' ? 'text-blue-400'  :
                  section === 'Gefixt'    ? 'text-amber-400' :
                  'text-white/40'
                }`}>
                  {section === 'Nieuw' ? '✦ ' : section === 'Verbeterd' ? '↑ ' : section === 'Gefixt' ? '✓ ' : ''}{section}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item, j) => (
                    <li key={j} className="text-white/55 text-xs flex items-start gap-1.5">
                      <span className="text-white/25 shrink-0">—</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function VersionBadge({ info }) {
  if (!info) return null
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
        <div>
          <span className="text-white/80 text-sm font-medium">MIXMATE OS&nbsp;</span>
          <span className="text-white font-mono text-sm font-bold">
            {info.version && info.version !== '?' ? `v${info.version}` : info.commit ?? '—'}
          </span>
        </div>
        {info.date && <span className="text-white/55 text-xs ml-auto">{info.date}</span>}
      </div>
      {info.commit && info.commit !== 'onbekend' && (
        <p className="text-white/30 text-xs pl-5 font-mono">{info.commit}</p>
      )}
    </div>
  )
}

export default function BackofficeUpdate() {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [versionInfo, setVersionInfo] = useState(null)
  const [updatesAvailable, setUpdatesAvailable] = useState(null)
  const [changelog, setChangelog] = useState([])
  const [logs, setLogs] = useState([])
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
        if (d.changelog) setChangelog(d.changelog)
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
    const port = import.meta.env.DEV ? '8000' : (window.location.port || '8000')
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
        setLogs(l => [...l, { type: 'done', text: 'Update klaar! Pagina herlaadt over 5 seconden…' }])
        setTimeout(() => window.location.reload(), 5000)
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
        <h3 className="text-white font-bold text-lg">Over-the-air update</h3>
        {status === STATUS.IDLE && (
          <button
            onClick={checkUpdates}
            className="text-sm text-white/60 hover:text-white font-medium transition-colors border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg"
          >
            Controleer op updates
          </button>
        )}
        {status === STATUS.CHECKING && (
          <span className="text-sm text-white/60 flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin inline-block" />
            Controleren…
          </span>
        )}
      </div>

      {/* Huidige versie */}
      <VersionBadge info={versionInfo} />

      {/* Update beschikbaar banner */}
      {updatesAvailable === true && status === STATUS.IDLE && (
        <>
          <div className="bg-blue-500/15 border border-blue-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <p className="text-blue-200 text-sm font-medium">Nieuwe versie beschikbaar</p>
          </div>
          <ChangelogSection changelog={changelog} />
        </>
      )}
      {updatesAvailable === false && status === STATUS.IDLE && (
        <div className="bg-green-500/15 border border-green-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-200 text-sm font-medium">Software is up-to-date</p>
        </div>
      )}

      {/* Wat doet een update */}
      {status === STATUS.IDLE && logs.length === 0 && (
        <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-4 space-y-2">
          <p className="text-white/70 text-sm font-semibold mb-3">Een update voert het volgende uit:</p>
          {[
            'git pull — nieuwste code ophalen',
            'pip install — Python dependencies bijwerken',
            'npm build — frontend opnieuw bouwen',
            'systemctl restart — service herstarten',
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 text-white/60 text-sm">
              <span className="text-white/40 font-mono text-xs w-4 shrink-0">{i + 1}.</span> {s}
            </div>
          ))}
        </div>
      )}

      {/* Live log output */}
      {logs.length > 0 && (
        <div className="bg-black/50 border border-white/20 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isUpdating ? 'bg-amber-400 animate-pulse' : status === STATUS.DONE ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/70 text-sm font-medium">
              {isUpdating ? currentStep || 'Bezig…' : status === STATUS.DONE ? 'Voltooid' : 'Fout'}
            </span>
          </div>
          <div className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className={
                log.type === 'step' ? 'text-white/80 font-semibold mt-2 first:mt-0' :
                log.type === 'done' ? 'text-green-400 mt-2 font-semibold' :
                log.type === 'error' ? 'text-red-400 font-medium' :
                'text-white/50'
              }>
                {log.type === 'step' && <span className="text-white/40 mr-2">›</span>}
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
          className="w-full py-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all active:scale-[0.98]"
        >
          {status === STATUS.ERROR ? 'Opnieuw proberen' : 'Update uitvoeren'}
        </button>
      )}

      {isUpdating && (
        <button
          disabled
          className="w-full py-4 rounded-xl bg-white/10 text-white/60 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="w-4 h-4 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
          Update bezig…
        </button>
      )}

      {status === STATUS.DONE && (
        <div className="flex gap-3">
          <button
            onClick={() => { setStatus(STATUS.IDLE); setLogs([]); setUpdatesAvailable(null) }}
            className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:border-white/40 hover:text-white/80 transition-all"
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
