import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  input: { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' },
  label: { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 },
  card: { background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 },
  btn: (color) => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
    background: color === 'green' ? '#5cb800' : color === 'blue' ? '#1a2a4a' : color === 'orange' ? '#d4630a' : color === 'red' ? '#8b1a1a' : '#1a2030',
    color: color === 'green' ? '#04060a' : color === 'blue' ? '#7eb3ff' : '#fff',
  }),
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' },
  td: { padding: '11px 14px', color: '#d8e0f0', fontSize: 13, borderBottom: '1px solid #0e1320' },
}

// ── Bracket Visual ─────────────────────────────────────────────────────────
function GameCard({ game, onEdit }) {
  const done = game.status === 'completed'
  const homeWon = done && game.winner_team_id === game.home_team_id
  const awayWon = done && game.winner_team_id === game.away_team_id
  return (
    <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, overflow: 'hidden', width: 190, flexShrink: 0 }}>
      <div style={{ padding: '3px 8px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: '#4a5568' }}>{game.court_name || 'Court TBD'}</span>
        <span style={{ fontSize: 9, color: '#4a5568' }}>{game.scheduled_time || 'TBD'}</span>
      </div>
      {[{ name: game.home_team_name, score: game.home_score, won: homeWon },
        { name: game.away_team_name, score: game.away_score, won: awayWon }].map((team, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: team.won ? '#0d1a0a' : 'transparent', borderBottom: i === 0 ? '1px solid #1a2030' : 'none' }}>
          <span style={{ fontSize: 11, color: team.won ? '#5cb800' : '#d8e0f0', fontWeight: team.won ? 700 : 400, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {team.name || 'TBD'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: team.won ? '#5cb800' : '#6b7a99' }}>
            {done ? (team.score ?? 0) : '-'}
          </span>
        </div>
      ))}
      {onEdit && (
        <button onClick={() => onEdit(game)} style={{ width: '100%', padding: '3px', fontSize: 10, background: 'transparent', border: 'none', borderTop: '1px solid #1a2030', color: '#4a9eff', cursor: 'pointer' }}>
          {done ? 'Edit Score' : 'Enter Score'}
        </button>
      )}
    </div>
  )
}

function BracketView({ games, divisionKey, onEdit, onBack }) {
  const rounds = useMemo(() => {
    const map = {}
    games.forEach(g => {
      const r = g.round || 'Games'
      if (!map[r]) map[r] = []
      map[r].push(g)
    })
    return map
  }, [games])

  const pools = useMemo(() => {
    const map = {}
    games.filter(g => g.pool_name).forEach(g => {
      if (!map[g.pool_name]) map[g.pool_name] = []
      map[g.pool_name].push(g)
    })
    return map
  }, [games])

  const bracketGames = games.filter(g => !g.pool_name && g.round && g.round !== 'Round Robin')
  const rrGames = games.filter(g => g.round === 'Round Robin')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 12 }}>← Back</button>
        <h2 style={{ margin: 0, fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: '0.5px' }}>{divisionKey} BRACKET</h2>
        <span style={{ fontSize: 11, color: '#4a5568' }}>{games.length} games</span>
      </div>

      {/* Pool play */}
      {Object.keys(pools).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Pool Play</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {Object.entries(pools).map(([poolName, poolGames]) => (
              <div key={poolName}>
                <div style={{ fontSize: 12, color: '#d4a017', fontWeight: 700, marginBottom: 8 }}>{poolName}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {poolGames.map(g => <GameCard key={g.id} game={g} onEdit={onEdit} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round robin */}
      {rrGames.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Round Robin</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rrGames.map(g => <GameCard key={g.id} game={g} onEdit={onEdit} />)}
          </div>
        </div>
      )}

      {/* Bracket rounds */}
      {bracketGames.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Bracket</div>
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 16 }}>
            {Object.entries(rounds).filter(([r]) => r !== 'Round Robin' && r !== 'Pool Play').map(([roundName, roundGames]) => (
              <div key={roundName} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', minWidth: 200 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7a99', marginBottom: 4 }}>{roundName}</div>
                {roundGames.map(g => <GameCard key={g.id} game={g} onEdit={onEdit} />)}
              </div>
            ))}
          </div>
        </div>
      )}

      {games.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No games scheduled yet for this division</div>
      )}
    </div>
  )
}

