import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

function Card({ title, value, accent = '#5cb800' }) {
  return (
    <div
      style={{
        background: '#080c12',
        border: '1px solid #1a2030',
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 28,
          fontWeight: 700,
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  )
}

const th = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 11,
  color: '#6b7a99',
  textTransform: 'uppercase',
  borderBottom: '1px solid #1a2030',
}

const td = {
  padding: '12px 14px',
  color: '#d8e0f0',
  fontSize: 13,
}

export default function Schedule() {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState('all')
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('id, name, start_date, location_name')
        .order('start_date', { ascending: false })

      const { data: gameData } = await supabase
        .from('scheduled_games')
        .select('*')
        .order('game_date', { ascending: true })
        .limit(250)

      setTournaments(tournamentData || [])
      setGames(gameData || [])
      setLoading(false)
    }

    loadData()
  }, [])

  const filteredGames = useMemo(() => {
    if (selectedTournament === 'all') return games

    return games.filter(
      (game) => String(game.tournament_id) === String(selectedTournament)
    )
  }, [games, selectedTournament])

  const completedGames = filteredGames.filter((g) => g.status === 'completed').length
  const uniqueCourts = new Set(filteredGames.map((g) => g.court_name).filter(Boolean)).size

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Scheduler</h1>
          <div style={{ color: '#6b7a99', marginTop: 6 }}>
            Tournament schedules, games, courts, and bracket flow.
          </div>
        </div>

        <button
          style={{
            background: '#5cb800',
            color: '#04060a',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Auto Build Schedule
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card title="Tournaments" value={tournaments.length} />
        <Card title="Games" value={filteredGames.length} accent="#d4a017" />
        <Card title="Completed" value={completedGames} accent="#4cafef" />
        <Card title="Courts" value={uniqueCourts} accent="#ff8a65" />
      </div>

      <div
        style={{
          background: '#080c12',
          border: '1px solid #1a2030',
          borderRadius: 12,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <label style={{ display: 'block', marginBottom: 8, color: '#6b7a99', fontSize: 12 }}>
          Tournament
        </label>

        <select
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
          style={{
            width: 320,
            background: '#04060a',
            color: '#fff',
            border: '1px solid #1a2030',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          <option value="all">All Tournaments</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          background: '#080c12',
          border: '1px solid #1a2030',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #1a2030', fontWeight: 700 }}>
          Scheduled Games
        </div>

        {loading ? (
          <div style={{ padding: 24, color: '#6b7a99' }}>Loading schedule...</div>
        ) : filteredGames.length === 0 ? (
          <div style={{ padding: 24, color: '#6b7a99' }}>No games found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a0f1a' }}>
                <th style={th}>Date</th>
                <th style={th}>Time</th>
                <th style={th}>Court</th>
                <th style={th}>Home</th>
                <th style={th}>Away</th>
                <th style={th}>Division</th>
                <th style={th}>Round</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game) => (
                <tr key={game.id} style={{ borderBottom: '1px solid #111827' }}>
                  <td style={td}>{game.game_date || '—'}</td>
                  <td style={td}>{game.game_time || '—'}</td>
                  <td style={td}>{game.court_name || '—'}</td>
                  <td style={td}>{game.home_team_name || 'TBD'}</td>
                  <td style={td}>{game.away_team_name || 'TBD'}</td>
                  <td style={td}>{game.division_name || '—'}</td>
                  <td style={td}>{game.round_name || 'Pool Play'}</td>
                  <td style={td}>{game.status || 'scheduled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
