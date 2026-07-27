import React, { useEffect, useState } from 'react'
import { api } from '../api'

function gradientFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff
  const hue = h % 360
  return `linear-gradient(160deg, hsl(${hue},55%,30%), hsl(${(hue+50)%360},70%,48%))`
}

function PumpCard({ pump, ingredients, onAssign, saving }) {
  const [open, setOpen] = useState(false)
  const ing = ingredients.find(i => i.id === pump.ingredient_id)

  function select(ingId) {
    onAssign(pump.id, ingId)
    setOpen(false)
  }

  return (
    <div style={{
      position: 'relative',
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      background: '#fff',
    }}>
      {/* Achtergrond — afbeelding of kleurgradiënt */}
      <div style={{ position: 'relative', height: 130 }}>
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
        )}
        {/* Donker overlay onderaan */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
        }} />

        {/* Slot-badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          borderRadius: 20, padding: '3px 10px',
          fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)',
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>
          Pomp {pump.slot}
        </div>

        {/* Status-dot */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 8, height: 8, borderRadius: 4,
          background: ing ? '#30d158' : '#636366',
          boxShadow: ing ? '0 0 0 2px rgba(48,209,88,0.3)' : 'none',
        }} />

        {/* Naam op de afbeelding */}
        <div style={{
          position: 'absolute', bottom: 10, left: 12, right: 12,
        }}>
          {ing ? (
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {ing.name}
              {ing.is_carbonated && (
                <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginLeft: 6 }}>CO₂</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              Leeg — tik om te koppelen
            </div>
          )}
        </div>
      </div>

      {/* Knop onderaan */}
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        style={{
          width: '100%', padding: '11px 16px',
          background: 'none', border: 'none', borderTop: '1px solid #f2f2f7',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 13, color: '#3a3a3c', fontWeight: 500 }}>
          {saving ? 'Opslaan…' : ing ? 'Ingrediënt wijzigen' : 'Ingrediënt koppelen'}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#c7c7cc" strokeWidth="2.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% - 50px)', left: 0, right: 0, zIndex: 20,
          background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1 }}>
            Pomp {pump.slot} — kies ingrediënt
          </div>
          <button
            onClick={() => select(null)}
            style={{
              width: '100%', padding: '10px 16px', background: pump.ingredient_id == null ? '#f2f2f7' : 'none',
              border: 'none', borderTop: '1px solid #f2f2f7', textAlign: 'left',
              fontSize: 14, color: '#636366', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#f2f2f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aeaeb2" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </div>
            Leeg
          </button>
          {ingredients.map(i => (
            <button
              key={i.id}
              onClick={() => select(i.id)}
              style={{
                width: '100%', padding: '10px 16px',
                background: pump.ingredient_id === i.id ? '#f2f2f7' : 'none',
                border: 'none', borderTop: '1px solid #f9f9f9', textAlign: 'left',
                fontSize: 14, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              {/* Mini-afbeelding in dropdown */}
              <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                {i.image_url ? (
                  <img src={i.image_url} alt={i.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: gradientFor(i.name), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{i.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontWeight: pump.ingredient_id === i.id ? 600 : 400 }}>{i.name}</div>
                {i.is_carbonated && <div style={{ fontSize: 11, color: '#aeaeb2' }}>CO₂</div>}
              </div>
              {pump.ingredient_id === i.id && (
                <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPumpsSimple() {
  const [pumps, setPumps]           = useState([])
  const [ingredients, setIngredients] = useState([])
  const [saving, setSaving]         = useState(null)

  function load() {
    Promise.all([api.getPumpsSimple(), api.getIngredients()])
      .then(([p, i]) => { setPumps(p); setIngredients(i) })
  }
  useEffect(load, [])

  async function assign(pumpId, ingredientId) {
    setSaving(pumpId)
    try {
      await api.assignIngredient(pumpId, ingredientId === '' ? null : ingredientId)
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
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f' }}>Pompkoppeling</div>
          <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>
            {filled} van {sorted.length} pompen gekoppeld
          </div>
        </div>
        <div style={{
          display: 'flex', gap: 2, alignItems: 'center',
        }}>
          {sorted.map(p => (
            <div key={p.id} style={{
              width: 8, height: 8, borderRadius: 4,
              background: p.ingredient_id ? '#30d158' : '#e5e5ea',
            }} />
          ))}
        </div>
      </div>

      {/* Pompkaarten grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
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
