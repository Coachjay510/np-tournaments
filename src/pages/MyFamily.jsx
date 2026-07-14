import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// ─── helpers ───────────────────────────────────────────────────────────────────
function avg(logs, key) {
  if (!logs || logs.length === 0) return null
  const sum = logs.reduce((a, r) => a + (Number(r[key]) || 0), 0)
  return (sum / logs.length).toFixed(1)
}

function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

function heightStr(inches) {
  if (!inches) return null
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

// ─── sub-components ────────────────────────────────────────────────────────────
function StatPill({ label, value }) {
  return (
    <div style={{
      background: '#0e1320',
      border: '1px solid #1a2030',
      borderRadius: 10,
      padding: '10px 14px',
      textAlign: 'center',
      minWidth: 60,
      flex: 1,
    }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800', lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 10, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Badge({ verified }) {
  return (
    <span style={{
      display: 'inline-block',
      background: verified ? '#5cb800' : '#d4a017',
      color: verified ? '#04060a' : '#1a1200',
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      padding: '3px 8px',
      borderRadius: 6,
      marginLeft: 8,
      verticalAlign: 'middle',
    }}>
      {verified ? 'Verified' : 'Pending'}
    </span>
  )
}

// ─── main component ────────────────────────────────────────────────────────────
export default function MyFamily() {
  // auth
  const [authLoading, setAuthLoading]   = useState(true)
  const [session, setSession]           = useState(null)
  const [email, setEmail]               = useState('')
  const [otpSent, setOtpSent]           = useState(false)
  const [sendingOtp, setSendingOtp]     = useState(false)
  const [authError, setAuthError]       = useState(null)

  // data
  const [dataLoading, setDataLoading]   = useState(false)
  const [links, setLinks]               = useState([])          // parent_player_links rows with player objects
  const [gameLogs, setGameLogs]         = useState({})          // keyed by player_id
  const [upcoming, setUpcoming]         = useState({})          // keyed by player_id
  const [selectedTab, setSelectedTab]   = useState(0)

  // link child flow
  const [showLinkFlow, setShowLinkFlow] = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]       = useState(false)
  const [requestingId, setRequestingId] = useState(null)   // player_id currently being requested
  const [requestedIds, setRequestedIds] = useState(new Set()) // already-requested this session

  // ── Auth init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      if (!sess) {
        setLinks([])
        setGameLogs({})
        setUpcoming({})
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load data when session arrives ──────────────────────────────────────────
  useEffect(() => {
    if (session) loadParentData(session.user.email)
  }, [session])

  async function loadParentData(parentEmail) {
    setDataLoading(true)

    // 1. fetch links + players
    const { data: linkRows } = await supabase
      .from('parent_player_links')
      .select(`
        id, verified, created_at, player_id,
        players (
          id, first_name, last_name, jersey_number, position,
          grad_year, height_inches, photo_url, avatar_url, bio,
          np_team_id, np_team_name, school_name, verification_status,
          accolade, gpa
        )
      `)
      .eq('parent_email', parentEmail)
      .order('created_at', { ascending: true })

    const validLinks = (linkRows || []).filter(l => l.players)
    setLinks(validLinks)

    if (validLinks.length === 0) {
      setShowLinkFlow(true)
      setDataLoading(false)
      return
    }

    // 2. for each player: load game logs + upcoming games
    const playerIds  = validLinks.map(l => l.player_id)
    const teamNames  = [...new Set(validLinks.map(l => l.players?.np_team_name).filter(Boolean))]
    const today      = new Date().toISOString().slice(0, 10)

    const [{ data: logs }, { data: games }] = await Promise.all([
      supabase
        .from('player_game_logs')
        .select('id, player_id, game_date, opponent, pts, reb, ast, stl, blk, fg_made, fg_att, fg3_made, fg3_att, ft_made, ft_att')
        .in('player_id', playerIds)
        .order('game_date', { ascending: false }),
      supabase
        .from('scheduled_games')
        .select(`
          id, home_team_name, away_team_name, scheduled_date, scheduled_time,
          round, pool_name, home_score, away_score, status, tournament_id,
          tournaments (id, name, city, state, venue_name)
        `)
        .gte('scheduled_date', today)
        .or(teamNames.map(n => `home_team_name.eq.${n},away_team_name.eq.${n}`).join(','))
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true }),
    ])

    // index logs by player_id
    const logMap = {}
    for (const l of validLinks) {
      logMap[l.player_id] = (logs || []).filter(r => r.player_id === l.player_id)
    }
    setGameLogs(logMap)

    // index upcoming by player_id
    const upcomingMap = {}
    for (const l of validLinks) {
      const teamName = l.players?.np_team_name
      upcomingMap[l.player_id] = teamName
        ? (games || []).filter(g => g.home_team_name === teamName || g.away_team_name === teamName)
        : []
    }
    setUpcoming(upcomingMap)

    setDataLoading(false)
  }

  // ── OTP ─────────────────────────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!email.trim()) return
    setSendingOtp(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/my-family` },
    })
    if (error) setAuthError(error.message)
    else setOtpSent(true)
    setSendingOtp(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setLinks([])
    setGameLogs({})
    setUpcoming({})
    setOtpSent(false)
    setEmail('')
    setShowLinkFlow(false)
    setSearchQuery('')
    setSearchResults([])
    setRequestedIds(new Set())
    setSelectedTab(0)
  }

  // ── Player search ────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const parts = q.trim().split(/\s+/)
    let query = supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number, position, grad_year, np_team_name, school_name')
    if (parts.length >= 2) {
      query = query
        .ilike('first_name', `%${parts[0]}%`)
        .ilike('last_name', `%${parts[1]}%`)
    } else {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    }
    const { data } = await query.limit(20)
    setSearchResults(data || [])
    setSearching(false)
  }, [])

  async function handleRequestLink(player) {
    if (!session) return
    setRequestingId(player.id)
    const { error } = await supabase
      .from('parent_player_links')
      .upsert(
        { parent_email: session.user.email, player_id: player.id, verified: false },
        { onConflict: 'parent_email,player_id', ignoreDuplicates: true }
      )
    if (!error) {
      setRequestedIds(prev => new Set([...prev, player.id]))
      // reload the parent data so the pending card appears
      await loadParentData(session.user.email)
    }
    setRequestingId(null)
  }

  // ── Derived helpers ──────────────────────────────────────────────────────────
  const currentLink   = links[selectedTab]
  const currentPlayer = currentLink?.players
  const currentLogs   = currentPlayer ? (gameLogs[currentPlayer.id] || []) : []
  const recentLogs    = currentLogs.slice(0, 10)
  const currentGames  = currentPlayer ? (upcoming[currentPlayer.id] || []) : []

  const hasPendingLinks = links.some(l => !l.verified)
  const hasLinkedPlayers = links.length > 0

  // ── RENDER: auth loading ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: 1 }}>MY FAMILY</div>
      </div>
    )
  }

  // ── RENDER: sign-in ─────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>MY FAMILY</div>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>Next Play Tournaments</div>
        <div style={{ fontSize: 13, color: '#6b7a99', marginBottom: 40, textAlign: 'center', maxWidth: 300 }}>
          Your child's stats, upcoming games, and tournament schedule — all in one place.
        </div>

        {otpSent ? (
          <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 10 }}>CHECK YOUR EMAIL</div>
            <div style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a magic link to <strong style={{ color: '#c0cce0' }}>{email}</strong>.<br />
              Tap it to open your family dashboard.
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
                Enter your email to receive a one-tap login link. No password needed.
              </div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                Your Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="you@example.com"
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
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
                style={{
                  width: '100%',
                  background: sendingOtp || !email.trim() ? '#1a2030' : '#5cb800',
                  color: sendingOtp || !email.trim() ? '#4a5568' : '#04060a',
                  border: 'none', padding: '13px', borderRadius: 10,
                  fontSize: 15, fontWeight: 700,
                  cursor: sendingOtp || !email.trim() ? 'default' : 'pointer',
                  fontFamily: 'Anton, sans-serif', letterSpacing: '0.5px',
                }}
              >
                {sendingOtp ? 'Sending…' : 'Send Login Link →'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── RENDER: data loading ─────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: 1 }}>Loading…</div>
      </div>
    )
  }

  // ── RENDER: link child screen (overlay or standalone) ─────────────────────
  if (showLinkFlow) {
    const alreadyLinkedIds = new Set(links.map(l => l.player_id))
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: 1 }}>MY FAMILY</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>signed in as {session.user.email}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {hasLinkedPlayers && (
              <button
                onClick={() => { setShowLinkFlow(false); setSearchQuery(''); setSearchResults([]) }}
                style={{ background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
              >
                ← Back
              </button>
            )}
            <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              Sign out
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 16px', maxWidth: 520, width: '100%', margin: '0 auto' }}>
          {!hasLinkedPlayers && (
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 8 }}>LINK YOUR CHILD</div>
              <div style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6 }}>
                Search for your child by name to connect their player profile to your account. A director will verify the link before it's fully active.
              </div>
            </div>
          )}

          {hasLinkedPlayers && (
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 20 }}>
              ADD ANOTHER CHILD
            </div>
          )}

          <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
            Search by Name
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="First name, last name…"
            style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 10, padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            autoFocus
          />

          {searching && (
            <div style={{ color: '#4a5568', textAlign: 'center', padding: 20, fontSize: 13 }}>Searching…</div>
          )}

          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div style={{ color: '#6b7a99', textAlign: 'center', padding: 24, fontSize: 14, lineHeight: 1.6 }}>
              No players found matching "{searchQuery}".<br />
              <span style={{ fontSize: 12, color: '#4a5568' }}>Try their full name or check the spelling.</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {searchResults.map(player => {
                const alreadyLinked = alreadyLinkedIds.has(player.id)
                const justRequested = requestedIds.has(player.id)
                const isRequesting  = requestingId === player.id
                return (
                  <div
                    key={player.id}
                    style={{
                      background: '#080c12',
                      border: '1px solid #1a2030',
                      borderRadius: 12,
                      padding: '16px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>
                        {player.first_name} {player.last_name}
                        {player.jersey_number != null && (
                          <span style={{ fontSize: 12, color: '#6b7a99', fontWeight: 400, marginLeft: 6 }}>#{player.jersey_number}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#8a9ab8', marginTop: 3 }}>
                        {[player.np_team_name, player.position, player.grad_year ? `Class of ${player.grad_year}` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {alreadyLinked ? (
                        <span style={{ fontSize: 12, color: '#5cb800', fontWeight: 700 }}>Linked</span>
                      ) : justRequested ? (
                        <span style={{ fontSize: 12, color: '#d4a017', fontWeight: 700 }}>Requested</span>
                      ) : (
                        <button
                          onClick={() => handleRequestLink(player)}
                          disabled={isRequesting}
                          style={{
                            background: isRequesting ? '#1a2030' : '#5cb800',
                            color: isRequesting ? '#4a5568' : '#04060a',
                            border: 'none', borderRadius: 8,
                            padding: '8px 14px', fontSize: 12, fontWeight: 700,
                            cursor: isRequesting ? 'default' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isRequesting ? 'Requesting…' : 'Request Link'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* pending links in this session */}
          {links.filter(l => !l.verified).length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Pending Verifications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.filter(l => !l.verified).map(l => (
                  <div
                    key={l.id}
                    style={{ background: '#0a0c10', border: '1px solid #2a2000', borderRadius: 10, padding: '12px 16px' }}
                  >
                    <div style={{ fontSize: 14, color: '#f0f4ff', fontWeight: 600 }}>
                      {l.players?.first_name} {l.players?.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#d4a017', marginTop: 3 }}>
                      Link requested — a director will verify this soon.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── RENDER: dashboard ────────────────────────────────────────────────────────
  return (
    <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: 1 }}>MY FAMILY</div>
          <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>signed in as {session.user.email}</div>
        </div>
        <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 12, cursor: 'pointer', padding: 0 }}>
          Sign out
        </button>
      </div>

      {/* Child tabs (only when multiple children) */}
      {links.length > 1 && (
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid #1a2030',
          background: '#060910',
          padding: '0 16px',
          scrollbarWidth: 'none',
        }}>
          {links.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setSelectedTab(i)}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                borderBottom: selectedTab === i ? '2px solid #5cb800' : '2px solid transparent',
                color: selectedTab === i ? '#5cb800' : '#6b7a99',
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {l.players?.first_name}
              {!l.verified && (
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#d4a017', marginLeft: 5, verticalAlign: 'middle', marginBottom: 2 }} />
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, padding: '20px 16px', maxWidth: 560, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {currentPlayer && (
          <>
            {/* ── Player card ── */}
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: '20px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* avatar */}
                {(currentPlayer.photo_url || currentPlayer.avatar_url) ? (
                  <img
                    src={currentPlayer.photo_url || currentPlayer.avatar_url}
                    alt={`${currentPlayer.first_name} ${currentPlayer.last_name}`}
                    style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid #1a2030' }}
                  />
                ) : (
                  <div style={{
                    width: 64, height: 64, borderRadius: 10, background: '#0e1320',
                    border: '1px solid #1a2030', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                    fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#2a3a50',
                  }}>
                    {(currentPlayer.first_name?.[0] || '') + (currentPlayer.last_name?.[0] || '')}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#f0f4ff', letterSpacing: '0.3px' }}>
                      {currentPlayer.first_name} {currentPlayer.last_name}
                    </div>
                    <Badge verified={currentLink.verified} />
                  </div>

                  <div style={{ fontSize: 13, color: '#8a9ab8', marginTop: 4 }}>
                    {currentPlayer.np_team_name}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8 }}>
                    {currentPlayer.jersey_number != null && (
                      <span style={{ fontSize: 12, color: '#6b7a99' }}>#{currentPlayer.jersey_number}</span>
                    )}
                    {currentPlayer.position && (
                      <span style={{ fontSize: 12, color: '#6b7a99' }}>{currentPlayer.position}</span>
                    )}
                    {currentPlayer.grad_year && (
                      <span style={{ fontSize: 12, color: '#6b7a99' }}>Class of {currentPlayer.grad_year}</span>
                    )}
                    {heightStr(currentPlayer.height_inches) && (
                      <span style={{ fontSize: 12, color: '#6b7a99' }}>{heightStr(currentPlayer.height_inches)}</span>
                    )}
                    {currentPlayer.gpa && (
                      <span style={{ fontSize: 12, color: '#6b7a99' }}>GPA {currentPlayer.gpa}</span>
                    )}
                  </div>

                  {currentPlayer.school_name && (
                    <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>{currentPlayer.school_name}</div>
                  )}
                </div>
              </div>

              {!currentLink.verified && (
                <div style={{ marginTop: 14, background: '#1a1200', border: '1px solid #3a2800', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#d4a017', lineHeight: 1.5 }}>
                  Your link to this player is pending verification. A director will confirm it shortly.
                </div>
              )}

              {currentPlayer.accolade && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#d4a017', fontStyle: 'italic' }}>{currentPlayer.accolade}</div>
              )}
            </div>

            {/* ── Stats section ── */}
            {currentLogs.length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Season Averages · {currentLogs.length} game{currentLogs.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <StatPill label="PTS" value={avg(currentLogs, 'pts')} />
                  <StatPill label="REB" value={avg(currentLogs, 'reb')} />
                  <StatPill label="AST" value={avg(currentLogs, 'ast')} />
                  <StatPill label="STL" value={avg(currentLogs, 'stl')} />
                  <StatPill label="BLK" value={avg(currentLogs, 'blk')} />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20, background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: '18px', textAlign: 'center' }}>
                <div style={{ color: '#6b7a99', fontSize: 14 }}>No game logs yet</div>
                <div style={{ color: '#4a5568', fontSize: 12, marginTop: 4 }}>Stats will appear here once games are recorded.</div>
              </div>
            )}

            {/* ── Recent games ── */}
            {recentLogs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  Recent Games
                </div>
                <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
                  {recentLogs.map((log, idx) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < recentLogs.length - 1 ? '1px solid #0d1220' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#4a5568' }}>{fmtDate(log.game_date)}</div>
                        <div style={{ fontSize: 14, color: '#c0cce0', fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          vs {log.opponent || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', lineHeight: 1 }}>{log.pts ?? '—'}</div>
                          <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.5 }}>PTS</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#c0cce0', lineHeight: 1 }}>{log.reb ?? '—'}</div>
                          <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.5 }}>REB</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#c0cce0', lineHeight: 1 }}>{log.ast ?? '—'}</div>
                          <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 0.5 }}>AST</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Upcoming games ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Upcoming Games
              </div>
              {currentGames.length === 0 ? (
                <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: '18px', textAlign: 'center' }}>
                  <div style={{ color: '#6b7a99', fontSize: 14 }}>No upcoming games scheduled</div>
                  <div style={{ color: '#4a5568', fontSize: 12, marginTop: 4 }}>Check back after the next bracket is posted.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentGames.map(game => {
                    const myTeam    = currentPlayer.np_team_name
                    const isHome    = game.home_team_name === myTeam
                    const opponent  = isHome ? game.away_team_name : game.home_team_name
                    const matchup   = isHome
                      ? `${myTeam} vs ${opponent}`
                      : `${opponent} vs ${myTeam}`
                    const tournament = game.tournaments
                    return (
                      <div
                        key={game.id}
                        style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: '14px 16px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', marginBottom: 2 }}>{matchup}</div>
                            {(game.round || game.pool_name) && (
                              <div style={{ fontSize: 11, color: '#d4a017', marginBottom: 4 }}>
                                {[game.round, game.pool_name].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            {tournament && (
                              <div style={{ fontSize: 11, color: '#6b7a99' }}>
                                {tournament.name}
                                {(tournament.city || tournament.state) && (
                                  <span style={{ color: '#4a5568' }}> · {[tournament.city, tournament.state].filter(Boolean).join(', ')}</span>
                                )}
                              </div>
                            )}
                            {tournament?.venue_name && (
                              <div style={{ fontSize: 11, color: '#4a5568' }}>{tournament.venue_name}</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 13, color: '#c0cce0' }}>{fmtDate(game.scheduled_date)}</div>
                            {game.scheduled_time && (
                              <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>{fmtTime(game.scheduled_time)}</div>
                            )}
                            {game.status === 'completed' && (
                              <div style={{ fontSize: 10, color: '#5cb800', fontWeight: 700, marginTop: 4, textTransform: 'uppercase' }}>
                                Final: {game.home_score} – {game.away_score}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Add Another Child ── */}
        <div style={{ paddingBottom: 32 }}>
          <button
            onClick={() => { setShowLinkFlow(true); setSearchQuery(''); setSearchResults([]) }}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px dashed #2a3a50',
              color: '#6b7a99',
              borderRadius: 12,
              padding: 14,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Another Child
          </button>
        </div>
      </div>
    </div>
  )
}
