import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtHeight(inches) {
  if (!inches) return ''
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

function fmtRecord(wins, losses) {
  if (wins == null && losses == null) return '—'
  return `${wins ?? 0}-${losses ?? 0}`
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#080c12',
      border: '1px solid #1a2030',
      borderRadius: 12,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ label, color = '#4a5568', bg = '#0e1320' }) {
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color,
      border: `1px solid ${color}33`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {label}
    </span>
  )
}

function StatusBadge({ label }) {
  const map = {
    approved:  { color: '#5cb800', bg: '#0a180a' },
    pending:   { color: '#d4a017', bg: '#1a1200' },
    rejected:  { color: '#e05555', bg: '#1f0707' },
    paid:      { color: '#5cb800', bg: '#0a180a' },
    unpaid:    { color: '#e05555', bg: '#1f0707' },
    partial:   { color: '#d4a017', bg: '#1a1200' },
    complete:  { color: '#5cb800', bg: '#0a180a' },
    incomplete:{ color: '#d4a017', bg: '#1a1200' },
  }
  const key = (label || '').toLowerCase()
  const { color, bg } = map[key] || { color: '#6b7a99', bg: '#0e1320' }
  return <Badge label={label || '—'} color={color} bg={bg} />
}

// ─── TeamRow (expandable) ──────────────────────────────────────────────────────

