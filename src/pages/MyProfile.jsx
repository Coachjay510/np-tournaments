import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtHeight(inches) {
  if (!inches) return '—'
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

function avg(arr, key) {
  const vals = arr.map(r => Number(r[key])).filter(v => !isNaN(v))
  if (!vals.length) return '—'
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

// ── sub-components ────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  background: '#0e1320',
  border: '1px solid #1a2030',
  color: '#d8e0f0',
  borderRadius: 8,
  padding: '11px 14px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: 11,
  color: '#4a5568',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  display: 'block',
  marginBottom: 5,
}

const cardStyle = {
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 12,
  overflow: 'hidden',
}

const th = {
  padding: '8px 12px',
  fontSize: 10,
  color: '#6b7a99',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  borderBottom: '1px solid #1a2030',
  textAlign: 'left',
  background: '#080c12',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '10px 12px',
  color: '#c0cce0',
  fontSize: 13,
  borderBottom: '1px solid #0e1320',
}

function VerificationBadge({ status }) {
  const map = {
    verified:   { label: 'Verified',   color: '#5cb800', bg: '#0a180a', border: '#1e3a0a' },
    pending:    { label: 'Pending',     color: '#d4a017', bg: '#1a1400', border: '#3a2800' },
    unverified: { label: 'Unverified', color: '#6b7a99', bg: '#0a0f1a', border: '#1a2030' },
  }
  const s = map[status] || map.unverified
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: '3px 9px',
    }}>
      {s.label}
    </span>
  )
}

