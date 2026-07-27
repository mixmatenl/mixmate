import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'

function gradientFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff
  const hue = h % 360
  return `linear-gradient(135deg, hsl(${hue},55%,38%), hsl(${(hue+40)%360},65%,52%))`
}

function IngredientImage({ ing, size = 56 }) {
  if (ing.image_url) {
    return (
      <img
        src={ing.image_url}
        alt={ing.name}
        style={{ width: size, height: size, borderRadius: size * 0.28, objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: gradientFor(ing.name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.42, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-1px' }}>
        {ing.name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

function ImagePicker({ ing, onUpdated }) {
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    setLoading(true)
    try {
      const url = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = ev => {
          const img = new Image()
          img.onload = () => {
            const MAX = 600
            let w = img.width, h = img.height
            if (w > MAX || h > MAX) {
              if (w > h) { h = Math.round(h * MAX / w); w = MAX }
              else { w = Math.round(w * MAX / h); h = MAX }
            }
            const c = document.createElement('canvas')
            c.width = w; c.height = h
            c.getContext('2d').drawImage(img, 0, 0, w, h)
            res(c.toDataURL('image/jpeg', 0.82))
          }
          img.onerror = rej
          img.src = ev.target.result
        }
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const blob = await fetch(url).then(r => r.blob())
      const updated = await api.uploadIngredientImage(ing.id, new File([blob], 'img.jpg', { type: 'image/jpeg' }))
      onUpdated(updated)
    } catch (err) { alert('Upload mislukt: ' + err.message) }
    setLoading(false)
    e.target.value = ''
  }

  async function removeImage() {
    try {
      const updated = await api.updateIngredient(ing.id, { image_url: '' })
      onUpdated(updated)
    } catch (err) { alert('Fout: ' + err.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {/* Afbeelding — altijd zichtbare upload-knop eronder */}
      <div style={{ position: 'relative' }}>
        <IngredientImage ing={ing} size={56} />
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 56 * 0.28,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 11 }}>…</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={() => !loading && fileRef.current?.click()}
          disabled={loading}
          style={{
            fontSize: 11, color: '#007aff', background: 'none', border: 'none',
            cursor: loading ? 'wait' : 'pointer', padding: '2px 6px',
            fontFamily: 'inherit', borderRadius: 6,
          }}
        >
          {ing.image_url ? 'Wijzig' : 'Foto'}
        </button>
        {ing.image_url && (
          <button
            type="button"
            onClick={removeImage}
            style={{
              fontSize: 11, color: '#aeaeb2', background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px 6px', fontFamily: 'inherit', borderRadius: 6,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        data-native-keyboard="true"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}

export default function AdminIngredients() {
  const [ingredients, setIngredients] = useState([])
  const [name, setName]               = useState('')
  const [isCarbonated, setIsCarbonated] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [editId, setEditId]           = useState(null)
  const [editName, setEditName]       = useState('')
  const [confirmId, setConfirmId]     = useState(null)

  function load() { api.getIngredients().then(setIngredients) }
  useEffect(load, [])

  function updateLocal(updated) {
    setIngredients(list => list.map(i => i.id === updated.id ? updated : i))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const ing = await api.createIngredient({ name: name.trim(), is_carbonated: isCarbonated })
      setIngredients(prev => [...prev, ing])
      setName(''); setIsCarbonated(false)
    } catch (err) { alert('Fout: ' + err.message) }
    setLoading(false)
  }

  async function saveEdit(ing) {
    try {
      const updated = await api.updateIngredient(ing.id, { name: editName.trim() })
      updateLocal(updated)
      setEditId(null)
    } catch (err) { alert('Fout: ' + err.message) }
  }

  async function handleDelete(id) {
    try { await api.deleteIngredient(id); setIngredients(l => l.filter(i => i.id !== id)) }
    catch (err) { alert('Fout: ' + err.message) }
    setConfirmId(null)
  }

  const inp = {
    border: '1px solid #e5e5ea', borderRadius: 12, padding: '10px 14px',
    fontSize: 14, color: '#1d1d1f', background: '#f9f9f9',
    outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {confirmId && (
        <ConfirmDialog
          title="Ingrediënt verwijderen?"
          message="Dit verwijdert ook de koppeling met pompen en recepten."
          confirmLabel="Verwijderen"
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* Nieuw ingrediënt */}
      <form onSubmit={handleAdd} style={{
        background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16,
        padding: 20, marginBottom: 24,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          Nieuw ingrediënt
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Naam (bijv. Wodka, Cola)"
            style={{ ...inp, flex: 1 }}
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              padding: '10px 20px', background: '#1d1d1f', color: '#fff', border: 'none',
              borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: loading || !name.trim() ? 0.4 : 1, whiteSpace: 'nowrap',
            }}
          >
            Toevoegen
          </button>
        </div>
        <label
          onClick={() => setIsCarbonated(!isCarbonated)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 40, height: 24, borderRadius: 12, background: isCarbonated ? '#1d1d1f' : '#e5e5ea',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 3, width: 18, height: 18, borderRadius: 9,
              background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s',
              transform: isCarbonated ? 'translateX(19px)' : 'translateX(3px)',
            }} />
          </div>
          <span style={{ fontSize: 14, color: '#3a3a3c' }}>Koolzuurhoudend (valve)</span>
        </label>
      </form>

      {/* Ingrediëntenlijst */}
      {ingredients.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 14, padding: '32px 0' }}>
          Nog geen ingrediënten aangemaakt.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {ingredients.map(ing => (
            <div key={ing.id} style={{
              background: '#fff', border: '1px solid #e5e5ea', borderRadius: 14,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <ImagePicker ing={ing} onUpdated={updateLocal} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {editId === ing.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(ing)}
                      style={{ ...inp, flex: 1 }}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(ing)} style={{
                      padding: '10px 14px', background: '#1d1d1f', color: '#fff',
                      border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>OK</button>
                    <button onClick={() => setEditId(null)} style={{
                      padding: '10px 12px', background: '#f2f2f7', color: '#3a3a3c',
                      border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                    }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 }}>{ing.name}</div>
                    {ing.is_carbonated && (
                      <div style={{
                        display: 'inline-block', fontSize: 11, color: '#6e6e73',
                        border: '1px solid #e5e5ea', borderRadius: 20, padding: '1px 8px',
                      }}>koolzuur</div>
                    )}
                  </>
                )}
              </div>

              {editId !== ing.id && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditId(ing.id); setEditName(ing.name) }}
                    style={{ padding: '6px 12px', background: '#f2f2f7', border: 'none', borderRadius: 8, fontSize: 13, color: '#3a3a3c', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Naam
                  </button>
                  <button
                    onClick={() => setConfirmId(ing.id)}
                    style={{ padding: '6px 10px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
