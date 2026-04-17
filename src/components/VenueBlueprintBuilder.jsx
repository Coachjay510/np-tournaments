import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const ELEMENTS = [
  { type: 'full_court', label: 'Full Court', icon: '🏀', w: 200, h: 100, color: '#1a3a1a' },
  { type: 'half_court', label: 'Half Court', icon: '⛹️', w: 100, h: 100, color: '#1a2a3a' },
  { type: 'bleachers', label: 'Bleachers', icon: '👥', w: 120, h: 40, color: '#2a1a3a' },
  { type: 'chair_row', label: 'Chair Row', icon: '🪑', w: 100, h: 25, color: '#2a2a1a' },
  { type: 'bench', label: 'Bench', icon: '🪵', w: 80, h: 20, color: '#3a2a1a' },
  { type: 'player_bench', label: 'Player Bench', icon: '🏃', w: 80, h: 20, color: '#1a3a2a' },
  { type: 'scoreboard', label: 'Scoreboard', icon: '📊', w: 60, h: 40, color: '#1a1a3a' },
  { type: 'bathroom', label: 'Bathroom', icon: '🚻', w: 50, h: 50, color: '#2a2a2a' },
  { type: 'snack_bar', label: 'Snack Bar', icon: '🍕', w: 80, h: 50, color: '#3a1a1a' },
  { type: 'entry_door', label: 'Entry Door', icon: '🚪', w: 30, h: 50, color: '#0a2a0a' },
  { type: 'exit_door', label: 'Exit Door', icon: '🚨', w: 30, h: 50, color: '#2a0a0a' },
  { type: 'ref_chairs', label: 'Ref Chairs', icon: '🦓', w: 40, h: 25, color: '#1a1a2a' },
  { type: 'standing_room', label: 'Standing Room', icon: '🧍', w: 100, h: 60, color: '#1a2a1a' },
]

function Element({ el, selected, onSelect, onUpdate }) {
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })

  function onMouseDown(e) {
    e.stopPropagation()
    onSelect(el.id)
    dragging.current = true
    startPos.current = { x: el.x, y: el.y }
    offset.current = { x: e.clientX - el.x, y: e.clientY - el.y }
    const onMove = (ev) => {
      if (!dragging.current) return
      onUpdate(el.id, { x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y })
    }
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const def = ELEMENTS.find(e => e.type === el.type) || ELEMENTS[0]
  const transform = `rotate(${el.rotation || 0}deg)`

  return (
    <div onMouseDown={onMouseDown} style={{
      position: 'absolute', left: el.x, top: el.y,
      width: el.w || def.w, height: el.h || def.h,
      background: el.color || def.color,
      border: `2px solid ${selected ? '#5cb800' : 'rgba(255,255,255,0.15)'}`,
      borderRadius: 6, cursor: 'move', userSelect: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transform, transformOrigin: 'center',
      boxShadow: selected ? '0 0 0 2px #5cb800' : 'none',
      zIndex: selected ? 10 : 1,
    }}>
      <div style={{ fontSize: el.type.includes('court') ? 24 : 16 }}>{def.icon}</div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 4px', lineHeight: 1.2 }}>
        {el.label || def.label}
        {el.capacity ? <div style={{ color: '#5cb800', fontSize: 8 }}>{el.capacity} seats</div> : null}
      </div>
    </div>
  )
}

