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
  source,
  onSourceChange
}) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
      <select value={source} onChange={(e) => onSourceChange(e.target.value)}>
        <option value="Next Play Sports">Next Play Sports</option>
        <option value="Covert Hoops">Covert Hoops</option>
        <option value="Nothing But Net">Nothing But Net</option>
      </select>

      <select value={division} onChange={(e) => onDivisionChange(e.target.value)}>
        <option value="all">All Divisions</option>
        {divisionOptions.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select value={gender} onChange={(e) => onGenderChange(e.target.value)}>
        <option value="all">All Genders</option>
        <option value="boys">Boys</option>
        <option value="girls">Girls</option>
      </select>

      <input
        type="text"
        placeholder="Search team..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <select value={sortBy} onChange={(e) => onSortByChange(e.target.value)}>
        <option value="rank">Rank</option>
        <option value="ranking_points">Power Score</option>
        <option value="wins">Wins</option>
        <option value="losses">Losses</option>
        <option value="games_played">Games Played</option>
        <option value="opponent_strength">Strength of Schedule</option>
        <option value="point_diff">Point Differential</option>
        <option value="skill_level">Team Level</option>
        <option value="team_name">Team Name</option>
      </select>

      <select value={sortDir} onChange={(e) => onSortDirChange(e.target.value)}>
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </div>
  )
}
