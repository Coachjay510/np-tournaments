import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

export default function Staff({ director }) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'referee' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!director?.id) return
    loadStaff()
  }, [director?.id])

  async function loadStaff() {
    const { data } = await supabase.from('tournament_staff').select('*').eq('director_id', director.id).order('created_at', { ascending: false })
    setStaff(data || [])
    setLoading(false)
  }

  async function handleInvite() {
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    const { data } = await supabase.from('tournament_staff').insert({
      director_id: director.id,
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: 'invited',
    }).select().single()
    if (data) { setStaff(prev => [data, ...prev]); setForm({ name: '', email: '', role: 'referee' }); setShowInvite(false) }
    setSaving(false)
  }

  async function handleRemove(id) {
    await supabase.from('tournament_staff').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  const roleColors = {
    referee: { bg: '#071525', color: '#4a9eff', border: '#0a2540' },
    scorekeeper: { bg: '#0d1a0a', color: '#5cb800', border: '#1a3a0a' },
    coordinator: { bg: '#1a1500', color: '#d4a017', border: '#3a3000' },
    admin: { bg: '#1f0707', color: '#e05555', border: '#3a0a0a' },
  }

  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="STAFF" actions={
        <button onClick={() => setShowInvite(true)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Add Staff
        </button>
      } />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>STAFF MEMBERS ({staff.length})</div>
            </div>
            {staff.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No staff added yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0f1a' }}>
                    {['Name', 'Email', 'Role', 'Status', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => {
                    const rc = roleColors[s.role] || roleColors.referee
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #0e1320' }}>
                        <td style={{ padding: '12px 14px', color: '#d8e0f0', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '12px 14px', color: '#6b7a99', fontSize: 12 }}>{s.email}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, textTransform: 'uppercase' }}>{s.role}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 11, color: s.status === 'active' ? '#5cb800' : '#d4a017' }}>{s.status}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button onClick={() => handleRemove(s.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 440 }}>
            <h3 style={{ margin: '0 0 20px', color: '#f0f4ff' }}>Add Staff Member</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                  <option value="referee">Referee</option>
                  <option value="scorekeeper">Scorekeeper</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowInvite(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleInvite} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {saving ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
