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
      {/* Age-Up Modal */}
      {showAgeUp && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:14, padding:28, width:620, maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ fontFamily:'Anton, sans-serif', fontSize:20, color:'#f0f4ff', marginBottom:4 }}>📅 AGE-UP PREVIEW</div>
            <div style={{ fontSize:12, color:'#4a5568', marginBottom:16 }}>{ageUpPreview.length} teams will be updated on September 1 season reset.</div>
            <div style={{ flex:1, overflowY:'auto', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#0a0f1a' }}>
                    {['TEAM','AGE','DIVISION'].map(h => <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#4a5568', fontWeight:700 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ageUpPreview.map(t => (
                    <tr key={t.id} style={{ borderBottom:'1px solid #0d1320' }}>
                      <td style={{ padding:'8px 12px', color:'#c0cce0' }}>{t.name}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ color:'#ef4444' }}>{t.oldAge}</span>
                        <span style={{ color:'#4a5568', margin:'0 6px' }}>→</span>
                        <span style={{ color:'#5cb800' }}>{t.newAge}</span>
                      </td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ color:'#ef4444', fontSize:11 }}>{t.oldDiv}</span>
                        <span style={{ color:'#4a5568', margin:'0 6px' }}>→</span>
                        <span style={{ color:'#5cb800', fontSize:11 }}>{t.newDiv}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setShowAgeUp(false)} style={{ background:'transparent', color:'#6b7a99', border:'1px solid #1a2030', padding:'8px 16px', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={handleAgeUp} disabled={agingUp} style={{ background:'#d4a017', color:'#04060a', border:'none', padding:'8px 20px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {agingUp ? 'Updating...' : 'Age Up ' + ageUpPreview.length + ' Teams'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  { value: 'source_asc', label: 'Team Name A→Z' },
  { value: 'source_desc', label: 'Team Name Z→A' },
  { value: 'master_asc', label: 'Master Team A→Z' },
  { value: 'master_desc', label: 'Master Team Z→A' },
  { value: 'division_asc', label: 'Division A→Z' },
  { value: 'org_asc', label: 'Org A→Z' },
  { value: 'status_linked', label: 'Linked First' },
  { value: 'status_unlinked', label: 'Unlinked First' },
]

const PER_PAGE = 25

export default function Teams() {
  const navigate = useNavigate()
  const { teams, loading, error, refresh } = useTeamsAdmin()

  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [division, setDivision] = useState('all')
  const [linkStatus, setLinkStatus] = useState('all')
  const [sortBy, setSortBy] = useState('source_asc')
  const [page, setPage] = useState(1)
  const [mergeTeam, setMergeTeam] = useState(null)
  const [orgTeam, setOrgTeam] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [orgs, setOrgs] = useState([])
  const [createForm, setCreateForm] = useState({ display_name: '', ranking_division_key: '', age_group: '', gender: '', organization_id: '', contact_name: '', contact_email: '', contact_phone: '' })
  const [creating, setCreating] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkOrg, setBulkOrg] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [showAgeUp, setShowAgeUp] = useState(false)
  const [agingUp, setAgingUp] = useState(false)
  const [ageUpPreview, setAgeUpPreview] = useState([])
  const [createError, setCreateError] = useState('')

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
        row.bt_master_teams?.display_name?.toLowerCase().includes(q) ||
        row.bt_master_teams?.bt_organizations?.org_name?.toLowerCase().includes(q)
      )
    }

    rows.sort((a, b) => {
      const aSource = a.source_team_name || ''
      const bSource = b.source_team_name || ''
      const aMaster = a.bt_master_teams?.display_name || ''
      const bMaster = b.bt_master_teams?.display_name || ''
      const aOrg = a.bt_master_teams?.bt_organizations?.org_name || ''
      const bOrg = b.bt_master_teams?.bt_organizations?.org_name || ''

      switch (sortBy) {
        case 'source_asc': return aSource.localeCompare(bSource)
        case 'source_desc': return bSource.localeCompare(aSource)
        case 'master_asc': return aMaster.localeCompare(bMaster)
        case 'master_desc': return bMaster.localeCompare(aMaster)
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
    return filteredTeams.slice(start, start + PER_PAGE)
  }, [filteredTeams, page])

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PER_PAGE))
  const linkedCount = filteredTeams.filter((t) => !!t.master_team_id).length
  const unlinkedCount = filteredTeams.filter((t) => !t.master_team_id).length
  const uniqueMasters = new Set(filteredTeams.map((t) => t.master_team_id).filter(Boolean)).size

  function goPrev() { setPage((p) => Math.max(1, p - 1)) }
  function goNext() { setPage((p) => Math.min(totalPages, p + 1)) }
  function resetPageAndSet(setter, value) { setPage(1); setter(value) }

  async function loadOrgs() {
    const { data } = await supabase.from('bt_organizations').select('id, org_name').order('org_name')
    setOrgs(data || [])
  }

  async function handleCreateTeam() {
    if (!createForm.display_name.trim()) { setCreateError('Team name is required'); return }
    setCreating(true)
    setCreateError('')
    const { error } = await supabase.from('bt_master_teams').insert({
      display_name: createForm.display_name.trim(),
      ranking_division_key: createForm.ranking_division_key.trim() || null,
      age_group: createForm.age_group.trim() || null,
      gender: createForm.gender || null,
      organization_id: createForm.organization_id ? Number(createForm.organization_id) : null,
      contact_name: createForm.contact_name.trim() || null,
      contact_email: createForm.contact_email.trim() || null,
      contact_phone: createForm.contact_phone.trim() || null,
    })
    if (error) { setCreateError(error.message); setCreating(false); return }
    setCreating(false)
    setShowCreate(false)
    setCreateForm({ display_name: '', ranking_division_key: '', age_group: '', gender: '', organization_id: '', contact_name: '', contact_email: '', contact_phone: '' })
    refresh()
  }

  async function handleDeleteTeam(team) {
    setDeleting(true)
    await supabase.from('bt_team_links').delete().eq('id', team.id)
    setDeleting(false)
    setDeleteConfirm(null)
    refresh()
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === pagedTeams.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pagedTeams.map(t => t.id)))
    }
  }

  async function handleBulkAssignOrg() {
    if (!bulkOrg || selectedIds.size === 0) return
    setBulkSaving(true)
    const masterIds = [...new Set(
      [...selectedIds].map(id => pagedTeams.find(t => t.id === id)?.master_team_id).filter(Boolean)
    )]
    await Promise.all(masterIds.map(mid =>
      supabase.from('bt_master_teams').update({ organization_id: Number(bulkOrg) }).eq('id', mid)
    ))
    setBulkSaving(false)
    setSelectedIds(new Set())
    setBulkOrg('')
    refresh()
  }

  const AGE_MAP = {
    '6u':'7u','7u':'8u','8u':'9u','9u':'10u','10u':'11u','11u':'12u',
    '12u':'13u','13u':'14u','14u':'15u','15u':'16u','16u':'17u','17u':'18u',
  }
  const DIV_MAP = {
    '6u_boys':'7u_boys','7u_boys':'8u_boys','8u_boys':'9u_boys','9u_boys':'10u_boys',
    '10u_boys':'11u_boys','11u_boys':'12u_boys','12u_boys':'13u_boys','13u_boys':'14u_boys',
    '14u_boys':'15u_boys','15u_boys':'16u_boys','16u_boys':'17u_boys','17u_boys':'18u_boys',
    '6u_girls':'7u_girls','7u_girls':'8u_girls','8u_girls':'9u_girls','9u_girls':'10u_girls',
    '10u_girls':'11u_girls','11u_girls':'12u_girls','12u_girls':'13u_girls','13u_girls':'14u_girls',
    '14u_girls':'15u_girls','15u_girls':'16u_girls','16u_girls':'17u_girls','17u_girls':'18u_girls',
    '10_11u_boys':'11_12u_boys','11_12u_boys':'12_13u_boys','12_13u_boys':'13_14u_boys',
  }

  async function previewAgeUp() {
    const { data } = await supabase.from('bt_master_teams')
      .select('id, display_name, age_group, ranking_division_key')
      .not('age_group', 'is', null)
    const preview = (data || [])
      .map(t => ({
        id: t.id, name: t.display_name,
        oldAge: t.age_group, newAge: AGE_MAP[t.age_group] || t.age_group,
        oldDiv: t.ranking_division_key,
        newDiv: DIV_MAP[t.ranking_division_key] || t.ranking_division_key,
      }))
      .filter(t => t.newAge !== t.oldAge)
    setAgeUpPreview(preview)
    setShowAgeUp(true)
  }

  async function handleAgeUp() {
    if (!window.confirm('Age up ALL ' + ageUpPreview.length + ' teams by 1 year? This cannot be undone.')) return
    setAgingUp(true)
    await Promise.all(ageUpPreview.map(t =>
      supabase.from('bt_master_teams').update({ age_group: t.newAge, ranking_division_key: t.newDiv }).eq('id', t.id)
    ))
    setAgingUp(false)
    setShowAgeUp(false)
    refresh()
    alert('Done! ' + ageUpPreview.length + ' teams aged up.')
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={previewAgeUp} style={{ background:'rgba(234,179,8,0.1)', color:'#d4a017', border:'1px solid rgba(234,179,8,0.3)', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              📅 Age-Up
            </button>
            <button onClick={() => { setShowCreate(true); setCreateError(''); loadOrgs() }} style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Create Team
            </button>
            <button onClick={refresh} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Refresh Teams
            </button>
          </div>
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
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>Source team names shown · Master team listed as reference</div>
          </div>

          <div style={{ padding: 18, borderBottom: '1px solid #1a2030', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            <input type="text" value={search} onChange={(e) => resetPageAndSet(setSearch, e.target.value)} placeholder="Search team, master team, or org..." style={inputStyle} />
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
                      {['Team Name', 'Source', 'Division', 'Org', 'Master Team', 'Master ID', 'Source ID', 'Status', 'Actions'].map((label) => (
                        <th key={label} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTeams.map((team) => (
                      <tr key={team.id} style={{ borderBottom: '1px solid #0e1320' }}>
                        {/* Primary: source team name */}
                        <td style={{ padding: '13px 14px', color: '#f0f4ff', fontWeight: 700 }}>
                          {team.bt_master_teams?.display_name || team.source_team_name || '—'}
                        </td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>{team.ranking_source}</td>
                        <td style={{ padding: '13px 14px', color: '#6b7a99', fontSize: 12 }}>{team.ranking_division_key || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>
                          {team.bt_master_teams?.bt_organizations?.org_name || <span style={{ color: '#4a5568' }}>No org</span>}
                        </td>
                        {/* Master team as reference */}
                        <td style={{ padding: '13px 14px', fontSize: 12 }}>
                          {team.bt_master_teams?.display_name
                            ? <span style={{ color: '#5cb800' }}>{team.bt_master_teams.display_name}</span>
                            : <span style={{ color: '#4a5568' }}>No master</span>
                          }
                        </td>
                        <td style={{ padding: '13px 14px', color: '#4a5568', fontSize: 12 }}>{team.master_team_id || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#4a5568', fontSize: 12 }}>{team.source_team_id}</td>
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

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 560 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#f0f4ff' }}>Create New Team</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'display_name', label: 'Team Name *', type: 'input' },
                { key: 'ranking_division_key', label: 'Division Key', type: 'input' },
                { key: 'age_group', label: 'Age Group', type: 'input' },
                { key: 'contact_name', label: 'Contact Name', type: 'input' },
                { key: 'contact_email', label: 'Contact Email', type: 'input' },
                { key: 'contact_phone', label: 'Contact Phone', type: 'input' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={createForm[key]} onChange={(e) => setCreateForm(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Gender</label>
                <select value={createForm.gender} onChange={(e) => setCreateForm(p => ({ ...p, gender: e.target.value }))}
                  style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="">—</option>
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Organization</label>
                <select value={createForm.organization_id} onChange={(e) => setCreateForm(p => ({ ...p, organization_id: e.target.value }))}
                  style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="">No organization</option>
                  {orgs.map(org => (<option key={org.id} value={org.id}>{org.org_name}</option>))}
                </select>
              </div>
            </div>
            {createError && <div style={{ marginTop: 12, padding: '10px 14px', background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, fontSize: 12, color: '#e05555' }}>{createError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleCreateTeam} disabled={creating} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {creating ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

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
      {/* Age-Up Modal */}
      {showAgeUp && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:14, padding:28, width:620, maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <div style={{ fontFamily:'Anton, sans-serif', fontSize:20, color:'#f0f4ff', marginBottom:4 }}>📅 AGE-UP PREVIEW</div>
            <div style={{ fontSize:12, color:'#4a5568', marginBottom:16 }}>{ageUpPreview.length} teams will be updated on September 1 season reset.</div>
            <div style={{ flex:1, overflowY:'auto', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#0a0f1a' }}>
                    {['TEAM','AGE','DIVISION'].map(h => <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#4a5568', fontWeight:700 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ageUpPreview.map(t => (
                    <tr key={t.id} style={{ borderBottom:'1px solid #0d1320' }}>
                      <td style={{ padding:'8px 12px', color:'#c0cce0' }}>{t.name}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ color:'#ef4444' }}>{t.oldAge}</span>
                        <span style={{ color:'#4a5568', margin:'0 6px' }}>→</span>
                        <span style={{ color:'#5cb800' }}>{t.newAge}</span>
                      </td>
                      <td style={{ padding:'8px 12px' }}>
                        <span style={{ color:'#ef4444', fontSize:11 }}>{t.oldDiv}</span>
                        <span style={{ color:'#4a5568', margin:'0 6px' }}>→</span>
                        <span style={{ color:'#5cb800', fontSize:11 }}>{t.newDiv}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setShowAgeUp(false)} style={{ background:'transparent', color:'#6b7a99', border:'1px solid #1a2030', padding:'8px 16px', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={handleAgeUp} disabled={agingUp} style={{ background:'#d4a017', color:'#04060a', border:'none', padding:'8px 20px', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                {agingUp ? 'Updating...' : 'Age Up ' + ageUpPreview.length + ' Teams'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
