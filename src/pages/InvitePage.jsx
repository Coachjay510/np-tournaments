import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const bg = '#04060a'
const surface = '#080c12'
const border = '#1a2030'
const text = '#d8e0f0'
const muted = '#4a5568'
const green = '#5cb800'
const blue = '#4a9eff'

const card = {
  background: surface,
  border: `1px solid ${border}`,
  borderRadius: 12,
  padding: 20,
}

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recipient, setRecipient] = useState(null)
  const [invite, setInvite] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [orgTeams, setOrgTeams] = useState([])
  const [selectedTeamIds, setSelectedTeamIds] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [session, setSession] = useState(null)

  // Auth state
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [sendingMagic, setSendingMagic] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Load invite by token
  useEffect(() => {
    if (!token) return
    async function load() {
      setLoading(true)

      // Load recipient + invite + tournament in one shot
      const { data: rec, error: recErr } = await supabase
        .from('tournament_invite_recipients')
        .select(`
          *,
          tournament_invites (
            *,
            tournaments (
              id, name, start_date, end_date, location, venue_name,
              city, state, registration_fee, entry_fee, description,
              registration_deadline, status
            )
          )
        `)
        .eq('token', token)
        .single()

      if (recErr || !rec) {
        setError('This invite link is invalid or has expired.')
        setLoading(false)
        return
      }

      setRecipient(rec)
      setInvite(rec.tournament_invites)
      setTournament(rec.tournament_invites?.tournaments)

      // Mark opened
      if (!rec.opened_at) {
        await supabase
          .from('tournament_invite_recipients')
          .update({ opened_at: new Date().toISOString() })
          .eq('token', token)
      }

      // Load org teams if org is linked
      if (rec.org_id) {
        const { data: teams } = await supabase
          .from('bt_master_teams')
          .select('id, display_name, ranking_division_key, age_group, gender')
          .eq('organization_id', rec.org_id)
          .is('merged_into_id', null)
          .order('display_name')
        setOrgTeams(teams || [])
      }

      setLoading(false)
    }
    load()
  }, [token])

  async function sendMagicLink() {
    if (!email.trim()) return
    setSendingMagic(true)
    const redirectTo = `${window.location.origin}/invite/${token}`
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })
    setSendingMagic(false)
    if (err) {
      setError(err.message)
    } else {
      setMagicSent(true)
    }
  }

  function toggleTeam(id) {
    setSelectedTeamIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleRegister() {
    if (selectedTeamIds.size === 0) return
    setSubmitting(true)
    setError('')

    const tournamentId = tournament?.id
    const alreadyRegistered = []
    const toInsert = []

    for (const teamId of selectedTeamIds) {
      // Check if already registered
      const { data: existing } = await supabase
        .from('tournament_teams')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('team_id', teamId)
        .maybeSingle()

      if (existing) {
        alreadyRegistered.push(teamId)
      } else {
        toInsert.push({
          tournament_id: tournamentId,
          team_id: Number(teamId),
          approval_status: tournament.require_approval ? 'pending' : 'approved',
          payment_status: 'unpaid',
        })
      }
    }

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from('tournament_teams')
        .insert(toInsert)

      if (insertErr) {
        setError(`Registration failed: ${insertErr.message}`)
        setSubmitting(false)
        return
      }
    }

    // Mark recipient as registered
    await supabase
      .from('tournament_invite_recipients')
      .update({ registered: true, registered_at: new Date().toISOString() })
      .eq('token', token)

    setSubmitting(false)
    setSubmitted(true)
  }

  // ─── Render states ──────────────────────────────────────────
  if (loading) return (
    <PageWrap>
      <div style={{ color: muted, fontSize: 14 }}>Loading invite...</div>
    </PageWrap>
  )

  if (error && !recipient) return (
    <PageWrap>
      <div style={{ color: '#e05555', fontSize: 14 }}>{error}</div>
    </PageWrap>
  )

  if (submitted) return (
    <PageWrap>
      <div style={{ ...card, textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: green, marginBottom: 8 }}>
          YOU'RE IN
        </div>
        <div style={{ color: text, fontSize: 14, marginBottom: 4 }}>
          {selectedTeamIds.size} team{selectedTeamIds.size !== 1 ? 's' : ''} registered for
        </div>
        <div style={{ color: green, fontWeight: 700, fontSize: 16 }}>{tournament?.name}</div>
        <div style={{ color: muted, fontSize: 12, marginTop: 16 }}>
          The tournament director will be in touch with more details.
        </div>
      </div>
    </PageWrap>
  )

  const fee = tournament?.registration_fee || tournament?.entry_fee || 0
  const deadline = tournament?.registration_deadline
    ? new Date(tournament.registration_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <PageWrap>
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tournament header */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
            Tournament Invite
          </div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: green, letterSpacing: 1, marginBottom: 12 }}>
            {tournament?.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Date', value: tournament?.start_date ? `${fmt(tournament.start_date)}${tournament.end_date && tournament.end_date !== tournament.start_date ? ` – ${fmt(tournament.end_date)}` : ''}` : '—' },
              { label: 'Location', value: [tournament?.venue_name, tournament?.city, tournament?.state].filter(Boolean).join(', ') || '—' },
              { label: 'Entry Fee', value: fee ? `$${Number(fee).toLocaleString()}` : 'Free' },
              { label: 'Deadline', value: deadline || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                <div style={{ color: text, fontSize: 13, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
          {invite?.message && (
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#0a0f1a', borderRadius: 8, borderLeft: `3px solid ${blue}`, color: text, fontSize: 13, lineHeight: 1.6 }}>
              {invite.message}
            </div>
          )}
        </div>

        {/* Auth gate */}
        {!session ? (
          <div style={{ ...card }}>
            <div style={{ fontWeight: 700, color: text, fontSize: 15, marginBottom: 6 }}>
              Sign in to register your teams
            </div>
            <div style={{ color: muted, fontSize: 12, marginBottom: 16 }}>
              Enter your email and we'll send you a sign-in link — no password needed.
            </div>
            {magicSent ? (
              <div style={{ color: green, fontSize: 13 }}>
                ✓ Check your email for a sign-in link, then come back to this page.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                  placeholder="your@email.com"
                  style={{ flex: 1, background: '#0e1320', border: `1px solid ${border}`, color: text, borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
                />
                <button
                  onClick={sendMagicLink}
                  disabled={sendingMagic || !email.trim()}
                  style={{ background: green, color: '#04060a', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: sendingMagic ? 0.6 : 1 }}
                >
                  {sendingMagic ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            )}
            {error && <div style={{ color: '#e05555', fontSize: 12, marginTop: 10 }}>{error}</div>}
          </div>
        ) : orgTeams.length === 0 ? (
          <div style={{ ...card }}>
            <div style={{ color: muted, fontSize: 13 }}>
              No teams found for your organization. Contact the tournament director if you think this is a mistake.
            </div>
          </div>
        ) : recipient?.registered ? (
          <div style={{ ...card, borderColor: 'rgba(92,184,0,0.3)', background: 'rgba(92,184,0,0.05)' }}>
            <div style={{ color: green, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>✓ Already Registered</div>
            <div style={{ color: muted, fontSize: 13 }}>Your teams have been submitted for this tournament.</div>
          </div>
        ) : (
          <div style={{ ...card }}>
            <div style={{ fontWeight: 700, color: text, fontSize: 15, marginBottom: 4 }}>
              Select your teams
            </div>
            <div style={{ color: muted, fontSize: 12, marginBottom: 16 }}>
              Choose which teams from your organization to enter.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {orgTeams.map(team => {
                const selected = selectedTeamIds.has(team.id)
                return (
                  <div
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${selected ? 'rgba(92,184,0,0.4)' : border}`,
                      background: selected ? 'rgba(92,184,0,0.06)' : '#0a0f1a',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${selected ? green : '#2a3550'}`,
                      background: selected ? green : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <span style={{ color: '#04060a', fontSize: 11, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: text, fontWeight: 600, fontSize: 13 }}>{team.display_name}</div>
                      <div style={{ color: muted, fontSize: 11, marginTop: 2 }}>
                        {[team.age_group, team.gender, team.ranking_division_key].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {error && <div style={{ color: '#e05555', fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <button
              onClick={handleRegister}
              disabled={submitting || selectedTeamIds.size === 0}
              style={{
                width: '100%', background: selectedTeamIds.size > 0 ? green : '#1a2030',
                color: selectedTeamIds.size > 0 ? '#04060a' : muted,
                border: 'none', padding: '13px', borderRadius: 8,
                fontWeight: 700, fontSize: 14, cursor: selectedTeamIds.size > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {submitting
                ? 'Registering...'
                : selectedTeamIds.size > 0
                  ? `Register ${selectedTeamIds.size} Team${selectedTeamIds.size !== 1 ? 's' : ''}`
                  : 'Select at least one team'}
            </button>
          </div>
        )}
      </div>
    </PageWrap>
  )
}

function fmt(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PageWrap({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center',
      padding: '48px 16px',
    }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: 2, marginBottom: 32 }}>
        NP TOURNAMENTS
      </div>
      {children}
    </div>
  )
}
