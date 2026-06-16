import { useEffect } from 'react'

/**
 * DragScrollProvider — bijhoudt of de laatste touch een scroll was of een tik.
 * Drempel 20px zodat kleine vingerbewegingen niet als scroll tellen.
 * Cooldown 80ms (was 300ms) zodat taps na scrollen niet geblokkeerd worden.
 */
export function DragScrollProvider({ children }) {
  useEffect(() => {
    let startX = 0
    let startY = 0
    let didScroll = false
    let lastScrollTime = 0

    function onStart(e) {
      didScroll = false
      const t = e.touches?.[0] ?? e
      startX = t.clientX
      startY = t.clientY
    }

    function onMove(e) {
      const t = e.touches?.[0] ?? e
      const dx = Math.abs(t.clientX - startX)
      const dy = Math.abs(t.clientY - startY)
      if (dx > 20 || dy > 20) {
        didScroll = true
        lastScrollTime = Date.now()
      }
    }

    window.__dragScrollDidScroll = () => didScroll || (Date.now() - lastScrollTime < 80)

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove',  onMove,  { passive: true })

    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',  onMove)
      delete window.__dragScrollDidScroll
    }
  }, [])

  return children
}
