import { useEffect } from 'react'

/**
 * DragScrollProvider — globale drag-to-scroll voor Pi touchscreen.
 * Voegt één event listener toe aan het document. Wanneer je drukt en sleept,
 * zoekt het automatisch de dichtstbijzijnde scrollbare ancestor en scrollt die.
 * Onderscheidt een swipe (> 6px beweging) van een tik (klik).
 */
export function DragScrollProvider({ children }) {
  useEffect(() => {
    let scrollEl = null
    let startY = 0
    let startScroll = 0
    let didScroll = false

    function findScrollable(el) {
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el)
        const overflow = style.overflowY
        const canScroll = overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
        if (canScroll && el.scrollHeight > el.clientHeight + 2) return el
        el = el.parentElement
      }
      return null
    }

    function getClientY(e) {
      return e.touches ? e.touches[0]?.clientY ?? 0 : e.clientY
    }

    function onDown(e) {
      didScroll = false
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      if (e.target.closest('button, a, [role="button"]')) return
      scrollEl = findScrollable(e.target)
      if (!scrollEl) return
      startY = getClientY(e)
      startScroll = scrollEl.scrollTop
    }

    function onMove(e) {
      if (!scrollEl) return
      const dy = getClientY(e) - startY
      if (Math.abs(dy) > 6) {
        didScroll = true
        scrollEl.scrollTop = startScroll - dy
        e.preventDefault()
        e.stopPropagation()
      }
    }

    function onUp() {
      scrollEl = null
    }

    window.__dragScrollDidScroll = () => didScroll

    // Mouse events (Pi met touchscreen-emulatie als muis)
    document.addEventListener('mousedown', onDown, { passive: true })
    document.addEventListener('mousemove', onMove, { passive: false })
    document.addEventListener('mouseup', onUp, { passive: true })

    // Touch events (echte touchscreens)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp, { passive: true })

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
      delete window.__dragScrollDidScroll
    }
  }, [])

  return children
}