// ── Score Edit Modal ───────────────────────────────────────────────────────
function ScoreModal({ game, onSave, onClose }) {
  const [home, setHome] = useState(game.home_score ?? '')
  const [away, setAway] = useState(game.away_score ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(game.id, Number(home), Number(away))
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 360 }}>
        <h3 style={{ margin: '0 0 20px', color: '#f0f4ff' }}>Enter Score</h3>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={s.label}>{game.home_team_name}</label>
            <input type="number" value={home} onChange={e => setHome(e.target.value)} style={{ ...s.input, width: '100%' }} autoFocus />
          </div>
          <div>
            <label style={s.label}>{game.away_team_name}</label>
            <input type="number" value={away} onChange={e => setAway(e.target.value)} style={{ ...s.input, width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Saving...' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Auto Scheduler ─────────────────────────────────────────────────────────
function AutoSchedulerPanel({ teams, constraints, courts, games, divisionKey, tournamentId, onScheduled }) {
  const [format, setFormat] = useState('pool_then_bracket')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [gameDuration, setGameDuration] = useState(60)
  const [selectedCourts, setSelectedCourts] = useState(courts.map(c => c.id))
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const divTeams = teams.filter(t => t.division_key === divisionKey)
  // All existing games (other divisions) for court conflict avoidance
  const existingGames = games || []

  function toggleCourt(id) {
    setSelectedCourts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleRun() {
    console.log('handleRun called', { startDate, selectedCourts, divTeams, divisionKey, teams })
    if (!startDate || !selectedCourts.length || !divTeams.length) {
      console.log('Early return:', { startDate, courtsLen: selectedCourts.length, divTeamsLen: divTeams.length })
      return
    }
    setRunning(true)
    setResult(null)

    const courtsToUse = courts.filter(c => selectedCourts.includes(c.id))
    const generatedGames = generateConflictAwareGames({
      teams: divTeams,
      constraints,
      existingGames,
      startDate,
      startTime,
      courtsToUse,
      format,
      gameDuration: Number(gameDuration),
      divisionKey,
    })

    const { error } = await supabase.from('scheduled_games').insert(
      generatedGames.map(g => ({ ...g, tournament_id: tournamentId, is_auto_scheduled: true }))
    )

    if (error) {
      setResult({ type: 'error', msg: error.message })
    } else {
      setResult({ type: 'success', msg: `Generated ${generatedGames.length} games!` })
      onScheduled()
    }
    setRunning(false)
  }

  return (
    <div style={s.card}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, color: '#f0f4ff', marginBottom: 16 }}>⚡ AUTO SCHEDULER — {divisionKey}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={s.label}>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...s.input, width: '100%' }}>
            <option value="pool_then_bracket">Pool Play → Bracket</option>
            <option value="single_elimination">Single Elimination</option>
            <option value="double_elimination">Double Elimination</option>
            <option value="pool_play">Pool Play Only</option>
            <option value="round_robin">Round Robin</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Game Duration (mins)</label>
          <input type="number" value={gameDuration} onChange={e => setGameDuration(e.target.value)} style={{ ...s.input, width: '100%' }} />
        </div>
        <div>
          <label style={s.label}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...s.input, width: '100%' }} />
        </div>
        <div>
          <label style={s.label}>First Game Time</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...s.input, width: '100%' }} />
        </div>
      </div>

      {/* Courts */}
      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>Courts</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {courts.length === 0 ? (
            <div style={{ fontSize: 12, color: '#4a5568' }}>No courts — add venues with courts first</div>
          ) : courts.map(court => (
            <button key={court.id} onClick={() => toggleCourt(court.id)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: selectedCourts.includes(court.id) ? '#0d1a0a' : 'transparent',
              color: selectedCourts.includes(court.id) ? '#5cb800' : '#6b7a99',
              border: `1px solid ${selectedCourts.includes(court.id) ? '#1a3a0a' : '#1a2030'}`,
            }}>
              {court.name}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict summary */}
      {constraints.length > 0 && (
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#d4a017', fontWeight: 700, marginBottom: 8 }}>⚠ CONFLICTS DETECTED ({constraints.filter(c => c.has_conflicts).length} teams)</div>
          {constraints.filter(c => c.has_conflicts).map(c => (
            <div key={c.id} style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>
              <span style={{ color: '#c0cce0' }}>Team {c.team_id}</span>
              {c.preferred_day && ` · ${c.preferred_day} only`}
              {c.earliest_start_time && ` · After ${c.earliest_start_time}`}
              {c.latest_start_time && ` · Before ${c.latest_start_time}`}
              {c.shared_coach_group && ` · Coach group: ${c.shared_coach_group}`}
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase' }}>Teams</div>
          <div style={{ fontSize: 22, fontFamily: 'Anton, sans-serif', color: '#f0f4ff', marginTop: 4 }}>{divTeams.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase' }}>Est. Games</div>
          <div style={{ fontSize: 22, fontFamily: 'Anton, sans-serif', color: '#5cb800', marginTop: 4 }}>{estimateGames(format, divTeams.length)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase' }}>Courts</div>
          <div style={{ fontSize: 22, fontFamily: 'Anton, sans-serif', color: '#f0f4ff', marginTop: 4 }}>{selectedCourts.length}</div>
        </div>
      </div>

      {result && (
        <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12, background: result.type === 'success' ? '#0d1a0a' : '#1f0707', color: result.type === 'success' ? '#5cb800' : '#e05555', border: `1px solid ${result.type === 'success' ? '#1a3a0a' : '#3a0a0a'}` }}>
          {result.msg}
        </div>
      )}

      <button onClick={handleRun} disabled={running || !startDate || !selectedCourts.length || !divTeams.length}
        style={{ ...s.btn('green'), width: '100%', opacity: (running || !startDate || !selectedCourts.length || !divTeams.length) ? 0.5 : 1 }}>
        {running ? 'Generating...' : '⚡ Generate Schedule'}
      </button>
    </div>
  )
}

// ── Main Schedule Page ─────────────────────────────────────────────────────
export default function Schedule({ director }) {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [teams, setTeams] = useState([])
  const [constraints, setConstraints] = useState([])
  const [courts, setCourts] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('schedule') // 'schedule' | 'bracket'
  const [activeDivision, setActiveDivision] = useState(null)
  const [scoreGame, setScoreGame] = useState(null)
  const [showScheduler, setShowScheduler] = useState(false)

  useEffect(() => {
    supabase.from('tournaments').select('id, name, start_date').order('start_date', { ascending: false })
      .then(({ data }) => {
        setTournaments(data || [])
        if (data?.[0]) setSelectedTournamentId(data[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedTournamentId) return
    loadAll(selectedTournamentId)
  }, [selectedTournamentId])

  async function loadAll(tid) {
    setLoading(true)
    const [ttRes, constraintsRes, courtsRes, gamesRes] = await Promise.all([
      supabase.from('tournament_teams').select('*').eq('tournament_id', tid),
      supabase.from('tournament_team_constraints').select('*').eq('tournament_id', tid),
      supabase.from('venue_courts').select('*, venue_gyms(name), venues(name)').order('name'),
      supabase.from('scheduled_games').select('*').eq('tournament_id', tid).order('scheduled_date').order('scheduled_time'),
    ])

    const teamIds = [...new Set((ttRes.data || []).map(t => Number(t.team_id)).filter(Boolean))]
    let masterMap = {}
    if (teamIds.length) {
      const { data: masterData } = await supabase
        .from('bt_master_teams')
        .select('id, display_name, age_group, gender, ranking_division_key, bt_organizations(org_name)')
        .in('id', teamIds)
      ;(masterData || []).forEach(m => { masterMap[Number(m.id)] = m })
    }
    const mergedTeams = (ttRes.data || []).map(tt => ({
      ...tt,
      team_name: masterMap[Number(tt.team_id)]?.display_name || '—',
      org_name: masterMap[Number(tt.team_id)]?.bt_organizations?.org_name || '—',
      division_key: masterMap[Number(tt.team_id)]?.ranking_division_key || '—',
      age_group: masterMap[Number(tt.team_id)]?.age_group || '—',
      gender: masterMap[Number(tt.team_id)]?.gender || '—',
    }))
    const mergedCourts = (courtsRes.data || []).map(c => ({
      ...c,
      name: `${c.venues?.name || ''} - ${c.venue_gyms?.name || ''} - ${c.name}`.replace(/^ - | -  - /g, '').trim(),
    }))

    setTeams(mergedTeams)
    setConstraints(constraintsRes.data || [])
    setCourts(mergedCourts)
    setGames(gamesRes.data || [])
    setLoading(false)
  }

  async function handleUpdateScore(gameId, homeScore, awayScore) {
    const game = games.find(g => g.id === gameId)
    const winnerId = homeScore > awayScore ? game?.home_team_id : awayScore > homeScore ? game?.away_team_id : null
    await supabase.from('scheduled_games').update({
      home_score: homeScore, away_score: awayScore,
      winner_team_id: winnerId, status: 'completed', updated_at: new Date().toISOString()
    }).eq('id', gameId)
    loadAll(selectedTournamentId)
  }

  async function handleDeleteGames(divKey) {
    const divGames = games.filter(g => g.division_key === divKey || teams.find(t => t.team_id === g.home_team_id && t.division_key === divKey))
    if (!divGames.length) return
    await supabase.from('scheduled_games').delete().in('id', divGames.map(g => g.id))
    loadAll(selectedTournamentId)
  }

  const divisionGroups = useMemo(() => {
    const groups = {}
    teams.forEach(team => {
      const key = team.division_key || 'No Division'
      if (!groups[key]) groups[key] = []
      groups[key].push(team)
    })
    return groups
  }, [teams])

  const divisionGames = useMemo(() => {
    if (!activeDivision) return []
    const divTeamIds = new Set(teams.filter(t => t.division_key === activeDivision).map(t => String(t.team_id)))
    return games.filter(g =>
      divTeamIds.has(String(g.home_team_id)) || divTeamIds.has(String(g.away_team_id)) ||
      g.home_team_name === 'TBD' || g.away_team_name === 'TBD'
    )
  }, [games, activeDivision, teams])

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="SCHEDULE"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {view === 'bracket' && (
              <button onClick={() => { setView('schedule'); setActiveDivision(null) }} style={s.btn('blue')}>← Schedule</button>
            )}
            {selectedTournamentId && (
              <button onClick={() => navigate(`/tournaments/${selectedTournamentId}`)} style={s.btn('blue')}>Open Tournament →</button>
            )}
          </div>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {/* Tournament selector */}
        <div style={{ marginBottom: 20 }}>
          <select value={selectedTournamentId} onChange={e => { setSelectedTournamentId(e.target.value); setView('schedule'); setActiveDivision(null) }}
            style={{ ...s.input, minWidth: 300 }}>
            <option value="">Select a tournament</option>
            {tournaments.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : !selectedTournamentId ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Select a tournament to view its schedule</div>
        ) : view === 'bracket' && activeDivision ? (
          // ── Bracket View ──
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {Object.keys(divisionGroups).sort().map(div => (
                <button key={div} onClick={() => setActiveDivision(div)} style={{
                  ...s.btn(div === activeDivision ? 'green' : 'blue'),
                  fontSize: 11,
                }}>
                  {div} ({divisionGroups[div]?.length || 0})
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <button onClick={() => setShowScheduler(!showScheduler)} style={s.btn('orange')}>
                ⚡ {showScheduler ? 'Hide' : 'Show'} Auto Scheduler
              </button>
              {divisionGames.length > 0 && (
                <button onClick={() => { if (confirm('Delete all games for this division?')) handleDeleteGames(activeDivision) }} style={s.btn('red')}>
                  🗑 Clear Games
                </button>
              )}
            </div>

            {showScheduler && (
              <div style={{ marginBottom: 20 }}>
                <AutoSchedulerPanel
                  teams={teams}
                  constraints={constraints}
                  courts={courts}
                  games={games}
                  divisionKey={activeDivision}
                  tournamentId={selectedTournamentId}
                  onScheduled={() => loadAll(selectedTournamentId)}
                />
              </div>
            )}

            <div style={s.card}>
              <BracketView
                games={divisionGames}
                divisionKey={activeDivision}
                onEdit={setScoreGame}
                onBack={() => { setView('schedule'); setActiveDivision(null) }}
              />
            </div>
          </div>
        ) : (
          // ── Schedule View ──
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Teams', value: teams.length },
                { label: 'Divisions', value: Object.keys(divisionGroups).length, accent: '#d4a017' },
                { label: 'Games Scheduled', value: games.length, accent: '#4a9eff' },
                { label: 'Completed', value: games.filter(g => g.status === 'completed').length, accent: '#5cb800' },
              ].map(stat => (
                <div key={stat.label} style={{ ...s.card, padding: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: stat.accent || '#f0f4ff', lineHeight: 1 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {teams.length === 0 ? (
              <div style={{ ...s.card, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#c0cce0', marginBottom: 8 }}>NO TEAMS REGISTERED</div>
                <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 20 }}>Add teams to this tournament first</div>
                <button onClick={() => navigate(`/tournaments/${selectedTournamentId}`)} style={s.btn('green')}>Go to Tournament →</button>
              </div>
            ) : (
              Object.entries(divisionGroups).sort().map(([divKey, divTeams]) => {
                const divGames = games.filter(g => {
                  const divTeamIds = new Set(divTeams.map(t => String(t.team_id)))
                  return divTeamIds.has(String(g.home_team_id)) || divTeamIds.has(String(g.away_team_id))
                })
                return (
                  <div key={divKey} style={{ ...s.card, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => { setActiveDivision(divKey); setView('bracket') }}
                        style={{ background: 'none', border: 'none', fontFamily: 'Anton, sans-serif', fontSize: 15, color: '#5cb800', cursor: 'pointer', letterSpacing: '0.5px', padding: 0 }}>
                        {divKey} ↗
                      </button>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#4a5568' }}>{divTeams.length} teams · {divGames.length} games</span>
                        <button onClick={() => { setActiveDivision(divKey); setView('bracket'); setShowScheduler(true) }}
                          style={{ ...s.btn('orange'), padding: '5px 10px', fontSize: 11 }}>⚡ Schedule</button>
                        <button onClick={() => { setActiveDivision(divKey); setView('bracket') }}
                          style={{ ...s.btn('blue'), padding: '5px 10px', fontSize: 11 }}>Bracket →</button>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#0a0f1a' }}>
                          {['Team', 'Org', 'Payment', 'Status', 'Conflicts'].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {divTeams.map(team => {
                          const constraint = constraints.find(c => String(c.team_id) === String(team.team_id))
                          return (
                            <tr key={team.id}>
                              <td style={{ ...s.td, fontWeight: 600 }}>{team.team_name}</td>
                              <td style={{ ...s.td, color: '#6b7a99' }}>{team.org_name}</td>
                              <td style={s.td}>
                                <span style={{ fontSize: 11, color: team.payment_status === 'paid' ? '#5cb800' : '#d4a017', fontWeight: 700 }}>
                                  {team.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                                </span>
                              </td>
                              <td style={s.td}>
                                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                                  background: team.approval_status === 'approved' ? '#0d1a0a' : '#1a1500',
                                  color: team.approval_status === 'approved' ? '#5cb800' : '#d4a017',
                                  border: `1px solid ${team.approval_status === 'approved' ? '#1a3a0a' : '#3a3000'}` }}>
                                  {team.approval_status || 'pending'}
                                </span>
                              </td>
                              <td style={s.td}>
                                {constraint?.has_conflicts ? (
                                  <span style={{ fontSize: 11, color: '#d4a017' }}>
                                    {[constraint.preferred_day && `${constraint.preferred_day} only`,
                                      constraint.shared_coach_group && `Coach: ${constraint.shared_coach_group}`,
                                      constraint.earliest_start_time && `After ${constraint.earliest_start_time}`
                                    ].filter(Boolean).join(' · ') || 'Has conflicts'}
                                  </span>
                                ) : <span style={{ fontSize: 11, color: '#4a5568' }}>None</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })
            )}
          </>
        )}
      </div>

      {scoreGame && (
        <ScoreModal game={scoreGame} onSave={handleUpdateScore} onClose={() => setScoreGame(null)} />
      )}
    </div>
  )
}

// ── Game Generation with Conflict Awareness ────────────────────────────────
function generateConflictAwareGames({ teams, constraints, existingGames, startDate, startTime, courtsToUse, format, gameDuration, divisionKey }) {
  // Build a set of already-used court+time slots from other divisions
  const usedSlots = new Set()
  ;(existingGames || []).forEach(g => {
    if (g.court_id && g.scheduled_date && g.scheduled_time) {
      usedSlots.add(`${g.court_id}|${g.scheduled_date}|${g.scheduled_time}`)
    }
  })
  const games = []
  let slotIndex = 0

  // Build constraint map by team_id
  const constraintMap = {}
  constraints.forEach(c => { constraintMap[String(c.team_id)] = c })

  // Sort teams by ranking points if available (skill-based seeding)
  const sortedTeams = [...teams].sort((a, b) => (b.ranking_points || 0) - (a.ranking_points || 0))

  function getDateForDay(preferredDay) {
    if (!preferredDay) return startDate
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const base = new Date(startDate)
    const baseDay = base.getDay()
    const targetDay = days.indexOf(preferredDay)
    if (targetDay === -1) return startDate
    const diff = (targetDay - baseDay + 7) % 7
    const target = new Date(base)
    target.setDate(base.getDate() + diff)
    return target.toISOString().split('T')[0]
  }

  function getTimeSlot(idx, teamA, teamB) {
    const constraintA = constraintMap[String(teamA?.team_id)]
    const constraintB = constraintMap[String(teamB?.team_id)]
    const earliest = constraintA?.earliest_start_time || constraintB?.earliest_start_time
    const preferredDayA = constraintA?.has_conflicts ? constraintA.preferred_day : null
    const preferredDayB = constraintB?.has_conflicts ? constraintB.preferred_day : null
    const preferredDay = preferredDayA || preferredDayB
    const gameDate = getDateForDay(preferredDay)

    const [h, m] = startTime.split(':').map(Number)
    let slotOffset = Math.floor(idx / courtsToUse.length)

    // Find a slot that isn't already taken on any court
    let found = false
    let courtIdx = idx % courtsToUse.length
    let attempts = 0
    while (!found && attempts < 100) {
      let totalMins = h * 60 + m + slotOffset * gameDuration
      if (earliest) {
        const [eh, em] = earliest.split(':').map(Number)
        if (totalMins < eh * 60 + em) totalMins = eh * 60 + em
      }
      const hour = Math.floor(totalMins / 60) % 24
      const min = totalMins % 60
      const timeStr = `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`
      const slotKey = `${courtsToUse[courtIdx]?.id}|${gameDate}|${timeStr}`
      if (!usedSlots.has(slotKey)) {
        usedSlots.add(slotKey)
        return {
          court_id: courtsToUse[courtIdx]?.id || null,
          scheduled_date: gameDate,
          scheduled_time: timeStr,
          game_duration_mins: gameDuration,
        }
      }
      courtIdx = (courtIdx + 1) % courtsToUse.length
      if (courtIdx === 0) slotOffset++
      attempts++
    }
    // Fallback
    const totalMins = h * 60 + m + slotOffset * gameDuration
    const hour = Math.floor(totalMins / 60) % 24
    const min = totalMins % 60
    return {
      court_id: courtsToUse[courtIdx]?.id || null,
      scheduled_date: gameDate,
      scheduled_time: `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`,
      game_duration_mins: gameDuration,
    }
  }

  function makeGame(teamA, teamB, round, roundNum, extra = {}) {
    return {
      ...getTimeSlot(slotIndex++, teamA, teamB),
      home_team_id: String(teamA?.team_id || ''),
      away_team_id: String(teamB?.team_id || ''),
      home_team_name: teamA?.team_name || 'TBD',
      away_team_name: teamB?.team_name || 'TBD',
      round,
      round_number: roundNum,
      status: 'scheduled',
      ...extra,
    }
  }

  if (format === 'round_robin') {
    for (let i = 0; i < sortedTeams.length; i++) {
      for (let j = i + 1; j < sortedTeams.length; j++) {
        games.push(makeGame(sortedTeams[i], sortedTeams[j], 'Round Robin', 1))
      }
    }
  } else if (format === 'pool_play' || format === 'pool_then_bracket') {
    // Check for shared coach conflicts — teams with same coach can't be in same pool
    const coachGroups = {}
    sortedTeams.forEach(t => {
      const c = constraintMap[String(t.team_id)]
      if (c?.shared_coach_group) {
        if (!coachGroups[c.shared_coach_group]) coachGroups[c.shared_coach_group] = []
        coachGroups[c.shared_coach_group].push(t)
      }
    })

    const poolSize = sortedTeams.length <= 6 ? 3 : 4
    const numPools = Math.ceil(sortedTeams.length / poolSize)
    const pools = Array.from({ length: numPools }, () => [])

    // Distribute teams — spread coach groups across pools
    const assigned = new Set()
    sortedTeams.forEach((team, idx) => {
      if (assigned.has(team.team_id)) return
      const poolIdx = idx % numPools
      pools[poolIdx].push(team)
      assigned.add(team.team_id)
    })

    pools.forEach((pool, poolIdx) => {
      const poolName = `Pool ${String.fromCharCode(65 + poolIdx)}`
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          games.push(makeGame(pool[i], pool[j], 'Pool Play', 1, { pool_name: poolName }))
        }
      }
    })

    if (format === 'pool_then_bracket') {
      const bracketTeams = Math.min(numPools * 2, 8)
      for (let i = 0; i < bracketTeams / 2; i++) {
        games.push(makeGame(null, null, bracketTeams > 4 ? 'Quarterfinal' : 'Semifinal', 2, {
          bracket_slot: `QF${i + 1}`, home_team_name: 'TBD', away_team_name: 'TBD',
        }))
      }
      games.push(makeGame(null, null, 'Semifinal', 3, { bracket_slot: 'SF1', home_team_name: 'TBD', away_team_name: 'TBD' }))
      games.push(makeGame(null, null, 'Semifinal', 3, { bracket_slot: 'SF2', home_team_name: 'TBD', away_team_name: 'TBD' }))
      games.push(makeGame(null, null, 'Final', 4, { bracket_slot: 'FINAL', home_team_name: 'TBD', away_team_name: 'TBD' }))
    }
  } else if (format === 'single_elimination') {
    const rounds = Math.ceil(Math.log2(sortedTeams.length))
    let roundTeams = [...sortedTeams]
    for (let r = 0; r < rounds; r++) {
      const roundName = r === rounds - 1 ? 'Final' : r === rounds - 2 ? 'Semifinal' : r === rounds - 3 ? 'Quarterfinal' : `Round ${r + 1}`
      const nextRound = []
      for (let i = 0; i < roundTeams.length; i += 2) {
        games.push(makeGame(roundTeams[i], roundTeams[i + 1], roundName, r + 1, {
          bracket_slot: `R${r + 1}G${Math.floor(i / 2) + 1}`
        }))
        nextRound.push(null)
      }
      roundTeams = nextRound
    }
  }

  return games
}

function estimateGames(format, n) {
  if (!n) return '—'
  if (format === 'round_robin') return (n * (n - 1)) / 2
  if (format === 'single_elimination') return n - 1
  if (format === 'double_elimination') return (n - 1) * 2
  if (format === 'pool_play') { const ps = n <= 6 ? 3 : 4; const p = Math.ceil(n / ps); return p * ((ps * (ps - 1)) / 2) }
  if (format === 'pool_then_bracket') { const ps = n <= 6 ? 3 : 4; const p = Math.ceil(n / ps); return p * ((ps * (ps - 1)) / 2) + p * 2 - 1 }
  return '—'
}
