import { useEffect, useState } from 'react'

const FORMAT_OPTIONS = [
  { value: 'pool_then_bracket', label: 'Pool Play → Bracket' },
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'pool_play', label: 'Pool Play Only' },
  { value: 'round_robin', label: 'Round Robin' },
]

const s = {
  label: { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 },
  input: { width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none' },
  btn: { padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' },
}

export default function AutoScheduler({ divisions, courts, teams, onSchedule, loading }) {
  const [divisionId, setDivisionId] = useState(divisions[0]?.id || '')
  const [format, setFormat] = useState('pool_then_bracket')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [selectedCourts, setSelectedCourts] = useState(courts.slice(0, 2).map(c => c.id))
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!divisionId && divisions.length > 0) {
      setDivisionId(divisions[0].id)
    }
  }, [divisionId, divisions])

  useEffect(() => {
    if (selectedCourts.length === 0 && courts.length > 0) {
      setSelectedCourts(courts.slice(0, 2).map(c => c.id))
    }
  }, [selectedCourts.length, courts])


  const division = divisions.find(d => d.id === divisionId)
  const divTeams = teams.filter(t => t.division_id === divisionId || t.event_division_id === divisionId)

  function toggleCourt(id) {
    setSelectedCourts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  async function handleRun() {
    if (!divisionId || !startDate || !selectedCourts.length) return
    setRunning(true)
    setResult(null)

    const courtsToUse = courts.filter(c => selectedCourts.includes(c.id))
    const { error } = await onSchedule({
      divisionId,
      teams: divTeams.length ? divTeams : generatePlaceholderTeams(division),
      startDate,
      startTime,
      courtsToUse,
      format,
    })

    setResult(error ? { type: 'error', msg: error.message } : { type: 'success', msg: `Schedule generated!` })
    setRunning(false)
  }

  function generatePlaceholderTeams(div) {
    const count = div?.max_teams || 8
    return Array.from({ length: count }, (_, i) => ({
      id: null, name: `Team ${i + 1}`
    }))
  }

  const gamesEstimate = estimateGames(format, divTeams.length || division?.max_teams || 8)

  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#f0f4ff', letterSpacing: 0.5, marginBottom: 20 }}>
        AUTO SCHEDULER
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Division */}
        <div>
          <label style={s.label}>Division</label>
          <select value={divisionId} onChange={e => setDivisionId(e.target.value)} style={s.input}>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Format */}
        <div>
          <label style={s.label}>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={s.input}>
            {FORMAT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label style={s.label}>Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={s.input} />
        </div>

        {/* Start Time */}
        <div>
          <label style={s.label}>First Game Time</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={s.input} />
        </div>
      </div>

      {/* Court selection */}
      <div style={{ marginBottom: 16 }}>
        <label style={s.label}>Courts to Use</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {courts.length === 0 ? (
            <div style={{ fontSize: 12, color: '#4a5568' }}>No courts added yet. Add courts first.</div>
          ) : courts.map(court => (
            <button key={court.id} onClick={() => toggleCourt(court.id)}
              style={{
                ...s.btn, fontSize: 12, padding: '6px 14px',
                background: selectedCourts.includes(court.id) ? '#0d1a0a' : 'transparent',
                color: selectedCourts.includes(court.id) ? '#5cb800' : '#6b7a99',
                border: `1px solid ${selectedCourts.includes(court.id) ? '#1a3a0a' : '#1a2030'}`,
              }}>
              {court.name}
              {court.venue_name && <span style={{ color: '#4a5568', marginLeft: 4 }}>({court.venue_name})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Teams</div>
            <div style={{ fontSize: 20, fontFamily: 'Anton, sans-serif', color: '#f0f4ff', marginTop: 4 }}>
              {divTeams.length || division?.max_teams || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Est. Games</div>
            <div style={{ fontSize: 20, fontFamily: 'Anton, sans-serif', color: '#5cb800', marginTop: 4 }}>{gamesEstimate}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Courts</div>
            <div style={{ fontSize: 20, fontFamily: 'Anton, sans-serif', color: '#f0f4ff', marginTop: 4 }}>{selectedCourts.length}</div>
          </div>
        </div>
      </div>

      {result && (
        <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 12,
          background: result.type === 'success' ? '#0d1a0a' : '#1f0707',
          color: result.type === 'success' ? '#5cb800' : '#e05555',
          border: `1px solid ${result.type === 'success' ? '#1a3a0a' : '#3a0a0a'}`,
        }}>
          {result.msg}
        </div>
      )}

      <button onClick={handleRun} disabled={running || !divisionId || !startDate || !selectedCourts.length}
        style={{ ...s.btn, background: '#5cb800', color: '#04060a', opacity: (running || !divisionId || !startDate) ? 0.5 : 1, width: '100%' }}>
        {running ? 'Generating...' : '⚡ Generate Schedule'}
      </button>
    </div>
  )
}

function estimateGames(format, teamCount) {
  if (!teamCount) return '—'
  if (format === 'round_robin') return (teamCount * (teamCount - 1)) / 2
  if (format === 'single_elimination') return teamCount - 1
  if (format === 'double_elimination') return (teamCount - 1) * 2
  if (format === 'pool_play') {
    const poolSize = teamCount <= 6 ? 3 : 4
    const pools = Math.ceil(teamCount / poolSize)
    return pools * ((poolSize * (poolSize - 1)) / 2)
  }
  if (format === 'pool_then_bracket') {
    const poolSize = teamCount <= 6 ? 3 : 4
    const pools = Math.ceil(teamCount / poolSize)
    const poolGames = pools * ((poolSize * (poolSize - 1)) / 2)
    const bracketTeams = Math.min(pools * 2, 8)
    return poolGames + bracketTeams - 1
  }
  return '—'
}
