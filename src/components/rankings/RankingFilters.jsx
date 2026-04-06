export default function RankingFilters({
  division,
  onDivisionChange,
  divisionOptions,
  gender,
  onGenderChange,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}) {
  const inputStyle = {
    width:'100%',
    background:'#0e1320',
    border:'1px solid #1a2030',
    color:'#d8e0f0',
    borderRadius:8,
    padding:'10px 12px',
    fontSize:13,
    outline:'none'
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
      <select value={division} onChange={e => onDivisionChange(e.target.value)} style={inputStyle}>
        <option value="all">All divisions</option>
        {divisionOptions.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>

      <select value={gender} onChange={e => onGenderChange(e.target.value)} style={inputStyle}>
        <option value="all">All genders</option>
        <option value="boys">Boys</option>
        <option value="girls">Girls</option>
      </select>

      <select value={sortBy} onChange={e => onSortByChange(e.target.value)} style={inputStyle}>
        <option value="rank">Rank</option>
        <option value="team_name">Team Name</option>
        <option value="wins">Wins</option>
        <option value="losses">Losses</option>
        <option value="ranking_points">Ranking Points</option>
        <option value="opponent_strength">Opponent Strength</option>
        <option value="point_diff">Point Differential</option>
        <option value="games_played">Games Played</option>
      </select>

      <select value={sortDir} onChange={e => onSortDirChange(e.target.value)} style={inputStyle}>
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>

      <input
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search by team name"
        style={inputStyle}
      />
    </div>
  )
}
