import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'
import BracketVisual from '../components/schedule/BracketVisual'

const s = {
  input: { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' },
  label: { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 },
  card: { background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 },
  btn: (color) => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
    background: color === 'green' ? '#5cb800' : color === 'blue' ? '#1a2a4a' : color === 'orange' ? '#d4630a' : color === 'red' ? '#8b1a1a' : '#1a2030',
    color: color === 'green' ? '#04060a' : color === 'blue' ? '#7eb3ff' : '#fff',
  }),
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' },
  td: { padding: '11px 14px', color: '#d8e0f0', fontSize: 13, borderBottom: '1px solid #0e1320' },
}

// ── Game Card (for elimination brackets) ──────────────────────────────────
function GameCard({ game, onEdit, courtsMap, refsMap }) {
  const done = game.status === 'completed'
  const homeWon = done && game.winner_team_id === game.home_team_id
  const awayWon = done && game.winner_team_id === game.away_team_id
  const courtName = game.court_id && courtsMap ? courtsMap[game.court_id] : null
  const refs = refsMap && game.id ? (refsMap[game.id] || []) : []

  return (
    <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, overflow: 'hidden', width: 200, flexShrink: 0 }}>
      <div style={{ padding: '3px 8px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: courtName ? '#4a9eff' : '#4a5568' }}>{courtName || 'Court TBD'}</span>
        <span style={{ fontSize: 9, color: '#4a5568' }}>{game.scheduled_time || 'TBD'}</span>
      </div>
      {[
        { name: game.home_team_name, score: game.home_score, won: homeWon },
        { name: game.away_team_name, score: game.away_score, won: awayWon }
      ].map((team, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: team.won ? '#0d1a0a' : 'transparent', borderBottom: i === 0 ? '1px solid #1a2030' : 'none' }}>
          <span style={{ fontSize: 11, color: team.won ? '#5cb800' : '#d8e0f0', fontWeight: team.won ? 700 : 400, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {team.name || 'TBD'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: team.won ? '#5cb800' : '#6b7a99' }}>
            {done ? (team.score ?? 0) : '-'}
          </span>
        </div>
      ))}
      {refs.length > 0 && (
        <div style={{ padding: '3px 8px', borderTop: '1px solid #1a2030', fontSize: 9, color: '#4a5568' }}>
          🦓 {refs.join(', ')}
        </div>
      )}
      {onEdit && (
        <div style={{ display: 'flex', borderTop: '1px solid #1a2030' }}>
          <button onClick={() => onEdit(game, 'score')} style={{ flex: 1, padding: '3px', fontSize: 10, background: 'transparent', border: 'none', borderRight: '1px solid #1a2030', color: '#4a9eff', cursor: 'pointer' }}>Score</button>
          <button onClick={() => onEdit(game, 'edit')} style={{ flex: 1, padding: '3px', fontSize: 10, background: 'transparent', border: 'none', color: '#d4a017', cursor: 'pointer' }}>Edit</button>
        </div>
      )}
    </div>
  )
}

// ── Matchup Table Row ──────────────────────────────────────────────────────
function GameRow({ game, idx, courtsMap, refsMap, onEdit }) {
  const refs = refsMap && game.id ? (refsMap[game.id] || []) : []
  const courtName = game.court_id && courtsMap ? courtsMap[game.court_id] : null
  return (
    <tr key={game.id}>
      <td style={{ ...s.td, color: '#4a5568', fontSize: 11 }}>{idx + 1}</td>
      <td style={{ ...s.td, fontWeight: 600 }}>{game.home_team_name}</td>
      <td style={s.td}>{game.away_team_name}</td>
      <td style={{ ...s.td, color: courtName ? '#4a9eff' : '#4a5568', fontSize: 11 }}>{courtName || '—'}</td>
      <td style={{ ...s.td, color: '#6b7a99', fontSize: 11 }}>{game.scheduled_date || ''} {game.scheduled_time || '—'}</td>
      <td style={s.td}>
        {game.status === 'completed'
          ? <span style={{ color: '#5cb800', fontWeight: 700 }}>{game.home_score} - {game.away_score}</span>
          : <span style={{ color: '#4a5568' }}>—</span>}
      </td>
      <td style={{ ...s.td, fontSize: 11, color: '#4a5568' }}>{refs.length > 0 ? `🦓 ${refs.join(', ')}` : '—'}</td>
      <td style={s.td}>
        {onEdit && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => onEdit(game, 'score')} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, background: '#071525', color: '#4a9eff', border: '1px solid #0a2540', cursor: 'pointer' }}>Score</button>
            <button onClick={() => onEdit(game, 'edit')} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, background: '#1a1500', color: '#d4a017', border: '1px solid #3a3000', cursor: 'pointer' }}>Edit</button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Bracket / Matchup View ─────────────────────────────────────────────────
