import { useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { useTeamsAdmin } from '../hooks/useTeamsAdmin'
import TeamMergeModal from '../components/teams/TeamMergeModal'
import TeamOrgModal from '../components/teams/TeamOrgModal'

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: accent, lineHeight: 1, letterSpacing: '0.5px' }}>
        {value}
      </div>
    </div>
  )
}

function badgeStyle(linked) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.4px',
    background: linked ? '#0d1a0a' : '#2a130f',
    color: linked ? '#5cb800' : '#ffb38a',
    border: linked ? '1px solid #1a3a0a' : '1px solid #4b251d',
  }
}

const PER_PAGE = 20

export default function Teams() {
  const { teams, loading, error, refresh } = useTeamsAdmin()

  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [division, setDivision] = useState('all')
  const [linkStatus, setLinkStatus] = useState('all')
  const [sortBy, setSortBy] = useState('source_team_name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedOrgTeam, setSelectedOrgTeam] = useState(null)

  const divisionOptions = useMemo(() => {
    const values = [...new Set((teams || []).map((t) => t.ranking_division_key).filter(Boolean))]
    return values.sort((a, b) => a.localeCompare(b))
  }, [teams])

  const filteredTeams = useMemo(() => {
    let rows = [...(teams || [])]

    if (source !== 'all') rows = rows.filter((row) => row.ranking_source === source)
    if (division !== 'all') rows = rows.filter((row) => row.ranking_division_key === division)

    if (linkStatus !== 'all') {
      rows = rows.filter((row) =>
        linkStatus === 'linked' ? !!row.master_team_id : !row.master_team_id
      )
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (row) =>
          row.source_team_name?.toLowerCase().includes(q) ||
          row.bt_master_teams?.display_name?.toLowerCase().includes(q) ||
          row.bt_master_teams?.bt_organizations?.org_name?.toLowerCase().includes(q)
      )
    }

    rows.sort((a, b) => {
      let av
      let bv

      if (sortBy === 'master_display_name') {
        av = a.bt_master_teams?.display_name || ''
        bv = b.bt_master_teams?.display_name || ''
      } else if (sortBy === 'organization_name') {
        av = a.bt_master_teams?.bt_organizations?.org_name || ''
        bv = b.bt_master_teams?.bt_organizations?.org_name || ''
      } else {
        av = a[sortBy] ?? ''
        bv = b[sortBy] ?? ''
      }

      const numericFields = ['master_team_id', 'source_team_id']

      if (numericFields.includes(sortBy)) {
        av = Number(av || 0)
        bv = Number(bv || 0)
      } else {
        av = String(av).toLowerCase()
        bv = String(bv).toLowerCase()
      }

      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [teams, source, division, linkStatus, search, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PER_PAGE))
  const pagedTeams = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filteredTeams.slice(start, start + PER_PAGE)
  }, [filteredTeams, page])

  const linkedCount = filteredTeams.filter((t) => !!t.master_team_id).length
  const unlinkedCount = filteredTeams.filter((t) => !t.master_team_id).length
  const uniqueMasters = new Set(filteredTeams.map((t) => t.master_team_id).filter(Boolean)).size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="TEAMS"
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
            Refresh Teams
          </button>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Source Teams" value={filteredTeams.length || 0} accent="#5cb800" />
          <StatCard label="Master Teams" value={uniqueMasters || 0} />
          <StatCard label="Linked" value={linkedCount || 0} accent="#d4a017" />
          <StatCard label="Unlinked" value={unlinkedCount || 0} accent="#ff9d7a" />
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0', letterSpacing: '0.3px' }}>
              TEAM DIRECTORY + MERGE TOOLS
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
              Search, sort, merge duplicate teams, and assign organizations
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderBottom: '1px solid #1a2030',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              gap: 12,
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              placeholder="Search team, master team, or org..."
              style={{
                width: '100%',
                background: '#0e1320',
                border: '1px solid #1a2030',
                color: '#d8e0f0',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                outline: 'none',
              }}
            />

            <select value={source} onChange={(e) => { setPage(1); setSource(e.target.value) }} style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              <option value="all">All Sources</option>
              <option value="Covert Hoops">Covert Hoops</option>
              <option value="Nothing But Net">Nothing But Net</option>
            </select>

            <select value={division} onChange={(e) => { setPage(1); setDivision(e.target.value) }} style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              <option value="all">All Divisions</option>
              {divisionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <select value={linkStatus} onChange={(e) => { setPage(1); setLinkStatus(e.target.value) }} style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              <option value="all">All Link Status</option>
              <option value="linked">Linked</option>
              <option value="unlinked">Unlinked</option>
            </select>

            <select value={sortBy} onChange={(e) => { setPage(1); setSortBy(e.target.value) }} style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
              <option value="source_team_name">Team Name</option>
              <option value="ranking_source">Source</option>
              <option value="ranking_division_key">Division</option>
              <option value="master_display_name">Master Team</option>
              <option value="organization_name">Organization</option>
              <option value="master_team_id">Master Team ID</option>
              <option value="source_team_id">Source Team ID</option>
            </select>

            <button
              onClick={() => {
                setPage(1)
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
              }}
              style={{
                background: '#0e1320',
                border: '1px solid #1a2030',
                color: '#d8e0f0',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {error ? (
            <div style={{ padding: 24, color: '#e05555', fontSize: 13 }}>
              Error: {error.message}
            </div>
          ) : loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>
              Loading teams...
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Source Team', 'Source', 'Division', 'Master Team', 'Organization', 'Master ID', 'Source Team ID', 'Status', 'Actions'].map((label) => (
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
                    {pagedTeams.map((team) => (
                      <tr key={team.id} style={{ borderBottom: '1px solid #0e1320' }}>
                        <td style={{ padding: '13px 14px', color: '#d8e0f0', fontWeight: 600 }}>{team.source_team_name}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{team.ranking_source}</td>
                        <td style={{ padding: '13px 14px', color: '#6b7a99', fontSize: 12 }}>{team.ranking_division_key || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{team.bt_master_teams?.display_name || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{team.bt_master_teams?.bt_organizations?.org_name || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{team.master_team_id || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{team.source_team_id}</td>
                        <td style={{ padding: '13px 14px' }}>
                          <span style={badgeStyle(!!team.master_team_id)}>
                            {team.master_team_id ? 'Linked' : 'Unlinked'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 14px', display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setSelectedTeam(team)}
                            style={{
                              background: '#1e88ff',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Merge
                          </button>
                          <button
                            onClick={() => setSelectedOrgTeam(team)}
                            style={{
                              background: '#5f51ff',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Org
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1a2030' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: 'transparent',
                    color: page === 1 ? '#3b4558' : '#d8e0f0',
                    border: '1px solid #1a2030',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>

                <div style={{ color: '#6b7a99', fontSize: 12 }}>
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    background: 'transparent',
                    color: page === totalPages ? '#3b4558' : '#d8e0f0',
                    border: '1px solid #1a2030',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <TeamMergeModal open={!!selectedTeam} team={selectedTeam} onClose={() => setSelectedTeam(null)} onMerged={refresh} />
      <TeamOrgModal open={!!selectedOrgTeam} team={selectedOrgTeam} onClose={() => setSelectedOrgTeam(null)} onAssigned={refresh} />
    </div>
  )
}
