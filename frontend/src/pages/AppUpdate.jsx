import React, { useState, useEffect, useRef } from 'react'

const STATUS = { IDLE: 'idle', CHECKING: 'checking', UP_TO_DATE: 'uptodate', AVAILABLE: 'available', UPDATING: 'updating', DONE: 'done', ERROR: 'error' }

const STEPS = [
  { key: 'git',      label: 'Nieuwe versie ophalen',     icon: '↓' },
  { key: 'pip',      label: 'Software bijwerken',         icon: '⚙' },
  { key: 'npm',      label: 'Interface bijwerken',        icon: '✦' },
  { key: 'build',    label: 'Interface voorbereiden',     icon: '◈' },
  { key: 'restart',  label: 'Machine herstarten',         icon: '↺' },
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
  const [currentStepIdx, setCurrentStepIdx] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const wsRef = useRef(null)

  useEffect(() => {
    fetch('/api/system/version').then(r => r.json()).then(setVersionInfo).catch(() => {})
  }, [])

  function checkUpdates() {
    setStatus(STATUS.CHECKING)
    fetch('/api/system/check-updates')
      .then(r => r.json())
      .then(d => setStatus(d.updates_available ? STATUS.AVAILABLE : STATUS.UP_TO_DATE))
      .catch(() => setStatus(STATUS.IDLE))
  }

  function startUpdate() {
    setStatus(STATUS.UPDATING)
    setCurrentStepIdx(0)
    setCompletedSteps([])
    setErrorMsg('')

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    const port = import.meta.env.DEV ? '8000' : (window.location.port || '80')
    const ws = new WebSocket(`${proto}://${host}:${port}/ws/system/update`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'step') {
        const idx = stepIndexFromLabel(msg.label)
        if (idx >= 0) {
          setCurrentStepIdx(idx)
          setCompletedSteps(prev => {
            const newCompleted = []
            for (let i = 0; i < idx; i++) newCompleted.push(i)
            return newCompleted
          })
        }
      } else if (msg.type === 'done') {
        setCompletedSteps([0,1,2,3,4])
        setCurrentStepIdx(-1)
        setStatus(STATUS.DONE)
        fetch('/api/system/version').then(r => r.json()).then(setVersionInfo).catch(() => {})
      } else if (msg.type === 'error') {
        setStatus(STATUS.ERROR)
        setErrorMsg(msg.message)
      }
    }
    ws.onerror = () => { setStatus(STATUS.ERROR); setErrorMsg('Verbinding verbroken') }
  }

  const isUpdating = status === STATUS.UPDATING

  return (
    <div className="space-y-8 max-w-md">

      {/* Versie kaart */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {/* App icoon */}
          <div className="w-16 h-16 rounded-2xl bg-[#111] flex items-center justify-center shrink-0 shadow-lg">
            <svg width="32" height="42" viewBox="0 0 120 160" fill="none">
              <rect x="45" y="8" width="30" height="14" rx="7" stroke="white" strokeWidth="5" fill="none"/>
              <path d="M35 28 Q35 22 45 22 L75 22 Q85 22 85 28 L85 38 Q85 44 75 44 L45 44 Q35 44 35 38 Z" stroke="white" strokeWidth="5" fill="none"/>
              <path d="M40 44 L30 130 Q30 138 40 138 L80 138 Q90 138 90 130 L80 44 Z" stroke="white" strokeWidth="5" fill="none"/>
              <path d="M94 50 Q108 60 104 75 Q100 90 94 95" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-bold text-lg">Mixmate</p>
            <p className="text-gray-400 text-sm">
              {versionInfo ? `Versie ${versionInfo.commit}` : 'Versie laden…'}
            </p>
            {versionInfo?.date && <p className="text-gray-300 text-xs mt-0.5">{versionInfo.date}</p>}
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

      {/* Status berichten */}
      {status === STATUS.IDLE && (
        <button onClick={checkUpdates}
          className="w-full py-4 bg-white border border-gray-200 rounded-2xl text-gray-600 text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98]">
          Controleer op updates
        </button>
      )}

      {status === STATUS.CHECKING && (
        <div className="flex items-center justify-center gap-3 py-6 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          Controleren…
        </div>
      )}

      {status === STATUS.UP_TO_DATE && (
        <div className="text-center py-4 space-y-1">
          <p className="text-gray-700 font-medium text-sm">Mixmate is up‑to‑date</p>
          <p className="text-gray-400 text-xs">Je hebt de nieuwste versie</p>
          <button onClick={() => setStatus(STATUS.IDLE)} className="mt-3 text-xs text-gray-300 hover:text-gray-500 transition-colors">
            Opnieuw controleren
          </button>
        </div>
      )}

      {status === STATUS.AVAILABLE && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-blue-900 font-semibold text-sm">Update beschikbaar</p>
            <p className="text-blue-600 text-xs mt-1">Er is een nieuwe versie van Mixmate beschikbaar. De update duurt ongeveer 1 minuut.</p>
          </div>
          <button onClick={startUpdate}
            className="w-full py-3 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all active:scale-[0.98]">
            Nu installeren
          </button>
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
                {/* Icoon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isDone ? 'bg-green-500' :
                  isActive ? 'bg-[#111]' :
                  'bg-gray-100'
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
                {/* Label */}
                <span className={`text-sm transition-all ${
                  isDone ? 'text-gray-400 line-through' :
                  isActive ? 'text-gray-900 font-semibold' :
                  'text-gray-300'
                }`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
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
            <p className="text-gray-400 text-sm mt-1">Mixmate is bijgewerkt naar de nieuwste versie</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="w-full py-3.5 rounded-2xl bg-[#111] text-white text-sm font-bold hover:bg-[#333] transition-all">
            Opnieuw laden
          </button>
        </div>
      )}

      {/* Fout */}
      {status === STATUS.ERROR && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-3">
          <p className="text-red-700 text-sm font-medium">Update mislukt</p>
          <p className="text-red-500 text-xs">{errorMsg}</p>
          <button onClick={() => setStatus(STATUS.IDLE)}
            className="text-xs text-red-400 hover:text-red-600 transition-colors">
            Opnieuw proberen
          </button>
        </div>
      )}
    </div>
  )
}