export default function VenueBlueprintBuilder({ venueId, venueName }) {
  const [elements, setElements] = useState([])
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef(null)

  useEffect(() => {
    loadBlueprint()
  }, [venueId])

  async function loadBlueprint() {
    setLoading(true)
    const { data } = await supabase.from('venue_blueprints').select('*').eq('venue_id', venueId).single()
    if (data?.elements) setElements(data.elements)
    setLoading(false)
  }

  async function saveBlueprint() {
    setSaving(true)
    await supabase.from('venue_blueprints').upsert({ venue_id: venueId, elements }, { onConflict: 'venue_id' })
    setSaving(false)
    alert('Blueprint saved!')
  }

  function addElement(type) {
    const def = ELEMENTS.find(e => e.type === type)
    const newEl = {
      id: Date.now().toString(),
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      w: def.w, h: def.h,
      rotation: 0,
      label: def.label,
      capacity: type.includes('bleacher') ? 50 : type === 'chair_row' ? 20 : null,
      color: def.color,
    }
    setElements(prev => [...prev, newEl])
    setSelected(newEl.id)
  }

  function updateElement(id, updates) {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el))
  }

  function deleteSelected() {
    setElements(prev => prev.filter(el => el.id !== selected))
    setSelected(null)
  }

  const selectedEl = elements.find(el => el.id === selected)

  const totalCapacity = elements.reduce((sum, el) => sum + (el.capacity || 0), 0)

  if (loading) return <div style={{ padding: 40, color: '#4a5568', textAlign: 'center' }}>Loading blueprint...</div>

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left toolbar */}
      <div style={{ width: 160, background: '#080c12', borderRight: '1px solid #1a2030', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>Add Elements</div>
        {ELEMENTS.map(el => (
          <button key={el.type} onClick={() => addElement(el.type)} style={{
            width: '100%', padding: '7px 8px', marginBottom: 4, background: '#0e1320',
            border: '1px solid #1a2030', borderRadius: 6, color: '#c0cce0', fontSize: 11,
            cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{el.icon}</span> {el.label}
          </button>
        ))}
        <div style={{ borderTop: '1px solid #1a2030', marginTop: 12, paddingTop: 12 }}>
          <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Capacity</div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#5cb800' }}>{totalCapacity}</div>
          <div style={{ fontSize: 10, color: '#4a5568' }}>seats</div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#04060a' }}>
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Canvas label */}
        <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 11, color: '#4a5568', fontFamily: 'var(--font-m)', letterSpacing: 1 }}>
          {venueName || 'Venue'} Blueprint — drag elements to arrange
        </div>

        {/* Save button */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
          <button onClick={() => setElements([])} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
            Clear
          </button>
          <button onClick={saveBlueprint} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Saving...' : '💾 Save Blueprint'}
          </button>
        </div>

        <div ref={canvasRef} style={{ position: 'absolute', inset: 0 }} onClick={() => setSelected(null)}>
          {elements.map(el => (
            <Element key={el.id} el={el} selected={selected === el.id} onSelect={setSelected} onUpdate={updateElement} />
          ))}
        </div>
      </div>

      {/* Right properties panel */}
      {selectedEl && (
        <div style={{ width: 200, background: '#080c12', borderLeft: '1px solid #1a2030', padding: 14, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Properties</div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>LABEL</label>
            <input value={selectedEl.label || ''} onChange={e => updateElement(selected, { label: e.target.value })}
              style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '6px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {selectedEl.capacity !== null && selectedEl.capacity !== undefined && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>CAPACITY</label>
              <input type="number" value={selectedEl.capacity || 0} onChange={e => updateElement(selected, { capacity: Number(e.target.value) })}
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#5cb800', borderRadius: 6, padding: '6px 8px', fontSize: 13, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>WIDTH</label>
              <input type="number" value={selectedEl.w || 100} onChange={e => updateElement(selected, { w: Number(e.target.value) })}
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '6px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>HEIGHT</label>
              <input type="number" value={selectedEl.h || 60} onChange={e => updateElement(selected, { h: Number(e.target.value) })}
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '6px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>ROTATION</label>
            <input type="range" min="0" max="360" value={selectedEl.rotation || 0} onChange={e => updateElement(selected, { rotation: Number(e.target.value) })}
              style={{ width: '100%', accentColor: '#5cb800' }} />
            <div style={{ fontSize: 10, color: '#4a5568', textAlign: 'center' }}>{selectedEl.rotation || 0}°</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>COLOR</label>
            <input type="color" value={selectedEl.color || '#1a2030'} onChange={e => updateElement(selected, { color: e.target.value })}
              style={{ width: '100%', height: 32, background: 'none', border: '1px solid #1a2030', borderRadius: 6, cursor: 'pointer' }} />
          </div>

          <button onClick={deleteSelected} style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            🗑 Delete Element
          </button>
        </div>
      )}
    </div>
  )
}
