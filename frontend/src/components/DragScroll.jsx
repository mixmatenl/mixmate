import { useEffect } from 'react'

/**
 * DragScrollProvider — detecteert alleen of een touch een scroll was of een tik.
 * Scrolling zelf wordt volledig door de browser afgehandeld (native, 60fps).
 * window.__dragScrollDidScroll() geeft true terug als de vinger > 8px bewoog.
 */
export function DragScrollProvider({ children }) {
  useEffect(() => {
    let startY = 0
    let didScroll = false
    let lastScrollTime = 0

    function onStart(e) {
      didScroll = false
      startY = e.touches ? e.touches[0]?.clientY ?? 0 : e.clientY
    }

    function onMove(e) {
      const dy = Math.abs((e.touches ? e.touches[0]?.clientY ?? 0 : e.clientY) - startY)
      if (dy > 8) {
        didScroll = true
        lastScrollTime = Date.now()
      }
    }

    window.__dragScrollDidScroll = () => didScroll || (Date.now() - lastScrollTime < 300)

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove,  { passive: true })
    document.addEventListener('mousedown', onStart, { passive: true })
    document.addEventListener('mousemove', onMove,  { passive: true })

    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',  onMove)
      document.removeEventListener('mousedown',  onStart)
      document.removeEventListener('mousemove',  onMove)
      delete window.__dragScrollDidScroll
    }
  }, [])

  return children
}
