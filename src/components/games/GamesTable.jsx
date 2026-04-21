import { Link } from 'react-router-dom'

const thStyle = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 11,
  color: '#6b7a99',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  borderBottom: '1px solid #1a2030',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '13px 14px',
  color: '#c0cce0',
  fontSize: 13,
  verticalAlign: 'middle',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${m}/${d}/${y.slice(2)}`
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  if (h == null) return t
  const hour = parseInt(h, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${period}`
}

function SourceBadge({ row }) {
  const isTournament = row.source_type === 'tournament'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        background: isTournament ? '#0d1a0a' : '#071525',
        color: isTournament ? '#5cb800' : '#4a9eff',
        border: `1px solid ${isTournament ? '#1a3a0a' : '#0a2540'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {isTournament ? 'NP' : (row.ranking_source || 'Circuit')}
    </span>
  )
}

function ScoreCell({ row, linkable }) {
  const { home_score: hs, away_score: as, scored } = row
  if (!scored) {
    return <span style={{ color: '#4a5568', fontSize: 12 }}>— vs —</span>
  }
  const homeWon = hs > as
  const awayWon = as > hs
  return (
    <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, letterSpacing: '0.5px' }}>
      <span style={{ color: homeWon ? '#5cb800' : '#6b7a99' }}>{hs}</span>
      <span style={{ color: '#2d3748', margin: '0 6px' }}>–</span>
      <span style={{ color: awayWon ? '#5cb800' : '#6b7a99' }}>{as}</span>
    </span>
  )
}

function TeamCell({ id, name, highlight, linkEnabled }) {
  const color = highlight ? '#f0f4ff' : '#c0cce0'
  const weight = highlight ? 700 : 500
  if (linkEnabled && id) {
    return (
      <Link
        to={`/team/${id}`}
        style={{ color, fontWeight: weight, textDecoration: 'none' }}
      >
        {name}
      </Link>
    )
  }
  return <span style={{ color, fontWeight: weight }}>{name}</span>
}

/**
 * GamesTable — shared between admin (np-tournaments) and public (np-rankings).
 *
 * Props:
 *  - rows: normalized rows from useGameResults
 *  - adminMode: show extra admin columns (status, edit button)
 *  - onEditScore: callback for admin score editing
 *  - linkTeams: whether team names should link (useful on np-tournaments)
 *  - linkTournaments: whether tournament cells should link to /t/:slug
 */
export default function GamesTable({
  rows,
  adminMode = false,
  onEditScore,
  linkTeams = false,
  linkTournaments = false,
}) {
  if (!rows.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99', fontSize: 13 }}>
        No games match the current filters.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#0a0f1a' }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Division</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Home</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Score</th>
            <th style={thStyle}>Away</th>
            <th style={thStyle}>Tournament / Round</th>
            {adminMode && <th style={thStyle}>Status</th>}
            {adminMode && onEditScore && <th style={thStyle}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const homeWon = row.scored && row.home_score > row.away_score
            const awayWon = row.scored && row.away_score > row.home_score
            return (
              <tr key={row.id} style={{ borderBottom: '1px solid #0e1320' }}>
                <td style={tdStyle}>
                  <div style={{ color: '#d8e0f0', fontWeight: 600 }}>{formatDate(row.date)}</div>
                  {row.time && (
                    <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>
                      {formatTime(row.time)}
                    </div>
                  )}
                </td>
                <td style={tdStyle}>
                  <SourceBadge row={row} />
                </td>
                <td style={tdStyle}>
                  <div style={{ color: '#d8e0f0', fontSize: 12 }}>
                    {row.division_name || row.division_key || '—'}
                  </div>
                  {row.gender && (
                    <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2, textTransform: 'capitalize' }}>
                      {row.gender}{row.age_group ? ` • ${row.age_group}` : ''}
                    </div>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <TeamCell
                    id={row.home_team_id}
                    name={row.home_team_name}
                    highlight={homeWon}
                    linkEnabled={linkTeams}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <ScoreCell row={row} />
                </td>
                <td style={tdStyle}>
                  <TeamCell
                    id={row.away_team_id}
                    name={row.away_team_name}
                    highlight={awayWon}
                    linkEnabled={linkTeams}
                  />
                </td>
                <td style={tdStyle}>
                  {row.tournament_name ? (
                    linkTournaments && row.tournament_slug ? (
                      <Link
                        to={`/t/${row.tournament_slug}`}
                        style={{ color: '#d4a017', textDecoration: 'none', fontSize: 12 }}
                      >
                        {row.tournament_name}
                      </Link>
                    ) : (
                      <div style={{ color: '#d4a017', fontSize: 12 }}>{row.tournament_name}</div>
                    )
                  ) : (
                    <div style={{ color: '#6b7a99', fontSize: 12 }}>{row.circuit_label}</div>
                  )}
                  {(row.round || row.pool_name) && (
                    <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>
                      {[row.pool_name, row.round].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </td>
                {adminMode && (
                  <td style={tdStyle}>
                    <StatusPill status={row.status} scored={row.scored} />
                  </td>
                )}
                {adminMode && onEditScore && (
                  <td style={tdStyle}>
                    {row.source_type === 'tournament' && (
                      <button
                        onClick={() => onEditScore(row)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #1a2030',
                          color: '#5cb800',
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {row.scored ? 'Edit' : 'Enter'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status, scored }) {
  let label = status || 'scheduled'
  let bg = '#1a1500', color = '#d4a017', border = '#3a3000'
  if (scored || status === 'completed') {
    label = 'Final'
    bg = '#0d1a0a'; color = '#5cb800'; border = '#1a3a0a'
  } else if (status === 'in_progress') {
    label = 'Live'
    bg = '#1f0707'; color = '#e05555'; border = '#3a0a0a'
  } else if (status === 'cancelled') {
    label = 'Cancelled'
    bg = '#0e1320'; color = '#6b7a99'; border = '#1a2030'
  } else {
    label = 'Scheduled'
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {label}
    </span>
  )
}
