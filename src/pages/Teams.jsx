import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { useTeams, usePaginatedTeams } from '../hooks/useTeams'

export default function Teams() {
  const { teams, loading, error, refresh } = useTeams()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('display_name')
  const [sortDirection, setSortDirection] = useState('asc')

  const pageSize = 25

  const { rows, total, totalPages } = usePaginatedTeams(
    teams,
    page,
    pageSize,
    search,
    sortBy,
    sortDirection
  )

  const stats = useMemo(() => {
    const orgCount = new Set(
      teams.map((t) => t.organization_name).filter(Boolean)
    ).size

    const divisions = new Set(
      teams.map((t) => t.ranking_division_key).filter(Boolean)
    ).size

    return {
      totalTeams: teams.length,
      orgCount,
      divisions,
    }
  }, [teams])

  function handleSort(field) {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  function sortArrow(field) {
    if (sortBy !== field) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Topbar
        title="TEAMS"
        actions={
          <button
            onClick={refresh}
            style={{
              background: '#5cb800',
              color: '#04060a',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        }
      />

      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div style={cardStyle}>
            <div style={labelStyle}>Master Teams</div>
            <div style={valueStyle}>{stats.totalTeams}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Organizations</div>
            <div style={valueStyle}>{stats.orgCount}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Divisions</div>
            <div style={valueStyle}>{stats.divisions}</div>
          </div>
        </div>

        <div
          style={{
            background: '#080c12',
            border: '1px solid #1a2030',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid #1a2030',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search team, org, or division..."
              style={{
                width: 320,
                background: '#0e1320',
                border: '1px solid #1a2030',
                color: '#d8e0f0',
                borderRadius: 8,
                padding: '10px 12px',
              }}
            />

            <div style={{ color: '#6b7a99', fontSize: 13 }}>
              Showing {rows.length} of {total} teams
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>
              Loading teams...
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#ff9d7a' }}>
              {error.message}
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0f1a' }}>
                    {[
                      ['display_name', 'Team'],
                      ['organization_name', 'Organization'],
                      ['ranking_division_key', 'Division'],
                      ['source_count', 'Sources'],
                    ].map(([field, label]) => (
                      <th
                        key={field}
                        onClick={() => handleSort(field)}
                        style={{
                          textAlign: 'left',
                          padding: '14px 16px',
                          color: '#6b7a99',
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        {label} {sortArrow(field)}
                      </th>
                    ))}
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '14px 16px',
                        color: '#6b7a99',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((team) => (
                    <tr
                      key={team.master_team_id || team.display_name}
                      style={{
                        borderTop: '1px solid #121826',
                      }}
                    >
                      <td style={cellStyle}>
                        <div style={{ color: '#f0f4ff', fontWeight: 700 }}>
                          {team.display_name}
                        </div>
                      </td>

                      <td style={cellStyle}>
                        <div style={{ color: '#c0cce0' }}>
                          {team.organization_name || '—'}
                        </div>
                      </td>

                      <td style={cellStyle}>
                        <div style={{ color: '#8fa3bf' }}>
                          {team.ranking_division_key}
                        </div>
                      </td>

                      <td style={cellStyle}>
                        <div style={{ color: '#5cb800', fontWeight: 700 }}>
                          {team.source_count}
                        </div>
                      </td>

                      <td style={cellStyle}>
                        <Link
                          to={`/teams/${team.master_team_id}`}
                          style={{
                            background: '#1e88ff',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: 8,
                            textDecoration: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  borderTop: '1px solid #1a2030',
                }}
              >
                <div style={{ color: '#6b7a99', fontSize: 13 }}>
                  Page {page} of {totalPages || 1}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={buttonStyle}
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={buttonStyle}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const cardStyle = {
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 12,
  padding: 18,
}

const labelStyle = {
  color: '#6b7a99',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: 8,
}

const valueStyle = {
  color: '#f0f4ff',
  fontSize: 30,
  fontWeight: 700,
}

const cellStyle = {
  padding: '14px 16px',
}

const buttonStyle = {
  background: '#0e1320',
  border: '1px solid #1a2030',
  color: '#d8e0f0',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
}
