import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const SAVE_DEBOUNCE_MS = 5000
const LOCAL_KEY = (id) => `np_scoreboard_${id}`

function ScoreBtn({ label, onClick, color = '#c0cce0', small = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#0e1320',
        border: '1px solid #1a2030',
        color,
        borderRadius: 10,
        padding: small ? '10px 12px' : '16px 0',
        fontSize: small ? 13 : 18,
        fontWeight: 700,
        fontFamily: 'Anton, sans-serif',
        cursor: 'pointer',
        minWidth: small ? 48 : 64,
        flex: small ? undefined : 1,
        letterSpacing: '0.5px',
        transition: 'background 0.1s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseDown={e => (e.currentTarget.style.background = '#1a2030')}
      onMouseUp={e => (e.currentTarget.style.background = '#0e1320')}
      onTouchStart={e => (e.currentTarget.style.background = '#1a2030')}
      onTouchEnd={e => (e.currentTarget.style.background = '#0e1320')}
    >
      {label}
    </button>
  )
}

export default function Scoreboard() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [staffRecord, setStaffRecord] = useState(null)
  const [staffLoading, setStaffLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [authError, setAuthError] = useState(null)

  // ── Game selection ─────────────────────────────────────────────────────────
  const [myCourtGames, setMyCourtGames] = useState([])
  const [otherGames, setOtherGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)

  // ── Score state ────────────────────────────────────────────────────────────
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [period, setPeriod] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [completing, setCompleting] = useState(false)

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState('idle')
  const [lastSaved, setLastSaved] = useState(null)
  const saveTimer = useRef(null)
  const [resumeData, setResumeData] = useState(null)

  // ── Auth init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session) loadStaffRecord(session.user.email)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadStaffRecord(session.user.email)
      } else {
        setStaffRecord(null)
        setMyCourtGames([])
        setOtherGames([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadStaffRecord(userEmail) {
    setStaffLoading(true)

    // Check tournament_staff first (scorekeepers, coordinators, admins)
    const { data: staff } = await supabase
      .from('tournament_staff')
      .select('*, courts(id, name)')
      .eq('email', userEmail)
      .in('role', ['scorekeeper', 'coordinator', 'admin'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (staff) {
      setStaffRecord(staff)
      setStaffLoading(false)
      loadGames(staff)
      return
    }

    // Fall back: check if they're a director (sees all games, no court filter)
    const { data: director } = await supabase
      .from('directors')
      .select('id, display_name, email')
      .eq('email', userEmail)
      .maybeSingle()

    if (director) {
      const rec = { id: director.id, name: director.display_name, email: director.email, role: 'director', court_id: null, courts: null }
      setStaffRecord(rec)
      setStaffLoading(false)
      loadGames(rec)
      return
    }

    setStaffRecord(null)
    setStaffLoading(false)
  }

  async function loadGames(staff) {
    setLoadingGames(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('scheduled_games')
      .select('id, home_team_name, away_team_name, scheduled_date, scheduled_time, round, pool_name, home_score, away_score, status, tournament_id, court_id')
      .eq('scheduled_date', today)
      .neq('status', 'completed')
      .order('scheduled_time', { ascending: true })

    const all = data || []
    if (staff?.court_id) {
      setMyCourtGames(all.filter(g => g.court_id === staff.court_id))
      setOtherGames(all.filter(g => g.court_id !== staff.court_id))
    } else {
      setMyCourtGames([])
      setOtherGames(all)
    }
    setLoadingGames(false)
  }

  async function handleSendOtp() {
    if (!email.trim()) return
    setSendingOtp(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/scoreboard` },
    })
    if (error) setAuthError(error.message)
    else setOtpSent(true)
    setSendingOtp(false)
  }

  async function handleSignOut() {
    clearTimeout(saveTimer.current)
    await supabase.auth.signOut()
    setSelectedGame(null)
    setResumeData(null)
    setStaffRecord(null)
    setMyCourtGames([])
    setOtherGames([])
    setOtpSent(false)
    setEmail('')
  }

  // ── Select a game ──────────────────────────────────────────────────────────
  const handleSelectGame = useCallback(async (game) => {
    const local = localStorage.getItem(LOCAL_KEY(game.id))
    const { data: remote } = await supabase
      .from('scoreboard_sessions')
      .select('*')
      .eq('game_id', game.id)
      .maybeSingle()

    const existing = remote || (local ? JSON.parse(local) : null)
    if (existing && (existing.home_score > 0 || existing.away_score > 0 || existing.period > 1)) {
      setResumeData({ game, session: existing })
    } else {
      startGame(game, 0, 0, 1)
    }
  }, [])

  function startGame(game, hs = 0, as_ = 0, p = 1) {
    setSelectedGame(game)
    setHomeScore(hs)
    setAwayScore(as_)
    setPeriod(p)
    setGameOver(false)
    setResumeData(null)
    setSaveStatus('idle')
  }

  // ── Save logic ─────────────────────────────────────────────────────────────
  const doSaveToSupabase = useCallback(async (game, hs, as_, p) => {
    if (!game) return
    setSaveStatus('saving')
    try {
      await supabase.from('scoreboard_sessions').upsert(
        { game_id: game.id, home_score: hs, away_score: as_, period: p, status: 'active', updated_at: new Date().toISOString() },
        { onConflict: 'game_id' }
      )
      await supabase
        .from('scheduled_games')
        .update({ home_score: hs, away_score: as_, updated_at: new Date().toISOString() })
        .eq('id', game.id)
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch {
      setSaveStatus('error')
    }
  }, [])

  const scheduleAutoSave = useCallback((game, hs, as_, p) => {
    localStorage.setItem(LOCAL_KEY(game.id), JSON.stringify({ home_score: hs, away_score: as_, period: p, updated_at: new Date().toISOString() }))
    setSaveStatus('pending')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSaveToSupabase(game, hs, as_, p), SAVE_DEBOUNCE_MS)
  }, [doSaveToSupabase])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  function addHome(n) {
    const next = Math.max(0, homeScore + n)
    setHomeScore(next)
    scheduleAutoSave(selectedGame, next, awayScore, period)
  }
  function addAway(n) {
    const next = Math.max(0, awayScore + n)
    setAwayScore(next)
    scheduleAutoSave(selectedGame, homeScore, next, period)
  }
  function nextPeriod() {
    const next = period + 1
    setPeriod(next)
    scheduleAutoSave(selectedGame, homeScore, awayScore, next)
  }

  async function handleComplete() {
    setCompleting(true)
    clearTimeout(saveTimer.current)
    const winnerId =
      homeScore > awayScore ? selectedGame.home_team_id :
      awayScore > homeScore ? selectedGame.away_team_id : null

    await supabase.from('scheduled_games').update({
      home_score: homeScore, away_score: awayScore,
      winner_team_id: winnerId, status: 'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', selectedGame.id)

    await supabase.from('scoreboard_sessions').upsert({
      game_id: selectedGame.id, home_score: homeScore, away_score: awayScore,
      period, status: 'completed', updated_at: new Date().toISOString(),
    }, { onConflict: 'game_id' })

    localStorage.removeItem(LOCAL_KEY(selectedGame.id))
    setGameOver(true)
    setCompleting(false)
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…' :
    saveStatus === 'pending' ? 'Unsaved changes' :
    saveStatus === 'error' ? '⚠ Save failed' :
    saveStatus === 'saved' && lastSaved
      ? `Saved ${Math.round((Date.now() - lastSaved) / 1000)}s ago`
      : ''

  // ── Filtered game lists ────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase()
  const filteredMyCourt = q
    ? myCourtGames.filter(g => `${g.home_team_name} ${g.away_team_name}`.toLowerCase().includes(q))
    : myCourtGames
  const filteredOther = q
    ? otherGames.filter(g => `${g.home_team_name} ${g.away_team_name}`.toLowerCase().includes(q))
    : otherGames

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: auth loading
  // ════════════════════════════════════════════════════════════════════════════
  if (authLoading || staffLoading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: 1 }}>NP SCOREBOARD</div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: sign-in
  // ════════════════════════════════════════════════════════════════════════════
  if (!session) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>NP SCOREBOARD</div>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 40 }}>Scorekeeper Login</div>

        {otpSent ? (
          <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 10 }}>CHECK YOUR EMAIL</div>
            <div style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a login link to <strong style={{ color: '#c0cce0' }}>{email}</strong>.<br />
              Tap the link in your email to open the scoreboard.
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
                style={{ width: '100%', background: sendingOtp || !email.trim() ? '#1a2030' : '#5cb800', color: sendingOtp || !email.trim() ? '#4a5568' : '#04060a', border: 'none', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: sendingOtp || !email.trim() ? 'default' : 'pointer', fontFamily: 'Anton, sans-serif', letterSpacing: '0.5px' }}
              >
                {sendingOtp ? 'Sending…' : 'Send Login Link →'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: not a registered scorekeeper
  // ════════════════════════════════════════════════════════════════════════════
  if (!staffRecord) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#f0f4ff', marginBottom: 10 }}>NOT REGISTERED</div>
        <div style={{ color: '#6b7a99', fontSize: 14, maxWidth: 340, lineHeight: 1.6, marginBottom: 28 }}>
          {session.user.email} is not registered as a scorekeeper.<br />
          Contact your tournament director to be added.
        </div>
        <button
          onClick={handleSignOut}
          style={{ background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
        >
          Sign out
        </button>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: resume modal
  // ════════════════════════════════════════════════════════════════════════════
  if (resumeData) {
    const { game, session: saved } = resumeData
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#080c12', border: '1px solid #d4a017', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#d4a017', marginBottom: 6 }}>RESUME GAME?</div>
          <div style={{ color: '#c0cce0', fontSize: 14, marginBottom: 20 }}>A saved session was found for this game:</div>
          <div style={{ background: '#0a0f1a', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, color: '#f0f4ff', marginBottom: 8 }}>
              {game.home_team_name} vs {game.away_team_name}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Score</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800' }}>{saved.home_score} – {saved.away_score}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Period</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#c0cce0' }}>{saved.period}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => startGame(game, 0, 0, 1)} style={{ flex: 1, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: 11, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Start Over
            </button>
            <button onClick={() => startGame(game, saved.home_score, saved.away_score, saved.period)} style={{ flex: 2, background: '#5cb800', color: '#04060a', border: 'none', padding: 11, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              Resume →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: live scoreboard
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedGame) {
    const winner = homeScore > awayScore ? selectedGame.home_team_name
      : awayScore > homeScore ? selectedGame.away_team_name : null

    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => { clearTimeout(saveTimer.current); setSelectedGame(null) }}
            style={{ background: 'transparent', border: 'none', color: '#6b7a99', fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            ← Games
          </button>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#5cb800', letterSpacing: 1 }}>NP SCOREBOARD</div>
          <div style={{ fontSize: 11, color: saveStatus === 'error' ? '#e05555' : saveStatus === 'saved' ? '#5cb800' : '#4a5568' }}>
            {saveLabel}
          </div>
        </div>

        {(selectedGame.round || selectedGame.pool_name) && (
          <div style={{ padding: '6px 20px', background: '#080c12', borderBottom: '1px solid #1a2030', fontSize: 11, color: '#6b7a99', textAlign: 'center' }}>
            {[selectedGame.round, selectedGame.pool_name].filter(Boolean).join(' · ')}
          </div>
        )}

        {gameOver ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
            <div style={{ fontSize: 11, color: '#5cb800', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>FINAL</div>
            <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#8a9ab8', marginBottom: 6, maxWidth: 140 }}>{selectedGame.home_team_name}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 72, color: homeScore > awayScore ? '#5cb800' : '#f0f4ff', lineHeight: 1 }}>{homeScore}</div>
              </div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#2d3748' }}>–</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#8a9ab8', marginBottom: 6, maxWidth: 140 }}>{selectedGame.away_team_name}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 72, color: awayScore > homeScore ? '#5cb800' : '#f0f4ff', lineHeight: 1 }}>{awayScore}</div>
              </div>
            </div>
            {winner && <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#d4a017', letterSpacing: 1 }}>{winner} WINS</div>}
            <button onClick={() => { setSelectedGame(null); setGameOver(false) }} style={{ marginTop: 20, background: '#5cb800', color: '#04060a', border: 'none', padding: '13px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Score Another Game
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[1, 2, 3, 4].map(p => (
                <button key={p} onClick={() => { setPeriod(p); scheduleAutoSave(selectedGame, homeScore, awayScore, p) }} style={{ background: period === p ? '#0d1a0a' : '#0e1320', color: period === p ? '#5cb800' : '#4a5568', border: `1px solid ${period === p ? '#2a4010' : '#1a2030'}`, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Q{p}</button>
              ))}
              <button onClick={() => { setPeriod(5); scheduleAutoSave(selectedGame, homeScore, awayScore, 5) }} style={{ background: period === 5 ? '#1a1400' : '#0e1320', color: period === 5 ? '#d4a017' : '#4a5568', border: `1px solid ${period === 5 ? '#3a2800' : '#1a2030'}`, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OT</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#8a9ab8', marginBottom: 8, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{selectedGame.home_team_name}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 88, color: '#f0f4ff', lineHeight: 1, letterSpacing: '-2px' }}>{homeScore}</div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <ScoreBtn label="+3" onClick={() => addHome(3)} color="#d4a017" />
                  <ScoreBtn label="+2" onClick={() => addHome(2)} color="#5cb800" />
                  <ScoreBtn label="+1" onClick={() => addHome(1)} color="#c0cce0" />
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                  <ScoreBtn label="−1" onClick={() => addHome(-1)} color="#4a5568" small />
                </div>
              </div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: '#1a2030', textAlign: 'center', paddingTop: 44 }}>—</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#8a9ab8', marginBottom: 8, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{selectedGame.away_team_name}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 88, color: '#f0f4ff', lineHeight: 1, letterSpacing: '-2px' }}>{awayScore}</div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <ScoreBtn label="+1" onClick={() => addAway(1)} color="#c0cce0" />
                  <ScoreBtn label="+2" onClick={() => addAway(2)} color="#5cb800" />
                  <ScoreBtn label="+3" onClick={() => addAway(3)} color="#d4a017" />
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                  <ScoreBtn label="−1" onClick={() => addAway(-1)} color="#4a5568" small />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <button onClick={nextPeriod} style={{ background: '#0e1320', color: '#c0cce0', border: '1px solid #1a2030', padding: 13, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Q{Math.min(period + 1, 5)} Next</button>
                <button onClick={handleComplete} disabled={completing} style={{ background: completing ? '#1a2030' : '#5cb800', color: completing ? '#4a5568' : '#04060a', border: 'none', padding: 13, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {completing ? 'Finalizing…' : 'Complete Game →'}
                </button>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#2d3748' }}>
                Scores auto-save every {SAVE_DEBOUNCE_MS / 1000}s · Safe to leave and return
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: game picker
  // ════════════════════════════════════════════════════════════════════════════
  const courtName = staffRecord.courts?.name
  const totalGames = filteredMyCourt.length + filteredOther.length

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: 1 }}>NP SCOREBOARD</div>
          {courtName ? (
            <div style={{ fontSize: 11, color: '#d4a017', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>
              {courtName}
            </div>
          ) : staffRecord?.role === 'director' && (
            <div style={{ fontSize: 11, color: '#4a9eff', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>
              Director · All Games
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: '#8a9ab8', fontWeight: 600 }}>{staffRecord.name}</div>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 2 }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', maxWidth: 520, width: '100%', margin: '0 auto' }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search any team…"
          style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 10, padding: '12px 16px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20 }}
        />

        {loadingGames ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: 40 }}>Loading today's games…</div>
        ) : totalGames === 0 ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: 40, fontSize: 13 }}>
            {searchQuery ? 'No matching games.' : 'No games scheduled for today.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* My court games */}
            {filteredMyCourt.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📍 {courtName || 'Your Court'}</span>
                  <span style={{ color: '#4a5568' }}>— {filteredMyCourt.length} game{filteredMyCourt.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredMyCourt.map(g => <GameCard key={g.id} game={g} onSelect={handleSelectGame} highlight />)}
                </div>
              </div>
            )}

            {/* Other games */}
            {filteredOther.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  {filteredMyCourt.length > 0 ? 'All Other Games' : `Today · ${filteredOther.length} game${filteredOther.length !== 1 ? 's' : ''}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredOther.map(g => <GameCard key={g.id} game={g} onSelect={handleSelectGame} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GameCard({ game, onSelect, highlight = false }) {
  return (
    <button
      onClick={() => onSelect(game)}
      style={{
        background: highlight ? '#080f04' : '#080c12',
        border: `1px solid ${highlight ? '#1e3a0a' : '#1a2030'}`,
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer',
        textAlign: 'left', width: '100%', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = highlight ? '#3a6014' : '#2a4010')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = highlight ? '#1e3a0a' : '#1a2030')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {(game.round || game.pool_name) && (
            <div style={{ fontSize: 10, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {[game.round, game.pool_name].filter(Boolean).join(' · ')}
            </div>
          )}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>{game.home_team_name}</div>
          <div style={{ fontSize: 12, color: '#6b7a99', margin: '2px 0' }}>vs</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>{game.away_team_name}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {game.scheduled_time && (
            <div style={{ fontSize: 12, color: '#8a9ab8' }}>{game.scheduled_time.slice(0, 5)}</div>
          )}
          {(game.home_score != null || game.away_score != null) && (
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', marginTop: 4 }}>
              {game.home_score ?? 0} – {game.away_score ?? 0}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 10, color: '#5cb800', fontWeight: 700, textTransform: 'uppercase' }}>Score →</div>
        </div>
      </div>
    </button>
  )
}
