import { useEffect, useMemo, useRef, useState } from 'react'
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

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'G/F', 'F/C']
const blankPlayer = { first_name: '', last_name: '', jersey_number: '', position: '', grad_year: '', height_inches: '', gender: 'M' }
const blankRole = { email: '', role: 'coach' }

export default function TeamDetail() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const {
    team, games, linkedSources, organizations, players, roles,
    loading, saving, error, refresh, saveTeam, addPlayer, removePlayer, addRole, removeRole,
  } = useTeamDetail(teamId)

  const [form, setForm] = useState({
    display_name: '', ranking_division_key: '', age_group: '', gender: '',
    organization_id: '', graduating_year: '', contact_name: '', contact_email: '', contact_phone: '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Roster state
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [playerForm, setPlayerForm] = useState(blankPlayer)
  const [savingPlayer, setSavingPlayer] = useState(false)
  const [playerError, setPlayerError] = useState(null)

  // Roles state
  const [showAddRole, setShowAddRole] = useState(false)
  const [roleForm, setRoleForm] = useState(blankRole)
  const [savingRole, setSavingRole] = useState(false)

  // Verification upload state
  const [uploadingPlayer, setUploadingPlayer] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const pendingUploadId = useRef(null)
  const fileInputRef = useRef(null)

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
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('bt_team_links').update({ master_team_id: null }).eq('master_team_id', teamId)
    await supabase.from('bt_master_teams').delete().eq('id', teamId)
    navigate('/teams')
  }

  async function handleAddPlayer(e) {
    e.preventDefault()
    if (!playerForm.first_name || !playerForm.last_name) return
    setSavingPlayer(true)
    setPlayerError(null)
    try {
      await addPlayer(playerForm)
      setPlayerForm(blankPlayer)
      setShowAddPlayer(false)
    } catch (err) {
      setPlayerError(err.message)
    } finally {
      setSavingPlayer(false)
    }
  }

  async function handleAddRole(e) {
    e.preventDefault()
    if (!roleForm.email) return
    setSavingRole(true)
    try {
      await addRole(roleForm.email, roleForm.role)
      setRoleForm(blankRole)
      setShowAddRole(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingRole(false)
    }
  }

  function handleUploadClick(playerId) {
    pendingUploadId.current = playerId
    setUploadError(null)
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !pendingUploadId.current) return

    const playerId = pendingUploadId.current
    pendingUploadId.current = null
    setUploadingPlayer(playerId)
    setUploadError(null)

    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `${playerId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('verification-docs')
        .upload(path, file, { contentType: file.type })
      if (upErr) throw upErr

      // Mark as parsing while AI runs
      await supabase.from('players').update({
        verification_status: 'parsing',
        verification_doc_url: path,
        verification_doc_type: ext === 'pdf' ? 'pdf' : 'image',
      }).eq('id', playerId)

      // Call edge function — needs ANTHROPIC_API_KEY set in Supabase secrets
      const { data: parsed, error: fnErr } = await supabase.functions.invoke('parse-verification-doc', {
        body: { filePath: path, docType: 'verification document' },
      })

      if (fnErr) throw new Error(fnErr.message || 'Edge function error')

      await supabase.from('players').update({
        verification_status: 'pending',
        verified_name:   parsed?.name   || null,
        verified_dob:    parsed?.dob    || null,
        verified_grade:  parsed?.grade  || null,
        verified_gender: parsed?.gender || null,
        ai_confidence:   parsed?.confidence || null,
      }).eq('id', playerId)

      refresh()
    } catch (err) {
      setUploadError(err.message)
      // Reset status if parse failed
      await supabase.from('players').update({ verification_status: 'unverified' }).eq('id', playerId)
    } finally {
      setUploadingPlayer(null)
    }
  }

  function fmtHeight(inches) {
    if (!inches) return '—'
    return `${Math.floor(inches / 12)}'${inches % 12}"`
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
            {saveSuccess && <span style={{ color: '#5cb800', fontSize: 12, fontWeight: 700 }}>✓ Saved!</span>}
            {error && <span style={{ color: '#ef4444', fontSize: 12 }}>{error.message}</span>}
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

            {/* ── Roster ──────────────────────────────────────────────── */}
            <div style={{ ...panelStyle, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ ...panelTitle, marginBottom: 0 }}>
                  Roster
                  <span style={{ marginLeft: 10, background: '#0e1a08', color: '#5cb800', border: '1px solid #2a4010', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {players.length} players
                  </span>
                </div>
                <button
                  onClick={() => { setShowAddPlayer(v => !v); setPlayerError(null) }}
                  style={{ background: '#0e1a08', color: '#5cb800', border: '1px solid #2a4010', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {showAddPlayer ? 'Cancel' : '+ Add Player'}
                </button>
              </div>

              {showAddPlayer && (
                <form onSubmit={handleAddPlayer} style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 80px 80px 80px', gap: 10, marginBottom: 10 }}>
                    <label style={labelStyle}>First Name<input required value={playerForm.first_name} onChange={e => setPlayerForm(p => ({ ...p, first_name: e.target.value }))} style={inputStyle} /></label>
                    <label style={labelStyle}>Last Name<input required value={playerForm.last_name} onChange={e => setPlayerForm(p => ({ ...p, last_name: e.target.value }))} style={inputStyle} /></label>
                    <label style={labelStyle}>#<input value={playerForm.jersey_number} onChange={e => setPlayerForm(p => ({ ...p, jersey_number: e.target.value }))} style={inputStyle} type="number" min="0" max="99" /></label>
                    <label style={labelStyle}>Position
                      <select value={playerForm.position} onChange={e => setPlayerForm(p => ({ ...p, position: e.target.value }))} style={inputStyle}>
                        <option value="">—</option>
                        {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                    </label>
                    <label style={labelStyle}>Grad Year<input value={playerForm.grad_year} onChange={e => setPlayerForm(p => ({ ...p, grad_year: e.target.value }))} style={inputStyle} type="number" min="2024" max="2035" /></label>
                    <label style={labelStyle}>Height (in)<input value={playerForm.height_inches} onChange={e => setPlayerForm(p => ({ ...p, height_inches: e.target.value }))} style={inputStyle} type="number" min="48" max="96" /></label>
                    <label style={labelStyle}>Gender
                      <select value={playerForm.gender} onChange={e => setPlayerForm(p => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </label>
                  </div>
                  {playerError && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{playerError}</div>}
                  <button type="submit" disabled={savingPlayer} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {savingPlayer ? 'Adding…' : 'Add to Roster'}
                  </button>
                </form>
              )}

              {players.length === 0 ? (
                <div style={{ color: '#4a5568', fontSize: 13, padding: '16px 0' }}>No players on roster. Add a player above to get started.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['#', 'Name', 'Pos', 'Grad', 'Ht', 'ID Check', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #0e1320' }}>
                        <td style={{ ...tableCellStyle, color: '#5cb800', fontWeight: 700, width: 40 }}>{p.jersey_number ?? '—'}</td>
                        <td style={{ ...tableCellStyle, fontWeight: 600, color: '#f0f4ff' }}>{p.first_name} {p.last_name}</td>
                        <td style={tableCellStyle}>{p.position || '—'}</td>
                        <td style={tableCellStyle}>{p.grad_year || '—'}</td>
                        <td style={tableCellStyle}>{fmtHeight(p.height_inches)}</td>
                        <td style={{ ...tableCellStyle, minWidth: 110 }}>
                          {uploadingPlayer === p.id ? (
                            <span style={{ fontSize: 11, color: '#4a9eff' }}>Scanning…</span>
                          ) : p.verification_status === 'verified' ? (
                            <span style={{ fontSize: 11, color: '#5cb800', fontWeight: 700 }}>✓ Verified</span>
                          ) : p.verification_status === 'pending' ? (
                            <span style={{ fontSize: 11, color: '#d4a017' }}>Pending Review</span>
                          ) : p.verification_status === 'parsing' ? (
                            <span style={{ fontSize: 11, color: '#4a9eff' }}>Processing…</span>
                          ) : p.verification_status === 'rejected' ? (
                            <button
                              onClick={() => handleUploadClick(p.id)}
                              style={{ background: 'transparent', color: '#e05555', border: '1px solid #3a1010', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                            >Re-upload</button>
                          ) : (
                            <button
                              onClick={() => handleUploadClick(p.id)}
                              style={{ background: '#0e1320', color: '#8a9ab8', border: '1px solid #1a2030', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                            >Upload ID</button>
                          )}
                        </td>
                        <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                          <button
                            onClick={() => removePlayer(p.linkId)}
                            style={{ background: 'transparent', color: '#4a5568', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4 }}
                            title="Remove from team"
                          >×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Hidden file input for verification doc uploads */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
            {uploadError && (
              <div style={{ marginBottom: 14, padding: '10px 14px', background: '#1a0808', border: '1px solid #3a1010', borderRadius: 8, fontSize: 12, color: '#e05555' }}>
                Upload failed: {uploadError}
              </div>
            )}

            {/* ── Team Roles (Coaches / Scorers) ──────────────────────── */}
            <div style={{ ...panelStyle, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ ...panelTitle, marginBottom: 0 }}>Team Roles</div>
                <button
                  onClick={() => setShowAddRole(v => !v)}
                  style={{ background: '#0e1a08', color: '#5cb800', border: '1px solid #2a4010', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {showAddRole ? 'Cancel' : '+ Invite'}
                </button>
              </div>

              {showAddRole && (
                <form onSubmit={handleAddRole} style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 10, alignItems: 'end' }}>
                    <label style={labelStyle}>Email
                      <input required type="email" value={roleForm.email} onChange={e => setRoleForm(p => ({ ...p, email: e.target.value }))} placeholder="coach@example.com" style={inputStyle} />
                    </label>
                    <label style={labelStyle}>Role
                      <select value={roleForm.role} onChange={e => setRoleForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                        <option value="coach">Coach</option>
                        <option value="scorer">Scorer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <button type="submit" disabled={savingRole} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 40 }}>
                      {savingRole ? '…' : 'Invite'}
                    </button>
                  </div>
                </form>
              )}

              {roles.length === 0 ? (
                <div style={{ color: '#4a5568', fontSize: 13 }}>No roles assigned. Invite a coach or scorer to manage this team.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {roles.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0b111b', border: '1px solid #1a2030', borderRadius: 8, padding: '10px 14px' }}>
                      <div>
                        <span style={{ color: '#f0f4ff', fontWeight: 600, fontSize: 13 }}>{r.email}</span>
                        <span style={{ marginLeft: 10, background: '#0e1a08', color: '#5cb800', border: '1px solid #2a4010', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{r.role}</span>
                        {r.accepted_at
                          ? <span style={{ marginLeft: 8, color: '#5cb800', fontSize: 11 }}>✓ Accepted</span>
                          : <span style={{ marginLeft: 8, color: '#6b7a99', fontSize: 11 }}>Pending</span>
                        }
                      </div>
                      <button onClick={() => removeRole(r.id)} style={{ background: 'transparent', color: '#4a5568', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
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
