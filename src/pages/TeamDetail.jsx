import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { useTeamDetail } from '../hooks/useTeamDetail'
import { supabase } from '../supabaseClient'

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: accent, lineHeight: 1, letterSpacing: '0.5px' }}>{value}</div>
    </div>
  )
}

const panelStyle = { background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }
const panelTitle = { color: '#f0f4ff', fontWeight: 700, marginBottom: 14 }
const labelStyle = { display: 'grid', gap: 6, color: '#c0cce0', fontSize: 12, fontWeight: 700 }
const inputStyle = { width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }
const tableCellStyle = { padding: '13px 14px', color: '#c0cce0' }

export default function TeamDetail() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { team, games, linkedSources, organizations, loading, saving, error, refresh, saveTeam } = useTeamDetail(teamId)
  const [form, setForm] = useState({
    display_name: '', ranking_division_key: '', age_group: '', gender: '',
    organization_id: '', graduating_year: '', contact_name: '', contact_email: '', contact_phone: '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!team) return
    setForm({
      display_name: team.display_name || '',
      ranking_division_key: team.ranking_division_key || '',
      age_group: team.age_group || '',
      gender: team.gender || '',
      organization_id: team.organization_id || '',
      graduating_year: team.graduating_year || '',
      contact_name: team.contact_name || '',
      contact_email: team.contact_email || '',
      contact_phone: team.contact_phone || '',
    })
  }, [team])

  const recentGames = useMemo(() => [...(games || [])].sort((a, b) => new Date(b.game_date) - new Date(a.game_date)), [games])

  async function handleSave() {
    await saveTeam({
      display_name: form.display_name || null,
      ranking_division_key: form.ranking_division_key || null,
      age_group: form.age_group || null,
      gender: form.gender || null,
      organization_id: form.organization_id ? Number(form.organization_id) : null,
      graduating_year: form.graduating_year ? Number(form.graduating_year) : null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
    })
    navigate('/teams')
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('bt_team_links').update({ master_team_id: null }).eq('master_team_id', teamId)
    await supabase.from('bt_master_teams').delete().eq('id', teamId)
    navigate('/teams')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="EDIT TEAM"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/teams')} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>← Back</button>
            <button onClick={() => setConfirmDelete(true)} style={{ background: '#2a0f0f', color: '#ff9d7a', border: '1px solid #4b1d1d', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            <button onClick={refresh} style={{ background: 'transparent', color: '#d8e0f0', border: '1px solid #1a2030', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
            <button onClick={handleSave} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save Team'}
            </button>
          </div>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {error ? (
          <div style={{ color: '#e05555', fontSize: 13 }}>Error: {error.message}</div>
        ) : loading ? (
          <div style={{ color: '#4a5568', fontSize: 13 }}>Loading team detail...</div>
        ) : !team ? (
          <div style={{ color: '#c0cce0', fontSize: 13 }}>Team not found.</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 34, color: '#f0f4ff', letterSpacing: '0.5px', lineHeight: 1 }}>{team.display_name}</div>
              <div style={{ marginTop: 8, color: '#6b7a99', fontSize: 13 }}>Master Team ID {team.id}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
              <StatCard label="Rank" value={`#${team.ranking?.rank || '—'}`} accent="#d4a017" />
              <StatCard label="Skill Level" value={team.ranking?.skill_level || '—'} accent="#5cb800" />
              <StatCard label="Record" value={`${team.ranking?.wins || 0}-${team.ranking?.losses || 0}`} />
              <StatCard label="Points" value={team.ranking?.ranking_points || 0} />
              <StatCard label="Gender" value={team.gender || '—'} />
              <StatCard label="Grad Year" value={team.graduating_year || '—'} />
            </div>

            <div style={{ ...panelStyle, marginBottom: 20, border: '2px solid #5cb800' }}>
              <div style={{ ...panelTitle, color: '#5cb800' }}>Edit Team</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Team Name<input value={form.display_name} onChange={(e) => setForm(p => ({ ...p, display_name: e.target.value }))} style={inputStyle} /></label>
                <label style={labelStyle}>Division Key<input value={form.ranking_division_key} onChange={(e) => setForm(p => ({ ...p, ranking_division_key: e.target.value }))} style={inputStyle} /></label>
                <label style={labelStyle}>Age Group<input value={form.age_group} onChange={(e) => setForm(p => ({ ...p, age_group: e.target.value }))} style={inputStyle} /></label>
                <label style={labelStyle}>Gender
                  <select value={form.gender} onChange={(e) => setForm(p => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                    <option value="">—</option>
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                  </select>
                </label>
                <label style={labelStyle}>Graduating Year<input value={form.graduating_year} onChange={(e) => setForm(p => ({ ...p, graduating_year: e.target.value }))} style={inputStyle} /></label>
                <label style={labelStyle}>Organization
                  <select value={form.organization_id} onChange={(e) => setForm(p => ({ ...p, organization_id: e.target.value }))} style={inputStyle}>
                    <option value="">No organization</option>
                    {organizations.map((org) => (<option key={org.id} value={org.id}>{org.org_name}</option>))}
                  </select>
                </label>
                <label style={labelStyle}>Contact Name<input value={form.contact_name} onChange={(e) => setForm(p => ({ ...p, contact_name: e.target.value }))} style={inputStyle} /></label>
                <label style={labelStyle}>Contact Email<input value={form.contact_email} onChange={(e) => setForm(p => ({ ...p, contact_email: e.target.value }))} style={inputStyle} /></label>
                <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Contact Phone<input value={form.contact_phone} onChange={(e) => setForm(p => ({ ...p, contact_phone: e.target.value }))} style={inputStyle} /></label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={panelStyle}>
                <div style={panelTitle}>Linked Sources</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {linkedSources.map((source) => (
                    <div key={source.id} style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 12 }}>
                      <div style={{ color: '#f0f4ff', fontWeight: 700 }}>{source.source_team_name}</div>
                      <div style={{ color: '#6b7a99', fontSize: 12, marginTop: 4 }}>{source.ranking_source} • {source.ranking_division_key} • Source Team ID {source.source_team_id}</div>
                    </div>
                  ))}
                  {!linkedSources.length && <div style={{ color: '#6b7a99', fontSize: 12 }}>No linked sources found.</div>}
                </div>
              </div>

              <div style={panelStyle}>
                <div style={panelTitle}>Recent Games</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0a0f1a' }}>
                        {['Date', 'Source', 'Division', 'Score'].map((label) => (
                          <th key={label} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentGames.map((game) => (
                        <tr key={`${game.game_id}-${game.ranking_source}`} style={{ borderBottom: '1px solid #0e1320' }}>
                          <td style={tableCellStyle}>{game.game_date ? new Date(game.game_date).toLocaleDateString() : '—'}</td>
                          <td style={tableCellStyle}>{game.ranking_source}</td>
                          <td style={tableCellStyle}>{game.ranking_division_key}</td>
                          <td style={tableCellStyle}>{game.score_home} - {game.score_away}</td>
                        </tr>
                      ))}
                      {!recentGames.length && (
                        <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#4a5568' }}>No recent games found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #3a0a0a', borderRadius: 14, padding: 28, width: 400 }}>
            <h3 style={{ margin: '0 0 12px', color: '#ff9d7a' }}>Delete Team?</h3>
            <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px' }}>
              This will permanently delete <strong style={{ color: '#d8e0f0' }}>{team?.display_name}</strong> and unlink all source teams. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
