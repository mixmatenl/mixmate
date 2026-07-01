import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import AdminPumpsSimple from './AdminPumpsSimple'
import AdminRecipes from './AdminRecipes'
import AdminIngredients from './AdminIngredients'
import AdminCategories from './AdminCategories'
import AdminGlasses from './AdminGlasses'
import PumpCalibrationWizard from './PumpCalibrationWizard'
import AppUpdate from './AppUpdate'
import AdminDemo from './AdminDemo'
import WifiSetup from './WifiSetup'
import CloudPairing from './CloudPairing'
import MachineSpoelen from './MachineSpoelen'

// ── Factory Reset animatiescherm ──────────────────────────────────────────────
const RESET_STEPS = [
  { label: 'Koppeling met portaal verbreken',    duration: 7000  },
  { label: 'Recepten wissen',                    duration: 6000  },
  { label: 'Ingrediënten wissen',                duration: 5500  },
  { label: 'Glazen en categorieën wissen',       duration: 5000  },
  { label: 'Pompinstellingen wissen',            duration: 4500  },
  { label: 'Configuratie en PIN wissen',         duration: 6000  },
  { label: 'Systeem opschonen',                  duration: 7000  },
  { label: 'Machine herstarten',                 duration: 9000  },
]

function FactoryResetScreen() {
  const [stepIndex,  setStepIndex]  = useState(0)
  const [done,       setDone]       = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [countdown,  setCountdown]  = useState(30)

  useEffect(() => {
    let cancelled = false
    const totalMs = RESET_STEPS.reduce((s, x) => s + x.duration, 0)
    let elapsed = 0

    async function run() {
      for (let i = 0; i < RESET_STEPS.length; i++) {
        if (cancelled) return
        setStepIndex(i)
        const stepMs = RESET_STEPS[i].duration
        const tick = 30
        const start = elapsed
        for (let t = 0; t < stepMs; t += tick) {
          if (cancelled) return
          await new Promise(r => setTimeout(r, tick))
          elapsed = start + t
          setProgress(Math.min(99, Math.round((elapsed / totalMs) * 100)))
        }
        elapsed = start + stepMs
      }
      setProgress(100)
      setDone(true)
    }

    run()
    return () => { cancelled = true }
  }, [])

  // Afteltimer + pagina herladen zodra animatie klaar is
  useEffect(() => {
    if (!done) return
    let secs = 30
    const interval = setInterval(() => {
      secs -= 1
      setCountdown(secs)
      if (secs <= 0) {
        clearInterval(interval)
        // Probeer de pagina te herladen — werkt zodra de machine weer online is
        const retry = setInterval(() => {
          fetch('/api/system/info').then(() => {
            clearInterval(retry)
            window.location.reload()
          }).catch(() => {})
        }, 2000)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [done])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#111',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Pulserend icoon */}
      <div style={{
        width: 80, height: 80, borderRadius: 40,
        background: done ? '#1c1c1e' : '#2c1c1c',
        border: `2px solid ${done ? '#30d158' : '#ff3b30'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        animation: done ? 'none' : 'mm-pulse 1.4s ease-in-out infinite',
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          stroke={done ? '#30d158' : '#ff3b30'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {done
            ? <polyline points="20 6 9 17 4 12"/>
            : <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>
          }
        </svg>
      </div>

      {/* Titel */}
      <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {done ? 'Klaar' : 'Terugzetten naar fabrieksinstellingen'}
      </div>
      <div style={{ color: '#636366', fontSize: 13, marginBottom: 40, textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
        {done
          ? countdown > 0
            ? `Machine herstart… pagina laadt opnieuw over ${countdown} seconden.`
            : 'Wachten tot de machine weer online is…'
          : 'Zet de machine niet uit. Dit duurt even.'
        }
      </div>

      {/* Voortgangsbalk */}
      <div style={{ width: 280, background: '#2c2c2e', borderRadius: 8, height: 6, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 8,
          background: done ? '#30d158' : '#ff3b30',
          width: `${progress}%`,
          transition: 'width .12s linear, background .4s',
        }} />
      </div>

      {/* Stappen */}
      <div style={{ width: 280 }}>
        {RESET_STEPS.map((step, i) => {
          const isActive = i === stepIndex && !done
          const isDone   = i < stepIndex || done
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0',
              opacity: isDone ? 1 : isActive ? 1 : 0.3,
              transition: 'opacity .3s',
            }}>
              <div style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isDone ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : isActive ? (
                  <div style={{
                    width: 8, height: 8, borderRadius: 4, background: '#ff3b30',
                    animation: 'mm-blink .8s ease-in-out infinite',
                  }} />
                ) : (
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: '#3a3a3c' }} />
                )}
              </div>
              <div style={{ fontSize: 13, color: isDone ? '#ebebf5' : isActive ? '#fff' : '#636366', fontWeight: isActive ? 600 : 400 }}>
                {step.label}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes mm-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,.4); }
          50%       { box-shadow: 0 0 0 12px rgba(255,59,48,0); }
        }
        @keyframes mm-blink {
          0%, 100% { opacity: 1; } 50% { opacity: .3; }
        }
      `}</style>
    </div>
  )
}

// ── Iconen ────────────────────────────────────────────────────────────────────
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
)
const IconWifi = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>
  </svg>
)
const IconCloud = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>
)
const IconPumps = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2v6m0 0l-3-3m3 3l3-3"/><rect x="5" y="8" width="14" height="13" rx="2"/>
    <path d="M9 21v-5a3 3 0 0 1 6 0v5"/>
  </svg>
)
const IconCalibrate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M20 12h-2M6 12H4m14.66 5.66l-1.41-1.41M6.75 6.75L5.34 5.34M12 20v-2M12 6V4"/>
  </svg>
)
const IconGlass = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M8 2h8l-2 7H10L8 2z"/><path d="M10 9v10"/><path d="M14 9v10"/><path d="M7 19h10"/>
  </svg>
)
const IconIngredient = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/>
  </svg>
)
const IconCategory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IconRecipe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
  </svg>
)
const IconDisplay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)
const IconDemo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)
const IconUpdate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconRestart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
  </svg>
)
const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)
const IconFactory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconSpoelen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 22V12M12 12C12 12 8 9 8 6a4 4 0 0 1 8 0c0 3-4 6-4 6z"/>
    <path d="M8 22h8"/>
  </svg>
)

