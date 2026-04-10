import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { useTeamsAdmin } from '../hooks/useTeamsAdmin'
import TeamMergeModal from '../components/teams/TeamMergeModal'
import TeamOrgModal from '../components/teams/TeamOrgModal'
import { supabase } from '../supabaseClient'

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: accent, lineHeight: 1, letterSpacing: '0.5px' }}>{value}</div>
    </div>
  )
}

function badgeStyle(linked) {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.4px',
    background: linked ? '#0d1a0a' : '#2a130f',
    color: linked ? '#5cb800' : '#ffb38a',
    border: linked ? '1px solid #1a3a0a' : '1px solid #4b251d',
  }
}

const btnStyle = (color) => ({
  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', border: 'none',
  background: color === 'green' ? '#5cb800' : color === 'orange' ? '#d4630a' : color === 'red' ? '#8b1a1a' : '#1a2a4a',
  color: color === 'green' ? '#04060a' : '#fff',
})

const SORT_OPTIONS = [
  { value: 'master_asc', label: 'Master Team A→Z' },
  { value: 'master_desc', label: 'Master Team Z→A' },
  { value: 'source_asc', label: 'Source Team A→Z' },
  { value: 'source_desc', label: 'Source Team Z→A' },
  { value: 'division_asc', label: 'Division A→Z' },
  { value: 'org_asc', label: 'Org A→Z' },
  { value: 'status_linked', label: 'Linked First' },
  { value: 'status_unlinked', label: 'Unlinked First' },
]

const PER_PAGE = 20

