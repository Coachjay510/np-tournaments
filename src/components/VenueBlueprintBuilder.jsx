import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// ── Element Definitions ───────────────────────────────────────────
const ELEMENT_DEFS = {
  // Courts
  full_court:    { label: 'Full Court',      icon: '🏀', w: 220, h: 110, color: '#0d2b0d', category: 'courts' },
  half_court:    { label: 'Half Court',      icon: '⛹️', w: 110, h: 110, color: '#0d1f2b', category: 'courts' },
  // Seating
  bleachers:     { label: 'Bleachers',       icon: '👥', w: 140, h: 45, color: '#1a1040', category: 'seating', hasCapacity: true },
  chair_row:     { label: 'Chair Row',       icon: '🪑', w: 100, h: 22, color: '#1a1a0d', category: 'seating', hasCapacity: true },
  single_chair:  { label: 'Single Chair',    icon: '🪑', w: 22,  h: 22, color: '#1a1a0d', category: 'seating', hasCapacity: true },
  bench:         { label: 'Bench',           icon: '🪵', w: 90,  h: 22, color: '#2b1a0d', category: 'seating', hasCapacity: true },
  player_bench:  { label: 'Player Bench',    icon: '🏃', w: 90,  h: 22, color: '#0d2b1a', category: 'seating', hasCapacity: true },
  coach_chair:   { label: 'Coach Chair',     icon: '📋', w: 22,  h: 22, color: '#0d1a2b', category: 'seating', hasCapacity: true },
  ref_seat:      { label: 'Ref Seat',        icon: '🦓', w: 22,  h: 22, color: '#1a1a1a', category: 'seating', hasCapacity: true },
  scoreboard_seat:{ label: 'Scorer Seat',   icon: '📊', w: 40,  h: 22, color: '#1a0d2b', category: 'seating', hasCapacity: true },
  standing_room: { label: 'Standing Room',   icon: '🧍', w: 100, h: 60, color: '#0d1a0d', category: 'seating', hasCapacity: true },
  // Tables
  table_round:   { label: 'Round Table',     icon: '⭕', w: 50,  h: 50, color: '#2b1a0d', category: 'furniture', shape: 'circle' },
  table_rect:    { label: 'Rect Table',      icon: '⬜', w: 80,  h: 40, color: '#2b1a0d', category: 'furniture' },
  scoreboard:    { label: 'Scoreboard',      icon: '📺', w: 70,  h: 40, color: '#0d0d2b', category: 'furniture' },
  // Facilities
  bathroom:      { label: 'Bathroom',        icon: '🚻', w: 55,  h: 55, color: '#1a1a2b', category: 'facilities' },
  stairs:        { label: 'Stairs',          icon: '🪜', w: 50,  h: 50, color: '#2b2b1a', category: 'facilities' },
  ramp:          { label: 'Ramp',            icon: '♿', w: 60,  h: 40, color: '#1a2b1a', category: 'facilities' },
  snack_bar:     { label: 'Snack Bar',       icon: '🍕', w: 80,  h: 50, color: '#2b0d0d', category: 'facilities' },
  // Doors
  entry_door:    { label: 'Entry',           icon: '🚪', w: 35,  h: 55, color: '#0d2b0d', category: 'doors' },
  exit_door:     { label: 'Exit',            icon: '🚨', w: 35,  h: 55, color: '#2b0d0d', category: 'doors' },
  emergency_exit:{ label: 'Emergency Exit',  icon: '🆘', w: 35,  h: 55, color: '#2b1a0d', category: 'doors' },
}

const CATEGORIES = [
  { id: 'courts',    label: '🏀 Courts' },
  { id: 'seating',   label: '👥 Seating' },
  { id: 'furniture', label: '🪑 Furniture' },
  { id: 'facilities',label: '🏗 Facilities' },
  { id: 'doors',     label: '🚪 Doors' },
]

