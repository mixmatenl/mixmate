import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import ConfirmDialog from '../components/ConfirmDialog'

function gradientFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff
  return `linear-gradient(135deg, hsl(${h % 360},55%,38%), hsl(${(h + 40) % 360},65%,52%))`
}

function Avatar({ ing, size = 52 }) {
  const r = Math.round(size * 0.26)
  if (ing.image_url) {
    return (
      <img
        src={ing.image_url}
        alt={ing.name}
        style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', flexShrink: 0, display: 'block' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: r, flexShrink: 0,
      background: gradientFor(ing.name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-1px', userSelect: 'none' }}>
        {ing.name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  )
}

function IngredientRow({ ing, categories = [], onUpdated, onDelete }) {
  const fileInputId = `img-upload-${ing.id}`
  const [uploading, setUploading] = useState(false)
  const [editing,    setEditing]    = useState(false)
  const [editName,   setEditName]   = useState(ing.name)
  const [editCatId,  setEditCatId]  = useState(ing.ingredient_category_id ?? '')
  const [uploadErr,  setUploadErr]  = useState(null)
  const [confirm, setConfirm]     = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr(null)
    try {
      // Resize + compress client-side
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = reject
        reader.onload = ev => {
          const img = new Image()
          img.onerror = reject
          img.onload = () => {
            const MAX = 600
            let w = img.width, h = img.height
            if (w > MAX || h > MAX) {
              if (w > h) { h = Math.round(h * MAX / w); w = MAX }
              else { w = Math.round(w * MAX / h); h = MAX }
            }
            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/jpeg', 0.82))
          }
          img.src = ev.target.result
        }
        reader.readAsDataURL(file)
      })
      const blob     = await fetch(dataUrl).then(r => r.blob())
      const formFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
      const updated  = await api.uploadIngredientImage(ing.id, formFile)
      onUpdated(updated)
    } catch (err) {
      setUploadErr('Upload mislukt')
    }
    setUploading(false)
    e.target.value = ''
  }

  async function saveName() {
    const catChanged = (editCatId ? Number(editCatId) : null) !== (ing.ingredient_category_id ?? null)
    if (!editName.trim() && !catChanged) { setEditing(false); return }
    try {
      const updated = await api.updateIngredient(ing.id, {
        name: editName.trim() || ing.name,
        ingredient_category_id: editCatId ? Number(editCatId) : null,
      })
      onUpdated(updated)
    } catch { /* silent */ }
    setEditing(false)
  }

  async function removeImage() {
    try {
      const updated = await api.updateIngredient(ing.id, { image_url: '' })
      onUpdated(updated)
    } catch { /* silent */ }
  }

  return (
    <>
      {confirm && (
        <ConfirmDialog
          title="Ingrediënt verwijderen?"
          message={`"${ing.name}" wordt ook ontkoppeld van pompen en recepten.`}
          confirmLabel="Verwijderen"
          onConfirm={() => onDelete(ing.id)}
          onCancel={() => setConfirm(false)}
        />
      )}

      <div style={{
        background: '#fff', border: '1px solid #e5e5ea', borderRadius: 14,
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
      }}>

        {/* Avatar + foto-upload via label (werkt altijd op touchscreen) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <label
            htmlFor={fileInputId}
            style={{ cursor: uploading ? 'wait' : 'pointer', position: 'relative', display: 'block' }}
          >
            <Avatar ing={ing} size={52} />
            {/* Camera-badge */}
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              width: 20, height: 20, borderRadius: 10,
              background: '#1d1d1f', border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {uploading
                ? <span style={{ color: '#fff', fontSize: 9 }}>…</span>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
              }
            </div>
          </label>

          {/* Foto verwijderen */}
          {ing.image_url && (
            <button
              type="button"
              onClick={removeImage}
              style={{ fontSize: 10, color: '#aeaeb2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              ✕ foto
            </button>
          )}
          {uploadErr && (
            <span style={{ fontSize: 10, color: '#ff3b30' }}>{uploadErr}</span>
          )}
        </div>

        {/* Verborgen file input */}
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />

        {/* Naam */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false) }}
                  autoFocus
                  style={{ flex: 1, border: '1px solid #007aff', borderRadius: 8, padding: '7px 10px', fontSize: 14, color: '#1d1d1f', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                />
                <button type="button" onClick={saveName} style={{ padding: '7px 12px', background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                <button type="button" onClick={() => setEditing(false)} style={{ padding: '7px 10px', background: '#f2f2f7', color: '#3a3a3c', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
              </div>
              {categories.length > 0 && (
                <select value={editCatId} onChange={e => setEditCatId(e.target.value)} style={{ border: '1px solid #e5e5ea', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#1d1d1f', background: '#f9f9f9', fontFamily: 'inherit' }}>
                  <option value="">— Geen categorie —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          ) : (
            <div
              onClick={() => { setEditing(true); setEditName(ing.name) }}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{ing.name}</div>
              {(ing.is_carbonated || ing.ingredient_category_name) && (
                <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>
                  {[ing.ingredient_category_name, ing.is_carbonated ? 'CO₂ / valve' : null].filter(Boolean).join(' · ')}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#c7c7cc', marginTop: 1 }}>Tik om naam te wijzigen</div>
            </div>
          )}
        </div>

        {/* Verwijder */}
        {!editing && (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, borderRadius: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d1d6" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        )}
      </div>
    </>
  )
}

const inp = {
  border: '1px solid #e5e5ea', borderRadius: 10, padding: '10px 14px',
  fontSize: 14, color: '#1d1d1f', background: '#f9f9f9', outline: 'none', fontFamily: 'inherit',
}

function Toggle({ value, onChange, label }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ width: 38, height: 22, borderRadius: 11, flexShrink: 0, background: value ? '#1d1d1f' : '#e5e5ea', position: 'relative', transition: 'background .18s' }}>
        <div style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: 9, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'transform .18s', transform: value ? 'translateX(18px)' : 'translateX(2px)' }} />
      </div>
      <span style={{ fontSize: 14, color: '#3a3a3c' }}>{label}</span>
    </div>
  )
}

export default function AdminIngredients() {
  const [ingredients,    setIngredients]    = useState([])
  const [categories,     setCategories]     = useState([])
  const [tab,            setTab]            = useState('ingredienten')

  // Nieuw ingrediënt
  const [name,           setName]           = useState('')
  const [isCarbonated,   setIsCarbonated]   = useState(false)
  const [catId,          setCatId]          = useState('')
  const [loading,        setLoading]        = useState(false)

  // Categoriebeheer
  const [catName,        setCatName]        = useState('')
  const [catEditing,     setCatEditing]     = useState(null)
  const [catLoading,     setCatLoading]     = useState(false)

  useEffect(() => {
    api.getIngredients().then(setIngredients).catch(() => {})
    api.getIngredientCategories().then(setCategories).catch(() => {})
  }, [])

  function updateLocal(updated) {
    setIngredients(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function removeLocal(id) {
    setIngredients(prev => prev.filter(i => i.id !== id))
    api.deleteIngredient(id).catch(() => {})
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const ing = await api.createIngredient({ name: name.trim(), is_carbonated: isCarbonated, ingredient_category_id: catId ? Number(catId) : null })
      setIngredients(prev => [...prev, ing])
      setName(''); setIsCarbonated(false); setCatId('')
    } catch { /* silent */ }
    setLoading(false)
  }

  async function handleCatSave(e) {
    e.preventDefault(); setCatLoading(true)
    try {
      if (catEditing) {
        const updated = await api.updateIngredientCategory(catEditing.id, { name: catName })
        setCategories(prev => prev.map(c => c.id === catEditing.id ? updated : c))
        setCatEditing(null)
      } else {
        const created = await api.createIngredientCategory({ name: catName })
        setCategories(prev => [...prev, created])
      }
      setCatName('')
    } catch { /* silent */ }
    setCatLoading(false)
  }

  async function handleCatDelete(cat) {
    await api.deleteIngredientCategory(cat.id).catch(() => {})
    setCategories(prev => prev.filter(c => c.id !== cat.id))
    setIngredients(prev => prev.map(i => i.ingredient_category_id === cat.id ? { ...i, ingredient_category_id: null, ingredient_category_name: null } : i))
  }

  const tabs = [
    { key: 'ingredienten', label: 'Ingrediënten' },
    { key: 'categorieen',  label: 'Categorieën'  },
  ]

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 20, border: '1.5px solid',
            borderColor: tab === t.key ? '#1d1d1f' : '#e5e5ea',
            background: tab === t.key ? '#1d1d1f' : '#fff',
            color: tab === t.key ? '#fff' : '#6e6e73',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'ingredienten' && (
        <>
          {/* Nieuw ingrediënt */}
          <form onSubmit={handleAdd} style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Nieuw ingrediënt</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Naam (bijv. Wodka, Cola…)" style={{ ...inp, flex: 1 }} />
              <button type="submit" disabled={loading || !name.trim()} style={{ padding: '10px 18px', background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading || !name.trim() ? 0.4 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Toevoegen</button>
            </div>
            {categories.length > 0 && (
              <select value={catId} onChange={e => setCatId(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 10, paddingRight: 14 }}>
                <option value="">— Geen categorie —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <Toggle value={isCarbonated} onChange={setIsCarbonated} label="Koolzuurhoudend (valve)" />
          </form>

          {/* Lijst */}
          {ingredients.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 14, padding: 32 }}>Nog geen ingrediënten. Voeg er een toe.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ingredients.map(ing => (
                <IngredientRow key={ing.id} ing={ing} categories={categories} onUpdated={updateLocal} onDelete={removeLocal} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'categorieen' && (
        <>
          <form onSubmit={handleCatSave} style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{catEditing ? 'Categorie bewerken' : 'Nieuwe categorie'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Bijv. Sterke drank, Sappen, Siropen" style={{ ...inp, flex: 1 }} />
              <button type="submit" disabled={catLoading || !catName.trim()} style={{ padding: '10px 18px', background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: catLoading || !catName.trim() ? 0.4 : 1, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{catEditing ? 'Opslaan' : 'Toevoegen'}</button>
              {catEditing && <button type="button" onClick={() => { setCatEditing(null); setCatName('') }} style={{ padding: '10px 14px', background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>}
            </div>
          </form>

          {categories.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aeaeb2', fontSize: 14, padding: 32 }}>Nog geen categorieën. Voeg bijv. "Sterke drank", "Sappen" of "Siropen" toe.</p>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e5ea', borderRadius: 16, overflow: 'hidden' }}>
              {categories.map((cat, i) => (
                <div key={cat.id} style={{ padding: '14px 16px', borderBottom: i < categories.length - 1 ? '1px solid #f2f2f7' : 'none', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{cat.name}</div>
                    <div style={{ fontSize: 11, color: '#aeaeb2', marginTop: 2 }}>
                      {ingredients.filter(i => i.ingredient_category_id === cat.id).length} ingrediënten
                    </div>
                  </div>
                  <button type="button" onClick={() => { setCatEditing(cat); setCatName(cat.name) }} style={{ fontSize: 13, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginRight: 14 }}>Bewerk</button>
                  <button type="button" onClick={() => handleCatDelete(cat)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Verwijder</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
