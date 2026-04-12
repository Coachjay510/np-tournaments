import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

export default function Announcements({ director }) {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState('')
  const [announcements, setAnnouncements] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'info' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!director?.id) return
    supabase.from('tournaments').select('id, name').eq('director_id', director.id).order('start_date', { ascending: false })
      .then(({ data }) => {
        setTournaments(data || [])
        if (data?.[0]) setSelectedTournament(data[0].id)
        setLoading(false)
      })
  }, [director?.id])

  useEffect(() => {
    if (!selectedTournament) return
    supabase.from('tournament_announcements').select('*').eq('tournament_id', selectedTournament).order('created_at', { ascending: false })
      .then(({ data }) => setAnnouncements(data || []))
  }, [selectedTournament])

  async function handleCreate() {
    if (!form.title.trim() || !form.message.trim()) return
    setSaving(true)
    const { data } = await supabase.from('tournament_announcements').insert({
      tournament_id: selectedTournament,
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      director_id: director.id,
    }).select().single()
    if (data) {
      setAnnouncements(prev => [data, ...prev])
      setForm({ title: '', message: '', type: 'info' })
      setShowCreate(false)
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('tournament_announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const typeColors = {
    info: { bg: '#071525', color: '#4a9eff', border: '#0a2540' },
    warning: { bg: '#1a1500', color: '#d4a017', border: '#3a3000' },
    urgent: { bg: '#1f0707', color: '#e05555', border: '#3a0a0a' },
    success: { bg: '#0d1a0a', color: '#5cb800', border: '#1a3a0a' },
  }

  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="ANNOUNCEMENTS" actions={
        <button onClick={() => setShowCreate(true)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + New Announcement
        </button>
      } />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ marginBottom: 20 }}>
          <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}
            style={{ ...inputStyle, minWidth: 280, width: 'auto' }}>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {announcements.length === 0 ? (
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center', color: '#4a5568' }}>
              No announcements yet. Create one to notify teams.
            </div>
          ) : announcements.map(a => {
            const c = typeColors[a.type] || typeColors.info
            return (
              <div key={a.id} style={{ background: '#080c12', border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}`, textTransform: 'uppercase' }}>{a.type}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>{a.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#4a5568' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 16 }}>🗑</button>
                  </div>
                </div>
                <p style={{ color: '#c0cce0', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{a.message}</p>
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 520 }}>
            <h3 style={{ margin: '0 0 20px', color: '#f0f4ff' }}>New Announcement</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                  <option value="success">Success</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Title</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Schedule Update" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Message</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Write your announcement..." rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {saving ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
