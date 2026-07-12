import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://np-backend-production.up.railway.app'

export default function Staff({ director }) {
  const [staff, setStaff] = useState([])
  const [refs, setRefs] = useState([])
  const [courts, setCourts] = useState([]) // courts across all active tournaments
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('staff')
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showAddRef, setShowAddRef] = useState(false)
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'scorekeeper', court_id: '' })
  const [refForm, setRefForm] = useState({ full_name: '', email: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [sendingLink, setSendingLink] = useState(null) // staff id being sent

  useEffect(() => {
    if (!director?.id) return
    loadAll()
  }, [director?.id])

  async function loadAll() {
    setLoading(true)
    const [staffRes, refsRes, courtsRes] = await Promise.all([
      supabase.from('tournament_staff').select('*, courts(id, name)').eq('director_id', director.id).order('created_at', { ascending: false }),
      supabase.from('refs').select('*').eq('director_id', director.id).order('full_name'),
      supabase
        .from('courts')
        .select('id, name, tournament_id, tournaments!inner(director_id, name, status)')
        .eq('tournaments.director_id', director.id)
        .in('tournaments.status', ['draft', 'registration_open', 'in_progress'])
        .eq('is_active', true),
    ])
    setStaff(staffRes.data || [])
    setRefs(refsRes.data || [])
    setCourts(courtsRes.data || [])
    setLoading(false)
  }

  async function handleAddStaff() {
    if (!staffForm.name.trim() || !staffForm.email.trim()) return
    setSaving(true)
    const { data } = await supabase.from('tournament_staff').insert({
      director_id: director.id,
      name: staffForm.name.trim(),
      email: staffForm.email.trim().toLowerCase(),
      role: staffForm.role,
      status: 'invited',
      court_id: staffForm.court_id || null,
    }).select('*, courts(id, name)').single()
    if (data) {
      setStaff(prev => [data, ...prev])
      setStaffForm({ name: '', email: '', role: 'scorekeeper', court_id: '' })
      setShowAddStaff(false)
    }
    setSaving(false)
  }

  async function handleAddRef() {
    if (!refForm.full_name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('refs').insert({
      director_id: director.id,
      full_name: refForm.full_name.trim(),
      email: refForm.email.trim() || null,
      phone: refForm.phone.trim() || null,
      is_active: true,
    }).select().single()
    if (data) {
      setRefs(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      setRefForm({ full_name: '', email: '', phone: '' })
      setShowAddRef(false)
    }
    setSaving(false)
  }

  async function handleRemoveStaff(id) {
    await supabase.from('tournament_staff').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  async function handleSendLoginLink(staffMember) {
    setSendingLink(staffMember.id)
    const { error } = await supabase.auth.signInWithOtp({
      email: staffMember.email,
      options: { emailRedirectTo: `${window.location.origin}/scoreboard` },
    })
    if (error) alert('Error sending link: ' + error.message)
    else alert(`Login link sent to ${staffMember.email}`)
    setSendingLink(null)
  }

  async function handleAssignCourt(staffId, courtId) {
    await supabase.from('tournament_staff').update({ court_id: courtId || null }).eq('id', staffId)
    setStaff(prev => prev.map(s => {
      if (s.id !== staffId) return s
      const court = courts.find(c => c.id === courtId) || null
      return { ...s, court_id: courtId || null, courts: court ? { id: court.id, name: court.name } : null }
    }))
  }

  async function handleToggleRef(id, is_active) {
    await supabase.from('refs').update({ is_active: !is_active }).eq('id', id)
    setRefs(prev => prev.map(r => r.id === id ? { ...r, is_active: !is_active } : r))
  }

  async function handleRemoveRef(id) {
    await supabase.from('refs').delete().eq('id', id)
    setRefs(prev => prev.filter(r => r.id !== id))
  }

  async function handleSMSRef(refId) {
    const { data: tournaments } = await supabase
      .from('tournaments').select('id, name')
      .eq('director_id', director.id)
      .in('status', ['draft', 'registration_open', 'in_progress'])
      .order('start_date')
    if (!tournaments?.length) { alert('No active tournaments found.'); return }
    const options = tournaments.map((t, i) => `${i + 1}. ${t.name}`).join('\n')
    const choice = prompt(`Select tournament:\n\n${options}\n\nEnter number:`)
    if (!choice) return
    const tournament = tournaments[parseInt(choice) - 1]
    if (!tournament) { alert('Invalid selection'); return }
    try {
      const res = await fetch(`${BACKEND}/api/sms/invite-ref`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refId, tournamentId: tournament.id, directorName: director.display_name }),
      })
      const data = await res.json()
      if (data.success) alert(`SMS sent to ref for ${tournament.name}!`)
      else alert('Error: ' + (data.error || 'Failed'))
    } catch (err) { alert('Backend error: ' + err.message) }
  }

  async function handleInviteRef(refId) {
    const { data: tournaments } = await supabase
      .from('tournaments').select('id, name')
      .eq('director_id', director.id)
      .in('status', ['draft', 'registration_open', 'in_progress'])
      .order('start_date')
    if (!tournaments?.length) { alert('No active tournaments found.'); return }
    const options = tournaments.map((t, i) => `${i + 1}. ${t.name}`).join('\n')
    const choice = prompt(`Select tournament to invite ref to:\n\n${options}\n\nEnter number:`)
    if (!choice) return
    const tournament = tournaments[parseInt(choice) - 1]
    if (!tournament) { alert('Invalid selection'); return }
    try {
      const res = await fetch(`${BACKEND}/api/tournaments/invite-ref`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refId, tournamentId: tournament.id, directorName: director.display_name }),
      })
      const data = await res.json()
      if (data.success) alert(`Invite sent to ref for ${tournament.name}!`)
      else alert('Error: ' + (data.error || 'Failed to send invite'))
    } catch (err) { alert('Could not reach backend: ' + err.message) }
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

  const scorekeepers = staff.filter(s => s.role === 'scorekeeper')
  const otherStaff = staff.filter(s => s.role !== 'scorekeeper')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="STAFF & REFS" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddRef(true)} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Add Ref
          </button>
          <button onClick={() => setShowAddStaff(true)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Add Staff
          </button>
        </div>
      } />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['staff', `Staff (${staff.length})`], ['refs', `Referees (${refs.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: activeTab === id ? '#5cb800' : 'transparent',
              color: activeTab === id ? '#04060a' : '#6b7a99',
              border: `1px solid ${activeTab === id ? '#5cb800' : '#1a2030'}`,
            }}>{label}</button>
          ))}
        </div>

        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div> : (
          <>
            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Scorekeepers section */}
                <div>
                  <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Scorekeepers — Court Assignment & Login
                  </div>
                  <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
                    {scorekeepers.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: '#4a5568' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📟</div>
                        <div style={{ color: '#c0cce0', fontWeight: 600, marginBottom: 6 }}>No scorekeepers yet</div>
                        <div style={{ fontSize: 13, marginBottom: 16 }}>Add a scorekeeper to assign them a court and send their login link</div>
                        <button onClick={() => { setStaffForm(f => ({ ...f, role: 'scorekeeper' })); setShowAddStaff(true) }} style={{ background: '#0d1a0a', color: '#5cb800', border: '1px solid #1a3a0a', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          + Add Scorekeeper
                        </button>
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#0a0f1a' }}>
                            {['Name', 'Email', 'Court Assignment', 'Status', 'Scoreboard Access', ''].map(h => (
                              <th key={h} style={th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scorekeepers.map(s => (
                            <tr key={s.id}>
                              <td style={{ ...td, color: '#d8e0f0', fontWeight: 600 }}>{s.name}</td>
                              <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{s.email}</td>
                              <td style={td}>
                                <select
                                  value={s.court_id || ''}
                                  onChange={e => handleAssignCourt(s.id, e.target.value)}
                                  style={{ ...inp, width: 'auto', minWidth: 140, padding: '6px 10px', fontSize: 12 }}
                                >
                                  <option value="">No court</option>
                                  {courts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                                {courts.length === 0 && (
                                  <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                                    Add courts in Schedule
                                  </div>
                                )}
                              </td>
                              <td style={td}>
                                <span style={{ fontSize: 11, color: s.accepted_at ? '#5cb800' : '#d4a017' }}>
                                  {s.accepted_at ? '● Active' : '○ Invited'}
                                </span>
                              </td>
                              <td style={td}>
                                <button
                                  onClick={() => handleSendLoginLink(s)}
                                  disabled={sendingLink === s.id}
                                  style={{ background: '#0d1a0a', color: '#5cb800', border: '1px solid #1a3a0a', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                                >
                                  {sendingLink === s.id ? 'Sending…' : '🔗 Send Login Link'}
                                </button>
                              </td>
                              <td style={td}>
                                <button onClick={() => handleRemoveStaff(s.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer' }}>🗑</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Other staff section */}
                {otherStaff.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                      Other Staff
                    </div>
                    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#0a0f1a' }}>
                            {['Name', 'Email', 'Role', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {otherStaff.map(s => {
                            const rc = roleColors[s.role] || roleColors.referee
                            return (
                              <tr key={s.id}>
                                <td style={{ ...td, color: '#d8e0f0', fontWeight: 600 }}>{s.name}</td>
                                <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{s.email}</td>
                                <td style={td}>
                                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`, textTransform: 'uppercase' }}>
                                    {s.role}
                                  </span>
                                </td>
                                <td style={td}>
                                  <span style={{ fontSize: 11, color: s.accepted_at ? '#5cb800' : '#d4a017' }}>
                                    {s.accepted_at ? '● Active' : '○ Invited'}
                                  </span>
                                </td>
                                <td style={td}>
                                  <button onClick={() => handleRemoveStaff(s.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer' }}>🗑</button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    <thead>
                      <tr style={{ background: '#0a0f1a' }}>
                        {['Name', 'Email', 'Phone', 'Status', 'Games', ''].map(h => <th key={h} style={th}>{h}</th>)}
                      </tr>
                    </thead>
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
                          <td style={td}>
                            <button onClick={() => handleInviteRef(r.id)} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600, marginRight: 6 }}>
                              📧 Invite
                            </button>
                            <button onClick={() => handleSMSRef(r.id)} style={{ background: '#1a1500', color: '#d4a017', border: '1px solid #3a3000', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                              💬 SMS
                            </button>
                            <button onClick={() => handleRemoveRef(r.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', marginLeft: 6 }}>🗑</button>
                          </td>
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
                <select value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value, court_id: '' }))} style={inp}>
                  <option value="scorekeeper">Scorekeeper</option>
                  <option value="referee">Referee</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {staffForm.role === 'scorekeeper' && (
                <div>
                  <label style={lbl}>Court Assignment</label>
                  <select value={staffForm.court_id} onChange={e => setStaffForm(p => ({ ...p, court_id: e.target.value }))} style={inp}>
                    <option value="">No court assigned yet</option>
                    {courts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {courts.length === 0 && (
                    <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>
                      No courts set up yet — add courts in the Schedule page, then assign here
                    </div>
                  )}
                </div>
              )}
            </div>
            {staffForm.role === 'scorekeeper' && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#5cb800', fontWeight: 600, marginBottom: 4 }}>After adding:</div>
                <div style={{ fontSize: 12, color: '#6b7a99' }}>
                  Use the "Send Login Link" button on the staff page to email them a one-tap link to the scoreboard. No password needed.
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowAddStaff(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddStaff} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'Adding...' : 'Add Staff'}
              </button>
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
              <button onClick={handleAddRef} disabled={saving} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'Adding...' : '+ Add Referee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