// ── Court SVG Renderer ────────────────────────────────────────────
function CourtSVG({ type, w, h }) {
  if (type === 'full_court') return (
    <svg width={w} height={h} viewBox="0 0 220 110" style={{ position: 'absolute', inset: 0, opacity: 0.6 }}>
      <rect x="2" y="2" width="216" height="106" fill="none" stroke="#4a8a4a" strokeWidth="2"/>
      <line x1="110" y1="2" x2="110" y2="108" stroke="#4a8a4a" strokeWidth="1.5"/>
      <circle cx="110" cy="55" r="20" fill="none" stroke="#4a8a4a" strokeWidth="1.5"/>
      <circle cx="110" cy="55" r="2" fill="#4a8a4a"/>
      <path d="M 2 20 Q 45 20 45 55 Q 45 90 2 90" fill="none" stroke="#4a8a4a" strokeWidth="1.5"/>
      <path d="M 218 20 Q 175 20 175 55 Q 175 90 218 90" fill="none" stroke="#4a8a4a" strokeWidth="1.5"/>
      <rect x="2" y="30" width="25" height="50" fill="none" stroke="#4a8a4a" strokeWidth="1.5"/>
      <rect x="193" y="30" width="25" height="50" fill="none" stroke="#4a8a4a" strokeWidth="1.5"/>
    </svg>
  )
  if (type === 'half_court') return (
    <svg width={w} height={h} viewBox="0 0 110 110" style={{ position: 'absolute', inset: 0, opacity: 0.6 }}>
      <rect x="2" y="2" width="106" height="106" fill="none" stroke="#4a6a8a" strokeWidth="2"/>
      <line x1="2" y1="2" x2="2" y2="108" stroke="#4a6a8a" strokeWidth="2"/>
      <path d="M 2 20 Q 75 20 75 55 Q 75 90 2 90" fill="none" stroke="#4a6a8a" strokeWidth="1.5"/>
      <circle cx="2" cy="55" r="20" fill="none" stroke="#4a6a8a" strokeWidth="1.5"/>
      <rect x="2" y="30" width="25" height="50" fill="none" stroke="#4a6a8a" strokeWidth="1.5"/>
    </svg>
  )
  return null
}

