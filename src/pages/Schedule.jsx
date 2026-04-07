import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'
import { useSchedule } from '../hooks/useSchedule'
import AutoScheduler from '../components/schedule/AutoScheduler'
import BracketVisual from '../components/schedule/BracketVisual'
import { ScoreModal, RefAssignModal } from '../components/schedule/Modals'

const TABS = ['Overview', 'Schedule', 'Bracket', 'Refs', 'Divisions', 'Courts']

const FORMAT_LABELS = {
  single_elimination: 'Single Elim',
  double_elimination: 'Double Elim',
  pool_play: 'Pool Play',
  pool_then_bracket: 'Pool → Bracket',
  round_robin: 'Round Robin',
}

const s = {
  tab: (active) => ({
    padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', border: 'none', transition: 'all 0.12s',
    background: active ? '#5cb800' : 'transparent',
    color: active ? '#04060a' : '#6b7a99',
  }),
  card: { background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' },
  label: { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 },
  input: { width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' },
  btn: { padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none' },
}

export default function Schedule({ director }) {
  const { id: tournamentId } = useParams()
  const [tournament, setTournament] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [activeDivision, setActiveDivision] = useState(null)
  const [scoreGame, setScoreGame] = useState(null)
  const [refGame, setRefGame] = useState(null)
  const [refs, setRefs] = useState([])
  const [teams, setTeams] = useState([])

  const { games, divisions, courts, loading, autoSchedule, updateScore, addCourt, addDivision, deleteGame, refresh } = useSchedule(tournamentId)

  useEffect(() => {
    if (!tournamentId) return
    supabase.from('tournaments').select('*').eq('id', tournamentId).single()
      .then(({ data }) => setTournament(data))
    supabase.from('refs').select('*').eq('director_id', director?.id).eq('status', 'active')
      .then(({ data }) => setRefs(data || []))
    supabase.from('registrations').select('*, team:teams(*)').eq('tournament_id', tournamentId).eq('status', 'approved')
      .then(({ data }) => setTeams(data?.map(r => ({ id: r.team_id, name: r.team?.team_name || r.team_name, division_id: r.division_id })) || []))
  }, [tournamentId, director?.id])

  useEffect(() => {
    if (divisions.length && !activeDivision) setActiveDivision(divisions[0]?.id)
  }, [divisions])

  async function handleAssignRef({ gameId, refId, role }) {
    const ref = refs.find(r => r.id === refId)
    await supabase.from('ref_assignments').upsert({
      game_id: gameId, ref_id: refId, tournament_id: tournamentId,
      role, status: 'pending', pay_amount: ref?.pay_rate || 0
    }, { onConflict: 'game_id,ref_id' })
    refresh()
  }

  const divisionGames = activeDivision ? games.filter(g => g.division_id === activeDivision) : games
  const activeDivObj = divisions.find(d => d.id === activeDivision)
  const completedGames = games.filter(g => g.status === 'completed').length
  const pendingGames = games.filter(g => g.status === 'scheduled').length

  if (!tournament && !loading) return <div style={{ padding: 40, color: '#e05555', fontSize: 13 }}>Tournament not found</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title={tournament ? `${tournament.name.toUpperCase()} — SCHEDULE` : 'SCHEDULE'}
        actions={
          <button onClick={refresh} style={{ ...s.btn, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030' }}>
            ↻ Refresh
          </button>
        }
      />

      <div style={{ padding: '16px 24px 0', borderBottom: '1px solid #1a2030', display: 'flex', gap: 6 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={s.tab(activeTab === tab)}>{tab}</button>
        ))}
      </div>

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                { label: 'Total Games', value: games.length, color: '#f0f4ff' },
                { label: 'Completed', value: completedGames, color: '#5cb800' },
                { label: 'Pending', value: pendingGames, color: '#d4a017' },
                { label: 'Divisions', value: divisions.length, color: '#f0f4ff' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Division overview */}
            {divisions.length > 0 && (
              <div style={s.card}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>DIVISIONS</div>
                {divisions.map(div => {
                  const divGames = games.filter(g => g.division_id === div.id)
                  const done = divGames.filter(g => g.status === 'completed').length
                  return (
                    <div key={div.id} onClick={() => { setActiveDivision(div.id); setActiveTab('Bracket') }}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #0e1320', cursor: 'pointer', gap: 14 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0a0f1a'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{div.name}</div>
                        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{FORMAT_LABELS[div.bracket_format]} · {div.max_teams} teams max</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7a99' }}>{done}/{divGames.length} games</div>
                      <div style={{ fontSize: 11, color: '#5cb800' }}>View →</div>
                    </div>
                  )
                })}
              </div>
            )}

            {divisions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#4a5568', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 16, color: '#c0cce0', marginBottom: 8 }}>No divisions set up yet</div>
                <div style={{ marginBottom: 20 }}>Add divisions first, then use the Auto Scheduler to generate games</div>
                <button onClick={() => setActiveTab('Divisions')} style={{ ...s.btn, background: '#5cb800', color: '#04060a' }}>
                  Add Divisions
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SCHEDULE (list view) ── */}
        {activeTab === 'Schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Division filter + auto scheduler */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setActiveDivision(null)}
                style={s.tab(!activeDivision)}>All</button>
              {divisions.map(d => (
                <button key={d.id} onClick={() => setActiveDivision(d.id)}
                  style={s.tab(activeDivision === d.id)}>{d.name}</button>
              ))}
            </div>

            {divisions.length > 0 && courts.length > 0 && (
              <AutoScheduler
                divisions={divisions} courts={courts} teams={teams}
                onSchedule={autoSchedule}
              />
            )}

            {/* Game list */}
            <div style={s.card}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>
                GAMES {activeDivObj ? `— ${activeDivObj.name}` : ''}
                <span style={{ fontSize: 11, color: '#4a5568', marginLeft: 8 }}>({divisionGames.length})</span>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>Loading...</div>
              ) : divisionGames.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No games scheduled yet</div>
              ) : divisionGames.map(game => (
                <GameRow key={game.id} game={game}
                  onScore={() => setScoreGame(game)}
                  onRef={() => setRefGame(game)}
                  onDelete={() => deleteGame(game.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── BRACKET ── */}
        {activeTab === 'Bracket' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Division tabs */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {divisions.map(d => (
                <button key={d.id} onClick={() => setActiveDivision(d.id)}
                  style={s.tab(activeDivision === d.id)}>{d.name}</button>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>
                {activeDivObj?.name || 'Select a Division'}
                {activeDivObj && <span style={{ fontSize: 11, color: '#4a5568', marginLeft: 8 }}>{FORMAT_LABELS[activeDivObj.bracket_format]}</span>}
              </div>
              <div style={{ padding: 20 }}>
                <BracketVisual
                  games={divisionGames}
                  format={activeDivObj?.bracket_format}
                  onScoreClick={setScoreGame}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── REFS ── */}
        {activeTab === 'Refs' && (
          <RefTab refs={refs} games={games} directorId={director?.id} tournamentId={tournamentId} onRefAdded={() => {
            supabase.from('refs').select('*').eq('director_id', director?.id)
              .then(({ data }) => setRefs(data || []))
          }} />
        )}

        {/* ── DIVISIONS ── */}
        {activeTab === 'Divisions' && (
          <DivisionsTab divisions={divisions} tournamentId={tournamentId} onAdd={addDivision} />
        )}

        {/* ── COURTS ── */}
        {activeTab === 'Courts' && (
          <CourtsTab courts={courts} onAdd={addCourt} />
        )}
      </div>

      {/* Modals */}
      {scoreGame && <ScoreModal game={scoreGame} onSave={updateScore} onClose={() => setScoreGame(null)} />}
      {refGame && <RefAssignModal game={refGame} refs={refs} onAssign={handleAssignRef} onClose={() => setRefGame(null)} />}
    </div>
  )
}

// ─── Game Row ─────────────────────────────────────────────────────────────────
function GameRow({ game, onScore, onRef, onDelete }) {
  const isComplete = game.status === 'completed'
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #0e1320', gap: 12 }}>
      <div style={{ minWidth: 60, fontSize: 11, color: '#4a5568' }}>
        <div>{game.scheduled_time || 'TBD'}</div>
        <div>{game.court?.name || 'TBD'}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: game.winner_team_id === game.home_team_id ? '#5cb800' : '#d8e0f0' }}>
            {game.home_team_name || 'TBD'}
          </span>
          <span style={{ fontSize: 11, color: '#4a5568' }}>vs</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: game.winner_team_id === game.away_team_id ? '#5cb800' : '#d8e0f0' }}>
            {game.away_team_name || 'TBD'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>
          {game.round && <span style={{ marginRight: 8, color: '#d4a017' }}>{game.round}</span>}
          {game.pool_name && <span style={{ marginRight: 8 }}>{game.pool_name}</span>}
          {game.ref_assignments?.length > 0 && <span style={{ color: '#4a9eff' }}>👤 {game.ref_assignments[0]?.ref?.full_name}</span>}
        </div>
      </div>
      {isComplete && (
        <div style={{ fontSize: 16, fontFamily: 'Anton, sans-serif', color: '#f0f4ff', minWidth: 60, textAlign: 'center' }}>
          {game.home_score} - {game.away_score}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onScore} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, background: isComplete ? '#0e1320' : '#071525', color: isComplete ? '#6b7a99' : '#4a9eff', border: `1px solid ${isComplete ? '#1a2030' : '#0a2540'}`, cursor: 'pointer' }}>
          {isComplete ? 'Edit' : 'Score'}
        </button>
        <button onClick={onRef} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', cursor: 'pointer' }}>Ref</button>
        <button onClick={onDelete} style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, background: 'transparent', color: '#e05555', border: '1px solid #3a0a0a', cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  )
}

// ─── Refs Tab ─────────────────────────────────────────────────────────────────
function RefTab({ refs, games, directorId, tournamentId, onRefAdded }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', pay_rate: 30, pay_type: 'per_game' })
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    setSaving(true)
    await supabase.from('refs').insert({ ...form, director_id: directorId, status: 'active' })
    setSaving(false)
    setShowAdd(false)
    setForm({ full_name: '', email: '', phone: '', pay_rate: 30, pay_type: 'per_game' })
    onRefAdded()
  }

  const refGameCounts = {}
  games.forEach(g => {
    g.ref_assignments?.forEach(a => {
      refGameCounts[a.ref_id] = (refGameCounts[a.ref_id] || 0) + 1
    })
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer' }}>
          + Add Ref
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', marginBottom: 16 }}>ADD REFEREE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[['full_name','Full Name','text'],['email','Email','email'],['phone','Phone','tel'],['pay_rate','Pay Rate ($)','number']].map(([key, label, type]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Pay Type</label>
              <select value={form.pay_type} onChange={e => setForm(p => ({ ...p, pay_type: e.target.value }))}
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                <option value="per_game">Per Game</option>
                <option value="per_day">Per Day</option>
                <option value="flat">Flat Rate</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.full_name}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Add Ref'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>REFS ({refs.length})</div>
        {refs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No refs added yet</div>
        ) : refs.map(ref => (
          <div key={ref.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #0e1320', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0d1a0a', border: '1px solid #1a3a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#5cb800' }}>
              {ref.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{ref.full_name}</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{ref.email} {ref.phone && `· ${ref.phone}`}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#5cb800', fontWeight: 600 }}>${ref.pay_rate}/{ref.pay_type.replace('_', ' ')}</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{refGameCounts[ref.id] || 0} games assigned</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Divisions Tab ────────────────────────────────────────────────────────────
function DivisionsTab({ divisions, tournamentId, onAdd }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', gender: 'boys', age_group: '', bracket_format: 'pool_then_bracket', max_teams: 8 })
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    setSaving(true)
    await onAdd(form)
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', gender: 'boys', age_group: '', bracket_format: 'pool_then_bracket', max_teams: 8 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer' }}>
          + Add Division
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', marginBottom: 16 }}>ADD DIVISION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Division Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="13u Boys"
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Age Group</label>
              <input value={form.age_group} onChange={e => setForm(p => ({ ...p, age_group: e.target.value }))} placeholder="13u"
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Gender</label>
              <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                <option value="boys">Boys</option>
                <option value="girls">Girls</option>
                <option value="coed">Coed</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Format</label>
              <select value={form.bracket_format} onChange={e => setForm(p => ({ ...p, bracket_format: e.target.value }))}
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }}>
                <option value="pool_then_bracket">Pool → Bracket</option>
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="pool_play">Pool Play Only</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Max Teams</label>
              <input type="number" value={form.max_teams} onChange={e => setForm(p => ({ ...p, max_teams: parseInt(e.target.value) }))}
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.name}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Add Division'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>DIVISIONS ({divisions.length})</div>
        {divisions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No divisions yet</div>
        ) : divisions.map(div => (
          <div key={div.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #0e1320', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{div.name}</div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{FORMAT_LABELS[div.bracket_format]} · {div.max_teams} teams</div>
            </div>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: div.gender === 'boys' ? '#071525' : '#1a0718', color: div.gender === 'boys' ? '#4a9eff' : '#c84fc8', border: `1px solid ${div.gender === 'boys' ? '#0a2540' : '#3a0a3a'}` }}>
              {div.gender}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Courts Tab ───────────────────────────────────────────────────────────────
function CourtsTab({ courts, onAdd }) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name) return
    setSaving(true)
    await onAdd(name, venue)
    setSaving(false)
    setShowAdd(false)
    setName('')
    setVenue('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer' }}>
          + Add Court
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', marginBottom: 16 }}>ADD COURT</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Court Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Court 1"
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Venue Name</label>
              <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Chabot College"
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving || !name}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#5cb800', color: '#04060a', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Add Court'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>COURTS ({courts.length})</div>
        {courts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No courts added yet</div>
        ) : courts.map(court => (
          <div key={court.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #0e1320', gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#0d1a0a', border: '1px solid #1a3a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏀</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{court.name}</div>
              {court.venue_name && <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{court.venue_name}</div>}
            </div>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: '#0d1a0a', color: '#5cb800', border: '1px solid #1a3a0a' }}>Active</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FORMAT_LABELS = {
  single_elimination: 'Single Elim',
  double_elimination: 'Double Elim',
  pool_play: 'Pool Play',
  pool_then_bracket: 'Pool → Bracket',
  round_robin: 'Round Robin',
}
