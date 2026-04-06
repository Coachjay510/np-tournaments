import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { useTeamDetail } from '../hooks/useTeamDetail'

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div
      style={{
        background: '#080c12',
        border: '1px solid #1a2030',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          color: '#4a5568',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Anton, sans-serif',
          fontSize: 30,
          color: accent,
          lineHeight: 1,
          letterSpacing: '0.5px',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function resultBadge(isWin) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.4px',
    background: isWin ? '#0d1a0a' : '#2a130f',
    color: isWin ? '#5cb800' : '#ffb38a',
    border: isWin ? '1px solid #1a3a0a' : '1px solid #4b251d',
  }
}

export default function TeamDetail() {
  const { teamId } = useParams()
  const { team, games, loading, error, refresh } = useTeamDetail(teamId)

  const recentGames = useMemo(() => {
    return [...(games || [])].sort((a, b) => new Date(b.game_date) - new Date(a.game_date))
  }, [games])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="TEAM DETAIL"
        actions={
          <button
            onClick={refresh}
            style={{
              background: '#5cb800',
              color: '#04060a',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Refresh Team
          </button>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {error ? (
          <div style={{ color: '#e05555', fontSize: 13 }}>Error: {error.message}</div>
        ) : loading ? (
          <div style={{ color: '#4a5568', fontSize: 13 }}>Loading team detail...</div>
        ) : !team ? (
          <div style={{ color: '#c0cce0', fontSize: 13 }}>Team not found.</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: 'Anton, sans-serif',
                  fontSize: 34,
                  color: '#f0f4ff',
                  letterSpacing: '0.5px',
                  lineHeight: 1,
                }}
              >
                {team.team_name}
              </div>
              <div style={{ marginTop: 8, color: '#6b7a99', fontSize: 13 }}>
                {team.ranking_source} • {team.ranking_division_key} • Master Team ID {team.master_team_id}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
              <StatCard label="Rank" value={`#${team.rank || '—'}`} accent="#d4a017" />
              <StatCard label="Skill Level" value={team.skill_level || '—'} accent="#5cb800" />
              <StatCard label="Record" value={`${team.wins || 0}-${team.losses || 0}`} />
              <StatCard label="Ranking Points" value={team.ranking_points || 0} />
              <StatCard label="Points For" value={team.points_for || 0} />
              <StatCard label="Points Against" value={team.points_against || 0} />
            </div>

            <div
              style={{
                background: '#080c12',
                border: '1px solid #1a2030',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0', letterSpacing: '0.3px' }}>
                  RECENT GAMES
                </div>
                <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                  Previous games, scores, and results
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Date', 'Source', 'Division', 'Matchup', 'Score', 'Result'].map((label) => (
                        <th
                          key={label}
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            fontSize: 11,
                            color: '#6b7a99',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            borderBottom: '1px solid #1a2030',
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentGames.map((game) => {
                      const isHome = Number(game.home_team_id) === Number(team.master_team_id) || Number(game.home_team_id) === Number(team.source_team_id)
                      const teamScore = isHome ? game.score_home : game.score_away
                      const oppScore = isHome ? game.score_away : game.score_home
                      const opponentName = isHome ? game.away_team_name : game.home_team_name
                      const isWin = Number(teamScore) > Number(oppScore)

                      return (
                        <tr key={`${game.game_id}-${game.ranking_source}`} style={{ borderBottom: '1px solid #0e1320' }}>
                          <td style={{ padding: '13px 14px', color: '#c0cce0' }}>
                            {game.game_date ? new Date(game.game_date).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{game.ranking_source}</td>
                          <td style={{ padding: '13px 14px', color: '#6b7a99', fontSize: 12 }}>
                            {game.ranking_division_key}
                          </td>
                          <td style={{ padding: '13px 14px', color: '#d8e0f0', fontWeight: 600 }}>
                            {team.team_name} vs {opponentName}
                          </td>
                          <td style={{ padding: '13px 14px', color: '#c0cce0' }}>
                            {teamScore} - {oppScore}
                          </td>
                          <td style={{ padding: '13px 14px' }}>
                            <span style={resultBadge(isWin)}>{isWin ? 'Win' : 'Loss'}</span>
                          </td>
                        </tr>
                      )
                    })}
                    {!recentGames.length && (
                      <tr>
                        <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#4a5568' }}>
                          No recent games found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