function MatchupView({ games, divisionKey, onEdit, onBack, courtsMap, refsMap }) {
  const pools = useMemo(() => {
    const map = {}
    games.filter(g => g.pool_name).forEach(g => {
      if (!map[g.pool_name]) map[g.pool_name] = []
      map[g.pool_name].push(g)
    })
    return map
  }, [games])

  const rrGames = games.filter(g => g.round === 'Round Robin')
  const bracketRounds = useMemo(() => {
    const map = {}
    games.filter(g => !g.pool_name && g.round && !['Round Robin', 'Pool Play'].includes(g.round)).forEach(g => {
      if (!map[g.round]) map[g.round] = []
      map[g.round].push(g)
    })
    return map
  }, [games])

  const isBracket = Object.keys(bracketRounds).length > 0
  const thS = { ...s.th }
  const tdS = { ...s.td }

  const tableHeaders = ['#', 'Home', 'Away', 'Court', 'Time', 'Score', 'Refs', '']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 12 }}>← Back</button>
        <h2 style={{ margin: 0, fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: '0.5px' }}>{divisionKey} MATCHUPS</h2>
        <span style={{ fontSize: 11, color: '#4a5568' }}>{games.length} games</span>
      </div>

      {/* Pool play — clean table */}
      {Object.keys(pools).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(pools).sort().map(([poolName, poolGames]) => (
              <div key={poolName} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', minWidth: 400, flex: 1 }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#d4a017' }}>{poolName}</span>
                  <span style={{ fontSize: 11, color: '#4a5568' }}>{poolGames.length} games</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#0a0f1a' }}>{tableHeaders.map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>{poolGames.map((g, i) => <GameRow key={g.id} game={g} idx={i} courtsMap={courtsMap} refsMap={refsMap} onEdit={onEdit} />)}</tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round robin */}
      {rrGames.length > 0 && (
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a2030' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0' }}>Round Robin — {rrGames.length} games</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#0a0f1a' }}>{tableHeaders.map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{rrGames.map((g, i) => <GameRow key={g.id} game={g} idx={i} courtsMap={courtsMap} refsMap={refsMap} onEdit={onEdit} />)}</tbody>
          </table>
        </div>
      )}

      {/* Elimination bracket */}
      {isBracket && (
        <div>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Elimination Bracket</div>
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 16 }}>
            {Object.entries(bracketRounds).map(([roundName, roundGames]) => (
              <div key={roundName} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', minWidth: 210 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7a99', marginBottom: 4 }}>{roundName}</div>
                {roundGames.map(g => <GameCard key={g.id} game={g} onEdit={onEdit} courtsMap={courtsMap} refsMap={refsMap} />)}
              </div>
            ))}
          </div>
        </div>
      )}

      {games.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No games scheduled yet for this division</div>
      )}
    </div>
  )
}

