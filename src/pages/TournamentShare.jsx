import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://np-backend-production.up.railway.app'

export default function TournamentShare({ tournament, director, teams }) {
  const [tab, setTab] = useState('share')
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showNewInvite, setShowNewInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    subject: `You're invited to ${tournament?.name || 'our tournament'}`,
    message: `Hi Coach,\n\nYou're invited to register for ${tournament?.name || 'our tournament'}.\n\nClick the link below to view details and register your team:\n\n{REGISTRATION_LINK}\n\nSpots are limited — register early!\n\nSee you on the court,\n${director?.display_name || 'The Tournament Director'}`,
    send_at: '',
    recurrence: 'none',
    recurrence_end: '',
    stop_on_register: true,
    recipients: '', // comma-separated emails
  })

  const publicUrl = tournament?.slug
    ? `${window.location.origin}/t/${tournament.slug}`
    : null

  useEffect(() => {
    if (tournament?.id) loadInvites()
  }, [tournament?.id])

  async function loadInvites() {
    setLoading(true)
    const { data } = await supabase
      .from('tournament_invites')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('created_at', { ascending: false })
    setInvites(data || [])
    setLoading(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveInvite() {
    if (!form.message.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('tournament_invites').insert({
      tournament_id: tournament.id,
      director_id: director.id,
      subject: form.subject.trim(),
      message: form.message.trim(),
      send_at: form.send_at || null,
      recurrence: form.recurrence,
      recurrence_end: form.recurrence_end || null,
      stop_on_register: form.stop_on_register,
      active: true,
    }).select().single()

    if (data && form.recipients.trim()) {
      const emails = form.recipients.split(',').map(e => e.trim()).filter(Boolean)
      await supabase.from('tournament_invite_recipients').insert(
        emails.map(email => ({ invite_id: data.id, email }))
      )
    }

    setSaving(false)
    setShowNewInvite(false)
    loadInvites()
    setForm(f => ({ ...f, send_at: '', recurrence: 'none', recurrence_end: '', recipients: '' }))
  }

  async function toggleInvite(id, active) {
    await supabase.from('tournament_invites').update({ active: !active }).eq('id', id)
    setInvites(prev => prev.map(i => i.id === id ? { ...i, active: !active } : i))
  }

  async function deleteInvite(id) {
    await supabase.from('tournament_invites').delete().eq('id', id)
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  async function sendNow(invite) {
    try {
      await fetch(`${BACKEND}/api/tournaments/send-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId: invite.id,
          tournamentId: tournament.id,
          subject: invite.subject,
          message: invite.message.replace('{REGISTRATION_LINK}', publicUrl),
          registrationLink: publicUrl,
          directorEmail: director.email,
        })
      })
      await supabase.from('tournament_invites').update({ last_sent_at: new Date().toISOString(), sent_count: (invite.sent_count || 0) + 1 }).eq('id', invite.id)
      loadInvites()
      alert('Invite sent!')
    } catch (e) {
      alert('Send failed — check backend connection')
    }
  }

  const inp = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }
  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }
  const td = { padding: '12px 14px', borderBottom: '1px solid #0e1320' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', letterSpacing: '0.5px' }}>SHARE & INVITES</div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>{tournament?.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['share', 'notifications'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t ? '#5cb800' : 'transparent', color: tab === t ? '#04060a' : '#6b7a99', border: `1px solid ${tab === t ? '#5cb800' : '#1a2030'}` }}>
              {t === 'share' ? '🔗 Share' : '📣 Notifications'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

        {/* SHARE TAB */}
        {tab === 'share' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Public Registration Link</div>
              {publicUrl ? (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input readOnly value={publicUrl} style={{ ...inp, flex: 1, color: '#5cb800', cursor: 'pointer' }} onClick={copyLink} />
                    <button onClick={copyLink} style={{ background: copied ? '#5cb800' : '#1a2a4a', color: copied ? '#04060a' : '#7eb3ff', border: `1px solid ${copied ? '#5cb800' : '#1a3a6a'}`, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {copied ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <button onClick={() => window.open(publicUrl, '_blank')} style={{ background: 'transparent', color: '#4a9eff', border: '1px solid #1a3a6a', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Preview Registration Page ↗
                  </button>
                </>
              ) : (
                <div style={{ color: '#4a5568', fontSize: 13 }}>No slug set for this tournament. Save the tournament first.</div>
              )}
            </div>

            {/* QR Code placeholder */}
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Share Options</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => {
                  const subject = encodeURIComponent(`Register for ${tournament?.name}`)
                  const body = encodeURIComponent(`Hi Coach,\n\nYou're invited to register for ${tournament?.name}.\n\nRegister here: ${publicUrl}`)
                  window.open(`mailto:?subject=${subject}&body=${body}`)
                }} style={{ background: '#1a2030', color: '#c0cce0', border: '1px solid #1a2030', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  ✉️ Email Invite
                </button>
                <button onClick={() => {
                  const text = encodeURIComponent(`Register for ${tournament?.name}: ${publicUrl}`)
                  window.open(`sms:?body=${text}`)
                }} style={{ background: '#1a2030', color: '#c0cce0', border: '1px solid #1a2030', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  💬 Text Invite
                </button>
                <button onClick={copyLink} style={{ background: '#1a2030', color: '#c0cce0', border: '1px solid #1a2030', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  🔗 Copy Link
                </button>
              </div>
            </div>

            {/* Registration stats */}
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Registration Status</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Registered', value: teams.filter(t => t.registration_status === 'approved').length, color: '#5cb800' },
                  { label: 'Pending', value: teams.filter(t => t.registration_status === 'pending').length, color: '#d4a017' },
                  { label: 'Spots Left', value: Math.max(0, (tournament?.max_teams || 0) - teams.length), color: '#4a9eff' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === 'notifications' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, color: '#c0cce0', fontWeight: 600 }}>Scheduled Invites</div>
                <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Teams that register will automatically stop receiving messages</div>
              </div>
              <button onClick={() => setShowNewInvite(true)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + New Notification
              </button>
            </div>

            {/* New invite form */}
            {showNewInvite && (
              <div style={{ background: '#080c12', border: '1px solid #1a3a0a', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4ff' }}>New Invite Notification</div>
                  <button onClick={() => setShowNewInvite(false)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={lbl}>Subject</label>
                    <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Message <span style={{ color: '#4a9eff' }}>(use {'{REGISTRATION_LINK}'} for the signup link)</span></label>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ ...inp, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Send First Message At</label>
                      <input type="datetime-local" value={form.send_at} onChange={e => setForm(f => ({ ...f, send_at: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Recurrence</label>
                      <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))} style={inp}>
                        <option value="none">One-time only</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                      </select>
                    </div>
                  </div>
                  {form.recurrence !== 'none' && (
                    <div>
                      <label style={lbl}>Stop Recurring After</label>
                      <input type="datetime-local" value={form.recurrence_end} onChange={e => setForm(f => ({ ...f, recurrence_end: e.target.value }))} style={inp} />
                    </div>
                  )}
                  <div>
                    <label style={lbl}>Recipient Emails <span style={{ color: '#4a5568' }}>(comma-separated — leave blank to send to all followers)</span></label>
                    <input value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))} style={inp} placeholder="coach@team1.com, coach@team2.com" />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#c0cce0' }}>
                    <input type="checkbox" checked={form.stop_on_register} onChange={e => setForm(f => ({ ...f, stop_on_register: e.target.checked }))} />
                    Stop sending to a team once they register
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button onClick={() => setShowNewInvite(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                  <button onClick={saveInvite} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    {saving ? 'Saving...' : '💾 Save Notification'}
                  </button>
                </div>
              </div>
            )}

            {/* Invites list */}
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
            ) : invites.length === 0 ? (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📣</div>
                <div style={{ color: '#c0cce0', fontWeight: 600, marginBottom: 8 }}>No notifications yet</div>
                <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 16 }}>Create a scheduled invite to automatically reach out to coaches</div>
                <button onClick={() => setShowNewInvite(true)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Create First Notification
                </button>
              </div>
            ) : (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Subject', 'Send At', 'Recurrence', 'Sent', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ ...td, color: '#d8e0f0', fontWeight: 600, maxWidth: 200 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.subject}</div>
                          <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>
                            {inv.stop_on_register && '🛑 Stops on register'}
                          </div>
                        </td>
                        <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>
                          {inv.send_at ? new Date(inv.send_at).toLocaleString() : 'Manual only'}
                        </td>
                        <td style={{ ...td, color: '#6b7a99', fontSize: 12, textTransform: 'capitalize' }}>{inv.recurrence}</td>
                        <td style={{ ...td, color: '#c0cce0' }}>{inv.sent_count || 0}x</td>
                        <td style={{ ...td }}>
                          <button onClick={() => toggleInvite(inv.id, inv.active)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, cursor: 'pointer', background: inv.active ? '#0d1a0a' : '#1a1500', color: inv.active ? '#5cb800' : '#d4a017', border: `1px solid ${inv.active ? '#1a3a0a' : '#3a3000'}` }}>
                            {inv.active ? 'Active' : 'Paused'}
                          </button>
                        </td>
                        <td style={{ ...td, display: 'flex', gap: 6 }}>
                          <button onClick={() => sendNow(inv)} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                            Send Now
                          </button>
                          <button onClick={() => deleteInvite(inv.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer' }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
