import React, { useEffect, useState } from 'react'
import { api } from '../api'

function gradientFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff
  const hue = h % 360
  return `linear-gradient(160deg, hsl(${hue},55%,30%), hsl(${(hue + 50) % 360},70%,48%))`
}

function PumpCard({ pump, ingredients, onAssign, saving }) {
  const isValve = pump.pump_type === 'valve'
  const ing = ingredients.find(i => i.id === pump.ingredient_id)
  // Valve-pompen accepteren alleen CO2-ingrediënten; peristaltisch alleen niet-CO2
  const compatible = ingredients.filter(i => isValve ? i.is_carbonated : !i.is_carbonated)

  return (
    <div style={{
      borderRadius: 18,
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Visueel vlak — afbeelding of gradiënt */}
      <div style={{ position: 'relative', height: 120, flexShrink: 0 }}>
        {ing?.image_url ? (
          <img
            src={ing.image_url}
            alt={ing.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : ing ? (
          <div style={{ width: '100%', height: '100%', background: gradientFor(ing.name) }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(160deg, #1c1c1e, #2c2c2e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>
            </svg>
          </div>
        )}

        {/* Donker verloop onderaan */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Slot badge linksboven */}
        <div style={{ position: 'absolute', top: 9, left: 9, display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{
            background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)',
            borderRadius: 20, padding: '3px 9px',
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
            letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            Pomp {pump.slot}
          </div>
          {isValve && (
            <div style={{
              background: 'rgba(0,122,255,0.75)', backdropFilter: 'blur(6px)',
              borderRadius: 20, padding: '3px 8px',
              fontSize: 10, fontWeight: 700, color: '#fff',
              letterSpacing: '0.5px',
            }}>
              CO₂
            </div>
          )}
        </div>

        {/* Status dot rechtsboven */}
        <div style={{
          position: 'absolute', top: 11, right: 11,
          width: 7, height: 7, borderRadius: '50%',
          background: ing ? '#30d158' : '#48484a',
          boxShadow: ing ? '0 0 0 2px rgba(48,209,88,0.28)' : 'none',
        }} />

        {/* Naam onderaan */}
        <div style={{ position: 'absolute', bottom: 9, left: 11, right: 11 }}>
          {ing ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {ing.name}
              {ing.is_carbonated && (
                <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginLeft: 5 }}>CO₂</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Leeg</div>
          )}
        </div>
      </div>

      {/* Select onderaan de kaart — buiten overflow:hidden gebied */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid #f2f2f7' }}>
        <select
          value={pump.ingredient_id ?? ''}
          onChange={e => onAssign(pump.id, e.target.value === '' ? null : parseInt(e.target.value))}
          disabled={saving}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #e5e5ea',
            borderRadius: 10,
            fontSize: 13,
            color: '#1d1d1f',
            background: '#f9f9f9',
            appearance: 'none',
            WebkitAppearance: 'none',
            fontFamily: 'inherit',
            cursor: saving ? 'wait' : 'pointer',
            outline: 'none',
          }}
        >
          <option value="">— Leeg —</option>
          {compatible.map(i => (
            <option key={i.id} value={i.id}>
              {i.name}{i.is_carbonated ? ' (CO₂)' : ''}
            </option>
          ))}
          {compatible.length === 0 && (
            <option disabled value="">
              {isValve ? 'Geen CO₂-ingrediënten beschikbaar' : 'Geen ingrediënten beschikbaar'}
            </option>
          )}
        </select>
      </div>
    </div>
  )
}

export default function AdminPumpsSimple() {
  const [pumps, setPumps]             = useState([])
  const [ingredients, setIngredients] = useState([])
  const [saving, setSaving]           = useState(null)

  function load() {
    Promise.all([api.getPumpsSimple(), api.getIngredients()])
      .then(([p, i]) => { setPumps(p); setIngredients(i) })
  }
  useEffect(load, [])

  async function assign(pumpId, ingredientId) {
    setSaving(pumpId)
    try {
      await api.assignIngredient(pumpId, ingredientId)
      load()
    } catch (err) { alert('Fout: ' + err.message) }
    finally { setSaving(null) }
  }

  if (pumps.length === 0) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16,
        padding: 32, textAlign: 'center',
      }}>
        <p style={{ color: '#aeaeb2', fontSize: 14 }}>Geen pompen geconfigureerd.</p>
        <p style={{ color: '#c7c7cc', fontSize: 12, marginTop: 4 }}>Pompen worden ingesteld door de beheerder via de backoffice.</p>
      </div>
    )
  }

  const sorted = [...pumps].sort((a, b) => a.slot - b.slot)
  const filled = sorted.filter(p => p.ingredient_id).length

  return (
    <div>
      {/* Samenvatting */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Pompkoppeling</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
            {filled} van {sorted.length} pompen gekoppeld
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {sorted.map(p => (
            <div key={p.id} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: p.ingredient_id ? '#30d158' : '#e5e5ea',
            }} />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
      }}>
        {sorted.map(pump => (
          <PumpCard
            key={pump.id}
            pump={pump}
            ingredients={ingredients}
            onAssign={assign}
            saving={saving === pump.id}
          />
        ))}
      </div>
    </div>
  )
}
