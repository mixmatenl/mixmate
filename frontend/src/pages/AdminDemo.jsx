import React, { useState, useEffect, useRef } from 'react'

async function apiPost(path) {
  const r = await fetch(path, { method: 'POST' })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

/* ── Demo attractor overlay ─────────────────────────────────────────────── */
const VOORDELEN = [
  { icon: '🍹', title: 'Tot 32 cocktails', desc: 'Automatisch bereid in enkele seconden' },
  { icon: '⚡', title: 'Bliksemsnel', desc: 'Van bestelling naar glas in 7 seconden' },
  { icon: '📱', title: 'Bedien via de app', desc: 'Kies, pas aan en geniet — zonder wachten' },
  { icon: '🎯', title: 'Altijd perfect', desc: 'Elke cocktail exact hetzelfde recept' },
  { icon: '🔄', title: 'Eindeloos aanpasbaar', desc: 'Eigen recepten, glazen en ingrediënten' },
  { icon: '🎉', title: 'Ideaal voor events', desc: 'Schaalbaar van borrel tot groot festival' },
]

const SLIDE_COLORS = ['#1a0533', '#0d2137', '#1a1a0a', '#2d0a0a', '#0d1f0d', '#001a2d']

function DemoAttractorOverlay({ recipes, onExit }) {
  const [slide, setSlide] = useState(0)
  const [visible, setVisible] = useState(true)
  const [recipeIdx, setRecipeIdx] = useState(0)
  const timerRef = useRef(null)

  // Cycleer door voordelen
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setSlide(s => (s + 1) % VOORDELEN.length)
        setRecipeIdx(i => (i + 1) % Math.max(1, recipes.length))
        setVisible(true)
      }, 300)
    }, 3500)
    return () => clearInterval(timerRef.current)
  }, [recipes.length])

  const v = VOORDELEN[slide]
  const recipe = recipes[recipeIdx]
  const bgColor = SLIDE_COLORS[slide % SLIDE_COLORS.length]

  return (
    <div
      onClick={onExit}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: bgColor,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.8s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Watermark */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22vw', fontWeight: 900, color: 'rgba(255,255,255,0.04)',
        letterSpacing: '-0.04em', pointerEvents: 'none', overflow: 'hidden',
      }}>MIXMATE</div>

      {/* Accent lijn bovenaan */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
      }} />

      {/* Content blok */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 32, padding: '0 40px', maxWidth: 480, width: '100%',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(8px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>
            MIXMATE
          </div>
          <div style={{ fontSize: 12, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
            Cocktailmachine
          </div>
        </div>

        {/* Voordeel kaart */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 24, padding: '32px 40px',
          textAlign: 'center', width: '100%',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>{v.icon}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>{v.title}</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{v.desc}</div>
        </div>

        {/* Huidige cocktail */}
        {recipe && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '14px 20px', width: '100%',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {recipe.image_url
                ? <img src={recipe.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 22 }}>🍹</span>}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{recipe.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {recipe.ingredients?.length || 0} ingrediënten · {recipe.total_volume_ml || '?'}ml
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA onderaan */}
      <div style={{
        position: 'absolute', bottom: 48,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          fontSize: 18, fontWeight: 700, color: '#fff',
          letterSpacing: '0.01em', textAlign: 'center',
        }}>
          Tik op het scherm om de app te proberen
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'rgba(255,255,255,0.4)', fontSize: 13,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34c759', animation: 'pulse 2s ease-in-out infinite' }} />
          Demo modus actief
        </div>
      </div>

      {/* Voortgangsdots */}
      <div style={{ position: 'absolute', bottom: 20, display: 'flex', gap: 5 }}>
        {VOORDELEN.map((_, i) => (
          <div key={i} style={{
            width: i === slide ? 18 : 5, height: 5, borderRadius: 3,
            background: 'rgba(255,255,255,0.4)',
            opacity: i === slide ? 1 : 0.25,
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

const DEMO_KEY     = 'mixmate_demo_enabled'
const DEMO_MIN_KEY = 'mixmate_demo_minutes'

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 28, borderRadius: 14, padding: 3,
        background: checked ? '#1c1c1e' : 'var(--border)',
        border: 'none', cursor: 'pointer',
        transition: 'background 0.25s ease',
        display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      }} />
    </button>
  )
}

function Row({ label, hint, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
      {right}
    </div>
  )
}

export default function AdminDemo() {
  const [enabled,   setEnabled]   = useState(() => localStorage.getItem(DEMO_KEY) === '1')
  const [minutes,   setMinutes]   = useState(() => {
    const v = parseInt(localStorage.getItem(DEMO_MIN_KEY), 10)
    return isNaN(v) || v < 1 ? 5 : v
  })
  const [seeding,       setSeeding]       = useState(false)
  const [seedMsg,       setSeedMsg]       = useState(null)
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [recipes,         setRecipes]         = useState([])

  // Poll demo status voor synchronisatie
  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const s = await fetch('/api/demo/status').then(r => r.json())
        if (!cancelled) setSlideshowActive(s.slideshow_active)
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 3000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  // Laad recepten voor de overlay
  useEffect(() => {
    if (slideshowActive) {
      fetch('/api/recipes').then(r => r.json()).then(setRecipes).catch(() => {})
    }
  }, [slideshowActive])

  async function handleExitSlideshow() {
    await fetch('/api/demo/exit-slideshow', { method: 'POST' }).catch(() => {})
    setSlideshowActive(false)
  }

  function toggleEnabled(val) {
    setEnabled(val)
    if (val) localStorage.setItem(DEMO_KEY, '1')
    else localStorage.removeItem(DEMO_KEY)
  }

  function changeMinutes(val) {
    const n = Math.max(1, Math.min(60, Number(val)))
    setMinutes(n)
    localStorage.setItem(DEMO_MIN_KEY, String(n))
  }

  async function activateDemo() {
    setSeeding(true); setSeedMsg(null)
    try {
      await apiPost('/api/demo/activate')
      setSeedMsg({ ok: true, text: 'Demo data geladen — 12 recepten, 7 dagen rapporten.' })
    } catch {
      setSeedMsg({ ok: false, text: 'Fout bij laden van demo data.' })
    } finally {
      setSeeding(false)
    }
  }

  async function deactivateDemo() {
    setSeeding(true); setSeedMsg(null)
    try {
      await apiPost('/api/demo/deactivate')
      setSeedMsg({ ok: true, text: 'Demo data gewist. Machine is leeg en klaar voor echte setup.' })
    } catch {
      setSeedMsg({ ok: false, text: 'Fout bij wissen van demo data.' })
    } finally {
      setSeeding(false)
    }
  }

  return (
    <>
    {slideshowActive && (
      <DemoAttractorOverlay recipes={recipes} onExit={handleExitSlideshow} />
    )}
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Demo modus</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Als de machine een tijdje niet wordt gebruikt, start automatisch een aantrekkelijke showcase van de cocktails. Ideaal voor in de winkel of op een beurs.
        </p>
      </div>

      <div style={{
        background: 'var(--bg-card)', borderRadius: 16,
        border: '1px solid var(--border)', padding: '0 20px',
      }}>
        <Row
          label="Demo modus inschakelen"
          hint="Schakel automatisch over naar de demo bij inactiviteit"
          right={<Toggle checked={enabled} onChange={toggleEnabled} />}
        />
        <Row
          label="Wachttijd"
          hint={`Demo start na ${minutes} minuut${minutes !== 1 ? 'en' : ''} zonder aanraking`}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => changeMinutes(minutes - 1)}
                disabled={minutes <= 1}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--accent-bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 18, cursor: minutes > 1 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: minutes <= 1 ? 0.4 : 1,
                }}
              >−</button>
              <span style={{
                minWidth: 36, textAlign: 'center',
                fontSize: 15, fontWeight: 700, color: 'var(--text)',
              }}>{minutes}m</span>
              <button
                onClick={() => changeMinutes(minutes + 1)}
                disabled={minutes >= 60}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--accent-bg)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 18, cursor: minutes < 60 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: minutes >= 60 ? 0.4 : 1,
                }}
              >+</button>
            </div>
          }
        />
        <div style={{ padding: '14px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Wat ziet de bezoeker?</div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          }}>
            {[
              { icon: '🍹', title: 'Cocktail carrousel', desc: 'Wisselende showcase van al je recepten' },
              { icon: '👆', title: 'Tik om te starten', desc: 'Eén aanraking sluit de demo direct' },
              { icon: '🌙', title: 'Volgt thema', desc: 'Licht of donker, passend bij je stijl' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'var(--bg)', borderRadius: 12,
                border: '1px solid var(--border)', padding: '14px 12px',
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data sectie */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>Demo data</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Laad 12 voorbeeldcocktails, ingrediënten en 7 dagen aan nep-rapportages — of wis alles voor een echte opstart.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={activateDemo}
            disabled={seeding}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
              background: '#1c1c1e', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: seeding ? 'wait' : 'pointer',
              opacity: seeding ? 0.6 : 1,
            }}
          >{seeding ? 'Bezig…' : 'Demo data laden'}</button>
          <button
            onClick={deactivateDemo}
            disabled={seeding}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600, cursor: seeding ? 'wait' : 'pointer',
              opacity: seeding ? 0.6 : 1,
            }}
          >Wis demo data</button>
        </div>
        {seedMsg && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 10,
            background: seedMsg.ok ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
            border: `1px solid ${seedMsg.ok ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)'}`,
            fontSize: 13, color: 'var(--text)',
          }}>{seedMsg.text}</div>
        )}
      </div>

      {enabled && (
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.2)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34c759', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
            Demo modus actief — start na {minutes} minuut{minutes !== 1 ? 'en' : ''} inactiviteit
          </span>
        </div>
      )}

      {slideshowActive && (
        <div style={{
          marginTop: 16, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#007aff', flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
              Demo slideshow actief op alle apparaten
            </span>
          </div>
          <button
            onClick={handleExitSlideshow}
            style={{
              fontSize: 12, fontWeight: 600, color: '#007aff',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 8, flexShrink: 0,
            }}
          >Stoppen</button>
        </div>
      )}
    </div>
    </>
  )
}
