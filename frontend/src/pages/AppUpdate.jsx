import React, { useState, useEffect, useRef } from 'react'

const STATUS = { IDLE: 'idle', CHECKING: 'checking', UP_TO_DATE: 'uptodate', AVAILABLE: 'available', UPDATING: 'updating', DONE: 'done', ERROR: 'error' }

const STEPS = [
  { key: 'git',     label: 'Nieuwe versie ophalen',  icon: '↓' },
  { key: 'pip',     label: 'Software bijwerken',      icon: '⚙' },
  { key: 'npm',     label: 'Interface bijwerken',     icon: '✦' },
  { key: 'build',   label: 'Interface voorbereiden',  icon: '◈' },
  { key: 'restart', label: 'Machine herstarten',      icon: '↺' },
]

function stepIndexFromLabel(label) {
  if (label.includes('Git') || label.includes('code')) return 0
  if (label.includes('Python') || label.includes('depend')) return 1
  if (label.includes('Frontend — dep')) return 2
  if (label.includes('bouwen') || label.includes('build')) return 3
  if (label.includes('herstart') || label.includes('Service')) return 4
  return -1
}

export default function AppUpdate() {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [versionInfo, setVersionInfo] = useState(null)
  const [changelog, setChangelog] = useState([])
  const [compatible, setCompatible] = useState(true)
  const [compatMsg, setCompatMsg] = useState(null)
  const [currentStepIdx, setCurrentStepIdx] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const wsRef = useRef(null)
  const logEndRef = useRef(null)

  useEffect(() => {
    fetch('/api/system/version').then(r => r.json()).then(setVersionInfo).catch(() => {})
  }, [])

  useEffect(() => {
    if (showLogs) logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, showLogs])

  function checkUpdates() {
    setStatus(STATUS.CHECKING)
    fetch('/api/system/check-updates')
      .then(r => r.json())
      .then(d => {
        setStatus(d.updates_available ? STATUS.AVAILABLE : STATUS.UP_TO_DATE)
        if (d.changelog) setChangelog(d.changelog)
        setCompatible(d.compatible !== false)
        setCompatMsg(d.compat_message || null)
      })
      .catch(() => setStatus(STATUS.IDLE))
  }

  function startUpdate() {
    setStatus(STATUS.UPDATING)
    setCurrentStepIdx(0)
    setCompletedSteps([])
    setErrorMsg('')
    setLogs([])

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    const port = import.meta.env.DEV ? '8000' : (window.location.port || '8000')
    const ws = new WebSocket(`${proto}://${host}:${port}/ws/system/update`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'step') {
        const idx = stepIndexFromLabel(msg.label)
        if (idx >= 0) {
          setCurrentStepIdx(idx)
          setCompletedSteps(prev => Array.from({ length: idx }, (_, i) => i))
        }
        setLogs(l => [...l, { type: 'step', text: msg.label }])
      } else if (msg.type === 'log') {
        setLogs(l => [...l, { type: 'log', text: msg.line }])
      } else if (msg.type === 'done') {
        setCompletedSteps([0, 1, 2, 3, 4])
        setCurrentStepIdx(-1)
        setStatus(STATUS.DONE)
        setLogs(l => [...l, { type: 'done', text: 'Update klaar! Pagina herlaadt automatisch…' }])
        // Wacht 5 seconden zodat de service kan herstarten, herlaad dan automatisch
        setTimeout(() => window.location.reload(), 5000)
      } else if (msg.type === 'error') {
        setStatus(STATUS.ERROR)
        setErrorMsg(msg.message)
        setLogs(l => [...l, { type: 'error', text: msg.message }])
        setShowLogs(true) // automatisch logs tonen bij fout
      }
    }
    ws.onerror = () => {
      setStatus(STATUS.ERROR)
      setErrorMsg('Verbinding verbroken — probeer opnieuw')
      setShowLogs(true)
    }
  }

  const isUpdating = status === STATUS.UPDATING

  return (
    <div className="space-y-6 max-w-md">

      {/* Versie kaart */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#111] flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
            <img src="/logo.png" alt="MIXMATE OS" className="w-full h-full object-contain p-2" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-bold text-lg">MIXMATE OS</p>
            <p className="text-gray-500 text-sm">
              {versionInfo
                ? `v${versionInfo.version && versionInfo.version !== '?' ? versionInfo.version : '—'}`
                : 'Versie laden…'}
            </p>
            {versionInfo?.date && <p className="text-gray-400 text-xs mt-0.5">{versionInfo.date}</p>}
          </div>
          {status === STATUS.UP_TO_DATE && (
            <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Bijgewerkt
            </div>
          )}
          {status === STATUS.AVAILABLE && (
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
          )}
        </div>
      </div>

      {/* Status: IDLE */}
      {status === STATUS.IDLE && (
        <button onClick={checkUpdates}
          className="w-full py-4 bg-white border border-gray-200 rounded-2xl text-gray-600 text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98]">
          Controleer op updates
        </button>
      )}

      {/* Status: CHECKING */}
      {status === STATUS.CHECKING && (
        <div className="flex items-center justify-center gap-3 py-6 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          Controleren…
        </div>
      )}

      {/* Status: UP TO DATE */}
      {status === STATUS.UP_TO_DATE && (
        <div className="text-center py-4 space-y-1">
          <p className="text-gray-700 font-medium text-sm">MIXMATE OS is up‑to‑date</p>
          <p className="text-gray-400 text-xs">Je hebt de nieuwste versie</p>
          <button onClick={() => setStatus(STATUS.IDLE)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Opnieuw controleren
          </button>
        </div>
      )}

      {/* Status: AVAILABLE */}
      {status === STATUS.AVAILABLE && (
        <div className="space-y-3">
          {/* Changelog */}
          {changelog.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-gray-700 font-semibold text-sm">Wat is er nieuw?</p>
              </div>
              <div className="divide-y divide-gray-50">
                {changelog.slice(0, 1).map((entry, i) => (
                  <div key={i} className="px-5 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                        v{entry.version}
                      </span>
                      {entry.date && (
                        <span className="text-gray-400 text-xs">{entry.date}</span>
                      )}
                    </div>
                    {Object.entries(entry.sections).map(([section, items]) => items.length > 0 && (
                      <div key={section}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          section === 'Nieuw'     ? 'text-green-600' :
                          section === 'Verbeterd' ? 'text-blue-600'  :
                          section === 'Gefixt'    ? 'text-orange-500' :
                          'text-gray-500'
                        }`}>
                          {section === 'Nieuw' ? '✦ ' : section === 'Verbeterd' ? '↑ ' : section === 'Gefixt' ? '✓ ' : ''}{section}
                        </p>
                        <ul className="space-y-1">
                          {items.map((item, j) => (
                            <li key={j} className="text-gray-600 text-xs flex items-start gap-2">
                              <span className="text-gray-300 mt-0.5 shrink-0">—</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compatibiliteitswaarschuwing */}
          {!compatible && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-red-500 text-lg shrink-0">⚠</span>
              <div>
                <p className="text-red-800 font-semibold text-sm">Niet compatibel met dit model</p>
                <p className="text-red-600 text-xs mt-1">{compatMsg || 'Deze update is niet beschikbaar voor het huidige machine model.'}</p>
              </div>
            </div>
          )}

          {/* Install knop */}
          <div className={`rounded-2xl p-5 space-y-4 ${compatible ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-200'}`}>
            <div>
              <p className={`font-semibold text-sm ${compatible ? 'text-blue-900' : 'text-gray-500'}`}>Update beschikbaar</p>
              <p className={`text-xs mt-1 ${compatible ? 'text-blue-600' : 'text-gray-400'}`}>
                {compatible ? 'De update duurt ongeveer 2 minuten. De machine herstart automatisch.' : 'Neem contact op met MIXMATE voor meer informatie.'}
              </p>
            </div>
            <button onClick={startUpdate} disabled={!compatible}
              className="w-full py-3 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
              Nu installeren
            </button>
          </div>
        </div>
      )}

      {/* Update voortgang */}
      {(isUpdating || status === STATUS.DONE || status === STATUS.ERROR) && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-1">
          {STEPS.map((step, i) => {
            const isDone = completedSteps.includes(i)
            const isActive = currentStepIdx === i
            const isPending = !isDone && !isActive
            return (
              <div key={step.key} className={`flex items-center gap-4 px-2 py-3 rounded-2xl transition-all ${isActive ? 'bg-gray-50' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isDone ? 'bg-green-500' : isActive ? 'bg-[#111]' : 'bg-gray-100'
                }`}>
                  {isDone ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-gray-400 text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <span className={`text-sm transition-all ${
                  isDone ? 'text-gray-400 line-through' : isActive ? 'text-gray-900 font-semibold' : 'text-gray-300'
                }`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Fout */}
      {status === STATUS.ERROR && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 text-sm font-semibold">Update mislukt</p>
          </div>
          <p className="text-red-600 text-xs">{errorMsg}</p>
          <button onClick={() => setShowLogs(s => !s)} className="text-xs text-red-400 hover:text-red-600 transition-colors underline">
            {showLogs ? 'Verberg details' : 'Toon details'}
          </button>
          <button onClick={() => { setStatus(STATUS.IDLE); setLogs([]) }} className="block text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Opnieuw proberen
          </button>
        </div>
      )}

      {/* Log details (tonen bij fout of op verzoek) */}
      {logs.length > 0 && showLogs && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-white/50 text-xs font-mono">Update log</span>
            <button onClick={() => setShowLogs(false)} className="text-white/30 text-xs hover:text-white/60">✕</button>
          </div>
          <div className="h-48 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className={
                log.type === 'step'  ? 'text-white/80 font-semibold mt-2 first:mt-0' :
                log.type === 'done'  ? 'text-green-400 mt-1 font-semibold' :
                log.type === 'error' ? 'text-red-400 font-medium' :
                'text-white/50'
              }>
                {log.type === 'step' && <span className="text-white/30 mr-2">›</span>}
                {log.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Toon log knop ook tijdens updaten */}
      {isUpdating && logs.length > 0 && (
        <button onClick={() => setShowLogs(s => !s)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors w-full text-center">
          {showLogs ? '↑ Verberg log' : '↓ Toon log'}
        </button>
      )}

      {/* Klaar */}
      {status === STATUS.DONE && (
        <div className="text-center space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-gray-800 font-semibold">Update voltooid</p>
            <p className="text-gray-400 text-sm mt-1">Machine herstart… pagina laadt automatisch opnieuw.</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="w-full py-3.5 rounded-2xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] transition-all">
            Nu herladen
          </button>
        </div>
      )}
    </div>
  )
}
