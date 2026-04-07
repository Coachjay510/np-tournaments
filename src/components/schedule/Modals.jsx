import { useState } from 'react'

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 420 },
  title: { fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', letterSpacing: 0.5, marginBottom: 20 },
  label: { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 },
  input: { width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', textAlign: 'center', fontFamily: 'Anton, sans-serif', fontSize: 24 },
  btn: { padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' },
}

// ─── Score Entry Modal ────────────────────────────────────────────────────────
export function ScoreModal({ game, onSave, onClose }) {
  const [home, setHome] = useState(game?.home_score ?? '')
  const [away, setAway] = useState(game?.away_score ?? '')
  const [saving, setSaving] = useState(false)

  if (!game) return null

  async function handleSave() {
    setSaving(true)
    await onSave(game.id, parseInt(home) || 0, parseInt(away) || 0)
    setSaving(false)
    onClose()
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.title}>ENTER SCORE</div>
        <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 20 }}>
          {game.round && <span style={{ color: '#d4a017', marginRight: 8 }}>{game.round}</span>}
          {game.court?.name && <span>{game.court.name}</span>}
          {game.scheduled_time && <span style={{ marginLeft: 8 }}>{game.scheduled_time}</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 12, alignItems: 'center', marginBottom: 20 }}>
          <div>
            <label style={{ ...s.label, textAlign: 'center' }}>{game.home_team_name}</label>
            <input type="number" value={home} onChange={e => setHome(e.target.value)}
              style={s.input} placeholder="0" min="0" />
          </div>
          <div style={{ textAlign: 'center', fontSize: 18, color: '#4a5568', fontFamily: 'Anton, sans-serif', marginTop: 20 }}>VS</div>
          <div>
            <label style={{ ...s.label, textAlign: 'center' }}>{game.away_team_name}</label>
            <input type="number" value={away} onChange={e => setAway(e.target.value)}
              style={s.input} placeholder="0" min="0" />
          </div>
        </div>

        {home !== '' && away !== '' && parseInt(home) !== parseInt(away) && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#5cb800', marginBottom: 16, fontWeight: 600 }}>
            Winner: {parseInt(home) > parseInt(away) ? game.home_team_name : game.away_team_name}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...s.btn, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || home === '' || away === ''}
            style={{ ...s.btn, background: '#5cb800', color: '#04060a', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Ref Assignment Modal ─────────────────────────────────────────────────────
export function RefAssignModal({ game, refs, onAssign, onClose }) {
  const [selectedRef, setSelectedRef] = useState('')
  const [role, setRole] = useState('head_ref')
  const [saving, setSaving] = useState(false)

  if (!game) return null

  async function handleAssign() {
    if (!selectedRef) return
    setSaving(true)
    await onAssign({ gameId: game.id, refId: selectedRef, role })
    setSaving(false)
    onClose()
  }

  const assignedRefs = game.ref_assignments || []

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.title}>ASSIGN REF</div>
        <div style={{ fontSize: 13, color: '#8898b8', marginBottom: 20 }}>
          {game.home_team_name} vs {game.away_team_name}
          {game.scheduled_time && <span style={{ color: '#4a5568', marginLeft: 8 }}>· {game.scheduled_time}</span>}
        </div>

        {/* Already assigned */}
        {assignedRefs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Assigned</div>
            {assignedRefs.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#0a0f1a', borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: '#d8e0f0' }}>{a.ref?.full_name}</span>
                <span style={{ color: a.status === 'confirmed' ? '#5cb800' : '#d4a017' }}>{a.role.replace('_', ' ')} · {a.status}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={s.label}>Select Ref</label>
            <select value={selectedRef} onChange={e => setSelectedRef(e.target.value)}
              style={{ ...s.input, fontSize: 13, textAlign: 'left', fontFamily: 'inherit', padding: '10px 12px' }}>
              <option value="">Choose a ref...</option>
              {refs.filter(r => r.status === 'active').map(r => (
                <option key={r.id} value={r.id}>{r.full_name} — ${r.pay_rate}/{r.pay_type.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={s.label}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ ...s.input, fontSize: 13, textAlign: 'left', fontFamily: 'inherit', padding: '10px 12px' }}>
              <option value="head_ref">Head Ref</option>
              <option value="line_ref">Line Ref</option>
              <option value="table_official">Table Official</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...s.btn, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030' }}>Cancel</button>
          <button onClick={handleAssign} disabled={saving || !selectedRef}
            style={{ ...s.btn, background: '#5cb800', color: '#04060a', opacity: (saving || !selectedRef) ? 0.6 : 1 }}>
            {saving ? 'Assigning...' : 'Assign Ref'}
          </button>
        </div>
      </div>
    </div>
  )
}
