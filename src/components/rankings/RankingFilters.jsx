const inputStyle = {
  width: '100%',
  background: '#0e1320',
  border: '1px solid #1a2030',
  color: '#d8e0f0',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
  outline: 'none',
}

const tabStyle = (active) => ({
  padding: '8px 12px',
  borderRadius: 8,
  border: active ? '1px solid #1a3a0a' : '1px solid #1a2030',
  background: active ? '#0d1a0a' : 'transparent',
  color: active ? '#5cb800' : '#c0cce0',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
})

const chipStyle = (active) => ({
  padding: '8px 12px',
  borderRadius: 8,
  border: active ? '1px solid #1a3a0a' : '1px solid #1a2030',
  background: active ? '#0d1a0a' : 'transparent',
  color: active ? '#5cb800' : '#c0cce0',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

export default function RankingFilters({
  source,
  onSourceChange,
  divisions,
  onDivisionsChange,
  divisionOptions = [],
  gender,
  onGenderChange,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  topMode,
  onTopModeChange,
}) {
  function toggleDivision(value) {
    if (divisions.includes(value)) {
      onDivisionsChange(divisions.filter((d) => d !== value))
      return
    }

    onDivisionsChange([...divisions, value])
  }

  function clearDivisions() {
    onDivisionsChange([])
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <select value={source} onChange={(e) => onSourceChange(e.target.value)} style={inputStyle}>
          <option value="Next Play Sports">Next Play Sports</option>
          <option value="Covert Hoops">Covert Hoops</option>
          <option value="Nothing But Net">Nothing But Net</option>
        </select>

        <select value={gender} onChange={(e) => onGenderChange(e.target.value)} style={inputStyle}>
          <option value="all">All genders</option>
          <option value="boys">Boys</option>
          <option value="girls">Girls</option>
        </select>

        <select value={sortBy} onChange={(e) => onSortByChange(e.target.value)} style={inputStyle}>
          <option value="rank">Rank</option>
          <option value="ranking_points">Power Score</option>
          <option value="wins">Wins</option>
          <option value="losses">Losses</option>
          <option value="games_played">Games Played</option>
          <option value="opponent_strength">Strength of Schedule</option>
          <option value="point_diff">Point Differential</option>
          <option value="division_team_count">Division Size</option>
          <option value="skill_level">Team Level</option>
          <option value="team_name">Team Name</option>
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search team..."
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')}
            style={{
              ...inputStyle,
              width: 56,
              padding: '10px 0',
              cursor: 'pointer',
              fontWeight: 700,
            }}
            title={sortDir === 'asc' ? 'Lowest to highest' : 'Highest to lowest'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={clearDivisions}
            style={{
              ...inputStyle,
              cursor: 'pointer',
              fontWeight: 700,
              padding: '10px 12px',
            }}
          >
            Clear Divisions
          </button>
        </div>
      </div>

      <div>
        <div style={{ color: '#6b7a99', fontSize: 11, marginBottom: 8 }}>
          Divisions
        </div>

        {divisionOptions.length === 0 ? (
          <div style={{ color: '#6b7a99', fontSize: 12 }}>
            No divisions found
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {divisionOptions.map((opt) => {
              const active = divisions.includes(opt.value)

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleDivision(opt.value)}
                  style={chipStyle(active)}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => onTopModeChange('all')} style={tabStyle(topMode === 'all')}>
          All
        </button>
        <button type="button" onClick={() => onTopModeChange('10')} style={tabStyle(topMode === '10')}>
          Top 10
        </button>
        <button type="button" onClick={() => onTopModeChange('25')} style={tabStyle(topMode === '25')}>
          Top 25
        </button>
        <button type="button" onClick={() => onTopModeChange('50')} style={tabStyle(topMode === '50')}>
          Top 50
        </button>
      </div>
    </div>
  )
}