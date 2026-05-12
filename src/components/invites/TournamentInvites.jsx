import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://np-backend-production.up.railway.app'

const border = '#1a2030'
const muted = '#4a5568'
const text = '#d8e0f0'
const green = '#5cb800'
const surface = '#080c12'

const inputStyle = {
  background: '#0e1320', border: `1px solid ${border}`,
  color: text, borderRadius: 8, padding: '9px 12px',
  fontSize: 13, outline: 'none', width: '100%',
}

const STATUS_COLORS = {
  registered: { bg: 'rgba(92,184,0,0.12)', color: green, border: 'rgba(92,184,0,0.3)', label: 'Registered' },
  opened:     { bg: 'rgba(74,158,255,0.1)', color: '#4a9eff', border: 'rgba(74,158,255,0.3)', label: 'Opened' },
  invited:    { bg: 'rgba(74,85,104,0.2)', color: '#6b7a99', border: '#2a3550', label: 'Invited' },
}

function statusFor(rec) {
  if (rec.registered) return 'registered'
  if (rec.opened_at) return 'opened'
  return 'invited'
}

export default function TournamentInvites({ tournament, director }) {
  const [invites, setInvites] = useState([])       // tournament_invites rows
  const [recipients, setRecipients] = useState([]) // all recipients across invites
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  // Compose form
  const [showCompose, setShowCompose] = useState(false)
  const [subject, setSubject] = useState(`You're invited to ${tournament?.name}`)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [composeError, setComposeError] = useState('')
  const [activeInviteId, setActiveInviteId] = useState(null)

  // Add recipient form
  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [orgSearch, setOrgSearch] = useState('')
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [addError, setAddError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  const baseUrl = window.location.origin

  async function load() {
    setLoading(true)

    const { data: inv } = await supabase
      .from('tournament_invites')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('created_at', { ascending: false })

    setInvites(inv || [])

    if (inv?.length) {
      const inviteIds = inv.map(i => i.id)
      const { data: recs } = await supabase
        .from('tournament_invite_recipients')
        .select('*, bt_organizations(id, org_name)')
        .in('invite_id', inviteIds)
        .order('sent_at', { ascending: false })
      setRecipients(recs || [])

      // Default to first invite
      if (!activeInviteId && inv[0]) setActiveInviteId(inv[0].id)
    }

    const { data: orgData } = await supabase
      .from('bt_organizations')
      .select('id, org_name')
      .order('org_name')
    setOrgs(orgData || [])

    setLoading(false)
  }

  useEffect(() => { if (tournament?.id) load() }, [tournament?.id])

  const activeInvite = invites.find(i => i.id === activeInviteId)
  const activeRecipients = recipients.filter(r => r.invite_id === activeInviteId)

  const stats = useMemo(() => ({
    total:      activeRecipients.length,
    opened:     activeRecipients.filter(r => r.opened_at).length,
    registered: activeRecipients.filter(r => r.registered).length,
  }), [activeRecipients])

  const filteredOrgs = useMemo(() =>
    orgs.filter(o => o.org_name.toLowerCase().includes(orgSearch.toLowerCase())).slice(0, 8),
    [orgs, orgSearch]
  )

  async function handleCreateInvite() {
    if (!subject.trim()) return
    setSaving(true)
    setComposeError('')

    const { data, error } = await supabase
      .from('tournament_invites')
      .insert({
        tournament_id: tournament.id,
        director_id: director.id,
        subject: subject.trim(),
        message: message.trim(),
      })
      .select()
      .single()

    setSaving(false)
    if (error) { setComposeError(error.message); return }

    setShowCompose(false)
    setActiveInviteId(data.id)
    await load()
  }

  async function handleAddRecipient() {
    if (!activeInviteId) return
    if (!recipientEmail.trim() && !selectedOrg) { setAddError('Email or org required'); return }
    setAddingRecipient(true)
    setAddError('')

    const { error } = await supabase
      .from('tournament_invite_recipients')
      .insert({
        invite_id: activeInviteId,
        email: recipientEmail.trim() || null,
        org_id: selectedOrg?.id || null,
        phone: recipientPhone.trim() || null,
      })

    setAddingRecipient(false)
    if (error) { setAddError(error.message); return }

    setShowAddRecipient(false)
    setSelectedOrg(null)
    setOrgSearch('')
    setRecipientEmail('')
    setRecipientPhone('')
    await load()
  }

  async function handleSendInvites() {
    if (!activeInviteId) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch(`${BACKEND}/api/tournaments/send-team-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: activeInviteId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setSendResult({ emailSent: data.emailSent, smsSent: data.smsSent })
      await load()
    } catch (err) {
      setSendResult({ error: err.message })
    } finally {
      setSending(false)
    }
  }

  function copyInviteLink(rec) {
    navigator.clipboard.writeText(`${baseUrl}/invite/${rec.token}`)
  }

  if (loading) return (
    <div style={{ padding: 40, color: muted, fontSize: 13 }}>Loading invites...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, color: text, fontSize: 15 }}>Team Invites</div>
          <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>
            Invite org directors to register their teams for this tournament.
          </div>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          style={{ background: green, color: '#04060a', border: 'none', padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          + New Invite
        </button>
      </div>

      {/* Invite selector */}
      {invites.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {invites.map(inv => (
            <button
              key={inv.id}
              onClick={() => setActiveInviteId(inv.id)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid',
                borderColor: inv.id === activeInviteId ? green : border,
                background: inv.id === activeInviteId ? 'rgba(92,184,0,0.1)' : 'transparent',
                color: inv.id === activeInviteId ? green : muted,
                fontWeight: 600,
              }}
            >
              {inv.subject || 'Untitled Invite'}
            </button>
          ))}
        </div>
      )}

      {invites.length === 0 ? (
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <div style={{ color: muted, fontSize: 13, marginBottom: 16 }}>No invites yet. Create one to start inviting orgs.</div>
          <button
            onClick={() => setShowCompose(true)}
            style={{ background: green, color: '#04060a', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Create First Invite
          </button>
        </div>
      ) : (
        <>
          {/* Send controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSendInvites}
              disabled={sending || activeRecipients.length === 0}
              style={{
                background: sending || activeRecipients.length === 0 ? '#1a2030' : green,
                color: sending || activeRecipients.length === 0 ? muted : '#04060a',
                border: 'none', padding: '9px 18px', borderRadius: 8,
                fontWeight: 700, fontSize: 13,
                cursor: sending || activeRecipients.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Sending...' : `Send Invites (${activeRecipients.length})`}
            </button>
            {sendResult && !sendResult.error && (
              <div style={{ fontSize: 12, color: green }}>
                ✓ {sendResult.emailSent} email{sendResult.emailSent !== 1 ? 's' : ''}{sendResult.smsSent > 0 ? `, ${sendResult.smsSent} SMS` : ''} sent
              </div>
            )}
            {sendResult?.error && (
              <div style={{ fontSize: 12, color: '#e05555' }}>Error: {sendResult.error}</div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Invited', value: stats.total, color: '#6b7a99' },
              { label: 'Opened', value: stats.opened, color: '#4a9eff' },
              { label: 'Registered', value: stats.registered, color: green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color, lineHeight: 1 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Recipients table */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 1 }}>
                Recipients {activeRecipients.length > 0 && `(${activeRecipients.length})`}
              </div>
              <button
                onClick={() => setShowAddRecipient(true)}
                style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                + Add Org
              </button>
            </div>

            {activeRecipients.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: muted, fontSize: 13 }}>
                No recipients yet. Add orgs to send invites to.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0f1a' }}>
                    {['Organization', 'Email', 'Status', 'Sent', 'Invite Link'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${border}` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRecipients.map(rec => {
                    const s = statusFor(rec)
                    const sc = STATUS_COLORS[s]
                    return (
                      <tr key={rec.id} style={{ borderBottom: `1px solid #0e1320` }}>
                        <td style={{ padding: '12px 14px', color: text, fontWeight: 600, fontSize: 13 }}>
                          {rec.bt_organizations?.org_name || rec.team_name || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: muted, fontSize: 12 }}>
                          {rec.email || '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                            fontSize: 10, fontWeight: 700,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: muted, fontSize: 12 }}>
                          {rec.sent_at ? new Date(rec.sent_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {rec.token ? (
                            <button
                              onClick={() => copyInviteLink(rec)}
                              title={`${baseUrl}/invite/${rec.token}`}
                              style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Copy Link
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Compose invite modal */}
      {showCompose && (
        <Modal onClose={() => setShowCompose(false)} title="Create Invite">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Subject">
              <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Message (optional)">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                placeholder="Details about the tournament, divisions, requirements..."
              />
            </Field>
            {composeError && <div style={{ color: '#e05555', fontSize: 12 }}>{composeError}</div>}
            <ModalActions
              onCancel={() => setShowCompose(false)}
              onConfirm={handleCreateInvite}
              confirmLabel={saving ? 'Creating...' : 'Create Invite'}
              disabled={saving}
            />
          </div>
        </Modal>
      )}

      {/* Add recipient modal */}
      {showAddRecipient && (
        <Modal onClose={() => setShowAddRecipient(false)} title="Add Organization">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Search Organization">
              <input
                value={orgSearch}
                onChange={e => { setOrgSearch(e.target.value); setSelectedOrg(null) }}
                style={inputStyle}
                placeholder="Type to search..."
              />
              {orgSearch && !selectedOrg && (
                <div style={{ background: '#0a0f1a', border: `1px solid ${border}`, borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                  {filteredOrgs.length === 0 ? (
                    <div style={{ padding: '10px 12px', color: muted, fontSize: 12 }}>No orgs found</div>
                  ) : filteredOrgs.map(org => (
                    <div
                      key={org.id}
                      onClick={() => { setSelectedOrg(org); setOrgSearch(org.org_name); setRecipientEmail('') }}
                      style={{ padding: '10px 12px', cursor: 'pointer', color: text, fontSize: 13, borderBottom: `1px solid ${border}` }}
                    >
                      {org.org_name}
                    </div>
                  ))}
                </div>
              )}
              {selectedOrg && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(92,184,0,0.1)', border: '1px solid rgba(92,184,0,0.3)', borderRadius: 6, padding: '4px 10px' }}>
                  <span style={{ color: green, fontSize: 12, fontWeight: 700 }}>{selectedOrg.org_name}</span>
                  <button onClick={() => { setSelectedOrg(null); setOrgSearch('') }} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                </div>
              )}
            </Field>
            <Field label="Director Email">
              <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} style={inputStyle} placeholder="director@org.com" type="email" />
            </Field>
            <Field label="Phone (optional)">
              <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} style={inputStyle} placeholder="(555) 000-0000" type="tel" />
            </Field>
            {addError && <div style={{ color: '#e05555', fontSize: 12 }}>{addError}</div>}
            <ModalActions
              onCancel={() => setShowAddRecipient(false)}
              onConfirm={handleAddRecipient}
              confirmLabel={addingRecipient ? 'Adding...' : 'Add & Generate Link'}
              disabled={addingRecipient}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 480 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, color: '#f0f4ff', fontSize: 16, marginBottom: 20 }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ onCancel, onConfirm, confirmLabel, disabled }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
      <button onClick={onCancel} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
        Cancel
      </button>
      <button onClick={onConfirm} disabled={disabled} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: disabled ? 0.6 : 1 }}>
        {confirmLabel}
      </button>
    </div>
  )
}