// ── Single Element ────────────────────────────────────────────────
function BlueprintElement({ el, selected, onSelect, onUpdate }) {
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const def = ELEMENT_DEFS[el.type] || ELEMENT_DEFS.bench
  const isCircle = def.shape === 'circle'

  function onMouseDown(e) {
    e.stopPropagation()
    onSelect(el.id)
    dragging.current = true
    offset.current = { x: e.clientX - el.x, y: e.clientY - el.y }
    const onMove = (ev) => {
      if (!dragging.current) return
      onUpdate(el.id, { x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y })
    }
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const w = el.w || def.w
  const h = el.h || def.h

  return (
    <div onMouseDown={onMouseDown} style={{
      position: 'absolute', left: el.x, top: el.y, width: w, height: h,
      background: el.color || def.color,
      border: `2px solid ${selected ? '#5cb800' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: isCircle ? '50%' : 6,
      cursor: 'move', userSelect: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transform: `rotate(${el.rotation || 0}deg)`, transformOrigin: 'center',
      boxShadow: selected ? '0 0 0 2px rgba(92,184,0,0.4), 0 0 12px rgba(92,184,0,0.2)' : '0 2px 4px rgba(0,0,0,0.3)',
      zIndex: selected ? 10 : 1, overflow: 'hidden',
    }}>
      {(el.type === 'full_court' || el.type === 'half_court') && <CourtSVG type={el.type} w={w} h={h} />}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div style={{ fontSize: el.type.includes('court') ? 20 : w < 30 ? 10 : 14, lineHeight: 1 }}>{def.icon}</div>
        {w > 35 && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', marginTop: 2, lineHeight: 1.2, padding: '0 2px' }}>
          {el.label || def.label}
          {el.capacity ? <div style={{ color: '#5cb800', fontSize: 7 }}>{el.capacity}</div> : null}
        </div>}
      </div>
    </div>
  )
}

// ── Main Blueprint Builder ────────────────────────────────────────
export default function VenueBlueprintBuilder({ venueId, venueName, gyms = [], onClose }) {
  const [selectedGym, setSelectedGym] = useState(gyms[0]?.id || 'main')
  const [blueprints, setBlueprints] = useState({})
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('courts')

  const elements = blueprints[selectedGym] || []

  useEffect(() => { loadBlueprints() }, [venueId])

  async function loadBlueprints() {
    setLoading(true)
    const { data } = await supabase.from('venue_blueprints').select('*').eq('venue_id', venueId)
    const map = {}
    if (data) data.forEach(row => { map[row.gym_id || 'main'] = row.elements || [] })
    setBlueprints(map)
    setLoading(false)
  }

  async function saveBlueprint() {
    setSaving(true)
    await supabase.from('venue_blueprints').upsert({
      venue_id: venueId, gym_id: selectedGym, elements,
    }, { onConflict: 'venue_id,gym_id' })
    setSaving(false)
    alert('Blueprint saved!')
  }

  function setElements(updater) {
    setBlueprints(prev => ({
      ...prev,
      [selectedGym]: typeof updater === 'function' ? updater(prev[selectedGym] || []) : updater,
    }))
  }

  function addElement(type) {
    const def = ELEMENT_DEFS[type]
    const newEl = {
      id: Date.now().toString(),
      type, x: 120 + Math.random() * 150, y: 80 + Math.random() * 150,
      w: def.w, h: def.h, rotation: 0,
      label: def.label, color: def.color,
      capacity: def.hasCapacity ? (type === 'bleachers' ? 50 : type.includes('row') ? 20 : 1) : null,
    }
    setElements(prev => [...(prev || []), newEl])
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
  const totalCapacity = elements.reduce((sum, el) => sum + (Number(el.capacity) || 0), 0)
  const gymOptions = gyms.length > 0 ? gyms : [{ id: 'main', name: venueName || 'Main Floor' }]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', letterSpacing: 1 }}>
          🗺 VENUE BLUEPRINT
        </div>
        <div style={{ fontSize: 13, color: '#4a5568' }}>{venueName}</div>

        {/* Gym tabs */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
          {gymOptions.map(gym => (
            <button key={gym.id} onClick={() => { setSelectedGym(gym.id); setSelected(null) }} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: selectedGym === gym.id ? 'rgba(92,184,0,0.15)' : '#0e1320',
              color: selectedGym === gym.id ? '#5cb800' : '#6b7a99',
              border: `1px solid ${selectedGym === gym.id ? '#5cb800' : '#1a2030'}`,
            }}>{gym.name}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#4a5568' }}>Total Capacity: <span style={{ color: '#5cb800', fontWeight: 700 }}>{totalCapacity}</span></div>
          <button onClick={() => setElements([])} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 700 }}>Clear</button>
          <button onClick={saveBlueprint} disabled={saving} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 11, background: '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            {saving ? 'Saving...' : '💾 Save'}
          </button>
          <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, background: '#1a2030', color: '#6b7a99', border: '1px solid #1a2030', cursor: 'pointer', fontWeight: 700 }}>✕ Close</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left toolbar */}
        <div style={{ width: 170, background: '#080c12', borderRight: '1px solid #1a2030', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Category tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #1a2030' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                padding: '8px 12px', background: activeCategory === cat.id ? 'rgba(92,184,0,0.1)' : 'transparent',
                border: 'none', borderLeft: `2px solid ${activeCategory === cat.id ? '#5cb800' : 'transparent'}`,
                color: activeCategory === cat.id ? '#5cb800' : '#6b7a99', cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 600,
              }}>{cat.label}</button>
            ))}
          </div>
          {/* Elements for active category */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {Object.entries(ELEMENT_DEFS)
              .filter(([_, def]) => def.category === activeCategory)
              .map(([type, def]) => (
                <button key={type} onClick={() => addElement(type)} style={{
                  width: '100%', padding: '7px 8px', marginBottom: 4,
                  background: '#0e1320', border: '1px solid #1a2030', borderRadius: 6,
                  color: '#c0cce0', fontSize: 11, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'background 0.15s',
                }}>
                  <span style={{ fontSize: 14 }}>{def.icon}</span>
                  <span>{def.label}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#04060a' }}>
          {/* Grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
          <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 10, color: '#2a3040', fontFamily: 'monospace', letterSpacing: 1, pointerEvents: 'none' }}>
            {gymOptions.find(g => g.id === selectedGym)?.name || 'Floor'} • drag to arrange • click to select
          </div>
          {loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>Loading...</div>
          ) : (
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setSelected(null)}>
              {elements.map(el => (
                <BlueprintElement key={el.id} el={el} selected={selected === el.id} onSelect={setSelected} onUpdate={updateElement} />
              ))}
            </div>
          )}
        </div>

        {/* Right properties panel */}
        <div style={{ width: 200, background: '#080c12', borderLeft: '1px solid #1a2030', padding: 14, overflowY: 'auto', flexShrink: 0 }}>
          {selectedEl ? (
            <>
              <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Properties</div>

              {[
                { label: 'LABEL', key: 'label', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={selectedEl[key] || ''} onChange={e => updateElement(selected, { [key]: e.target.value })}
                    style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '6px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}

              {selectedEl.capacity !== null && selectedEl.capacity !== undefined && (
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>CAPACITY</label>
                  <input type="number" min="0" value={selectedEl.capacity || 0} onChange={e => updateElement(selected, { capacity: Number(e.target.value) })}
                    style={{ width: '100%', background: '#0e1320', border: '1px solid rgba(92,184,0,0.3)', color: '#5cb800', borderRadius: 6, padding: '6px 8px', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[{ label: 'W', key: 'w' }, { label: 'H', key: 'h' }].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input type="number" value={selectedEl[key] || 60} onChange={e => updateElement(selected, { [key]: Number(e.target.value) })}
                      style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '6px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>ROTATION: {selectedEl.rotation || 0}°</label>
                <input type="range" min="0" max="360" value={selectedEl.rotation || 0} onChange={e => updateElement(selected, { rotation: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#5cb800' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>COLOR</label>
                <input type="color" value={selectedEl.color || '#1a2030'} onChange={e => updateElement(selected, { color: e.target.value })}
                  style={{ width: '100%', height: 34, background: 'none', border: '1px solid #1a2030', borderRadius: 6, cursor: 'pointer' }} />
              </div>

              <button onClick={deleteSelected} style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: 8, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                🗑 Delete
              </button>
            </>
          ) : (
            <div style={{ color: '#2a3040', fontSize: 11, textAlign: 'center', marginTop: 40 }}>
              Click an element to edit its properties
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