export default function Teams() {
  const navigate = useNavigate()
  const { teams, loading, error, refresh } = useTeamsAdmin()

  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [division, setDivision] = useState('all')
  const [linkStatus, setLinkStatus] = useState('all')
  const [sortBy, setSortBy] = useState('master_asc')
  const [page, setPage] = useState(1)
  const [mergeTeam, setMergeTeam] = useState(null)
  const [orgTeam, setOrgTeam] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const divisionOptions = useMemo(() => {
    const values = [...new Set((teams || []).map((t) => t.ranking_division_key).filter(Boolean))]
    return values.sort((a, b) => a.localeCompare(b))
  }, [teams])

  const filteredTeams = useMemo(() => {
    let rows = [...(teams || [])]
    if (source !== 'all') rows = rows.filter((row) => row.ranking_source === source)
    if (division !== 'all') rows = rows.filter((row) => row.ranking_division_key === division)
    if (linkStatus !== 'all') rows = rows.filter((row) => linkStatus === 'linked' ? !!row.master_team_id : !row.master_team_id)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((row) =>
        row.source_team_name?.toLowerCase().includes(q) ||
        row.bt_master_teams?.display_name?.toLowerCase().includes(q)
      )
    }

    rows.sort((a, b) => {
      const aMaster = a.bt_master_teams?.display_name || ''
      const bMaster = b.bt_master_teams?.display_name || ''
      const aOrg = a.bt_master_teams?.bt_organizations?.org_name || ''
      const bOrg = b.bt_master_teams?.bt_organizations?.org_name || ''

      switch (sortBy) {
        case 'master_asc': {
          const mc = aMaster.localeCompare(bMaster)
          if (mc !== 0) return mc
          return (a.ranking_division_key || '').localeCompare(b.ranking_division_key || '')
        }
        case 'master_desc': return bMaster.localeCompare(aMaster)
        case 'source_asc': return (a.source_team_name || '').localeCompare(b.source_team_name || '')
        case 'source_desc': return (b.source_team_name || '').localeCompare(a.source_team_name || '')
        case 'division_asc': return (a.ranking_division_key || '').localeCompare(b.ranking_division_key || '')
        case 'org_asc': return aOrg.localeCompare(bOrg)
        case 'status_linked': return (b.master_team_id ? 1 : 0) - (a.master_team_id ? 1 : 0)
        case 'status_unlinked': return (a.master_team_id ? 1 : 0) - (b.master_team_id ? 1 : 0)
        default: return 0
      }
    })

    return rows
  }, [teams, source, division, linkStatus, search, sortBy])

  const pagedTeams = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    const slice = filteredTeams.slice(start, start + PER_PAGE)
    const seen = new Set()
    return slice.map((team) => {
      const key = team.master_team_id ? `m-${team.master_team_id}` : `s-${team.id}`
      const isFirst = !seen.has(key)
      seen.add(key)
      return { ...team, _isFirstOfGroup: isFirst }
    })
  }, [filteredTeams, page])

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PER_PAGE))
  const linkedCount = filteredTeams.filter((t) => !!t.master_team_id).length
  const unlinkedCount = filteredTeams.filter((t) => !t.master_team_id).length
  const uniqueMasters = new Set(filteredTeams.map((t) => t.master_team_id).filter(Boolean)).size

  function goPrev() { setPage((p) => Math.max(1, p - 1)) }
  function goNext() { setPage((p) => Math.min(totalPages, p + 1)) }
  function resetPageAndSet(setter, value) { setPage(1); setter(value) }

  async function handleDeleteTeam(team) {
    setDeleting(true)
    if (team.master_team_id) {
      // Delete the source link row
      await supabase.from('bt_team_links').delete().eq('id', team.id)
    }
    setDeleting(false)
    setDeleteConfirm(null)
    refresh()
  }

  const inputStyle = {
    width: '100%', background: '#0e1320', border: '1px solid #1a2030',
    color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="TEAMS"
        actions={
          <button onClick={refresh} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
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
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0', letterSpacing: '0.3px' }}>TEAM DIRECTORY + MASTER MAPPING</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>Grouped by master team — source teams listed below each master</div>
          </div>

          <div style={{ padding: 18, borderBottom: '1px solid #1a2030', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <input type="text" value={search} onChange={(e) => resetPageAndSet(setSearch, e.target.value)} placeholder="Search team name or master team..." style={inputStyle} />
            <select value={source} onChange={(e) => resetPageAndSet(setSource, e.target.value)} style={inputStyle}>
              <option value="all">All Sources</option>
              <option value="Covert Hoops">Covert Hoops</option>
              <option value="Nothing But Net">Nothing But Net</option>
            </select>
            <select value={division} onChange={(e) => resetPageAndSet(setDivision, e.target.value)} style={inputStyle}>
              <option value="all">All Divisions</option>
              {divisionOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
            </select>
            <select value={linkStatus} onChange={(e) => resetPageAndSet(setLinkStatus, e.target.value)} style={inputStyle}>
              <option value="all">All Link Status</option>
              <option value="linked">Linked</option>
              <option value="unlinked">Unlinked</option>
            </select>
            <select value={sortBy} onChange={(e) => resetPageAndSet(setSortBy, e.target.value)} style={{ ...inputStyle, color: '#5cb800' }}>
              {SORT_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          {error ? (
            <div style={{ padding: 24, color: '#e05555', fontSize: 13 }}>Error: {error.message}</div>
          ) : loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>Loading teams...</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Master Team', 'Source Team', 'Source', 'Division', 'Org', 'Master ID', 'Source ID', 'Status', 'Actions'].map((label) => (
                        <th key={label} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTeams.map((team) => (
                      <tr key={team.id} style={{
                        borderBottom: '1px solid #0e1320',
                        borderTop: team._isFirstOfGroup && team.master_team_id ? '1px solid #1a2030' : 'none',
                      }}>
                        <td style={{ padding: '13px 14px', fontWeight: 700, fontSize: 13, color: '#5cb800' }}>
                          {team._isFirstOfGroup ? (team.bt_master_teams?.display_name || '—') : ''}
                        </td>
                        <td style={{ padding: '13px 14px', paddingLeft: team.master_team_id ? 28 : 14, color: '#d8e0f0', fontWeight: 600 }}>
                          {team.source_team_name}
                        </td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>{team.ranking_source}</td>
                        <td style={{ padding: '13px 14px', color: '#6b7a99', fontSize: 12 }}>{team.ranking_division_key || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>
                          {team.bt_master_teams?.bt_organizations?.org_name || <span style={{ color: '#4a5568' }}>No org</span>}
                        </td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>{team.master_team_id || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>{team.source_team_id}</td>
                        <td style={{ padding: '13px 14px' }}>
                          <span style={badgeStyle(!!team.master_team_id)}>
                            {team.master_team_id ? 'Linked' : 'Unlinked'}
                          </span>
                        </td>
                        <td style={{ padding: '13px 14px' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button style={btnStyle('blue')} onClick={() => navigate(`/teams/${team.master_team_id || team.id}`)}>View</button>
                            <button style={btnStyle('orange')} onClick={() => setOrgTeam(team)}>Org</button>
                            <button style={btnStyle('green')} onClick={() => setMergeTeam(team)}>Merge</button>
                            <button style={btnStyle('red')} onClick={() => setDeleteConfirm(team)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1a2030' }}>
                <button onClick={goPrev} disabled={page === 1} style={{ background: 'transparent', color: page === 1 ? '#3b4558' : '#d8e0f0', border: '1px solid #1a2030', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                <div style={{ color: '#6b7a99', fontSize: 12 }}>Page {page} of {totalPages} · {filteredTeams.length} teams</div>
                <button onClick={goNext} disabled={page === totalPages} style={{ background: 'transparent', color: page === totalPages ? '#3b4558' : '#d8e0f0', border: '1px solid #1a2030', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
              </div>
            </>
          )}
        </div>
      </div>

      <TeamMergeModal
        open={!!mergeTeam}
        team={mergeTeam}
        onClose={() => setMergeTeam(null)}
        onMerged={() => { setMergeTeam(null); refresh() }}
      />

      <TeamOrgModal
        open={!!orgTeam}
        team={orgTeam}
        onClose={() => setOrgTeam(null)}
        onAssigned={() => { setOrgTeam(null); refresh() }}
      />

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #3a0a0a', borderRadius: 14, padding: 28, width: 400 }}>
            <h3 style={{ margin: '0 0 12px', color: '#ff9d7a' }}>Remove Source Team?</h3>
            <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px' }}>
              This will remove <strong style={{ color: '#d8e0f0' }}>{deleteConfirm.source_team_name}</strong> from the team directory. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={() => handleDeleteTeam(deleteConfirm)} disabled={deleting} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
