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

const labelStyle = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '1.2px',
  color: '#4a5568',
  marginBottom: 6,
  display: 'block',
}

export default function GameFilters({
  team,
  onTeamChange,
  divisionKey,
  onDivisionKeyChange,
  divisionOptions = [],
  gender,
  onGenderChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  circuit,
  onCircuitChange,
  circuitOptions = [],
  onClear,
}) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 12,
        }}
      >
        <div>
          <span style={labelStyle}>Team</span>
          <input
            type="text"
            value={team}
            onChange={(e) => onTeamChange(e.target.value)}
            placeholder="Search team name..."
            style={inputStyle}
          />
        </div>

        <div>
          <span style={labelStyle}>Division</span>
          <select
            value={divisionKey}
            onChange={(e) => onDivisionKeyChange(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All divisions</option>
            {divisionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <span style={labelStyle}>Gender</span>
          <select
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All genders</option>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </div>

        <div>
          <span style={labelStyle}>Circuit / Source</span>
          <select
            value={circuit}
            onChange={(e) => onCircuitChange(e.target.value)}
            style={inputStyle}
          >
            <option value="all">All sources</option>
            <option value="tournaments">NP Tournaments only</option>
            <option value="circuit-only">Circuit history only</option>
            {circuitOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <span style={labelStyle}>Date from</span>
          <input
            type="date"
            value={dateFrom || ''}
            onChange={(e) => onDateFromChange(e.target.value || null)}
            style={inputStyle}
          />
        </div>

        <div>
          <span style={labelStyle}>Date to</span>
          <input
            type="date"
            value={dateTo || ''}
            onChange={(e) => onDateToChange(e.target.value || null)}
            style={inputStyle}
          />
        </div>
      </div>

      {onClear && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClear}
            style={{
              background: 'transparent',
              border: '1px solid #1a2030',
              color: '#6b7a99',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