// ── Hulpcomponenten ───────────────────────────────────────────────────────────

function SettingsRow({ icon, iconBg = '#007aff', label, sublabel, onClick, last }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: '#fff', border: 'none', textAlign: 'left',
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', borderBottom: last ? 'none' : '1px solid #f2f2f7',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: '#111', fontWeight: 400 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 1 }}>{sublabel}</div>}
      </div>
      <IconChevron />
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {title && <div style={{ fontSize: 13, color: '#8e8e93', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, paddingLeft: 4 }}>{title}</div>}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        {children}
      </div>
    </div>
  )
}

function SubPageHeader({ onBack }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontSize: 15 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        Instellingen
      </button>
    </div>
  )
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5, marginBottom: 20 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 15, cursor: 'pointer', color: '#374151' }}>Annuleren</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, background: '#dc2626', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#fff', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Bezig...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Root: overzichtsscherm ────────────────────────────────────────────────────

function SettingsHome() {
  const navigate = useNavigate()
  const [confirm,         setConfirm]         = useState(null)
  const [actionBusy,      setActionBusy]      = useState(false)
  const [factoryResetting, setFactoryResetting] = useState(false)

  async function doRestart() {
    setActionBusy(true)
    await fetch('/api/system/restart', { method: 'POST' }).catch(() => {})
    setActionBusy(false)
    setConfirm(null)
  }

  async function doFactoryReset() {
    setConfirm(null)
    setFactoryResetting(true)
    await fetch('/api/system/factory-reset', { method: 'POST' }).catch(() => {})
  }

  if (factoryResetting) return <FactoryResetScreen />

  return (
    <div style={{ background: '#f2f2f7', flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 24, paddingLeft: 4 }}>Instellingen</h1>

      <Section title="Verbinding">
        <SettingsRow icon={<IconWifi />}  iconBg="#007aff" label="WiFi instellen"  sublabel="Verbind met een ander netwerk"      onClick={() => navigate('/instellingen/wifi')} />
        <SettingsRow icon={<IconCloud />} iconBg="#5856d6" label="Cloud koppeling" sublabel="Beheer op afstand via het portaal"  onClick={() => navigate('/instellingen/koppeling')} last />
      </Section>

      <Section title="Beheer">
        <SettingsRow icon={<IconPumps />}      iconBg="#34c759" label="Pompen"       onClick={() => navigate('/instellingen/pompen')} />
        <SettingsRow icon={<IconSpoelen />}    iconBg="#007aff" label="Spoelroutine" sublabel="Leidingen doorspoelen met water" onClick={() => navigate('/instellingen/spoelen')} />
        <SettingsRow icon={<IconCalibrate />}  iconBg="#ff9500" label="Kalibratie"   onClick={() => navigate('/instellingen/kalibratie')} />
        <SettingsRow icon={<IconGlass />}      iconBg="#00c7be" label="Glazen"       onClick={() => navigate('/instellingen/glazen')} />
        <SettingsRow icon={<IconIngredient />} iconBg="#ff2d55" label="Ingrediënten" onClick={() => navigate('/instellingen/ingredienten')} />
        <SettingsRow icon={<IconCategory />}   iconBg="#af52de" label="Categorieën"  onClick={() => navigate('/instellingen/categorieen')} />
        <SettingsRow icon={<IconRecipe />}     iconBg="#ff6b35" label="Recepten"     onClick={() => navigate('/instellingen/recepten')} last />
      </Section>

      <Section title="Systeem">
        <SettingsRow icon={<IconDemo />}    iconBg="#ff6b35" label="Demo modus"     sublabel="Automatische showcase bij inactiviteit" onClick={() => navigate('/instellingen/demo')} />
        <SettingsRow icon={<IconUpdate />}  iconBg="#636366" label="Software update"    sublabel="Controleer op nieuwe versie" onClick={() => navigate('/instellingen/update')} />
        <SettingsRow icon={<IconInfo />}    iconBg="#8e8e93" label="Over deze machine"  sublabel="Serienummer, netwerk en hardware" onClick={() => navigate('/instellingen/info')} />
        <SettingsRow icon={<IconRestart />} iconBg="#ff9500" label="Machine herstarten" sublabel="Duurt ongeveer 30 seconden"  onClick={() => setConfirm('restart')} />
        <SettingsRow icon={<IconFactory />} iconBg="#ff3b30" label="Fabrieksinstellingen" sublabel="Wist alle data en ontkoppelt de machine" onClick={() => setConfirm('factory')} last />
      </Section>

      {confirm === 'restart' && (
        <ConfirmDialog
          title="Machine herstarten"
          message="De machine start opnieuw op. Dit duurt ongeveer 30 seconden."
          confirmLabel="Herstarten"
          loading={actionBusy}
          onConfirm={doRestart}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === 'factory' && (
        <ConfirmDialog
          title="Fabrieksinstellingen herstellen?"
          message="Alle glazen, ingrediënten, recepten en pompen worden gewist. De machine wordt losgekoppeld van het portaal en het model wordt gewist. Dit kan niet ongedaan worden gemaakt."
          confirmLabel="Alles wissen"
          loading={actionBusy}
          onConfirm={doFactoryReset}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ── Sub-pagina wrapper ────────────────────────────────────────────────────────

function SubPage({ children }) {
  const navigate = useNavigate()
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <SubPageHeader onBack={() => navigate('/instellingen')} />
      <div style={{ flex: 1, overflowY: 'auto', background: '#f2f2f7' }}>
        {children}
      </div>
    </div>
  )
}

// ── Over deze machine ─────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #f2f2f7' }}>
      <span style={{ fontSize: 15, color: '#111' }}>{label}</span>
      <span style={{ fontSize: 15, color: '#8e8e93', fontFamily: label === 'Serienummer' || label === 'MAC-adres' || label === 'IP-adres' ? 'monospace' : 'inherit', letterSpacing: label === 'Serienummer' ? 0.5 : 0 }}>{value || '—'}</span>
    </div>
  )
}

function MachineInfo() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/system/info')
      .then(r => r.json())
      .then(d => { setInfo(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const serial = info?.machine_id?.startsWith('pi-') ? info.machine_id.replace('pi-', '').toUpperCase() : info?.machine_id

  return (
    <div style={{ background: '#f2f2f7', flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', color: '#8e8e93', paddingTop: 40 }}>Laden...</div>
      ) : (
        <>
          <Section title="Identificatie">
            <InfoRow label="Serienummer"  value={serial} />
            <InfoRow label="Hostnaam"     value={info?.hostname} />
            <InfoRow label="Model"        value={info?.model} />
            <div style={{ padding: '11px 16px', borderBottom: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: '#111' }}>Softwareversie</span>
                <span style={{ fontSize: 15, color: '#8e8e93' }}>{info?.version ? `v${info.version}` : '—'}</span>
              </div>
            </div>
          </Section>

          <Section title="Netwerk">
            <InfoRow label="IP-adres"   value={info?.ip_address} />
            <div style={{ padding: '11px 16px', borderBottom: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: '#111' }}>MAC-adres</span>
                <span style={{ fontSize: 15, color: '#8e8e93', fontFamily: 'monospace' }}>{info?.mac_address || '—'}</span>
              </div>
            </div>
          </Section>

          <Section title="Hardware">
            <InfoRow label="Uptime"        value={info?.uptime} />
            <InfoRow label="CPU-temp."     value={info?.cpu_temp != null ? `${info.cpu_temp} °C` : null} />
            <InfoRow label="RAM gebruikt"  value={info?.ram_used && info?.ram_total ? `${info.ram_used} / ${info.ram_total}` : null} />
            <div style={{ padding: '11px 16px', borderBottom: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, color: '#111' }}>Opslag</span>
                <span style={{ fontSize: 15, color: '#8e8e93' }}>
                  {info?.disk_used && info?.disk_total ? `${info.disk_used} / ${info.disk_total} (${info.disk_pct} vol)` : '—'}
                </span>
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

// ── Hoofd export ──────────────────────────────────────────────────────────────

export default function Instellingen() {
  const navigate = useNavigate()
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Routes>
        <Route path="/"            element={<SettingsHome />} />
        <Route path="wifi"         element={<SubPage><WifiSetup    onClose={() => navigate('/instellingen')} /></SubPage>} />
        <Route path="koppeling"    element={<SubPage><CloudPairing onClose={() => navigate('/instellingen')} /></SubPage>} />
        <Route path="pompen"       element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><AdminPumpsSimple /></div></SubPage>} />
        <Route path="spoelen"      element={<SubPage><MachineSpoelen /></SubPage>} />
        <Route path="kalibratie"   element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><PumpCalibrationWizard /></div></SubPage>} />
        <Route path="glazen"       element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><AdminGlasses /></div></SubPage>} />
        <Route path="ingredienten" element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><AdminIngredients /></div></SubPage>} />
        <Route path="categorieen"  element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><AdminCategories /></div></SubPage>} />
        <Route path="recepten"     element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><AdminRecipes /></div></SubPage>} />
        <Route path="update"       element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><AppUpdate /></div></SubPage>} />
        <Route path="demo"         element={<SubPage><div className="max-w-3xl mx-auto px-8 py-8"><AdminDemo /></div></SubPage>} />
        <Route path="info"         element={<SubPage><MachineInfo /></SubPage>} />
      </Routes>
    </div>
  )
}
