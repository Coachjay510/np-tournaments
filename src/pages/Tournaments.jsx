import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { useTournaments } from '../hooks/useTournaments'
import { supabase } from '../supabaseClient'
import { formatCurrency, formatDateRange, statusColor } from '../lib/utils'

const STATUS_OPTIONS = ['draft','registration_open','registration_closed','in_progress','completed','cancelled']
const FORMAT_OPTIONS = ['single_elimination','double_elimination','pool_play','pool_then_bracket','round_robin']
const FORMAT_LABELS = { single_elimination:'Single Elim', double_elimination:'Double Elim', pool_play:'Pool Play', pool_then_bracket:'Pool → Bracket', round_robin:'Round Robin' }

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:16, padding:32, width:520, maxHeight:'85vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize:11, color:'#4a5568', textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  )
}

export default function Tournaments({ director }) {
  const navigate = useNavigate()
  const { tournaments, loading, createTournament } = useTournaments(director?.id)
  const [showCreate, setShowCreate] = useState(false)
  const [venues, setVenues] = useState([])
  const [showNewVenue, setShowNewVenue] = useState(false)
  const [newVenueName, setNewVenueName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('venues').select('id, name').order('name').then(({ data }) => setVenues(data || []))
  }, [])

  const [form, setForm] = useState({
    name:'', slug:'', description:'', bracket_format:'pool_then_bracket',
    venue_name:'', venue_id:'', city:'', state:'', start_date:'', end_date:'',
    registration_deadline:'', max_teams:32, registration_fee:150,
    is_public:true, require_approval:false, allow_waitlist:true,
  })

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name') next.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      return next
    })
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await createTournament(form)
    if (error) { setError(error.message); setSaving(false) }
    else { setShowCreate(false); setSaving(false) }
  }

  const inputStyle = { width:'100%' }
  const col2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <Topbar title="TOURNAMENTS" actions={
        <button onClick={() => setShowCreate(true)} style={{ background:'#5cb800', color:'#04060a', border:'none', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700 }}>
          + New Tournament
        </button>
      } />

      <div style={{ padding:24, overflowY:'auto', flex:1 }}>
        {loading ? (
          <div style={{ color:'#4a5568', fontSize:13 }}>Loading...</div>
        ) : tournaments.length === 0 ? (
          <div style={{ textAlign:'center', padding:80 }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🏆</div>
            <div style={{ fontFamily:'Anton, sans-serif', fontSize:20, color:'#c0cce0', marginBottom:8 }}>NO TOURNAMENTS YET</div>
            <div style={{ fontSize:13, color:'#4a5568', marginBottom:24 }}>Create your first tournament to get started</div>
            <button onClick={() => setShowCreate(true)} style={{ background:'#5cb800', color:'#04060a', border:'none', padding:'10px 24px', borderRadius:8, fontSize:14, fontWeight:700 }}>
              Create Tournament
            </button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
            {tournaments.map(t => {
              const c = statusColor(t.status)
              return (
                <div key={t.id} onClick={() => navigate(`/tournaments/${t.id}`)}
                  style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, overflow:'hidden', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#2a3550'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#1a2030'}
                >
                  <div style={{ padding:'16px 18px', borderBottom:'1px solid #0e1320' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'#d8e0f0', flex:1, paddingRight:12 }}>{t.name}</div>
                      <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}`, flexShrink:0 }}>
                        {t.status.replace('_',' ')}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:'#4a5568' }}>{formatDateRange(t.start_date, t.end_date)}</div>
                    {t.city && <div style={{ fontSize:12, color:'#4a5568', marginTop:2 }}>{t.city}, {t.state}</div>}
                  </div>
                  <div style={{ padding:'12px 18px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    <div>
                      <div style={{ fontSize:10, color:'#4a5568', textTransform:'uppercase', letterSpacing:1 }}>Teams</div>
                      <div style={{ fontSize:16, fontFamily:'Anton, sans-serif', color:'#f0f4ff', marginTop:2 }}>{t.total_teams_registered || 0}<span style={{ fontSize:11, color:'#4a5568' }}>/{t.max_teams}</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'#4a5568', textTransform:'uppercase', letterSpacing:1 }}>Revenue</div>
                      <div style={{ fontSize:14, fontFamily:'Anton, sans-serif', color:'#5cb800', marginTop:2 }}>{formatCurrency(t.total_revenue)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'#4a5568', textTransform:'uppercase', letterSpacing:1 }}>Format</div>
                      <div style={{ fontSize:11, color:'#8898b8', marginTop:4 }}>{FORMAT_LABELS[t.bracket_format] || t.bracket_format}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <div style={{ fontFamily:'Anton, sans-serif', fontSize:20, color:'#f0f4ff', letterSpacing:0.5, marginBottom:24 }}>NEW TOURNAMENT</div>
        <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Field label="Tournament Name">
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="NP Hoopz Spring Classic 2026" style={inputStyle} required />
          </Field>
          <Field label="URL Slug">
            <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="np-hoopz-spring-classic-2026" style={inputStyle} required />
          </Field>
          <div style={col2}>
            <Field label="Start Date"><input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} style={inputStyle} required /></Field>
            <Field label="End Date"><input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} style={inputStyle} required /></Field>
          </div>
          <div style={col2}>
            <Field label="City"><input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Sacramento" style={inputStyle} /></Field>
            <Field label="State"><input value={form.state} onChange={e => set('state', e.target.value)} placeholder="CA" style={inputStyle} /></Field>
          </div>
          <Field label="Venue">
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={form.venue_id} onChange={e => { const v = venues.find(v => v.id === e.target.value); set('venue_id', e.target.value); if (v) set('venue_name', v.name) }} style={{ ...inputStyle, flex: 1 }}>
                <option value="">Select a venue</option>
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <button type="button" onClick={() => setShowNewVenue(!showNewVenue)} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ New</button>
            </div>
            {showNewVenue && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={newVenueName} onChange={e => setNewVenueName(e.target.value)} placeholder="New venue name" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={async () => { if (!newVenueName.trim()) return; const { data } = await supabase.from('venues').insert({ name: newVenueName.trim() }).select().single(); if (data) { setVenues(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name))); set('venue_id', data.id); set('venue_name', data.name); setNewVenueName(''); setShowNewVenue(false) } }} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Create</button>
              </div>
            )}
          </Field>
          <div style={col2}>
            <Field label="Max Teams"><input type="number" value={form.max_teams} onChange={e => set('max_teams', parseInt(e.target.value))} style={inputStyle} /></Field>
            <Field label="Registration Fee ($)"><input type="number" value={form.registration_fee} onChange={e => set('registration_fee', parseFloat(e.target.value))} style={inputStyle} /></Field>
          </div>
          <Field label="Bracket Format">
            <select value={form.bracket_format} onChange={e => set('bracket_format', e.target.value)} style={inputStyle}>
              {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
            </select>
          </Field>
          <Field label="Registration Deadline">
            <input type="datetime-local" value={form.registration_deadline} onChange={e => set('registration_deadline', e.target.value)} style={inputStyle} />
          </Field>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[['require_approval','Require approval for each team'],['allow_waitlist','Allow waitlist when full'],['is_public','Publicly visible tournament']].map(([key, label]) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#8898b8', cursor:'pointer' }}>
                <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
          {error && <div style={{ fontSize:12, color:'#e05555', background:'#1f0707', border:'1px solid #3a0a0a', padding:'8px 12px', borderRadius:6 }}>{error}</div>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
            <button type="button" onClick={() => setShowCreate(false)} style={{ background:'transparent', color:'#6b7a99', border:'1px solid #1a2030', padding:'9px 18px', borderRadius:8, fontSize:13 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ background:'#5cb800', color:'#04060a', border:'none', padding:'9px 20px', borderRadius:8, fontSize:13, fontWeight:700, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
