import React, { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import AdminPumpsSimple from './AdminPumpsSimple'
import AdminRecipes from './AdminRecipes'
import AdminIngredients from './AdminIngredients'
import AdminCategories from './AdminCategories'
import AdminGlasses from './AdminGlasses'
import PumpCalibrationWizard from './PumpCalibrationWizard'
import AppUpdate from './AppUpdate'
import WifiSetup from './WifiSetup'
import CloudPairing from './CloudPairing'

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

// ── Componenten ───────────────────────────────────────────────────────────────

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

function SubPageHeader({ label, onBack }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontSize: 16 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        Instellingen
      </button>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#111', marginLeft: 4 }}>{label}</span>
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

// ── Hoofdpagina ───────────────────────────────────────────────────────────────

export default function Instellingen() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const isRoot    = location.pathname === '/instellingen' || location.pathname === '/instellingen/'
  const [confirm,    setConfirm]   = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  async function doRestart() {
    setActionBusy(true)
    await fetch('/api/system/restart', { method: 'POST' }).catch(() => {})
    setActionBusy(false)
    setConfirm(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {isRoot ? (
        <div style={{ background: '#f2f2f7', flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 24, paddingLeft: 4 }}>Instellingen</h1>

          <Section title="Verbinding">
            <SettingsRow icon={<IconWifi />}  iconBg="#007aff" label="WiFi instellen"  sublabel="Verbind met een ander netwerk"           onClick={() => navigate('/instellingen/wifi')} />
            <SettingsRow icon={<IconCloud />} iconBg="#5856d6" label="Cloud koppeling" sublabel="Beheer op afstand via het portaal" onClick={() => navigate('/instellingen/koppeling')} last />
          </Section>

          <Section title="Beheer">
            <SettingsRow icon={<IconPumps />}      iconBg="#34c759" label="Pompen"       onClick={() => navigate('/instellingen/pompen')} />
            <SettingsRow icon={<IconCalibrate />}  iconBg="#ff9500" label="Kalibratie"   onClick={() => navigate('/instellingen/kalibratie')} />
            <SettingsRow icon={<IconGlass />}      iconBg="#00c7be" label="Glazen"       onClick={() => navigate('/instellingen/glazen')} />
            <SettingsRow icon={<IconIngredient />} iconBg="#ff2d55" label="Ingrediënten" onClick={() => navigate('/instellingen/ingredienten')} />
            <SettingsRow icon={<IconCategory />}   iconBg="#af52de" label="Categorieën"  onClick={() => navigate('/instellingen/categorieen')} />
            <SettingsRow icon={<IconRecipe />}     iconBg="#ff6b35" label="Recepten"     onClick={() => navigate('/instellingen/recepten')} last />
          </Section>

          <Section title="Systeem">
            <SettingsRow icon={<IconUpdate />}  iconBg="#636366" label="Software update"    sublabel="Controleer op nieuwe versie"      onClick={() => navigate('/instellingen/update')} />
            <SettingsRow icon={<IconRestart />} iconBg="#ff3b30" label="Machine herstarten" sublabel="Duurt ongeveer 30 seconden" onClick={() => setConfirm('restart')} last />
          </Section>
        </div>
      ) : (
        <Routes>
          <Route path="wifi"         element={<SubPage label="WiFi instellen"  onBack={() => navigate('/instellingen')}><WifiSetup    onClose={() => navigate('/instellingen')} /></SubPage>} />
          <Route path="koppeling"    element={<SubPage label="Cloud koppeling" onBack={() => navigate('/instellingen')}><CloudPairing onClose={() => navigate('/instellingen')} /></SubPage>} />
          <Route path="pompen"       element={<SubPage label="Pompen"          onBack={() => navigate('/instellingen')}><AdminPumpsSimple /></SubPage>} />
          <Route path="kalibratie"   element={<SubPage label="Kalibratie"      onBack={() => navigate('/instellingen')}><PumpCalibrationWizard /></SubPage>} />
          <Route path="glazen"       element={<SubPage label="Glazen"          onBack={() => navigate('/instellingen')}><AdminGlasses /></SubPage>} />
          <Route path="ingredienten" element={<SubPage label="Ingrediënten"    onBack={() => navigate('/instellingen')}><AdminIngredients /></SubPage>} />
          <Route path="categorieen"  element={<SubPage label="Categorieën"     onBack={() => navigate('/instellingen')}><AdminCategories /></SubPage>} />
          <Route path="recepten"     element={<SubPage label="Recepten"        onBack={() => navigate('/instellingen')}><AdminRecipes /></SubPage>} />
          <Route path="update"       element={<SubPage label="Software update" onBack={() => navigate('/instellingen')}><AppUpdate /></SubPage>} />
        </Routes>
      )}

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
    </div>
  )
}

function SubPage({ label, onBack, children }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ height: '100%' }}>
      <SubPageHeader label={label} onBack={onBack} />
      <div style={{ flex: 1, overflowY: 'auto', background: '#f2f2f7' }}>
        {children}
      </div>
    </div>
  )
}

function SubPageHeader({ label, onBack }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007aff', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontSize: 16 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        Instellingen
      </button>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#111', marginLeft: 4 }}>{label}</span>
    </div>
  )
}
