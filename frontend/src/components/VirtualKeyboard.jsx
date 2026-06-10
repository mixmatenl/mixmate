import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

/*
 * VirtualKeyboard — verschijnt onderaan het scherm wanneer een input/textarea
 * focus krijgt. Sluit automatisch als je buiten het veld/toetsenbord klikt.
 *
 * Gebruik: <VirtualKeyboardProvider> om App.jsx heen wrappen.
 * Werkt automatisch voor alle <input> en <textarea> elementen.
 */

const ROWS_LOWER = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['⇧','z','x','c','v','b','n','m','⌫'],
  ['.nl','@','SPATIE','.',',','↵'],
]

const ROWS_UPPER = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['⇧','Z','X','C','V','B','N','M','⌫'],
  ['.nl','@','SPATIE','.',',','↵'],
]

const ROWS_NUM = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['-','/','.',',','?','!','"',"'",'(',')'],
  ['#','%','+','=','<','>','€','£','$','&'],
  ['ABC','SPATIE','⌫','↵'],
]

export function VirtualKeyboard({ target, onClose }) {
  const [caps, setCaps] = useState(false)
  const [numMode, setNumMode] = useState(false)
  const kbRef = useRef(null)

  const rows = numMode ? ROWS_NUM : (caps ? ROWS_UPPER : ROWS_LOWER)

  // Check of het veld numeric is
  useEffect(() => {
    if (target && (target.type === 'number' || target.inputMode === 'numeric' || target.inputMode === 'decimal')) {
      setNumMode(true)
    } else {
      setNumMode(false)
    }
  }, [target])

  function press(key) {
    if (!target) return
    target.focus()

    if (key === '⌫') {
      const start = target.selectionStart
      const end = target.selectionEnd
      if (start === end && start > 0) {
        const val = target.value
        const newVal = val.slice(0, start - 1) + val.slice(end)
        setNativeValue(target, newVal)
        requestAnimationFrame(() => target.setSelectionRange(start - 1, start - 1))
      } else if (start !== end) {
        const val = target.value
        const newVal = val.slice(0, start) + val.slice(end)
        setNativeValue(target, newVal)
        requestAnimationFrame(() => target.setSelectionRange(start, start))
      }
    } else if (key === '↵') {
      if (target.tagName === 'TEXTAREA') {
        insertAt(target, '\n')
      } else {
        // Submit form or move to next field
        const form = target.closest('form')
        if (form) {
          const inputs = Array.from(form.querySelectorAll('input,textarea,select')).filter(el => !el.disabled)
          const idx = inputs.indexOf(target)
          if (idx < inputs.length - 1) {
            inputs[idx + 1].focus()
          } else {
            onClose()
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
          }
        } else {
          onClose()
        }
      }
    } else if (key === 'SPATIE') {
      insertAt(target, ' ')
    } else if (key === '⇧') {
      setCaps(c => !c)
    } else if (key === 'ABC') {
      setNumMode(false)
    } else if (key === '.nl' || key === '@') {
      insertAt(target, key === '.nl' ? '.nl' : '@')
    } else {
      insertAt(target, key)
      // Auto-lowercase after typing a letter in caps mode (single shift)
      if (caps && key.match(/[A-Z]/)) setCaps(false)
    }
  }

  function insertAt(el, text) {
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = el.value
    const newVal = val.slice(0, start) + text + val.slice(end)
    setNativeValue(el, newVal)
    requestAnimationFrame(() => el.setSelectionRange(start + text.length, start + text.length))
  }

  function setNativeValue(el, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value)
    } else {
      el.value = value
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function keyStyle(key) {
    const isWide = key === 'SPATIE'
    const isMed = ['⇧', '⌫', '↵', '.nl', '@', 'ABC'].includes(key)
    const isActive = key === '⇧' && caps

    return {
      flex: isWide ? 3 : isMed ? 1.5 : 1,
      minWidth: 0,
      height: '46px',
      borderRadius: '8px',
      fontSize: key.length > 1 ? '11px' : '16px',
      fontWeight: key.length === 1 ? '500' : '600',
      cursor: 'pointer',
      border: 'none',
      outline: 'none',
      transition: 'background 0.1s',
      background: isActive
        ? 'rgba(255,255,255,0.9)'
        : key.length === 1 || key === 'SPATIE'
          ? 'rgba(255,255,255,0.12)'
          : 'rgba(255,255,255,0.06)',
      color: isActive ? '#000' : 'rgba(255,255,255,0.90)',
    }
  }

  return createPortal(
    <div
      ref={kbRef}
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#1a1a1a',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        padding: '10px 8px 16px',
        zIndex: 99999,
        userSelect: 'none',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.6)',
      }}
      onMouseDown={e => e.preventDefault()} // prevent blur on input
      onTouchStart={e => e.preventDefault()}
    >
      {/* Sluit knop */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
        <button
          onMouseDown={e => { e.preventDefault(); onClose() }}
          onTouchEnd={e => { e.preventDefault(); onClose() }}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
            fontSize: '13px', cursor: 'pointer', padding: '2px 6px',
          }}
        >
          ✕ Sluiten
        </button>
        {!numMode && (
          <button
            onMouseDown={e => { e.preventDefault(); setNumMode(true) }}
            onTouchEnd={e => { e.preventDefault(); setNumMode(true) }}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
              fontSize: '13px', cursor: 'pointer', padding: '2px 8px',
            }}
          >
            123
          </button>
        )}
      </div>

      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: '5px', marginBottom: '5px', justifyContent: 'center' }}>
          {row.map((key, ki) => (
            <button
              key={ki}
              style={keyStyle(key)}
              onMouseDown={e => { e.preventDefault(); press(key) }}
              onTouchEnd={e => { e.preventDefault(); press(key) }}
            >
              {key === 'SPATIE' ? '' : key === '⇧' ? (caps ? '⇪' : '⇧') : key}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body
  )
}

export function VirtualKeyboardProvider({ children }) {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    function onFocus(e) {
      const el = e.target
      if (
        (el.tagName === 'INPUT' && el.type !== 'range' && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'file') ||
        el.tagName === 'TEXTAREA'
      ) {
        // Only show on touch device OR always (for Pi touchscreen)
        setTarget(el)
      }
    }

    function onBlur(e) {
      // Don't close immediately — the keyboard click causes blur before press handler runs
      // Let the keyboard's onMouseDown(preventDefault) handle this
    }

    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('focusin', onFocus)
    }
  }, [])

  return (
    <>
      {children}
      {target && (
        <VirtualKeyboard
          target={target}
          onClose={() => {
            target?.blur()
            setTarget(null)
          }}
        />
      )}
    </>
  )
}
