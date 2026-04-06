export default function RankingsTable({ rows }) {
  if (!rows.length) return <div style={{ padding:40, textAlign:'center', color:'#4a5568', fontSize:13 }}>No rankings found.</div>
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:'#0a0f1a' }}>
            {['Rank','Team','Division','W','L','Pts','SOS','PF','PA','GP'].map(label => (
              <th key={label} style={{ textAlign:'left', padding:'12px 14px', fontSize:11, color:'#6b7a99', textTransform:'uppercase', letterSpacing:'1px', borderBottom:'1px solid #1a2030' }}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={`${row.ranking_division_key}-${row.team_id}`} style={{ borderBottom:'1px solid #0e1320' }}>
              <td style={{ padding:'13px 14px', color:'#d4a017', fontWeight:700 }}>#{row.rank}</td>
              <td style={{ padding:'13px 14px', color:'#d8e0f0', fontWeight:600 }}>{row.team_name}</td>
              <td style={{ padding:'13px 14px', color:'#6b7a99', fontSize:12 }}>{row.ranking_division_key}</td>
              <td style={{ padding:'13px 14px', color:'#5cb800' }}>{row.wins ?? 0}</td>
              <td style={{ padding:'13px 14px', color:'#e05555' }}>{row.losses ?? 0}</td>
              <td style={{ padding:'13px 14px', color:'#5cb800', fontWeight:600 }}>{row.ranking_points ?? 0}</td>
              <td style={{ padding:'13px 14px', color:'#c0cce0' }}>{Number(row.opponent_strength || 0).toFixed(2)}</td>
              <td style={{ padding:'13px 14px', color:'#c0cce0' }}>{row.points_for ?? 0}</td>
              <td style={{ padding:'13px 14px', color:'#c0cce0' }}>{row.points_against ?? 0}</td>
              <td style={{ padding:'13px 14px', color:'#c0cce0' }}>{row.games_played ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
