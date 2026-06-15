import React from 'react'

export default function ConfirmDialog({ title, message, confirmLabel = 'Verwijderen', confirmDanger = true, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px 20px',
        maxWidth: 320, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        {title && <p style={{ fontWeight: 600, fontSize: 16, color: '#111', marginBottom: 8 }}>{title}</p>}
        {message && <p style={{ fontSize: 14, color: '#636366', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onConfirm} style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            background: confirmDanger ? '#ff3b30' : '#111',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            {confirmLabel}
          </button>
          <button onClick={onCancel} style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            background: '#f2f2f7', color: '#111', fontSize: 15, fontWeight: 400, cursor: 'pointer',
          }}>
            Annuleer
          </button>
        </div>
      </div>
    </div>
  )
}