// ── Score Modal ────────────────────────────────────────────────────────────
function ScoreModal({ game, onSave, onClose }) {
  const [home, setHome] = useState(game.home_score ?? '')
  const [away, setAway] = useState(game.away_score ?? '')
  const [saving, setSaving] = useState(false)
  async function handleSave() {
    setSaving(true)
    await onSave(game.id, Number(home), Number(away))
    setSaving(false); onClose()
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 360 }}>
        <h3 style={{ margin: '0 0 20px', color: '#f0f4ff' }}>Enter Score</h3>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={s.label}>{game.home_team_name}</label><input type="number" value={home} onChange={e => setHome(e.target.value)} style={{ ...s.input, width: '100%' }} autoFocus /></div>
          <div><label style={s.label}>{game.away_team_name}</label><input type="number" value={away} onChange={e => setAway(e.target.value)} style={{ ...s.input, width: '100%' }} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            {saving ? 'Saving...' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Game Modal ────────────────────────────────────────────────────────
function EditGameModal({ game, courts, availableRefs, currentRefs, onSave, onDelete, onClose }) {
  const [homeTeam, setHomeTeam] = useState(game.home_team_name || '')
  const [awayTeam, setAwayTeam] = useState(game.away_team_name || '')
  const [courtId, setCourtId] = useState(game.court_id || '')
  const [date, setDate] = useState(game.scheduled_date || '')
  const [time, setTime] = useState(game.scheduled_time || '')
  const [selectedRefs, setSelectedRefs] = useState(currentRefs.map(r => r.ref_id) || [])
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  function toggleRef(refId) {
    setSelectedRefs(prev => prev.includes(refId) ? prev.filter(r => r !== refId) : [...prev, refId])
  }

  async function handleSave() {
    setSaving(true)
    await onSave(game.id, { home_team_name: homeTeam, away_team_name: awayTeam, court_id: courtId || null, scheduled_date: date || null, scheduled_time: time || null }, selectedRefs)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 4px', color: '#f0f4ff' }}>Edit Game</h3>
        <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 20 }}>{game.round} {game.pool_name ? `· ${game.pool_name}` : ''}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div><label style={s.label}>Home Team</label><input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} style={{ ...s.input, width: '100%' }} /></div>
          <div><label style={s.label}>Away Team</label><input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} style={{ ...s.input, width: '100%' }} /></div>
          <div>
            <label style={s.label}>Court</label>
            <select value={courtId} onChange={e => setCourtId(e.target.value)} style={{ ...s.input, width: '100%' }}>
              <option value="">No court</option>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={s.label}>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...s.input, width: '100%' }} /></div>
          <div><label style={s.label}>Time</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...s.input, width: '100%' }} /></div>
        </div>

        {/* Ref assignment */}
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Referees (select up to 2)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {availableRefs.length === 0 ? (
              <div style={{ fontSize: 12, color: '#4a5568' }}>No refs added yet — add refs in the Staff page</div>
            ) : availableRefs.map(ref => (
              <button key={ref.id} onClick={() => toggleRef(ref.id)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: selectedRefs.includes(ref.id) ? '#071525' : 'transparent',
                color: selectedRefs.includes(ref.id) ? '#4a9eff' : '#6b7a99',
                border: `1px solid ${selectedRefs.includes(ref.id) ? '#0a2540' : '#1a2030'}`,
              }}>
                🦓 {ref.full_name}
              </button>
            ))}
          </div>
          {selectedRefs.length > 2 && <div style={{ fontSize: 11, color: '#d4a017', marginTop: 6 }}>Max 2 refs per game recommended</div>}
        </div>

        {confirmDel ? (
          <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#ff9d7a', marginBottom: 10 }}>Delete this game?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onDelete(game.id)} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Yes, Delete</button>
              <button onClick={() => setConfirmDel(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => setConfirmDel(true)} style={{ background: '#2a0f0f', color: '#ff9d7a', border: '1px solid #4b1d1d', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🗑 Delete</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Conflict Edit Modal ────────────────────────────────────────────────────
function ConflictEditModal({ divisionKey, teams, constraints, tournamentId, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [forms, setForms] = useState(() => {
    const map = {}
    teams.forEach(t => {
      const c = constraints.find(c => String(c.team_id) === String(t.team_id)) || {}
      map[t.team_id] = {
        has_conflicts: c.has_conflicts || false,
        preferred_day: c.preferred_day || '',
        earliest_start_time: c.earliest_start_time || '',
        latest_start_time: c.latest_start_time || '',
        shared_coach_group: c.shared_coach_group || '',
        min_rest_minutes: c.min_rest_minutes || 0,
        existingId: c.id || null,
      }
    })
    return map
  })

  function updateForm(teamId, field, value) {
    setForms(prev => ({ ...prev, [teamId]: { ...prev[teamId], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    for (const [teamId, form] of Object.entries(forms)) {
      const payload = {
        tournament_id: tournamentId, team_id: Number(teamId),
        has_conflicts: form.has_conflicts,
        preferred_day: form.has_conflicts && form.preferred_day ? form.preferred_day : null,
        earliest_start_time: form.has_conflicts && form.earliest_start_time ? form.earliest_start_time : null,
        latest_start_time: form.has_conflicts && form.latest_start_time ? form.latest_start_time : null,
        shared_coach_group: form.has_conflicts && form.shared_coach_group ? form.shared_coach_group : null,
        min_rest_minutes: Number(form.min_rest_minutes) || 0,
      }
      if (form.existingId) {
        await supabase.from('tournament_team_constraints').update(payload).eq('id', form.existingId)
      } else {
        await supabase.from('tournament_team_constraints').insert(payload)
      }
    }
    setSaving(false); onSaved()
  }

  const iS = { ...s.input, width: '100%', padding: '6px 10px', fontSize: 11 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 750, maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 4px', color: '#f0f4ff' }}>Edit Conflicts — {divisionKey}</h3>
        <p style={{ color: '#4a5568', fontSize: 12, margin: '0 0 20px' }}>Set scheduling constraints for each team</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0a0f1a' }}>
              {['Team', 'Has Conflicts', 'Preferred Day', 'Earliest', 'Latest', 'Coach Group', 'Rest (min)'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, color: '#6b7a99', textTransform: 'uppercase', borderBottom: '1px solid #1a2030' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map(team => {
              const form = forms[team.team_id] || {}
              return (
                <tr key={team.team_id} style={{ borderBottom: '1px solid #0e1320' }}>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: '#d8e0f0', fontWeight: 600 }}>{team.team_name}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <input type="checkbox" checked={form.has_conflicts || false} onChange={e => updateForm(team.team_id, 'has_conflicts', e.target.checked)} />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <select value={form.preferred_day || ''} onChange={e => updateForm(team.team_id, 'preferred_day', e.target.value)} disabled={!form.has_conflicts} style={iS}>
                      <option value="">Any</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 10px' }}><input type="time" value={form.earliest_start_time || ''} onChange={e => updateForm(team.team_id, 'earliest_start_time', e.target.value)} disabled={!form.has_conflicts} style={iS} /></td>
                  <td style={{ padding: '8px 10px' }}><input type="time" value={form.latest_start_time || ''} onChange={e => updateForm(team.team_id, 'latest_start_time', e.target.value)} disabled={!form.has_conflicts} style={iS} /></td>
                  <td style={{ padding: '8px 10px' }}><input value={form.shared_coach_group || ''} onChange={e => updateForm(team.team_id, 'shared_coach_group', e.target.value)} placeholder="e.g. A" disabled={!form.has_conflicts} style={iS} /></td>
                  <td style={{ padding: '8px 10px' }}><input type="number" value={form.min_rest_minutes || 0} onChange={e => updateForm(team.team_id, 'min_rest_minutes', e.target.value)} disabled={!form.has_conflicts} style={{ ...iS, width: 60 }} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            {saving ? 'Saving...' : 'Save Conflicts'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Auto Scheduler Panel ───────────────────────────────────────────────────
function AutoSchedulerPanel({ teams, constraints, courts, games, refs, divisionKey, tournamentId, onScheduled }) {
  const [format, setFormat] = useState('pool_then_bracket')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [gameDuration, setGameDuration] = useState(60)
  const [bufferMins, setBufferMins] = useState(10)
  const [selectedCourts, setSelectedCourts] = useState([])
  // Auto-select all courts when they first load
  useEffect(() => {
    if (courts.length > 0 && selectedCourts.length === 0) {
      setSelectedCourts(courts.map(c => c.id))
    }
  }, [courts])
  const [autoAssignRefs, setAutoAssignRefs] = useState(true)
  const [refsPerGame, setRefsPerGame] = useState(2)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const divTeams = teams.filter(t => t.division_key === divisionKey)
  const existingGames = games || []

  function toggleCourt(id) {
    setSelectedCourts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleRun() {
    if (!startDate || !selectedCourts.length || !divTeams.length) {
      setResult({ type: 'error', msg: `Missing: ${!startDate ? 'start date' : ''} ${!selectedCourts.length ? 'courts' : ''} ${!divTeams.length ? 'no teams in this division' : ''}`.trim() })
      return
    }
    setRunning(true); setResult(null)

    const courtsToUse = courts.filter(c => selectedCourts.includes(c.id))
    const totalDuration = Number(gameDuration) + Number(bufferMins)
    const generatedGames = generateGames({ teams: divTeams, constraints, existingGames, startDate, startTime, courtsToUse, format, gameDuration: totalDuration, divisionKey })

    const { error } = await supabase.from('scheduled_games').insert(
      generatedGames.map(g => ({ ...g, tournament_id: tournamentId, is_auto_scheduled: true }))
    )

    if (error) {
      setResult({ type: 'error', msg: error.message })
      setRunning(false); return
    }

    // Auto-assign refs if enabled
    if (autoAssignRefs && refs.length > 0) {
      const { data: insertedGames } = await supabase.from('scheduled_games')
        .select('id').eq('tournament_id', tournamentId).eq('is_auto_scheduled', true)
        .order('created_at', { ascending: false }).limit(generatedGames.length)

      if (insertedGames?.length) {
        const assignments = []
        insertedGames.forEach((game, i) => {
          const numRefs = Math.min(refsPerGame, refs.length)
          for (let r = 0; r < numRefs; r++) {
            const refIdx = (i * numRefs + r) % refs.length
            assignments.push({ game_id: game.id, ref_id: refs[refIdx].id, role: r === 0 ? 'head_referee' : 'referee' })
          }
        })
        await supabase.from('ref_assignments').insert(assignments)
      }
    }

    setResult({ type: 'success', msg: `Generated ${generatedGames.length} games!` })
    setRunning(false); onScheduled()
  }

  const conflictTeams = constraints.filter(c => c.has_conflicts && divTeams.find(t => String(t.team_id) === String(c.team_id)))

  return (
    <div style={s.card}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, color: '#f0f4ff', marginBottom: 16 }}>⚡ AUTO SCHEDULER — {divisionKey}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={s.label}>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...s.input, width: '100%' }}>
            <option value="two_games_guaranteed">2 Games Guaranteed (3-team pools)</option>
            <option value="pool_then_bracket">Pool Play → Bracket</option>
            <option value="pool_play">Pool Play Only</option>
            <option value="single_elimination">Single Elimination</option>
            <option value="double_elimination">Double Elimination</option>
            <option value="round_robin">Round Robin</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Game Duration (mins)</label>
          <input type="number" value={gameDuration} onChange={e => setGameDuration(e.target.value)} style={{ ...s.input, width: '100%' }} />
        </div>
        <div>
          <label style={s.label}>Buffer Between Games (mins)</label>
          <input type="number" value={bufferMins} onChange={e => setBufferMins(e.target.value)} style={{ ...s.input, width: '100%' }} />
        </div>
        <div>
          <label style={s.label}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...s.input, width: '100%' }} />
        </div>
        <div>
          <label style={s.label}>First Game Time</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ ...s.input, width: '100%' }} />
        </div>
        <div>
          <label style={s.label}>Refs Per Game</label>
          <input type="number" min="1" max="3" value={refsPerGame} onChange={e => setRefsPerGame(Number(e.target.value))} style={{ ...s.input, width: '100%' }} />
        </div>
      </div>

      {/* Courts */}
      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>Courts (select which courts to use)</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {courts.length === 0 ? (
            <div style={{ fontSize: 12, color: '#4a5568' }}>No courts found — add venues with courts first</div>
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
        {selectedCourts.length === 0 && courts.length > 0 && (
          <div style={{ fontSize: 11, color: '#d4a017', marginTop: 6 }}>⚠ Select at least one court</div>
        )}
      </div>

      {/* Refs */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <input type="checkbox" checked={autoAssignRefs} onChange={e => setAutoAssignRefs(e.target.checked)} id="autoRefs" />
          <label htmlFor="autoRefs" style={{ fontSize: 12, color: '#c0cce0', cursor: 'pointer' }}>Auto-assign refs ({refs.length} available)</label>
        </div>
        {refs.length === 0 && <div style={{ fontSize: 11, color: '#4a5568' }}>Add refs in Staff page first</div>}
      </div>

      {/* Conflicts */}
      {conflictTeams.length > 0 && (
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#d4a017', fontWeight: 700, marginBottom: 8 }}>⚠ {conflictTeams.length} TEAMS WITH CONFLICTS</div>
          {conflictTeams.map(c => {
            const team = divTeams.find(t => String(t.team_id) === String(c.team_id))
            return (
              <div key={c.id} style={{ fontSize: 11, color: '#6b7a99', marginBottom: 3 }}>
                <span style={{ color: '#c0cce0' }}>{team?.team_name || `Team ${c.team_id}`}</span>
                {c.preferred_day && ` · ${c.preferred_day} only`}
                {c.earliest_start_time && ` · After ${c.earliest_start_time}`}
                {c.latest_start_time && ` · Before ${c.latest_start_time}`}
                {c.shared_coach_group && ` · Coach group: ${c.shared_coach_group}`}
              </div>
            )
          })}
        </div>
      )}

      {/* Preview */}
      <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Teams', value: divTeams.length },
          { label: 'Est. Games', value: estimateGames(format, divTeams.length), accent: '#5cb800' },
          { label: 'Courts', value: selectedCourts.length },
          { label: 'Total (mins)', value: `${Number(gameDuration) + Number(bufferMins)}` },
        ].map(stat => (
          <div key={stat.label}>
            <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase' }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontFamily: 'Anton, sans-serif', color: stat.accent || '#f0f4ff', marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {result && (
        <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12, background: result.type === 'success' ? '#0d1a0a' : '#1f0707', color: result.type === 'success' ? '#5cb800' : '#e05555', border: `1px solid ${result.type === 'success' ? '#1a3a0a' : '#3a0a0a'}` }}>
          {result.msg}
        </div>
      )}

      <button onClick={handleRun} disabled={running}
        style={{ ...s.btn('green'), width: '100%', opacity: running ? 0.6 : 1 }}>
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
  const [refs, setRefs] = useState([])
  const [refAssignments, setRefAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('schedule')
  const [activeDivision, setActiveDivision] = useState(null)
  const [scoreGame, setScoreGame] = useState(null)
  const [editGame, setEditGame] = useState(null)
  const [editConflict, setEditConflict] = useState(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [bracketLayout, setBracketLayout] = useState('table')  // 'table' | 'visual'

  useEffect(() => {
    supabase.from('tournaments').select('id, name, start_date').order('start_date', { ascending: false })
      .then(({ data }) => {
        setTournaments(data || [])
        if (data?.[0]) setSelectedTournamentId(data[0].id)
      })
    // Load refs
    supabase.from('refs').select('*').eq('is_active', true).order('full_name')
      .then(({ data }) => setRefs(data || []))
  }, [])

  useEffect(() => {
    if (!selectedTournamentId) return
    loadAll(selectedTournamentId)
  }, [selectedTournamentId])

  async function loadAll(tid) {
    setLoading(true)
    const [ttRes, constraintsRes, courtsRes, gamesRes, assignmentsRes] = await Promise.all([
      supabase.from('tournament_teams').select('*').eq('tournament_id', tid),
      supabase.from('tournament_team_constraints').select('*').eq('tournament_id', tid),
      supabase.from('venue_courts').select('*, venue_gyms(name), venues(name)').order('name'),
      supabase.from('scheduled_games').select('*').eq('tournament_id', tid).order('scheduled_date').order('scheduled_time'),
      supabase.from('ref_assignments').select('*, refs(full_name)').in('game_id',
        (await supabase.from('scheduled_games').select('id').eq('tournament_id', tid)).data?.map(g => g.id) || []
      ),
    ])

    // Manual join master teams
    const teamIds = [...new Set((ttRes.data || []).map(t => Number(t.team_id)).filter(Boolean))]
    let masterMap = {}
    if (teamIds.length) {
      const { data: masterData } = await supabase.from('bt_master_teams')
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
      name: [c.venues?.name, c.venue_gyms?.name, c.name].filter(Boolean).join(' - '),
    }))

    setTeams(mergedTeams)
    setConstraints(constraintsRes.data || [])
    setCourts(mergedCourts)
    setGames(gamesRes.data || [])
    setRefAssignments(assignmentsRes.data || [])
    setLoading(false)
  }

  // Build courts map
  const courtsMap = useMemo(() => {
    const map = {}
    courts.forEach(c => { map[c.id] = c.name })
    return map
  }, [courts])

  // Build refs map: game_id -> [ref names]
  const refsMap = useMemo(() => {
    const map = {}
    refAssignments.forEach(a => {
      if (!map[a.game_id]) map[a.game_id] = []
      if (a.refs?.full_name) map[a.game_id].push(a.refs.full_name)
    })
    return map
  }, [refAssignments])

  const divisionGroups = useMemo(() => {
    const groups = {}
    teams.forEach(t => {
      const key = t.division_key || 'No Division'
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return groups
  }, [teams])

  const divisionGames = useMemo(() => {
    if (!activeDivision) return []
    const divTeamIds = new Set(teams.filter(t => t.division_key === activeDivision).map(t => String(t.team_id)))
    return games.filter(g => divTeamIds.has(String(g.home_team_id)) || divTeamIds.has(String(g.away_team_id)) || g.home_team_name === 'TBD' || g.away_team_name === 'TBD')
  }, [games, activeDivision, teams])

  async function handleUpdateScore(gameId, homeScore, awayScore) {
    const game = games.find(g => g.id === gameId)
    const winnerId = homeScore > awayScore ? game?.home_team_id : awayScore > homeScore ? game?.away_team_id : null
    await supabase.from('scheduled_games').update({ home_score: homeScore, away_score: awayScore, winner_team_id: winnerId, status: 'completed', updated_at: new Date().toISOString() }).eq('id', gameId)
    loadAll(selectedTournamentId)
  }

  async function handleEditGame(gameId, updates, selectedRefIds) {
    await supabase.from('scheduled_games').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', gameId)
    // Update ref assignments
    await supabase.from('ref_assignments').delete().eq('game_id', gameId)
    if (selectedRefIds?.length) {
      await supabase.from('ref_assignments').insert(
        selectedRefIds.map((refId, i) => ({ game_id: gameId, ref_id: refId, role: i === 0 ? 'head_referee' : 'referee' }))
      )
    }
    setEditGame(null); loadAll(selectedTournamentId)
  }

  async function handleDeleteGame(gameId) {
    await supabase.from('ref_assignments').delete().eq('game_id', gameId)
    await supabase.from('scheduled_games').delete().eq('id', gameId)
    setEditGame(null); loadAll(selectedTournamentId)
  }

  async function handleDeleteDivisionGames(divKey) {
    const divTeamIds = new Set(teams.filter(t => t.division_key === divKey).map(t => String(t.team_id)))
    const divGameIds = games.filter(g => divTeamIds.has(String(g.home_team_id)) || divTeamIds.has(String(g.away_team_id))).map(g => g.id)
    if (!divGameIds.length) return
    await supabase.from('ref_assignments').delete().in('game_id', divGameIds)
    await supabase.from('scheduled_games').delete().in('id', divGameIds)
    loadAll(selectedTournamentId)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="SCHEDULE" actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {view === 'bracket' && <button onClick={() => { setView('schedule'); setActiveDivision(null) }} style={s.btn('blue')}>← Schedule</button>}
          {selectedTournamentId && <button onClick={() => navigate(`/tournaments/${selectedTournamentId}`)} style={s.btn('blue')}>Open Tournament →</button>}
        </div>
      } />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ marginBottom: 20 }}>
          <select value={selectedTournamentId} onChange={e => { setSelectedTournamentId(e.target.value); setView('schedule'); setActiveDivision(null) }} style={{ ...s.input, minWidth: 300 }}>
            <option value="">Select a tournament</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : !selectedTournamentId ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Select a tournament</div>
        ) : view === 'bracket' && activeDivision ? (
          <div>
            {/* Division tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {Object.keys(divisionGroups).sort().map(div => (
                <button key={div} onClick={() => setActiveDivision(div)} style={{ ...s.btn(div === activeDivision ? 'green' : 'blue'), fontSize: 11 }}>
                  {div} ({divisionGroups[div]?.length || 0})
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setShowScheduler(!showScheduler)} style={s.btn('orange')}>
                ⚡ {showScheduler ? 'Hide' : 'Show'} Auto Scheduler
              </button>
              <button onClick={() => setEditConflict(activeDivision)} style={s.btn('blue')}>
                ⚠ Edit Conflicts
              </button>
              {divisionGames.length > 0 && (
                <button onClick={() => { if (window.confirm('Delete all games for this division?')) handleDeleteDivisionGames(activeDivision) }} style={s.btn('red')}>
                  🗑 Clear Games
                </button>
              )}

              {/* View layout toggle — table vs visual bracket */}
              {divisionGames.length > 0 && (
                <div style={{ display: 'flex', gap: 0, marginLeft: 'auto', border: '1px solid #1a2030', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => setBracketLayout('table')}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: bracketLayout === 'table' ? '#0d1a0a' : 'transparent',
                      color: bracketLayout === 'table' ? '#5cb800' : '#6b7a99',
                      border: 'none',
                      borderRight: '1px solid #1a2030',
                    }}
                  >
                    ☰ Table
                  </button>
                  <button
                    onClick={() => setBracketLayout('visual')}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: bracketLayout === 'visual' ? '#0d1a0a' : 'transparent',
                      color: bracketLayout === 'visual' ? '#5cb800' : '#6b7a99',
                      border: 'none',
                    }}
                  >
                    🏆 Bracket
                  </button>
                </div>
              )}
            </div>

            {showScheduler && (
              <div style={{ marginBottom: 20 }}>
                <AutoSchedulerPanel
                  teams={teams} constraints={constraints} courts={courts}
                  games={games} refs={refs} divisionKey={activeDivision}
                  tournamentId={selectedTournamentId}
                  onScheduled={() => loadAll(selectedTournamentId)}
                />
              </div>
            )}

            <div style={s.card}>
              {bracketLayout === 'visual' ? (
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <button onClick={() => { setView('schedule'); setActiveDivision(null) }} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 12 }}>← Back</button>
                    <h2 style={{ margin: 0, fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: '0.5px' }}>{activeDivision} BRACKET</h2>
                    <span style={{ fontSize: 11, color: '#4a5568' }}>{divisionGames.length} games</span>
                  </div>
                  <BracketVisual
                    games={divisionGames.map(g => ({
                      ...g,
                      court: g.court_id ? courtsMap[g.court_id] : null,
                    }))}
                    format={inferFormat(divisionGames)}
                    onScoreClick={(game) => setScoreGame(game)}
                  />
                </div>
              ) : (
                <MatchupView
                  games={divisionGames} divisionKey={activeDivision}
                  onEdit={(game, mode) => mode === 'edit' ? setEditGame(game) : setScoreGame(game)}
                  onBack={() => { setView('schedule'); setActiveDivision(null) }}
                  courtsMap={courtsMap} refsMap={refsMap}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Teams', value: teams.length },
                { label: 'Divisions', value: Object.keys(divisionGroups).length, accent: '#d4a017' },
                { label: 'Games', value: games.length, accent: '#4a9eff' },
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
                <button onClick={() => navigate(`/tournaments/${selectedTournamentId}`)} style={{ ...s.btn('green'), marginTop: 8 }}>Go to Tournament →</button>
              </div>
            ) : (
              Object.entries(divisionGroups).sort().map(([divKey, divTeams]) => {
                const divGamesCount = games.filter(g => {
                  const ids = new Set(divTeams.map(t => String(t.team_id)))
                  return ids.has(String(g.home_team_id)) || ids.has(String(g.away_team_id))
                }).length
                return (
                  <div key={divKey} style={{ ...s.card, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => { setActiveDivision(divKey); setView('bracket') }}
                        style={{ background: 'none', border: 'none', fontFamily: 'Anton, sans-serif', fontSize: 15, color: '#5cb800', cursor: 'pointer', padding: 0 }}>
                        {divKey} ↗
                      </button>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#4a5568' }}>{divTeams.length} teams · {divGamesCount} games</span>
                        <button onClick={() => { setActiveDivision(divKey); setView('bracket'); setShowScheduler(true) }} style={{ ...s.btn('orange'), padding: '5px 10px', fontSize: 11 }}>⚡ Schedule</button>
                        <button onClick={() => { setActiveDivision(divKey); setView('bracket') }} style={{ ...s.btn('blue'), padding: '5px 10px', fontSize: 11 }}>Matchups →</button>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#0a0f1a' }}>
                          {['Team', 'Org', 'Payment', 'Status', 'Conflicts'].map(h => <th key={h} style={s.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {divTeams.map(team => {
                          const constraint = constraints.find(c => String(c.team_id) === String(team.team_id))
                          const isScheduled = games.some(g => String(g.home_team_id) === String(team.team_id) || String(g.away_team_id) === String(team.team_id))
                          return (
                            <tr key={team.id} style={{ opacity: isScheduled ? 0.45 : 1 }}>
                              <td style={{ ...s.td, fontWeight: 600 }}>
                                {team.team_name}
                                {isScheduled && <span style={{ fontSize: 10, color: '#5cb800', marginLeft: 8 }}>✓ Scheduled</span>}
                              </td>
                              <td style={{ ...s.td, color: '#6b7a99' }}>{team.org_name}</td>
                              <td style={s.td}>
                                <span style={{ fontSize: 11, color: team.payment_status === 'paid' ? '#5cb800' : '#d4a017', fontWeight: 700 }}>
                                  {team.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                                </span>
                              </td>
                              <td style={s.td}>
                                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: team.approval_status === 'approved' ? '#0d1a0a' : '#1a1500', color: team.approval_status === 'approved' ? '#5cb800' : '#d4a017', border: `1px solid ${team.approval_status === 'approved' ? '#1a3a0a' : '#3a3000'}` }}>
                                  {team.approval_status || 'pending'}
                                </span>
                              </td>
                              <td style={s.td}>
                                {constraint?.has_conflicts ? (
                                  <span style={{ fontSize: 11, color: '#d4a017' }}>
                                    {[constraint.preferred_day && `${constraint.preferred_day} only`, constraint.shared_coach_group && `Coach: ${constraint.shared_coach_group}`, constraint.earliest_start_time && `After ${constraint.earliest_start_time}`].filter(Boolean).join(' · ') || 'Has conflicts'}
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

      {/* Modals */}
      {editConflict && (
        <ConflictEditModal divisionKey={editConflict} teams={teams.filter(t => t.division_key === editConflict)}
          constraints={constraints} tournamentId={selectedTournamentId}
          onClose={() => setEditConflict(null)} onSaved={() => { setEditConflict(null); loadAll(selectedTournamentId) }} />
      )}
      {editGame && (
        <EditGameModal game={editGame} courts={courts} availableRefs={refs}
          currentRefs={refAssignments.filter(a => a.game_id === editGame.id)}
          onSave={handleEditGame} onDelete={handleDeleteGame} onClose={() => setEditGame(null)} />
      )}
      {scoreGame && (
        <ScoreModal game={scoreGame} onSave={handleUpdateScore} onClose={() => setScoreGame(null)} />
      )}
    </div>
  )
}

// ── Game Generation ────────────────────────────────────────────────────────
function generateGames({ teams, constraints, existingGames, startDate, startTime, courtsToUse, format, gameDuration, divisionKey }) {
  const usedSlots = new Set()
  ;(existingGames || []).forEach(g => {
    if (g.court_id && g.scheduled_date && g.scheduled_time) usedSlots.add(`${g.court_id}|${g.scheduled_date}|${g.scheduled_time}`)
  })

  const games = []
  let slotIndex = 0
  const constraintMap = {}
  constraints.forEach(c => { constraintMap[String(c.team_id)] = c })
  const sortedTeams = [...teams].sort((a, b) => (b.ranking_points || 0) - (a.ranking_points || 0))

  function getDateForDay(preferredDay) {
    if (!preferredDay) return startDate
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const base = new Date(startDate)
    const diff = (days.indexOf(preferredDay) - base.getDay() + 7) % 7
    const d = new Date(base); d.setDate(base.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  function getSlot(teamA, teamB) {
    const cA = constraintMap[String(teamA?.team_id)]
    const cB = constraintMap[String(teamB?.team_id)]
    const earliest = cA?.earliest_start_time || cB?.earliest_start_time
    const preferredDay = (cA?.has_conflicts && cA.preferred_day) || (cB?.has_conflicts && cB.preferred_day)
    const gameDate = getDateForDay(preferredDay)
    const [h, m] = startTime.split(':').map(Number)
    let courtIdx = slotIndex % courtsToUse.length
    let slotOffset = Math.floor(slotIndex / courtsToUse.length)
    let attempts = 0
    while (attempts < 200) {
      let totalMins = h * 60 + m + slotOffset * gameDuration
      if (earliest) { const [eh, em] = earliest.split(':').map(Number); if (totalMins < eh * 60 + em) totalMins = eh * 60 + em }
      const hour = Math.floor(totalMins / 60) % 24
      const min = totalMins % 60
      const timeStr = `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`
      const key = `${courtsToUse[courtIdx]?.id}|${gameDate}|${timeStr}`
      if (!usedSlots.has(key)) {
        usedSlots.add(key)
        slotIndex++
        return { court_id: courtsToUse[courtIdx]?.id || null, scheduled_date: gameDate, scheduled_time: timeStr, game_duration_mins: gameDuration }
      }
      courtIdx = (courtIdx + 1) % courtsToUse.length
      if (courtIdx === 0) slotOffset++
      attempts++
    }
    slotIndex++
    return { court_id: courtsToUse[0]?.id || null, scheduled_date: gameDate, scheduled_time: startTime, game_duration_mins: gameDuration }
  }

  function makeGame(a, b, round, roundNum, extra = {}) {
    return {
      ...getSlot(a, b),
      home_team_id: String(a?.team_id || ''), away_team_id: String(b?.team_id || ''),
      home_team_name: a?.team_name || 'TBD', away_team_name: b?.team_name || 'TBD',
      round, round_number: roundNum, status: 'scheduled', ...extra,
    }
  }

  if (format === 'two_games_guaranteed') {
    // Build pools of 3, remainder goes into last pool (making it 4)
    // This guarantees every team plays at least 2 games
    const pools = []
    let remaining = [...sortedTeams]
    while (remaining.length >= 3) {
      pools.push(remaining.splice(0, 3))
    }
    // Add leftover teams to last pool instead of making a tiny pool
    if (remaining.length > 0 && pools.length > 0) {
      pools[pools.length - 1].push(...remaining)
    } else if (remaining.length > 0) {
      pools.push(remaining)
    }
    pools.forEach((pool, pi) => {
      const poolName = `Pool ${String.fromCharCode(65 + pi)}`
      const uniquePool = [...new Map(pool.map(t => [t.team_id, t])).values()]
      for (let i = 0; i < uniquePool.length; i++)
        for (let j = i + 1; j < uniquePool.length; j++)
          games.push(makeGame(uniquePool[i], uniquePool[j], 'Pool Play', 1, { pool_name: poolName }))
    })
  } else if (format === 'round_robin') {
    for (let i = 0; i < sortedTeams.length; i++)
      for (let j = i + 1; j < sortedTeams.length; j++)
        games.push(makeGame(sortedTeams[i], sortedTeams[j], 'Round Robin', 1))
  } else if (format === 'pool_play' || format === 'pool_then_bracket') {
    const poolSize = sortedTeams.length <= 6 ? 3 : 4
    const numPools2 = Math.ceil(sortedTeams.length / poolSize)
    const pools = Array.from({ length: numPools2 }, () => [])
    sortedTeams.forEach((t, i) => pools[i % numPools2].push(t))
    pools.forEach((pool, pi) => {
      const poolName = `Pool ${String.fromCharCode(65 + pi)}`
      const uniquePool = [...new Map(pool.map(t => [t.team_id, t])).values()]
      for (let i = 0; i < uniquePool.length; i++)
        for (let j = i + 1; j < uniquePool.length; j++)
          games.push(makeGame(uniquePool[i], uniquePool[j], 'Pool Play', 1, { pool_name: poolName }))
    })
    if (format === 'pool_then_bracket') {
      const numPools = pools.length
      const bracketTeams = Math.min(numPools * 2, 8)
      for (let i = 0; i < Math.ceil(bracketTeams / 2); i++)
        games.push(makeGame(null, null, bracketTeams > 4 ? 'Quarterfinal' : 'Semifinal', 2, { bracket_slot: `QF${i+1}`, home_team_name: 'TBD', away_team_name: 'TBD' }))
      games.push(makeGame(null, null, 'Semifinal', 3, { bracket_slot: 'SF1', home_team_name: 'TBD', away_team_name: 'TBD' }))
      games.push(makeGame(null, null, 'Semifinal', 3, { bracket_slot: 'SF2', home_team_name: 'TBD', away_team_name: 'TBD' }))
      games.push(makeGame(null, null, 'Final', 4, { bracket_slot: 'FINAL', home_team_name: 'TBD', away_team_name: 'TBD' }))
    }
  } else if (format === 'single_elimination') {
    const rounds = Math.ceil(Math.log2(sortedTeams.length))
    let roundTeams = [...sortedTeams]
    for (let r = 0; r < rounds; r++) {
      const roundName = r === rounds-1 ? 'Final' : r === rounds-2 ? 'Semifinal' : r === rounds-3 ? 'Quarterfinal' : `Round ${r+1}`
      for (let i = 0; i < roundTeams.length; i += 2)
        games.push(makeGame(roundTeams[i], roundTeams[i+1], roundName, r+1, { bracket_slot: `R${r+1}G${Math.floor(i/2)+1}` }))
      roundTeams = Array(Math.ceil(roundTeams.length / 2)).fill(null)
    }
  } else if (format === 'double_elimination') {
    const rounds = Math.ceil(Math.log2(sortedTeams.length))
    let roundTeams = [...sortedTeams]
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < roundTeams.length; i += 2) {
        games.push(makeGame(roundTeams[i], roundTeams[i+1], `Winners Round ${r+1}`, r+1, { bracket_slot: `W${r+1}G${Math.floor(i/2)+1}` }))
        games.push(makeGame(null, null, `Losers Round ${r+1}`, r+1, { bracket_slot: `L${r+1}G${Math.floor(i/2)+1}`, home_team_name: 'TBD', away_team_name: 'TBD' }))
      }
      roundTeams = Array(Math.ceil(roundTeams.length / 2)).fill(null)
    }
    games.push(makeGame(null, null, 'Championship', rounds+1, { bracket_slot: 'CHAMP', home_team_name: 'TBD', away_team_name: 'TBD' }))
  }

  return games
}

function estimateGames(format, n) {
  if (!n) return '—'
  if (format === 'two_games_guaranteed') return Math.ceil(n / 3) * 3
  if (format === 'round_robin') return (n * (n-1)) / 2
  if (format === 'single_elimination') return n - 1
  if (format === 'double_elimination') return (n-1) * 2 + 1
  if (format === 'pool_play') { const ps = n <= 6 ? 3 : 4; const p = Math.ceil(n/ps); return p * ((ps*(ps-1))/2) }
  if (format === 'pool_then_bracket') { const ps = n <= 6 ? 3 : 4; const p = Math.ceil(n/ps); return p * ((ps*(ps-1))/2) + p*2-1 }
  return '—'
}

// Detects bracket format from the games' pool/round data. Used by BracketVisual
// so we don't need to query tournaments.bracket_format separately.
function inferFormat(games) {
  if (!games?.length) return 'single_elimination'
  const hasPools = games.some(g => g.pool_name)
  const hasBracket = games.some(g => g.round && !['Round Robin', 'Pool Play'].includes(g.round))
  const hasRoundRobin = games.some(g => g.round === 'Round Robin')
  const hasLoserBracket = games.some(g => g.round && /loser|LB/i.test(g.round))

  if (hasRoundRobin && !hasBracket) return 'round_robin'
  if (hasLoserBracket) return 'double_elimination'
  if (hasPools && hasBracket) return 'pool_then_bracket'
  if (hasPools) return 'pool_play'
  return 'single_elimination'
}
