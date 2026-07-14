import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// ─── helpers ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

function fmt(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

function fmtTime(t) {
  if (!t) return ''
  const [hh, mm] = t.split(':')
  const h = Number(hh)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${mm} ${ampm}`
}

function Stars({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= rating ? '#d4a017' : '#2d3748', fontSize: 18 }}>★</span>
      ))}
    </span>
  )
}

// ─── shared styles ───────────────────────────────────────────────────────────

const S = {
  page: {
    background: '#04060a',
    minHeight: '100vh',
    fontFamily: 'system-ui, sans-serif',
    color: '#d8e0f0',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '14px 20px',
    borderBottom: '1px solid #1a2030',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  logoText: {
    fontFamily: 'Anton, sans-serif',
    fontSize: 18,
    color: '#5cb800',
    letterSpacing: 1,
    lineHeight: 1,
  },
  signedInAs: {
    fontSize: 12,
    color: '#6b7a99',
  },
  signOutBtn: {
    background: 'transparent',
    border: '1px solid #1a2030',
    color: '#6b7a99',
    fontSize: 12,
    padding: '6px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    marginLeft: 8,
  },
  body: {
    flex: 1,
    padding: '24px 16px',
    maxWidth: 600,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  card: {
    background: '#080c12',
    border: '1px solid #1a2030',
    borderRadius: 12,
    padding: '18px 20px',
    marginBottom: 16,
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: '#0e1320',
    border: '2px solid #1a2030',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Anton, sans-serif',
    fontSize: 22,
    color: '#5cb800',
    flexShrink: 0,
  },
  tabRow: {
    display: 'flex',
    borderBottom: '1px solid #1a2030',
    marginBottom: 20,
    gap: 0,
    overflowX: 'auto',
  },
  assignCard: {
    background: '#080c12',
    border: '1px solid #1a2030',
    borderRadius: 12,
    padding: '16px 18px',
    marginBottom: 10,
  },
  matchup: {
    fontFamily: 'Anton, sans-serif',
    fontSize: 15,
    color: '#f0f4ff',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: '#6b7a99',
    marginBottom: 2,
  },
  pill: (color) => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.5px',
    padding: '3px 9px',
    borderRadius: 20,
    background: color === 'green' ? '#0d2010' : color === 'red' ? '#1f0707' : '#0e1520',
    color: color === 'green' ? '#5cb800' : color === 'red' ? '#ff9d7a' : '#6b7a99',
    border: `1px solid ${color === 'green' ? '#1e4010' : color === 'red' ? '#3a1010' : '#1a2030'}`,
    textTransform: 'uppercase',
  }),
  actionRow: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  btnConfirm: {
    flex: 1,
    minWidth: 100,
    background: '#5cb800',
    color: '#04060a',
    border: 'none',
    borderRadius: 9,
    padding: '11px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Anton, sans-serif',
    letterSpacing: '0.5px',
  },
  btnDecline: {
    flex: 1,
    minWidth: 100,
    background: 'transparent',
    color: '#ff9d7a',
    border: '1px solid #3a1010',
    borderRadius: 9,
    padding: '11px 14px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#4a5568',
    fontSize: 14,
    lineHeight: 1.8,
  },
  label: {
    fontSize: 11,
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'block',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: '#0e1320',
    border: '1px solid #1a2030',
    color: '#d8e0f0',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 14,
  },
  primaryBtn: (disabled) => ({
    width: '100%',
    background: disabled ? '#1a2030' : '#5cb800',
    color: disabled ? '#4a5568' : '#04060a',
    border: 'none',
    padding: '13px',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'Anton, sans-serif',
    letterSpacing: '0.5px',
  }),
}

const TABS = ['Upcoming', 'Past', 'Reviews', 'Earnings']

// ─── Main component ──────────────────────────────────────────────────────────

export default function MyRef() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [refRecord, setRefRecord] = useState(null)
  const [refLoading, setRefLoading] = useState(false)

  // ── OTP form ────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [authError, setAuthError] = useState(null)

  // ── Tab / data ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('Upcoming')
  const [assignments, setAssignments] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState({}) // id -> bool

  // ── Auth init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session) loadRefRecord(session.user.email)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadRefRecord(session.user.email)
      } else {
        setRefRecord(null)
        setAssignments([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadRefRecord(userEmail) {
    setRefLoading(true)
    const { data } = await supabase
      .from('refs')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle()
    setRefRecord(data || null)
    setRefLoading(false)
    if (data) loadAssignments(data.id)
  }

  async function loadAssignments(refId) {
    setDataLoading(true)
    const { data } = await supabase
      .from('ref_assignments')
      .select(`
        id,
        game_id,
        ref_id,
        tournament_id,
        role,
        status,
        confirmed_at,
        pay_amount,
        feedback,
        rating,
        feedback_approved,
        created_at,
        scheduled_games (
          id,
          home_team_name,
          away_team_name,
          scheduled_date,
          scheduled_time,
          court_id,
          round,
          pool_name,
          status,
          home_score,
          away_score
        ),
        tournaments (
          id,
          name,
          venue_name,
          city,
          state
        )
      `)
      .eq('ref_id', refId)
      .order('created_at', { ascending: false })

    setAssignments(data || [])
    setDataLoading(false)
  }

  async function handleSendOtp() {
    if (!email.trim()) return
    setSendingOtp(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/my-ref` },
    })
    if (error) setAuthError(error.message)
    else setOtpSent(true)
    setSendingOtp(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setRefRecord(null)
    setAssignments([])
    setOtpSent(false)
    setEmail('')
  }

  async function handleRespond(assignmentId, newStatus) {
    setActionBusy(prev => ({ ...prev, [assignmentId]: true }))
    const updateData = { status: newStatus }
    if (newStatus === 'confirmed') updateData.confirmed_at = new Date().toISOString()
    await supabase.from('ref_assignments').update(updateData).eq('id', assignmentId)
    if (refRecord) await loadAssignments(refRecord.id)
    setActionBusy(prev => ({ ...prev, [assignmentId]: false }))
  }

  // ── Derived lists ────────────────────────────────────────────────────────────
  const upcomingAssignments = assignments.filter(a => {
    const d = a.scheduled_games?.scheduled_date
    return d && d >= TODAY && a.scheduled_games?.status !== 'cancelled'
  }).sort((a, b) => {
    const da = a.scheduled_games?.scheduled_date || ''
    const db = b.scheduled_games?.scheduled_date || ''
    return da < db ? -1 : da > db ? 1 : 0
  })

  const pastAssignments = assignments.filter(a => {
    const d = a.scheduled_games?.scheduled_date
    return d && d < TODAY
  }).sort((a, b) => {
    const da = a.scheduled_games?.scheduled_date || ''
    const db = b.scheduled_games?.scheduled_date || ''
    return da > db ? -1 : da < db ? 1 : 0
  })

  const reviewAssignments = assignments
    .filter(a => a.feedback_approved === true && a.rating != null)
    .sort((a, b) => {
      const da = a.scheduled_games?.scheduled_date || ''
      const db = b.scheduled_games?.scheduled_date || ''
      return da > db ? -1 : da < db ? 1 : 0
    })

  const confirmedEarnings = assignments.filter(a => {
    const d = a.scheduled_games?.scheduled_date
    const isPast = d && d < TODAY
    return (a.status === 'confirmed' || isPast) && a.pay_amount != null
  })
  const totalEarned = confirmedEarnings.reduce((sum, a) => sum + Number(a.pay_amount || 0), 0)
  const pendingEarnings = upcomingAssignments.filter(a => a.pay_amount != null)
  const pendingTotal = pendingEarnings.reduce((sum, a) => sum + Number(a.pay_amount || 0), 0)

  // ─── RENDER: auth loading ───────────────────────────────────────────────────
  if (authLoading || refLoading) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: 1 }}>
          NP REF PORTAL
        </div>
      </div>
    )
  }

  // ─── RENDER: sign-in ────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>
          NP REF PORTAL
        </div>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 40 }}>
          Referee Self-Service
        </div>

        {otpSent ? (
          <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 10 }}>
              CHECK YOUR EMAIL
            </div>
            <div style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a login link to <strong style={{ color: '#c0cce0' }}>{email}</strong>.<br />
              Tap the link to open your ref dashboard.
            </div>
            <button
              onClick={() => { setOtpSent(false); setEmail('') }}
              style={{ background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 380, width: '100%' }}>
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 13, color: '#8a9ab8', marginBottom: 20, lineHeight: 1.6 }}>
                Enter the email your tournament director registered you with. We'll send you a one-tap login link.
              </div>
              <label style={S.label}>Your Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="you@example.com"
                style={S.input}
                autoFocus
              />
              {authError && (
                <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, padding: '10px 14px', color: '#e05555', fontSize: 13, marginBottom: 14 }}>
                  {authError}
                </div>
              )}
              <button
                onClick={handleSendOtp}
                disabled={sendingOtp || !email.trim()}
                style={S.primaryBtn(sendingOtp || !email.trim())}
              >
                {sendingOtp ? 'Sending…' : 'Send Login Link →'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── RENDER: not a registered ref ───────────────────────────────────────────
  if (!refRecord) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#f0f4ff', marginBottom: 10 }}>
          NOT REGISTERED
        </div>
        <div style={{ color: '#6b7a99', fontSize: 14, maxWidth: 340, lineHeight: 1.6, marginBottom: 28 }}>
          <strong style={{ color: '#c0cce0' }}>{session.user.email}</strong> is not registered as a referee.<br />
          Contact your tournament director to be added.
        </div>
        <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          Sign out
        </button>
      </div>
    )
  }

  // ─── RENDER: dashboard ──────────────────────────────────────────────────────
  const initials = refRecord.full_name
    ? refRecord.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logoText}>NP REF PORTAL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={S.signedInAs}>Signed in as {session.user.email}</span>
          <button onClick={handleSignOut} style={S.signOutBtn}>Sign out</button>
        </div>
      </div>

      <div style={S.body}>
        {/* Profile card */}
        <div style={{ ...S.card, marginBottom: 24 }}>
          <div style={S.profileBadge}>
            <div style={S.avatar}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#f0f4ff', letterSpacing: '0.5px', marginBottom: 2 }}>
                {refRecord.full_name || '—'}
              </div>
              <div style={{ fontSize: 13, color: '#6b7a99', marginBottom: 4 }}>
                {refRecord.phone || refRecord.email}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {refRecord.status === 'active' && (
                  <span style={S.pill('green')}>Active</span>
                )}
                {refRecord.pay_rate != null && (
                  <span style={{ fontSize: 12, color: '#d4a017', fontWeight: 700 }}>
                    ${Number(refRecord.pay_rate).toFixed(0)}{refRecord.pay_type ? `/${refRecord.pay_type}` : '/game'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabRow}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #5cb800' : '2px solid transparent',
                color: activeTab === tab ? '#f0f4ff' : '#6b7a99',
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: activeTab === tab ? 700 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}
            >
              {tab}
              {tab === 'Upcoming' && upcomingAssignments.length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: '#0d2010', color: '#5cb800', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
                  {upcomingAssignments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {dataLoading ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: 40 }}>Loading…</div>
        ) : (
          <>
            {/* ── Upcoming ─────────────────────────────────────────────── */}
            {activeTab === 'Upcoming' && (
              <div>
                {upcomingAssignments.length === 0 ? (
                  <div style={S.emptyState}>
                    No upcoming assignments.<br />
                    <span style={{ fontSize: 12 }}>Check back after your director schedules your next game.</span>
                  </div>
                ) : upcomingAssignments.map(a => {
                  const g = a.scheduled_games
                  const t = a.tournaments
                  const isPending = a.status === 'pending'
                  const isConfirmed = a.status === 'confirmed'
                  const isDeclined = a.status === 'declined'
                  const busy = actionBusy[a.id]
                  return (
                    <div key={a.id} style={S.assignCard}>
                      <div style={S.matchup}>
                        {g?.home_team_name || 'TBD'} vs {g?.away_team_name || 'TBD'}
                      </div>
                      {t?.name && (
                        <div style={{ ...S.meta, color: '#d4a017', fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
                      )}
                      <div style={S.meta}>
                        {fmt(g?.scheduled_date)}{g?.scheduled_time ? ` · ${fmtTime(g.scheduled_time)}` : ''}
                        {g?.round ? ` · ${g.round}` : ''}
                        {g?.pool_name ? ` · ${g.pool_name}` : ''}
                      </div>
                      <div style={{ ...S.meta, marginBottom: 10 }}>
                        {a.role || 'Referee'}
                        {a.pay_amount != null ? ` · $${Number(a.pay_amount).toFixed(0)}` : ''}
                        {t?.venue_name ? ` · ${t.venue_name}` : ''}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {isConfirmed && <span style={S.pill('green')}>Confirmed</span>}
                        {isDeclined && <span style={S.pill('red')}>Declined</span>}
                        {isPending && <span style={S.pill()}>Pending Response</span>}
                      </div>
                      {isPending && (
                        <div style={S.actionRow}>
                          <button
                            onClick={() => handleRespond(a.id, 'confirmed')}
                            disabled={busy}
                            style={{ ...S.btnConfirm, opacity: busy ? 0.6 : 1 }}
                          >
                            {busy ? '…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => handleRespond(a.id, 'declined')}
                            disabled={busy}
                            style={{ ...S.btnDecline, opacity: busy ? 0.6 : 1 }}
                          >
                            {busy ? '…' : 'Decline'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Past ─────────────────────────────────────────────────── */}
            {activeTab === 'Past' && (
              <div>
                {pastAssignments.length === 0 ? (
                  <div style={S.emptyState}>No past assignments yet.</div>
                ) : pastAssignments.map(a => {
                  const g = a.scheduled_games
                  const t = a.tournaments
                  const hasScore = g?.home_score != null && g?.away_score != null
                  return (
                    <div key={a.id} style={S.assignCard}>
                      <div style={S.matchup}>
                        {g?.home_team_name || 'TBD'} vs {g?.away_team_name || 'TBD'}
                      </div>
                      {t?.name && (
                        <div style={{ ...S.meta, color: '#d4a017', fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
                      )}
                      <div style={S.meta}>
                        {fmt(g?.scheduled_date)}{g?.scheduled_time ? ` · ${fmtTime(g.scheduled_time)}` : ''}
                        {g?.round ? ` · ${g.round}` : ''}
                      </div>
                      <div style={S.meta}>
                        {a.role || 'Referee'}
                        {a.pay_amount != null ? ` · $${Number(a.pay_amount).toFixed(0)}` : ''}
                      </div>
                      {hasScore && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800' }}>
                            {g.home_score} – {g.away_score}
                          </span>
                          <span style={{ fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Final</span>
                        </div>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <span style={S.pill(a.status === 'confirmed' ? 'green' : a.status === 'declined' ? 'red' : '')}>
                          {a.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Reviews ──────────────────────────────────────────────── */}
            {activeTab === 'Reviews' && (
              <div>
                {reviewAssignments.length === 0 ? (
                  <div style={S.emptyState}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#c0cce0', marginBottom: 8 }}>NO REVIEWS YET</div>
                    Keep doing great work — reviews from completed games will appear here once approved.
                  </div>
                ) : reviewAssignments.map(a => {
                  const g = a.scheduled_games
                  const t = a.tournaments
                  return (
                    <div key={a.id} style={S.assignCard}>
                      <div style={S.matchup}>
                        {g?.home_team_name || 'TBD'} vs {g?.away_team_name || 'TBD'}
                      </div>
                      {t?.name && (
                        <div style={{ ...S.meta, color: '#d4a017', fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
                      )}
                      <div style={S.meta}>{fmt(g?.scheduled_date)}</div>
                      <div style={{ margin: '10px 0 6px' }}>
                        <Stars rating={a.rating} />
                        <span style={{ fontSize: 13, color: '#d4a017', fontWeight: 700, marginLeft: 8 }}>{a.rating}/5</span>
                      </div>
                      {a.feedback && (
                        <div style={{ fontSize: 14, color: '#c0cce0', lineHeight: 1.6, fontStyle: 'italic', borderLeft: '2px solid #1a2030', paddingLeft: 12, marginTop: 6 }}>
                          "{a.feedback}"
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Earnings ─────────────────────────────────────────────── */}
            {activeTab === 'Earnings' && (
              <div>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ ...S.card, marginBottom: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Earned</div>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: '#5cb800' }}>
                      ${totalEarned.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>{confirmedEarnings.length} game{confirmedEarnings.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ ...S.card, marginBottom: 0, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Upcoming Pay</div>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: '#d4a017' }}>
                      ${pendingTotal.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>{pendingEarnings.length} game{pendingEarnings.length !== 1 ? 's' : ''} scheduled</div>
                  </div>
                </div>

                {/* All assignments with pay */}
                <div style={{ fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Pay History
                </div>
                {assignments.filter(a => a.pay_amount != null).length === 0 ? (
                  <div style={S.emptyState}>No pay data yet.</div>
                ) : assignments
                  .filter(a => a.pay_amount != null)
                  .sort((a, b) => {
                    const da = a.scheduled_games?.scheduled_date || ''
                    const db = b.scheduled_games?.scheduled_date || ''
                    return da > db ? -1 : 1
                  })
                  .map(a => {
                    const g = a.scheduled_games
                    const isPast = g?.scheduled_date && g.scheduled_date < TODAY
                    return (
                      <div
                        key={a.id}
                        style={{
                          ...S.assignCard,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '14px 18px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#d8e0f0' }}>
                            {g?.home_team_name || 'TBD'} vs {g?.away_team_name || 'TBD'}
                          </div>
                          <div style={S.meta}>
                            {fmt(g?.scheduled_date)} · {a.role || 'Referee'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: isPast ? '#5cb800' : '#d4a017' }}>
                            ${Number(a.pay_amount).toFixed(0)}
                          </div>
                          <div style={{ fontSize: 10, color: '#4a5568', marginTop: 2, textTransform: 'uppercase' }}>
                            {isPast ? 'completed' : 'upcoming'}
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
