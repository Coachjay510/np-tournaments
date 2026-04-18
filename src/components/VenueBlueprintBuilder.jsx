import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const ELEMENT_DEFS = {
  full_court:     { label: 'Full Court',     icon: '🏀', w: 220, h: 110, color: '#0d2b0d', category: 'courts' },
  half_court:     { label: 'Half Court',     icon: '⛹️', w: 110, h: 110, color: '#0d1f2b', category: 'courts' },
  bleachers:      { label: 'Bleachers',      icon: '👥', w: 140, h: 45,  color: '#1a1040', category: 'seating', hasCapacity: true },
  chair_row:      { label: 'Chair Row',      icon: '🪑', w: 100, h: 22,  color: '#1a1a0d', category: 'seating', hasCapacity: true },
  single_chair:   { label: 'Single Chair',   icon: '🪑', w: 22,  h: 22,  color: '#1a1a0d', category: 'seating', hasCapacity: true },
  bench:          { label: 'Bench',          icon: '🪵', w: 90,  h: 22,  color: '#2b1a0d', category: 'seating', hasCapacity: true },
  player_bench:   { label: 'Player Bench',   icon: '🏃', w: 90,  h: 22,  color: '#0d2b1a', category: 'seating', hasCapacity: true },
  coach_chair:    { label: 'Coach Chair',    icon: '📋', w: 22,  h: 22,  color: '#0d1a2b', category: 'seating', hasCapacity: true },
  ref_seat:       { label: 'Ref Seat',       icon: '🦓', w: 22,  h: 22,  color: '#1a1a1a', category: 'seating', hasCapacity: true },
  scoreboard_seat:{ label: 'Scorer Seat',    icon: '📊', w: 40,  h: 22,  color: '#1a0d2b', category: 'seating', hasCapacity: true },
  standing_room:  { label: 'Standing Room',  icon: '🧍', w: 100, h: 60,  color: '#0d1a0d', category: 'seating', hasCapacity: true },
  table_round:    { label: 'Round Table',    icon: '⭕', w: 50,  h: 50,  color: '#2b1a0d', category: 'furniture', shape: 'circle' },
  table_rect:     { label: 'Rect Table',     icon: '⬜', w: 80,  h: 40,  color: '#2b1a0d', category: 'furniture' },
  scoreboard:     { label: 'Scoreboard',     icon: '📺', w: 70,  h: 40,  color: '#0d0d2b', category: 'furniture' },
  wall_h:         { label: 'Wall (H)',       icon: '▬',  w: 120, h: 12,  color: '#3a3a3a', category: 'structure' },
  wall_v:         { label: 'Wall (V)',       icon: '▮',  w: 12,  h: 120, color: '#3a3a3a', category: 'structure' },
  wall_corner:    { label: 'Corner',         icon: '◼',  w: 12,  h: 12,  color: '#3a3a3a', category: 'structure' },
  bathroom:       { label: 'Bathroom',       icon: '🚻', w: 55,  h: 55,  color: '#1a1a2b', category: 'facilities' },
  stairs:         { label: 'Stairs',         icon: '🪜', w: 50,  h: 50,  color: '#2b2b1a', category: 'facilities' },
  ramp:           { label: 'Ramp',           icon: '♿', w: 60,  h: 40,  color: '#1a2b1a', category: 'facilities' },
  snack_bar:      { label: 'Snack Bar',      icon: '🍕', w: 80,  h: 50,  color: '#2b0d0d', category: 'facilities' },
  entry_door:     { label: 'Entry',          icon: '🚪', w: 35,  h: 55,  color: '#0d2b0d', category: 'doors' },
  exit_door:      { label: 'Exit',           icon: '🚨', w: 35,  h: 55,  color: '#2b0d0d', category: 'doors' },
  emergency_exit: { label: 'Emergency Exit', icon: '🆘', w: 35,  h: 55,  color: '#2b1a0d', category: 'doors' },
}

const CATEGORIES = [
  { id: 'courts',    label: '🏀 Courts' },
  { id: 'seating',   label: '👥 Seating' },
  { id: 'furniture', label: '🪑 Furniture' },
  { id: 'structure', label: '🧱 Walls' },
  { id: 'facilities',label: '🏗 Facilities' },
  { id: 'doors',     label: '🚪 Doors' },
]

