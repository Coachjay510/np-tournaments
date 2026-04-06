export default function RankingFilters({ division, onDivisionChange, divisionOptions, search, onSearchChange }) {
  const inputStyle = { width:'100%', background:'#0e1320', border:'1px solid #1a2030', color:'#d8e0f0', borderRadius:8, padding:'10px 12px', fontSize:13, outline:'none' }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:12 }}>
      <select value={division} onChange={e => onDivisionChange(e.target.value)} style={inputStyle}>
        <option value="all">All divisions</option>
        {divisionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <input type="text" value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search by team name" style={inputStyle} />
    </div>
  )
}
