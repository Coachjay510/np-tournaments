function levelBadge(level) {
  const map = {
    D1: { bg: '#0d1a0a', border: '#1a3a0a', color: '#5cb800' },
    D2: { bg: '#1a150a', border: '#3a2d0a', color: '#d4a017' },
    D3: { bg: '#1a0d0d', border: '#3a1a1a', color: '#ff9d7a' },
  }

  const style = map[level] || { bg: '#0e1320', border: '#1a2030', color: '#c0cce0' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 38,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
      }}
    >
      {level || '—'}
    </span>
  )
}

export default function RankingsTable({ rows }) {
  if (!rows.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>
        No rankings found.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#0a0f1a' }}>
            {['Rank', 'Team', 'Level', 'Division', 'W', 'L', 'Pts', 'SOS', 'PF', 'PA', 'Diff', 'Teams'].map((label) => (
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
          {rows.map((row) => (
            <tr key={`${row.ranking_source}-${row.ranking_division_key}-${row.team_name}-${row.rank}`} style={{ borderBottom: '1px solid #0e1320' }}>
              <td style={{ padding: '13px 14px', color: '#d4a017', fontWeight: 700 }}>#{row.rank}</td>
              <td style={{ padding: '13px 14px', color: '#d8e0f0', fontWeight: 600 }}>{row.team_name}</td>
              <td style={{ padding: '13px 14px' }}>{levelBadge(row.skill_level)}</td>
              <td style={{ padding: '13px 14px', color: '#6b7a99', fontSize: 12 }}>{row.division_label || row.ranking_division_key}</td>
              <td style={{ padding: '13px 14px', color: '#5cb800' }}>{row.wins ?? 0}</td>
              <td style={{ padding: '13px 14px', color: '#ff9d7a' }}>{row.losses ?? 0}</td>
              <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{row.ranking_points ?? 0}</td>
              <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{Number(row.opponent_strength || 0).toFixed(2)}</td>
              <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{row.points_for ?? 0}</td>
              <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{row.points_against ?? 0}</td>
              <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{row.point_diff ?? 0}</td>
              <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{row.division_team_count ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