function StatPill({ label, value, accent = '#c0cce0' }) {
  return (
    <div style={{
      background: '#080c12', border: '1px solid #1a2030', borderRadius: 10,
      padding: '14px 18px', textAlign: 'center', minWidth: 70,
    }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginTop: 5 }}>
        {label}
      </div>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function MyProfile() {
  // auth
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession]         = useState(null)
  const [email, setEmail]             = useState('')
  const [otpSent, setOtpSent]         = useState(false)
  const [sendingOtp, setSendingOtp]   = useState(false)
  const [authError, setAuthError]     = useState(null)

  // player data
  const [player, setPlayer]           = useState(null)
  const [playerLoading, setPlayerLoading] = useState(false)

  // claim flow
  const [claimSearch, setClaimSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]     = useState(false)
  const [claiming, setClaiming]       = useState(null) // player id being claimed
  const [claimError, setClaimError]   = useState(null)
  const [searchDone, setSearchDone]   = useState(false)

  // profile edit
  const [activeTab, setActiveTab]     = useState('profile')
  const [form, setForm]               = useState({})
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState(null)

  // stats
  const [gameLogs, setGameLogs]       = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // teams
  const [teams, setTeams]             = useState([])
  const [teamsLoading, setTeamsLoading] = useState(false)

  // ── auth init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setAuthLoading(false)
      if (s) loadPlayer(s.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) {
        loadPlayer(s.user.id)
      } else {
        setPlayer(null)
        setGameLogs([])
        setTeams([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── data loaders ──────────────────────────────────────────────────────────

  async function loadPlayer(userId) {
    setPlayerLoading(true)
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setPlayer(data || null)
    if (data) {
      setForm({
        bio:        data.bio        || '',
        position:   data.position   || '',
        school_name: data.school_name || '',
        grad_year:  data.grad_year  != null ? String(data.grad_year) : '',
        gpa:        data.gpa        || '',
        accolade:   data.accolade   || '',
        film_url:   data.film_url   || '',
        film_url_2: data.film_url_2 || '',
      })
    }
    setPlayerLoading(false)
  }

  async function loadLogs(playerId) {
    setLogsLoading(true)
    const { data } = await supabase
      .from('player_game_logs')
      .select('*')
      .eq('player_id', playerId)
      .order('game_date', { ascending: false })
      .limit(20)
    setGameLogs(data || [])
    setLogsLoading(false)
  }

  async function loadTeams(playerId) {
    setTeamsLoading(true)
    const { data } = await supabase
      .from('team_players')
      .select('*, bt_master_teams(id, display_name, ranking_division_key, age_group)')
      .eq('player_id', playerId)
    setTeams(data || [])
    setTeamsLoading(false)
  }

  // load stats + teams when player found and tab viewed
  useEffect(() => {
    if (!player) return
    if (activeTab === 'stats' && gameLogs.length === 0 && !logsLoading) {
      loadLogs(player.id)
    }
    if (activeTab === 'teams' && teams.length === 0 && !teamsLoading) {
      loadTeams(player.id)
    }
  }, [activeTab, player])

  // ── auth actions ──────────────────────────────────────────────────────────

  async function handleSendOtp() {
    if (!email.trim()) return
    setSendingOtp(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/my-profile` },
    })
    if (error) setAuthError(error.message)
    else setOtpSent(true)
    setSendingOtp(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setPlayer(null)
    setGameLogs([])
    setTeams([])
    setOtpSent(false)
    setEmail('')
    setClaimSearch('')
    setSearchResults([])
    setSearchDone(false)
  }

  // ── claim flow ────────────────────────────────────────────────────────────

  async function handleSearch(e) {
    e.preventDefault()
    if (!claimSearch.trim()) return
    setSearching(true)
    setSearchDone(false)
    setClaimError(null)
    const parts = claimSearch.trim().split(/\s+/)
    let query = supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number, position, np_team_name, grad_year, gender, user_id')
      .is('user_id', null)

    if (parts.length >= 2) {
      query = query
        .ilike('first_name', `%${parts[0]}%`)
        .ilike('last_name', `%${parts[1]}%`)
    } else {
      query = query.or(
        `first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[0]}%`
      )
    }

    const { data } = await query.limit(20)
    setSearchResults(data || [])
    setSearchDone(true)
    setSearching(false)
  }

  async function handleClaim(p) {
    setClaiming(p.id)
    setClaimError(null)
    const { error } = await supabase
      .from('players')
      .update({ user_id: session.user.id })
      .eq('id', p.id)
      .is('user_id', null)

    if (error) {
      setClaimError(error.message)
      setClaiming(null)
      return
    }
    // reload player
    await loadPlayer(session.user.id)
    setClaiming(null)
    setSearchResults([])
    setClaimSearch('')
    setSearchDone(false)
  }

  // ── profile save ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!player) return
    setSaving(true)
    setSaveMsg(null)
    const payload = {
      bio:         form.bio        || null,
      position:    form.position   || null,
      school_name: form.school_name || null,
      grad_year:   form.grad_year  ? Number(form.grad_year) : null,
      gpa:         form.gpa        || null,
      accolade:    form.accolade   || null,
      film_url:    form.film_url   || null,
      film_url_2:  form.film_url_2 || null,
    }
    const { error } = await supabase
      .from('players')
      .update(payload)
      .eq('id', player.id)
      .eq('user_id', session.user.id)

    if (error) {
      setSaveMsg({ type: 'error', text: error.message })
    } else {
      setPlayer(prev => ({ ...prev, ...payload }))
      setSaveMsg({ type: 'ok', text: 'Profile saved.' })
      setTimeout(() => setSaveMsg(null), 3000)
    }
    setSaving(false)
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // ── computed stats ────────────────────────────────────────────────────────

  const seasonAverages = player && gameLogs.length > 0
    ? {
        pts: avg(gameLogs, 'pts'),
        reb: avg(gameLogs, 'reb'),
        ast: avg(gameLogs, 'ast'),
        stl: avg(gameLogs, 'stl'),
        blk: avg(gameLogs, 'blk'),
        gp:  gameLogs.length,
      }
    : null

  // ── RENDER: loading ───────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: 1 }}>
          NP TOURNAMENTS
        </div>
      </div>
    )
  }

  // ── RENDER: sign-in ───────────────────────────────────────────────────────

  if (!session) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>
          NP TOURNAMENTS
        </div>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 40 }}>
          Player Profile Portal
        </div>

        {otpSent ? (
          <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 10 }}>
              CHECK YOUR EMAIL
            </div>
            <div style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a login link to{' '}
              <strong style={{ color: '#c0cce0' }}>{email}</strong>.<br />
              Tap it to sign in to your player profile.
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
                Enter your email and we'll send you a one-tap login link. After logging in you can
                claim your player profile and update your info.
              </div>
              <label style={labelStyle}>Your Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="you@example.com"
                style={{ ...inputStyle, marginBottom: 14 }}
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
                  border: 'none', padding: 13, borderRadius: 10, fontSize: 15,
                  fontWeight: 700, cursor: sendingOtp || !email.trim() ? 'default' : 'pointer',
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

  // ── RENDER: loading player ────────────────────────────────────────────────

  if (playerLoading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4a5568', fontSize: 14 }}>Loading your profile…</div>
      </div>
    )
  }

  // ── RENDER: claim portal ──────────────────────────────────────────────────

  if (!player) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: 1 }}>
              NP TOURNAMENTS
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: '1px', marginTop: 2 }}>
              Player Portal
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#6b7a99' }}>{session.user.email}</div>
            <button
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '32px 20px', maxWidth: 520, width: '100%', margin: '0 auto' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 6 }}>
            CLAIM YOUR PROFILE
          </div>
          <div style={{ fontSize: 14, color: '#6b7a99', marginBottom: 28, lineHeight: 1.6 }}>
            Search for your name in our player database. Once you find your profile, click "This is me"
            to link it to your account.
          </div>

          <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Search by name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={claimSearch}
                onChange={e => setClaimSearch(e.target.value)}
                placeholder="First Last"
                style={{ ...inputStyle, flex: 1 }}
                autoFocus
              />
              <button
                type="submit"
                disabled={searching || !claimSearch.trim()}
                style={{
                  background: searching || !claimSearch.trim() ? '#1a2030' : '#5cb800',
                  color: searching || !claimSearch.trim() ? '#4a5568' : '#04060a',
                  border: 'none', padding: '0 20px', borderRadius: 8,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>

          {claimError && (
            <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, padding: '10px 14px', color: '#e05555', fontSize: 13, marginBottom: 16 }}>
              {claimError}
            </div>
          )}

          {searchDone && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#4a5568', fontSize: 13 }}>
              No unclaimed players found matching that name. Contact your tournament director if you
              believe your profile exists.
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} — select your profile
              </div>
              {searchResults.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: '#080c12', border: '1px solid #1a2030', borderRadius: 12,
                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff' }}>
                      {p.first_name} {p.last_name}
                      {p.jersey_number != null && (
                        <span style={{ color: '#5cb800', marginLeft: 8 }}>#{p.jersey_number}</span>
                      )}
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {p.position && (
                        <span style={{ fontSize: 12, color: '#6b7a99' }}>{p.position}</span>
                      )}
                      {p.np_team_name && (
                        <span style={{ fontSize: 12, color: '#8a9ab8' }}>{p.np_team_name}</span>
                      )}
                      {p.grad_year && (
                        <span style={{ fontSize: 12, color: '#4a5568' }}>Class of {p.grad_year}</span>
                      )}
                      {p.gender && (
                        <span style={{ fontSize: 12, color: '#4a5568' }}>
                          {p.gender === 'M' ? 'Boys' : p.gender === 'F' ? 'Girls' : p.gender}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaim(p)}
                    disabled={claiming === p.id}
                    style={{
                      background: claiming === p.id ? '#1a2030' : '#5cb800',
                      color: claiming === p.id ? '#4a5568' : '#04060a',
                      border: 'none', padding: '9px 16px', borderRadius: 8,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {claiming === p.id ? 'Claiming…' : 'This is me'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── RENDER: profile dashboard ─────────────────────────────────────────────

  const photoSrc = player.photo_url || player.avatar_url

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#d8e0f0' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: 1 }}>
            NP TOURNAMENTS
          </div>
          <div style={{ fontSize: 11, color: '#4a5568', letterSpacing: '1px', marginTop: 2 }}>
            My Profile
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#6b7a99' }}>
            signed in as {session.user.email}
          </div>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Player banner */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1a2030', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {photoSrc ? (
          <img
            src={photoSrc}
            alt=""
            style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid #1a2030', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: 12, background: '#0e1320',
            border: '2px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#2d3748', flexShrink: 0,
          }}>
            {(player.first_name?.[0] || '') + (player.last_name?.[0] || '')}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#f0f4ff', letterSpacing: '0.5px' }}>
              {player.first_name} {player.last_name}
            </h1>
            {player.jersey_number != null && (
              <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800' }}>
                #{player.jersey_number}
              </span>
            )}
            <VerificationBadge status={player.verification_status || 'unverified'} />
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              ['Position', player.position],
              ['Height',   fmtHeight(player.height_inches)],
              ['Weight',   player.weight_lbs ? `${player.weight_lbs} lbs` : null],
              ['Team',     player.np_team_name],
              ['School',   player.school_name],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: '#c0cce0', fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a2030', paddingLeft: 20 }}>
        {[
          { key: 'profile', label: 'Profile' },
          { key: 'stats',   label: 'Stats' },
          { key: 'teams',   label: 'Teams' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === t.key ? '2px solid #5cb800' : '2px solid transparent',
              color: activeTab === t.key ? '#5cb800' : '#6b7a99',
              padding: '12px 20px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.3px', marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, padding: '24px 20px', maxWidth: 640, width: '100%', margin: '0 auto' }}>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Editable fields */}
            <div style={{ ...cardStyle, padding: 22 }}>
              <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 18 }}>
                Edit Your Info
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={e => setField('bio', e.target.value)}
                    placeholder="Tell coaches and scouts about yourself…"
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Position</label>
                    <input
                      value={form.position}
                      onChange={e => setField('position', e.target.value)}
                      placeholder="e.g. PG, SG, PF"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Grad Year</label>
                    <input
                      value={form.grad_year}
                      onChange={e => setField('grad_year', e.target.value)}
                      placeholder="e.g. 2027"
                      type="number"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>School</label>
                  <input
                    value={form.school_name}
                    onChange={e => setField('school_name', e.target.value)}
                    placeholder="Your school name"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>GPA</label>
                    <input
                      value={form.gpa}
                      onChange={e => setField('gpa', e.target.value)}
                      placeholder="e.g. 3.8"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Accolade</label>
                    <input
                      value={form.accolade}
                      onChange={e => setField('accolade', e.target.value)}
                      placeholder="e.g. All-State"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Highlight Tape URL</label>
                  <input
                    value={form.film_url}
                    onChange={e => setField('film_url', e.target.value)}
                    placeholder="https://..."
                    type="url"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Highlight Tape 2 URL</label>
                  <input
                    value={form.film_url_2}
                    onChange={e => setField('film_url_2', e.target.value)}
                    placeholder="https://..."
                    type="url"
                    style={inputStyle}
                  />
                </div>
              </div>

              {saveMsg && (
                <div style={{
                  marginTop: 16,
                  background: saveMsg.type === 'ok' ? '#0a180a' : '#1f0707',
                  border: `1px solid ${saveMsg.type === 'ok' ? '#1e3a0a' : '#3a0a0a'}`,
                  borderRadius: 8, padding: '10px 14px',
                  color: saveMsg.type === 'ok' ? '#5cb800' : '#e05555',
                  fontSize: 13,
                }}>
                  {saveMsg.text}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 20, width: '100%',
                  background: saving ? '#1a2030' : '#5cb800',
                  color: saving ? '#4a5568' : '#04060a',
                  border: 'none', padding: 13, borderRadius: 10,
                  fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                  fontFamily: 'Anton, sans-serif', letterSpacing: '0.5px',
                }}
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>

            {/* Read-only info */}
            <div style={{ ...cardStyle }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Player Record (read-only)
              </div>
              <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Name',    `${player.first_name} ${player.last_name}`],
                  ['Jersey',  player.jersey_number != null ? `#${player.jersey_number}` : '—'],
                  ['Height',  fmtHeight(player.height_inches)],
                  ['Weight',  player.weight_lbs ? `${player.weight_lbs} lbs` : '—'],
                  ['Team',    player.np_team_name || '—'],
                  ['Gender',  player.gender === 'M' ? 'Boys' : player.gender === 'F' ? 'Girls' : '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14, color: '#c0cce0', fontWeight: 600 }}>{val}</div>
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
                    Verification
                  </div>
                  <VerificationBadge status={player.verification_status || 'unverified'} />
                </div>
              </div>
            </div>

            {/* Film links */}
            {(player.film_url || player.film_url_2) && (
              <div style={{ ...cardStyle, padding: '18px' }}>
                <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
                  Film Links
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {player.film_url && (
                    <a href={player.film_url} target="_blank" rel="noopener noreferrer" style={{ color: '#5cb800', fontSize: 14, wordBreak: 'break-all' }}>
                      Highlight Tape 1 →
                    </a>
                  )}
                  {player.film_url_2 && (
                    <a href={player.film_url_2} target="_blank" rel="noopener noreferrer" style={{ color: '#5cb800', fontSize: 14, wordBreak: 'break-all' }}>
                      Highlight Tape 2 →
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STATS TAB ── */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {logsLoading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#4a5568', fontSize: 13 }}>
                Loading stats…
              </div>
            ) : gameLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#4a5568', fontSize: 13 }}>
                No game logs recorded yet.
              </div>
            ) : (
              <>
                {/* Season averages */}
                {seasonAverages && (
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
                      Season Averages — {seasonAverages.gp} GP
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <StatPill label="PPG" value={seasonAverages.pts} accent="#5cb800" />
                      <StatPill label="RPG" value={seasonAverages.reb} />
                      <StatPill label="APG" value={seasonAverages.ast} />
                      <StatPill label="SPG" value={seasonAverages.stl} />
                      <StatPill label="BPG" value={seasonAverages.blk} />
                    </div>
                  </div>
                )}

                {/* Game log table */}
                <div style={{ ...cardStyle }}>
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Game Log (last {gameLogs.length})
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                      <thead>
                        <tr>
                          {['Date', 'Opponent', 'PTS', 'REB', 'AST', 'STL', 'BLK'].map(h => (
                            <th key={h} style={th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gameLogs.map((g, i) => (
                          <tr key={g.id || i}>
                            <td style={{ ...td, color: '#8a9ab8', fontSize: 12 }}>{fmtDate(g.game_date)}</td>
                            <td style={{ ...td, color: '#c0cce0', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.opponent || '—'}
                            </td>
                            <td style={{ ...td, color: '#5cb800', fontWeight: 700 }}>{g.pts ?? '—'}</td>
                            <td style={td}>{g.reb ?? '—'}</td>
                            <td style={td}>{g.ast ?? '—'}</td>
                            <td style={td}>{g.stl ?? '—'}</td>
                            <td style={td}>{g.blk ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TEAMS TAB ── */}
        {activeTab === 'teams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {teamsLoading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#4a5568', fontSize: 13 }}>
                Loading teams…
              </div>
            ) : teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#4a5568', fontSize: 13 }}>
                No team memberships found.
              </div>
            ) : (
              teams.map(tp => {
                const t = tp.bt_master_teams
                if (!t) return null
                return (
                  <div
                    key={tp.id}
                    style={{
                      ...cardStyle,
                      padding: '18px 20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', marginBottom: 6 }}>
                        {t.display_name}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {t.ranking_division_key && (
                          <div>
                            <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Division</div>
                            <div style={{ fontSize: 13, color: '#8a9ab8' }}>{t.ranking_division_key}</div>
                          </div>
                        )}
                        {t.age_group && (
                          <div>
                            <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Age Group</div>
                            <div style={{ fontSize: 13, color: '#8a9ab8' }}>{t.age_group}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      background: '#0d1a0a', border: '1px solid #1e3a0a', borderRadius: 8,
                      padding: '6px 12px', fontSize: 11, color: '#5cb800',
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0,
                    }}>
                      Active
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  )
}