const ROTATION_PRESETS = [
  { label: '0°',   val: 0 },
  { label: '90°',  val: 90 },
  { label: '180°', val: 180 },
  { label: '270°', val: 270 },
]

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
      <path d="M 2 20 Q 75 20 75 55 Q 75 90 2 90" fill="none" stroke="#4a6a8a" strokeWidth="1.5"/>
      <circle cx="2" cy="55" r="20" fill="none" stroke="#4a6a8a" strokeWidth="1.5"/>
      <rect x="2" y="30" width="25" height="50" fill="none" stroke="#4a6a8a" strokeWidth="1.5"/>
    </svg>
  )
  return null
}

function BlueprintElement({ el, selected, onSelect, onUpdate }) {
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const def = ELEMENT_DEFS[el.type] || ELEMENT_DEFS.bench
  const isCircle = def.shape === 'circle'
  const w = el.w || def.w
  const h = el.h || def.h

  function onMouseDown(e) {
    e.stopPropagation()
    onSelect(el.id)
    dragging.current = true
    offset.current = { x: e.clientX - el.x, y: e.clientY - el.y }
    const onMove = (ev) => {
      if (!dragging.current) return
      onUpdate(el.id, { x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y })
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div onMouseDown={onMouseDown} style={{
      position: 'absolute', left: el.x, top: el.y, width: w, height: h,
      background: el.color || def.color,
      border: `2px solid ${selected ? '#5cb800' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: isCircle ? '50%' : 4,
      cursor: 'move', userSelect: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transform: `rotate(${el.rotation || 0}deg)`, transformOrigin: 'center',
      boxShadow: selected ? '0 0 0 2px rgba(92,184,0,0.5), 0 0 16px rgba(92,184,0,0.2)' : '0 2px 6px rgba(0,0,0,0.4)',
      zIndex: selected ? 10 : 1, overflow: 'hidden',
    }}>
      {(el.type === 'full_court' || el.type === 'half_court') && <CourtSVG type={el.type} w={w} h={h} />}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: el.type.includes('court') ? 20 : w < 30 ? 10 : 14, lineHeight: 1 }}>{def.icon}</div>
        {w > 35 && (
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', marginTop: 2, lineHeight: 1.2, padding: '0 2px' }}>
            {el.label || def.label}
            {el.capacity ? <div style={{ color: '#5cb800', fontSize: 7 }}>{el.capacity}</div> : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VenueBlueprintBuilder({ venueId, venueName, gyms = [], onClose }) {
  const [selectedGym, setSelectedGym] = useState(gyms[0]?.id || 'main')
  const [blueprints, setBlueprints] = useState({})
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('courts')

  const elements = blueprints[selectedGym] || []
  const selectedEl = elements.find(el => el.id === selected)

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
    setSaveMsg('')
    const { error } = await supabase.from('venue_blueprints').upsert({
      venue_id: venueId,
      gym_id: selectedGym,
      elements,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'venue_id,gym_id' })
    setSaving(false)
    if (error) {
      console.error('Save error:', error)
      setSaveMsg('Error: ' + error.message)
    } else {
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2500)
    }
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
      type, x: 120 + Math.random() * 150, y: 80 + Math.random() * 100,
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

  function copySelected() {
    if (!selectedEl) return
    const copy = { ...selectedEl, id: Date.now().toString(), x: selectedEl.x + 20, y: selectedEl.y + 20 }
    setElements(prev => [...prev, copy])
    setSelected(copy.id)
  }

  function deleteSelected() {
    setElements(prev => prev.filter(el => el.id !== selected))
    setSelected(null)
  }

  const gymOptions = gyms.length > 0 ? gyms : [{ id: 'main', name: venueName || 'Main Floor' }]
  const totalCapacity = elements.reduce((sum, el) => sum + (Number(el.capacity) || 0), 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', letterSpacing: 1 }}>🗺 VENUE BLUEPRINT</div>
        <div style={{ fontSize: 12, color: '#4a5568' }}>{venueName}</div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {gymOptions.map(gym => (
            <button key={gym.id} onClick={() => { setSelectedGym(gym.id); setSelected(null) }} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: selectedGym === gym.id ? 'rgba(92,184,0,0.15)' : '#0e1320',
              color: selectedGym === gym.id ? '#5cb800' : '#6b7a99',
              border: `1px solid ${selectedGym === gym.id ? '#5cb800' : '#1a2030'}`,
            }}>{gym.name}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#4a5568' }}>Capacity: <span style={{ color: '#5cb800', fontWeight: 700 }}>{totalCapacity}</span></div>
          {saveMsg && <div style={{ fontSize: 11, color: saveMsg.startsWith('Error') ? '#ef4444' : '#5cb800', fontWeight: 700 }}>{saveMsg}</div>}
          <button onClick={() => { if (window.confirm('Clear all elements?')) { setElements([]); setSelected(null) } }} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 700 }}>Clear</button>
          <button onClick={saveBlueprint} disabled={saving} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, background: saving ? '#3a5a00' : '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            {saving ? 'Saving...' : '💾 Save'}
          </button>
          <button onClick={onClose} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, background: '#1a2030', color: '#6b7a99', border: '1px solid #1a2030', cursor: 'pointer' }}>✕ Close</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left toolbar - accordion */}
        <div style={{ width: 155, background: '#080c12', borderRight: '1px solid #1a2030', overflowY: 'auto', flexShrink: 0 }}>
          {CATEGORIES.map(cat => (
            <div key={cat.id}>
              <button onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)} style={{
                width: '100%', padding: '8px 10px', background: activeCategory === cat.id ? 'rgba(92,184,0,0.1)' : 'transparent',
                border: 'none', borderLeft: `2px solid ${activeCategory === cat.id ? '#5cb800' : 'transparent'}`,
                borderBottom: '1px solid #1a2030',
                color: activeCategory === cat.id ? '#5cb800' : '#6b7a99', cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 600,
              }}>{cat.label}</button>
              {activeCategory === cat.id && (
                <div style={{ background: '#060910', borderBottom: '1px solid #1a2030' }}>
                  {Object.entries(ELEMENT_DEFS)
                    .filter(([_, def]) => def.category === cat.id)
                    .map(([type, def]) => (
                      <button key={type} onClick={() => addElement(type)} style={{
                        width: '100%', padding: '6px 10px 6px 18px', background: 'transparent',
                        border: 'none', borderBottom: '1px solid #0d1018',
                        color: '#b0bcd0', fontSize: 10, cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span>{def.icon}</span> {def.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#04060a' }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
          <div style={{ position: 'absolute', top: 10, left: 14, fontSize: 10, color: '#1e2a3a', pointerEvents: 'none' }}>
            {gymOptions.find(g => g.id === selectedGym)?.name} — drag to move • click to select
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
        <div style={{ width: 210, background: '#080c12', borderLeft: '1px solid #1a2030', padding: 14, overflowY: 'auto', flexShrink: 0 }}>
          {selectedEl ? (
            <>
              <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>
                {ELEMENT_DEFS[selectedEl.type]?.icon} {ELEMENT_DEFS[selectedEl.type]?.label}
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>LABEL</label>
                <input value={selectedEl.label || ''} onChange={e => updateElement(selected, { label: e.target.value })}
                  style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '6px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
              </div>

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

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 6 }}>ROTATION</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
                  {ROTATION_PRESETS.map(p => (
                    <button key={p.val} onClick={() => updateElement(selected, { rotation: p.val })} style={{
                      padding: '5px 0', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      background: (selectedEl.rotation || 0) === p.val ? 'rgba(92,184,0,0.2)' : '#0e1320',
                      color: (selectedEl.rotation || 0) === p.val ? '#5cb800' : '#6b7a99',
                      border: `1px solid ${(selectedEl.rotation || 0) === p.val ? '#5cb800' : '#1a2030'}`,
                    }}>{p.label}</button>
                  ))}
                </div>
                <input type="range" min="0" max="360" value={selectedEl.rotation || 0}
                  onChange={e => updateElement(selected, { rotation: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#5cb800' }} />
                <div style={{ fontSize: 10, color: '#4a5568', textAlign: 'center', marginTop: 2 }}>{selectedEl.rotation || 0}°</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: '#4a5568', display: 'block', marginBottom: 4 }}>COLOR</label>
                <input type="color" value={selectedEl.color || '#1a2030'} onChange={e => updateElement(selected, { color: e.target.value })}
                  style={{ width: '100%', height: 32, background: 'none', border: '1px solid #1a2030', borderRadius: 6, cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={copySelected} style={{ flex: 1, background: 'rgba(59,130,246,0.1)', color: '#7eb3ff', border: '1px solid rgba(59,130,246,0.3)', padding: '7px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  📋 Copy
                </button>
                <button onClick={deleteSelected} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '7px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  🗑 Delete
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: '#2a3040', fontSize: 11, textAlign: 'center', marginTop: 60, lineHeight: 2 }}>
              Click an element<br/>to edit properties
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
