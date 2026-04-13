import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

export default function Staff({ director }) {
  const [staff, setStaff] = useState([])
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('staff')
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showAddRef, setShowAddRef] = useState(false)
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'referee' })
  const [refForm, setRefForm] = useState({ full_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!director?.id) return
    loadAll()
  }, [director?.id])

  async function loadAll() {
    setLoading(true)
    const [staffRes, refsRes] = await Promise.all([
      supabase.from('tournament_staff').select('*').eq('director_id', director.id).order('created_at', { ascending: false }),
      supabase.from('refs').select('*').eq('director_id', director.id).order('full_name'),
    ])
    setStaff(staffRes.data || [])
    setRefs(refsRes.data || [])
    setLoading(false)
  }

  async function handleAddStaff() {
    if (!staffForm.name.trim() || !staffForm.email.trim()) return
    setSaving(true)
    const { data } = await supabase.from('tournament_staff').insert({
      director_id: director.id, name: staffForm.name.trim(),
      email: staffForm.email.trim(), role: staffForm.role, status: 'invited',
    }).select().single()
    if (data) { setStaff(prev => [data, ...prev]); setStaffForm({ name: '', email: '', role: 'referee' }); setShowAddStaff(false) }
    setSaving(false)
  }

  async function handleAddRef() {
    if (!refForm.full_name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('refs').insert({
      director_id: director.id, full_name: refForm.full_name.trim(),
      email: refForm.email.trim() || null, phone: refForm.phone.trim() || null, is_active: true,
    }).select().single()
    if (data) { setRefs(prev => [...prev, data].sort((a,b) => a.full_name.localeCompare(b.full_name))); setRefForm({ full_name: '', email: '', phone: '' }); setShowAddRef(false) }
    setSaving(false)
  }

  async function handleRemoveStaff(id) {
    await supabase.from('tournament_staff').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  async function handleToggleRef(id, is_active) {
    await supabase.from('refs').update({ is_active: !is_active }).eq('id', id)
    setRefs(prev => prev.map(r => r.id === id ? { ...r, is_active: !is_active } : r))
  }

  async function handleRemoveRef(id) {
    await supabase.from('refs').delete().eq('id', id)
    setRefs(prev => prev.filter(r => r.id !== id))
  }

  const roleColors = {
    referee: { bg: '#071525', color: '#4a9eff', border: '#0a2540' },
    scorekeeper: { bg: '#0d1a0a', color: '#5cb800', border: '#1a3a0a' },
    coordinator: { bg: '#1a1500', color: '#d4a017', border: '#3a3000' },
    admin: { bg: '#1f0707', color: '#e05555', border: '#3a0a0a' },
  }

  const inp = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%' }
  const lbl = { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }
  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }
  const td = { padding: '12px 14px', borderBottom: '1px solid #0e1320' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="STAFF & REFS" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowAddRef(true) }} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Add Ref
          </button>
          <button onClick={() => { setShowAddStaff(true) }} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Add Staff
          </button>
        </div>
      } />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['staff', `Staff (${staff.length})`], ['refs', `Referees (${refs.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: activeTab === id ? '#5cb800' : 'transparent', color: activeTab === id ? '#04060a' : '#6b7a99',
              border: `1px solid ${activeTab === id ? '#5cb800' : '#1a2030'}`,
            }}>{label}</button>
          ))}
        </div>

        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div> : (
          <>
            {/* Staff Tab */}
            {activeTab === 'staff' && (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
                {staff.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No staff added yet</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#0a0f1a' }}>{['Name','Email','Role','Status',''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {staff.map(s => {
                        const rc = roleColors[s.role] || roleColors.referee
                        return (
                          <tr key={s.id}>
                            <td style={{ ...td, color: '#d8e0f0', fontWeight: 600 }}>{s.name}</td>
                            <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{s.email}</td>
                            <td style={td}><span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, textTransform: 'uppercase' }}>{s.role}</span></td>
                            <td style={td}><span style={{ fontSize: 11, color: s.status === 'active' ? '#5cb800' : '#d4a017' }}>{s.status}</span></td>
                            <td style={td}><button onClick={() => handleRemoveStaff(s.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer' }}>🗑</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Refs Tab */}
            {activeTab === 'refs' && (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
                {refs.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🦓</div>
                    <div style={{ color: '#c0cce0', fontWeight: 600, marginBottom: 8 }}>No refs added yet</div>
                    <div style={{ fontSize: 13, marginBottom: 16 }}>Add refs here to assign them to games in the Schedule page</div>
                    <button onClick={() => setShowAddRef(true)} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      + Add First Ref
                    </button>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#0a0f1a' }}>{['Name','Email','Phone','Status','Games',''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {refs.map(r => (
                        <tr key={r.id}>
                          <td style={{ ...td, color: '#d8e0f0', fontWeight: 600 }}>🦓 {r.full_name}</td>
                          <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{r.email || '—'}</td>
                          <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{r.phone || '—'}</td>
                          <td style={td}>
                            <button onClick={() => handleToggleRef(r.id, r.is_active)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, cursor: 'pointer', background: r.is_active ? '#0d1a0a' : '#1a1500', color: r.is_active ? '#5cb800' : '#d4a017', border: `1px solid ${r.is_active ? '#1a3a0a' : '#3a3000'}` }}>
                              {r.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td style={{ ...td, color: '#4a5568', fontSize: 12 }}>—</td>
                          <td style={td}><button onClick={() => handleRemoveRef(r.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer' }}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 440 }}>
            <h3 style={{ margin: '0 0 20px', color: '#f0f4ff' }}>Add Staff Member</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Name</label><input value={staffForm.name} onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))} style={inp} autoFocus /></div>
              <div><label style={lbl}>Email</label><input type="email" value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} style={inp} /></div>
              <div>
                <label style={lbl}>Role</label>
                <select value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))} style={inp}>
                  <option value="referee">Referee</option>
                  <option value="scorekeeper">Scorekeeper</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddStaff(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddStaff} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{saving ? 'Adding...' : 'Add Staff'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ref Modal */}
      {showAddRef && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 440 }}>
            <h3 style={{ margin: '0 0 4px', color: '#f0f4ff' }}>Add Referee</h3>
            <p style={{ color: '#4a5568', fontSize: 12, margin: '0 0 20px' }}>Refs added here can be assigned to games in the Schedule page</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Full Name *</label><input value={refForm.full_name} onChange={e => setRefForm(p => ({ ...p, full_name: e.target.value }))} style={inp} autoFocus placeholder="e.g. Marcus Williams" /></div>
              <div><label style={lbl}>Email</label><input type="email" value={refForm.email} onChange={e => setRefForm(p => ({ ...p, email: e.target.value }))} style={inp} placeholder="optional" /></div>
              <div><label style={lbl}>Phone</label><input value={refForm.phone} onChange={e => setRefForm(p => ({ ...p, phone: e.target.value }))} style={inp} placeholder="optional" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddRef(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddRef} disabled={saving} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>{saving ? 'Adding...' : '+ Add Referee'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