function TeamRow({ team, ranking }) {
  const [open, setOpen] = useState(false)
  const [players, setPlayers] = useState(null)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  async function toggleRoster() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (players !== null) return
    setLoadingPlayers(true)
    const { data } = await supabase
      .from('team_players')
      .select('player_id, players(id, first_name, last_name, jersey_number, position, grad_year, height_inches, verification_status)')
      .eq('np_team_id', team.id)
      .order('players(last_name)', { ascending: true })
    setPlayers(data || [])
    setLoadingPlayers(false)
  }

  const record = ranking ? fmtRecord(ranking.wins, ranking.losses) : '—'
  const rank = ranking?.rank

  return (
    <Card style={{ overflow: 'hidden' }}>
      <button
        onClick={toggleRoster}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '16px 18px',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, color: '#f0f4ff', letterSpacing: '0.3px', marginBottom: 4, lineHeight: 1.2 }}>
            {team.display_name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {team.age_group && <Badge label={team.age_group} color="#8a9ab8" />}
            {team.gender && <Badge label={team.gender} color="#6b7a99" />}
            {team.ranking_division_key && (
              <Badge label={team.ranking_division_key} color="#4a9eff" bg="#060d18" />
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {rank && (
            <div style={{ fontSize: 10, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
              Rank #{rank}
            </div>
          )}
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800' }}>{record}</div>
          <div style={{ fontSize: 10, color: open ? '#5cb800' : '#4a5568', marginTop: 4, letterSpacing: 1 }}>
            {open ? 'HIDE ROSTER ▲' : 'ROSTER ▼'}
          </div>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #1a2030', padding: '12px 18px' }}>
          {loadingPlayers ? (
            <div style={{ color: '#4a5568', fontSize: 13, padding: '8px 0' }}>Loading roster…</div>
          ) : !players || players.length === 0 ? (
            <div style={{ color: '#4a5568', fontSize: 13, padding: '8px 0' }}>No players on roster yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {players.map(tp => {
                const p = tp.players
                if (!p) return null
                return (
                  <div
                    key={tp.player_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 10px',
                      background: '#04060a',
                      borderRadius: 8,
                      border: '1px solid #0e1420',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#1a2030',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Anton, sans-serif',
                      fontSize: 12,
                      color: '#5cb800',
                      flexShrink: 0,
                    }}>
                      {p.jersey_number != null ? `#${p.jersey_number}` : '—'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#d8e0f0' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 1 }}>
                        {[p.position, p.grad_year ? `'${String(p.grad_year).slice(-2)}` : null, fmtHeight(p.height_inches)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {p.verification_status && p.verification_status !== 'unverified' && (
                      <StatusBadge label={p.verification_status} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── main page ─────────────────────────────────────────────────────────────────

export default function MyCoach() {
  // ── auth state ──────────────────────────────────────────────────────────────
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [authError, setAuthError] = useState(null)

  // ── profile state ───────────────────────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(false)
  const [coachProfile, setCoachProfile] = useState(null) // null = not yet loaded/found
  const [profileChecked, setProfileChecked] = useState(false)

  // ── profile setup form ──────────────────────────────────────────────────────
  const [setupName, setSetupName] = useState('')
  const [orgSearch, setOrgSearch] = useState('')
  const [orgResults, setOrgResults] = useState([])
  const [orgSearching, setOrgSearching] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [setupError, setSetupError] = useState(null)

  // ── dashboard data ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('teams')
  const [org, setOrg] = useState(null)
  const [teams, setTeams] = useState([])
  const [rankings, setRankings] = useState({}) // keyed by base_master_team_id
  const [dashLoading, setDashLoading] = useState(false)

  // schedules tab
  const [games, setGames] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [schedLoading, setSchedLoading] = useState(false)
  const [schedLoaded, setSchedLoaded] = useState(false)

  // tournaments tab
  const [tournamentEntries, setTournamentEntries] = useState([])
  const [tournLoading, setTournLoading] = useState(false)
  const [tournLoaded, setTournLoaded] = useState(false)

  // ── auth init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session) loadProfile(session.user.email)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (sess) {
        loadProfile(sess.user.email)
      } else {
        setCoachProfile(null)
        setProfileChecked(false)
        setOrg(null)
        setTeams([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userEmail) {
    setProfileLoading(true)
    const { data } = await supabase
      .from('coach_profiles')
      .select('*, bt_organizations(id, org_name, city, state)')
      .eq('email', userEmail)
      .maybeSingle()

    setProfileChecked(true)
    setProfileLoading(false)

    if (data && data.org_id && data.bt_organizations) {
      setCoachProfile(data)
      setOrg(data.bt_organizations)
      loadDashboard(data.org_id)
    } else if (data) {
      // profile exists but no org yet
      setCoachProfile(data)
      setSetupName(data.display_name || '')
    }
    // else: no profile → show setup screen (coachProfile stays null)
  }

  // ── OTP ─────────────────────────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!email.trim()) return
    setSendingOtp(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/mycoach` },
    })
    if (error) setAuthError(error.message)
    else setOtpSent(true)
    setSendingOtp(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setCoachProfile(null)
    setProfileChecked(false)
    setOrg(null)
    setTeams([])
    setOtpSent(false)
    setEmail('')
    setSetupName('')
    setOrgSearch('')
    setOrgResults([])
    setSelectedOrg(null)
    setSchedLoaded(false)
    setTournLoaded(false)
  }

  // ── profile setup ───────────────────────────────────────────────────────────
  async function handleOrgSearch(val) {
    setOrgSearch(val)
    setSelectedOrg(null)
    if (val.trim().length < 2) { setOrgResults([]); return }
    setOrgSearching(true)
    const { data } = await supabase
      .from('bt_organizations')
      .select('id, org_name, city, state')
      .ilike('org_name', `%${val.trim()}%`)
      .order('org_name')
      .limit(10)
    setOrgResults(data || [])
    setOrgSearching(false)
  }

  async function handleSaveProfile() {
    if (!setupName.trim() || !selectedOrg) return
    setSavingProfile(true)
    setSetupError(null)

    const userEmail = session.user.email
    const { data, error } = await supabase
      .from('coach_profiles')
      .upsert(
        {
          user_id: session.user.id,
          email: userEmail,
          display_name: setupName.trim(),
          org_id: selectedOrg.id,
        },
        { onConflict: 'email' }
      )
      .select('*, bt_organizations(id, org_name, city, state)')
      .single()

    if (error) {
      setSetupError(error.message)
      setSavingProfile(false)
      return
    }

    setCoachProfile(data)
    setOrg(data.bt_organizations)
    setSavingProfile(false)
    loadDashboard(data.org_id)
  }

  // ── dashboard load ───────────────────────────────────────────────────────────
  async function loadDashboard(orgId) {
    setDashLoading(true)

    // fetch active teams for org
    const { data: teamData } = await supabase
      .from('bt_master_teams')
      .select('id, display_name, ranking_division_key, age_group, gender')
      .eq('organization_id', orgId)
      .is('merged_into_id', null)
      .order('display_name')

    const fetchedTeams = teamData || []
    setTeams(fetchedTeams)

    // fetch rankings for those teams
    if (fetchedTeams.length > 0) {
      const teamIds = fetchedTeams.map(t => t.id)
      const { data: rankData } = await supabase
        .from('bt_rankings_next_play_tiered')
        .select('base_master_team_id, team_name, rank, wins, losses, ranking_points, games_played, ranking_division_key')
        .in('base_master_team_id', teamIds)

      const rankMap = {}
      for (const r of rankData || []) {
        rankMap[r.base_master_team_id] = r
      }
      setRankings(rankMap)
    }

    setDashLoading(false)
  }

  // ── schedule tab load (lazy) ─────────────────────────────────────────────────
  const loadSchedule = useCallback(async () => {
    if (schedLoaded || teams.length === 0) return
    setSchedLoading(true)

    const teamNames = teams.map(t => t.display_name)
    const teamIds = teams.map(t => t.id)
    const today = new Date().toISOString().slice(0, 10)

    // upcoming games matching any team name
    const { data: gamesData } = await supabase
      .from('scheduled_games')
      .select('id, tournament_id, home_team_name, away_team_name, scheduled_date, scheduled_time, round, pool_name, home_score, away_score, status')
      .gte('scheduled_date', today)
      .or(teamNames.map(n => `home_team_name.ilike.%${n}%`).concat(teamNames.map(n => `away_team_name.ilike.%${n}%`)).join(','))
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(100)

    // tournament registrations
    const { data: regData } = await supabase
      .from('tournament_teams')
      .select('id, name, approval_status, payment_status, roster_status, created_at, team_id, tournaments(id, name, start_date, end_date, city, state, venue_name, status)')
      .in('team_id', teamIds)
      .order('created_at', { ascending: false })

    setGames(gamesData || [])
    setRegistrations(regData || [])
    setSchedLoaded(true)
    setSchedLoading(false)
  }, [schedLoaded, teams])

  // ── tournaments tab load (lazy) ──────────────────────────────────────────────
  const loadTournaments = useCallback(async () => {
    if (tournLoaded || teams.length === 0) return
    setTournLoading(true)

    const teamIds = teams.map(t => t.id)
    const { data } = await supabase
      .from('tournament_teams')
      .select('id, team_id, approval_status, payment_status, tournaments(id, name, start_date, end_date, location, city, state, venue_name, status, slug)')
      .in('team_id', teamIds)
      .order('created_at', { ascending: false })

    // group by tournament
    const byTournament = {}
    for (const reg of data || []) {
      if (!reg.tournaments) continue
      const tid = reg.tournaments.id
      if (!byTournament[tid]) {
        byTournament[tid] = { tournament: reg.tournaments, registrations: [] }
      }
      byTournament[tid].registrations.push(reg)
    }

    setTournamentEntries(Object.values(byTournament))
    setTournLoaded(true)
    setTournLoading(false)
  }, [tournLoaded, teams])

  useEffect(() => {
    if (activeTab === 'schedule') loadSchedule()
    if (activeTab === 'tournaments') loadTournaments()
  }, [activeTab, loadSchedule, loadTournaments])

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: auth loading
  // ════════════════════════════════════════════════════════════════════════════
  if (authLoading || (session && !profileChecked && profileLoading)) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800', letterSpacing: 1 }}>NP COACHES</div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: sign-in
  // ════════════════════════════════════════════════════════════════════════════
  if (!session) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>NP COACHES</div>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 40 }}>Coach Portal Login</div>

        {otpSent ? (
          <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 38, marginBottom: 16 }}>📬</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 10 }}>CHECK YOUR EMAIL</div>
            <div style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a login link to <strong style={{ color: '#c0cce0' }}>{email}</strong>.<br />
              Tap the link to open your coach dashboard.
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
            <Card style={{ padding: 28 }}>
              <div style={{ fontSize: 13, color: '#8a9ab8', marginBottom: 20, lineHeight: 1.6 }}>
                Enter your email to receive a one-tap login link. No password needed.
              </div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="you@example.com"
                autoFocus
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
              />
              {authError && (
                <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, padding: '10px 14px', color: '#e05555', fontSize: 13, marginBottom: 14 }}>
                  {authError}
                </div>
              )}
              <button
                onClick={handleSendOtp}
                disabled={sendingOtp || !email.trim()}
                style={{
                  width: '100%',
                  background: sendingOtp || !email.trim() ? '#1a2030' : '#5cb800',
                  color: sendingOtp || !email.trim() ? '#4a5568' : '#04060a',
                  border: 'none',
                  padding: 13,
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: sendingOtp || !email.trim() ? 'default' : 'pointer',
                  fontFamily: 'Anton, sans-serif',
                  letterSpacing: '0.5px',
                }}
              >
                {sendingOtp ? 'Sending…' : 'Send Login Link →'}
              </button>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: profile setup
  // ════════════════════════════════════════════════════════════════════════════
  const needsSetup = profileChecked && (!coachProfile || !coachProfile.org_id)

  if (needsSetup) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>NP COACHES</div>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 40 }}>Set Up Your Profile</div>

        <div style={{ maxWidth: 420, width: '100%' }}>
          <Card style={{ padding: 28 }}>
            <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 20 }}>
              Signed in as <span style={{ color: '#8a9ab8' }}>{session.user.email}</span>
            </div>

            <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
              Your Name
            </label>
            <input
              type="text"
              value={setupName}
              onChange={e => setSetupName(e.target.value)}
              placeholder="Coach Name"
              autoFocus
              style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
            />

            <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
              Search for Your Organization
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={selectedOrg ? selectedOrg.org_name : orgSearch}
                onChange={e => { setSelectedOrg(null); handleOrgSearch(e.target.value) }}
                placeholder="Type org name…"
                style={{ width: '100%', background: selectedOrg ? '#0a180a' : '#0e1320', border: `1px solid ${selectedOrg ? '#2a4010' : '#1a2030'}`, color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: selectedOrg || orgResults.length === 0 ? 0 : 4 }}
              />
              {orgSearching && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#4a5568' }}>Searching…</div>
              )}
            </div>

            {!selectedOrg && orgResults.length > 0 && (
              <div style={{ border: '1px solid #1a2030', borderRadius: 8, overflow: 'hidden', marginTop: 4, marginBottom: 4 }}>
                {orgResults.map((o, i) => (
                  <button
                    key={o.id}
                    onClick={() => { setSelectedOrg(o); setOrgSearch(o.org_name); setOrgResults([]) }}
                    style={{
                      width: '100%',
                      background: '#0e1320',
                      border: 'none',
                      borderTop: i > 0 ? '1px solid #1a2030' : 'none',
                      color: '#d8e0f0',
                      padding: '11px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#141c28')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0e1320')}
                  >
                    <span style={{ fontWeight: 600 }}>{o.org_name}</span>
                    {(o.city || o.state) && (
                      <span style={{ color: '#6b7a99', marginLeft: 8, fontSize: 12 }}>
                        {[o.city, o.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedOrg && (
              <div style={{ fontSize: 12, color: '#5cb800', marginTop: 6, marginBottom: 0 }}>
                Selected: {selectedOrg.org_name}{selectedOrg.city ? ` — ${selectedOrg.city}, ${selectedOrg.state}` : ''}
                <button
                  onClick={() => { setSelectedOrg(null); setOrgSearch('') }}
                  style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', marginLeft: 8, fontSize: 11 }}
                >
                  Change
                </button>
              </div>
            )}

            {setupError && (
              <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, padding: '10px 14px', color: '#e05555', fontSize: 13, marginTop: 14 }}>
                {setupError}
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile || !setupName.trim() || !selectedOrg}
              style={{
                width: '100%',
                marginTop: 20,
                background: savingProfile || !setupName.trim() || !selectedOrg ? '#1a2030' : '#5cb800',
                color: savingProfile || !setupName.trim() || !selectedOrg ? '#4a5568' : '#04060a',
                border: 'none',
                padding: 13,
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: savingProfile || !setupName.trim() || !selectedOrg ? 'default' : 'pointer',
                fontFamily: 'Anton, sans-serif',
                letterSpacing: '0.5px',
              }}
            >
              {savingProfile ? 'Saving…' : 'Go to Dashboard →'}
            </button>

            <button
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 12, display: 'block', margin: '16px auto 0', textAlign: 'center' }}
            >
              Sign out
            </button>
          </Card>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: dashboard
  // ════════════════════════════════════════════════════════════════════════════

  const TAB_STYLE = (active) => ({
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #5cb800' : '2px solid transparent',
    color: active ? '#f0f4ff' : '#6b7a99',
    fontFamily: 'Anton, sans-serif',
    fontSize: 13,
    letterSpacing: '0.8px',
    cursor: 'pointer',
    padding: '10px 16px',
    textTransform: 'uppercase',
    transition: 'color 0.15s',
  })

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: 1, lineHeight: 1 }}>
            {org?.org_name || 'My Org'}
          </div>
          {(org?.city || org?.state) && (
            <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 3 }}>
              {[org.city, org.state].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, color: '#d8e0f0', fontWeight: 600 }}>{coachProfile?.display_name}</div>
          <div style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>{session.user.email}</div>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 3, textDecoration: 'underline' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1a2030', display: 'flex', padding: '0 12px', overflowX: 'auto' }}>
        <button style={TAB_STYLE(activeTab === 'teams')} onClick={() => setActiveTab('teams')}>Teams</button>
        <button style={TAB_STYLE(activeTab === 'schedule')} onClick={() => setActiveTab('schedule')}>Schedule</button>
        <button style={TAB_STYLE(activeTab === 'tournaments')} onClick={() => setActiveTab('tournaments')}>Tournaments</button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: '20px 16px', maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ── TEAMS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <div>
            {dashLoading ? (
              <div style={{ color: '#4a5568', textAlign: 'center', padding: 48 }}>Loading teams…</div>
            ) : teams.length === 0 ? (
              <div style={{ color: '#4a5568', textAlign: 'center', padding: 48, fontSize: 13 }}>
                No active teams found for this organization.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teams.map(team => (
                  <TeamRow key={team.id} team={team} ranking={rankings[team.id] || null} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCHEDULE TAB ──────────────────────────────────────────────── */}
        {activeTab === 'schedule' && (
          <div>
            {schedLoading ? (
              <div style={{ color: '#4a5568', textAlign: 'center', padding: 48 }}>Loading schedule…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Upcoming Games */}
                <div>
                  <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#d4a017', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                    Upcoming Games
                  </div>
                  {games.length === 0 ? (
                    <div style={{ color: '#4a5568', fontSize: 13, padding: '12px 0' }}>No upcoming games scheduled.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {games.map(g => (
                        <Card key={g.id} style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {(g.round || g.pool_name) && (
                                <div style={{ fontSize: 10, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                                  {[g.round, g.pool_name].filter(Boolean).join(' · ')}
                                </div>
                              )}
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff' }}>{g.home_team_name}</div>
                              <div style={{ fontSize: 11, color: '#4a5568', margin: '2px 0' }}>vs</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff' }}>{g.away_team_name}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 12, color: '#8a9ab8' }}>{fmtDate(g.scheduled_date)}</div>
                              {g.scheduled_time && (
                                <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 2 }}>{g.scheduled_time.slice(0, 5)}</div>
                              )}
                              {g.status && g.status !== 'scheduled' && (
                                <div style={{ marginTop: 4 }}><StatusBadge label={g.status} /></div>
                              )}
                              {(g.home_score != null && g.away_score != null && g.status === 'completed') && (
                                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#5cb800', marginTop: 4 }}>
                                  {g.home_score} – {g.away_score}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tournament Registrations */}
                {registrations.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#d4a017', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
                      Tournament Registrations
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {registrations.map(reg => (
                        <Card key={reg.id} style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>
                                {reg.tournaments?.name || 'Unknown Tournament'}
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7a99' }}>{reg.name}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                              <StatusBadge label={reg.approval_status || 'pending'} />
                              <StatusBadge label={reg.payment_status || 'unpaid'} />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TOURNAMENTS TAB ───────────────────────────────────────────── */}
        {activeTab === 'tournaments' && (
          <div>
            {tournLoading ? (
              <div style={{ color: '#4a5568', textAlign: 'center', padding: 48 }}>Loading tournaments…</div>
            ) : tournamentEntries.length === 0 ? (
              <div style={{ color: '#4a5568', fontSize: 13, textAlign: 'center', padding: 48 }}>
                No tournaments found for this organization.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tournamentEntries.map(({ tournament: t, registrations: regs }) => (
                  <Card key={t.id} style={{ padding: '18px 20px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', letterSpacing: '0.3px', marginBottom: 4 }}>
                        {t.name}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                        {t.start_date && (
                          <span style={{ fontSize: 12, color: '#8a9ab8' }}>
                            {fmtDate(t.start_date)}{t.end_date && t.end_date !== t.start_date ? ` – ${fmtDate(t.end_date)}` : ''}
                          </span>
                        )}
                        {(t.city || t.state) && (
                          <span style={{ fontSize: 12, color: '#6b7a99' }}>
                            {[t.venue_name, t.city, t.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                      {t.status && <StatusBadge label={t.status} />}
                    </div>

                    {/* Per-team registrations */}
                    <div style={{ borderTop: '1px solid #1a2030', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {regs.map(reg => {
                        const teamObj = teams.find(tm => tm.id === reg.team_id)
                        return (
                          <div key={reg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: 12, color: '#8a9ab8', flex: 1, minWidth: 0 }}>
                              {teamObj?.display_name || reg.team_id}
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <StatusBadge label={reg.approval_status || 'pending'} />
                              <StatusBadge label={reg.payment_status || 'unpaid'} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
