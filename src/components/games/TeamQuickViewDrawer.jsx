import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useTeamDetail } from '../../hooks/useTeamDetail'

const overlayStyle = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 9000,
}

const drawerStyle = {
  position: 'fixed', top: 0, right: 0, bottom: 0,
  width: 'min(540px, 100vw)',
  background: '#080c12',
  borderLeft: '1px solid #1a2030',
  display: 'flex', flexDirection: 'column',
  zIndex: 9001,
  overflow: 'hidden',
}

const panelStyle = { background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 14 }
const inputStyle = { width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const labelStyle = { display: 'grid', gap: 5, color: '#c0cce0', fontSize: 12, fontWeight: 700 }

function StatPill({ label, value, accent = '#f0f4ff' }) {
  return (
    <div style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: '#4a5568', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: accent, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function normalizeName(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').trim()
}
function matchScore(a = '', b = '') {
  const aa = normalizeName(a), bb = normalizeName(b)
  if (!aa || !bb) return 0
  if (aa === bb) return 100
  if (aa.includes(bb) || bb.includes(aa)) return 90
  const aW = new Set(aa.split(' ')), bW = new Set(bb.split(' '))
  let overlap = 0
  for (const w of aW) if (bW.has(w)) overlap++
  return Math.round((overlap / Math.max(aW.size, bW.size, 1)) * 100)
}

// ── Linked team panel ──────────────────────────────────────────────────────
function LinkedTeamContent({ masterTeamId, teamName, sourceTeamId, rankingSource, rankingDivisionKey, gameDbId, teamSide, onClose, onLinked }) {
  const navigate = useNavigate()
  const { team, games, linkedSources, loading, error } = useTeamDetail(masterTeamId)

  const recentGames = useMemo(
    () => [...(games || [])].sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).slice(0, 10),
    [games]
  )

  if (loading) return <div style={{ padding: 32, color: '#4a5568', fontSize: 13 }}>Loading team…</div>
  if (error)   return <div style={{ padding: 32, color: '#e05555', fontSize: 13 }}>Error: {error.message}</div>
  // ID didn't map to a master team — fall back to the unlinked/link panel
  if (!team)   return (
    <UnlinkedTeamContent
      teamName={teamName}
      sourceTeamId={sourceTeamId}
      rankingSource={rankingSource}
      rankingDivisionKey={rankingDivisionKey}
      gameDbId={gameDbId}
      teamSide={teamSide}
      onLinked={onLinked}
    />
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Identity */}
      <div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#f0f4ff', letterSpacing: '0.5px', lineHeight: 1 }}>
          {team.display_name}
        </div>
        <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
          Master Team ID {team.id}
          {team.ranking_division_key && ` • ${team.ranking_division_key}`}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <StatPill label="Rank"   value={team.ranking?.rank       ? `#${team.ranking.rank}` : '—'} accent="#d4a017" />
        <StatPill label="Level"  value={team.ranking?.skill_level || '—'} accent="#5cb800" />
        <StatPill label="Record" value={`${team.ranking?.wins || 0}-${team.ranking?.losses || 0}`} />
        <StatPill label="Pts"    value={team.ranking?.ranking_points || 0} />
      </div>

      {/* Details */}
      <div style={{ ...panelStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        {[
          ['Gender',    team.gender || '—'],
          ['Grad Year', team.graduating_year || '—'],
          ['Age Group', team.age_group || '—'],
          ['Contact',   team.contact_name || '—'],
        ].map(([lbl, val]) => (
          <div key={lbl}>
            <div style={{ color: '#4a5568', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.8px', marginBottom: 2 }}>{lbl}</div>
            <div style={{ color: '#c0cce0', fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Linked sources */}
      <div style={panelStyle}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#c0cce0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
          Linked Sources ({linkedSources.length})
        </div>
        {linkedSources.length ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {linkedSources.map((s) => (
              <div key={s.id} style={{ background: '#0e1320', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ color: '#f0f4ff', fontWeight: 600, fontSize: 13 }}>{s.source_team_name}</div>
                <div style={{ color: '#6b7a99', fontSize: 11, marginTop: 2 }}>
                  {s.ranking_source} • {s.ranking_division_key} • ID {s.source_team_id}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#4a5568', fontSize: 12 }}>No linked sources.</div>
        )}
      </div>

      {/* Recent games */}
      <div style={panelStyle}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#c0cce0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
          Recent Games
        </div>
        {recentGames.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Date', 'Source', 'Division', 'Score'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#4a5568', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentGames.map((g) => (
                <tr key={`${g.game_id}-${g.ranking_source}`} style={{ borderBottom: '1px solid #0e1320' }}>
                  <td style={{ padding: '7px 8px', color: '#c0cce0' }}>{g.game_date ? new Date(g.game_date).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '7px 8px', color: '#6b7a99' }}>{g.ranking_source}</td>
                  <td style={{ padding: '7px 8px', color: '#6b7a99' }}>{g.ranking_division_key}</td>
                  <td style={{ padding: '7px 8px', color: '#c0cce0', fontFamily: 'Anton, sans-serif', letterSpacing: '0.5px' }}>{g.score_home} – {g.score_away}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#4a5568', fontSize: 12 }}>No recent games.</div>
        )}
      </div>

      {/* Open full page */}
      <button
        onClick={() => { onClose(); navigate(`/teams/${masterTeamId}`) }}
        style={{ background: '#0d1a0a', border: '1px solid #1a3a0a', color: '#5cb800', padding: '11px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}
      >
        Open Full Edit Page →
      </button>
    </div>
  )
}

// ── Unlinked team panel ────────────────────────────────────────────────────
function UnlinkedTeamContent({ teamName, sourceTeamId, rankingSource, rankingDivisionKey, gameDbId, teamSide, onLinked }) {
  const [search,           setSearch]           = useState(teamName || '')
  const [searchById,       setSearchById]       = useState('')
  const [targets,          setTargets]          = useState([])
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [loadingSearch,    setLoadingSearch]    = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [error,            setError]            = useState(null)
  const [success,          setSuccess]          = useState(false)
  const [linkedMasterId,   setLinkedMasterId]   = useState(null)
  const [undoing,          setUndoing]          = useState(false)
  const [creatingNew,      setCreatingNew]      = useState(false)
  const [creating,         setCreating]         = useState(false)
  const [newName,          setNewName]          = useState(teamName || '')

  useEffect(() => {
    let cancelled = false
    const doSearch = async () => {
      setLoadingSearch(true)
      let q = supabase
        .from('bt_master_teams')
        .select('id, display_name, ranking_division_key, bt_organizations(org_name)')
        .order('display_name', { ascending: true })
        .limit(80)
      if (searchById.trim()) {
        const id = parseInt(searchById.trim())
        if (!isNaN(id)) q = q.eq('id', id)
      } else if (search.trim()) {
        q = q.ilike('display_name', `%${search.trim()}%`)
      }
      const { data } = await q
      if (!cancelled) {
        setTargets(data || [])
        setLoadingSearch(false)
      }
    }
    doSearch()
    return () => { cancelled = true }
  }, [search, searchById])

  const suggestions = useMemo(() =>
    [...targets]
      .map((t) => ({ ...t, score: matchScore(teamName, t.display_name) }))
      .sort((a, b) => b.score - a.score || a.display_name.localeCompare(b.display_name))
      .slice(0, 10),
    [targets, teamName]
  )

  async function handleLink() {
    if (!selectedTargetId) return
    setSaving(true)
    setError(null)
    const masterId = Number(selectedTargetId)

    if (sourceTeamId) {
      // Normal path: link via bt_team_links by source team ID
      const resolvedSource = rankingSource || 'NP Tournament'
      const { error: e } = await supabase.from('bt_team_links').upsert({
        source_team_id:       String(sourceTeamId),
        source_team_name:     teamName || 'Unknown',
        ranking_source:       resolvedSource,
        ranking_division_key: rankingDivisionKey || null,
        master_team_id:       masterId,
      }, { onConflict: 'source_team_id,ranking_source' })
      setSaving(false)
      if (e) { setError(e); return }
      setLinkedMasterId({ type: 'link', sourceTeamId, rankingSource: resolvedSource })
    } else if (gameDbId && teamSide) {
      // Name-only import (e.g. Covert Hoops): update only this specific game row
      const col = teamSide === 'home' ? 'normalized_home_team_id' : 'normalized_away_team_id'
      const { error: e } = await supabase.from('bt_games')
        .update({ [col]: masterId })
        .eq('id', gameDbId)
      setSaving(false)
      if (e) { setError(e); return }
      setLinkedMasterId({ type: 'game', gameDbId, col, masterId })
    } else {
      setSaving(false)
      setError({ message: 'Not enough information to link this team (missing game ID or source).' })
      return
    }

    setSuccess(true)
    onLinked?.()
  }

  async function handleUndo() {
    if (!linkedMasterId) return
    setUndoing(true)
    if (linkedMasterId.type === 'link') {
      await supabase.from('bt_team_links')
        .delete()
        .eq('source_team_id', String(linkedMasterId.sourceTeamId))
        .eq('ranking_source', linkedMasterId.rankingSource)
    } else if (linkedMasterId.type === 'game') {
      await supabase.from('bt_games')
        .update({ [linkedMasterId.col]: null })
        .eq('id', linkedMasterId.gameDbId)
    }
    setUndoing(false)
    setSuccess(false)
    setLinkedMasterId(null)
    setSelectedTargetId('')
    onLinked?.()
  }

  async function handleCreateAndLink() {
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const { data: newTeam, error: ce } = await supabase
      .from('bt_master_teams')
      .insert({ display_name: newName.trim(), ranking_division_key: rankingDivisionKey || null })
      .select('id')
      .single()
    if (ce) { setError(ce); setCreating(false); return }
    const masterId = newTeam.id

    if (sourceTeamId) {
      const resolvedSource = rankingSource || 'NP Tournament'
      const { error: le } = await supabase.from('bt_team_links').insert({
        source_team_id:       String(sourceTeamId),
        source_team_name:     teamName || 'Unknown',
        ranking_source:       resolvedSource,
        ranking_division_key: rankingDivisionKey || null,
        master_team_id:       masterId,
      })
      setCreating(false)
      if (le) { setError(le); return }
      setLinkedMasterId({ type: 'link', sourceTeamId, rankingSource: resolvedSource })
    } else if (gameDbId && teamSide) {
      const col = teamSide === 'home' ? 'normalized_home_team_id' : 'normalized_away_team_id'
      const { error: e } = await supabase.from('bt_games')
        .update({ [col]: masterId })
        .eq('id', gameDbId)
      setCreating(false)
      if (e) { setError(e); return }
      setLinkedMasterId({ type: 'game', gameDbId, col, masterId })
    } else {
      setCreating(false)
      setError({ message: 'Not enough information to link this team.' })
      return
    }

    setSuccess(true)
    onLinked?.()
  }

  if (success) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 32 }}>✅</div>
        <div style={{ color: '#5cb800', fontSize: 16, fontWeight: 700 }}>Team linked!</div>
        <div style={{ color: '#6b7a99', fontSize: 12 }}>The games table has been refreshed.</div>
        <button
          onClick={handleUndo}
          disabled={undoing}
          style={{ background: 'transparent', border: '1px solid #3a1a0a', color: '#d4630a', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}
        >
          {undoing ? 'Undoing…' : '↩ Undo this link'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Source info */}
      <div style={{ ...panelStyle, border: '1px solid #3a1a0a' }}>
        <div style={{ fontSize: 10, color: '#d4630a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontWeight: 700 }}>⚠ Not Linked to a Master Team</div>
        <div style={{ color: '#f0f4ff', fontWeight: 700, fontSize: 15 }}>{teamName}</div>
        <div style={{ color: '#6b7a99', fontSize: 12, marginTop: 4 }}>
          {rankingSource || 'Unknown source'}
          {rankingDivisionKey ? ` • ${rankingDivisionKey}` : ''}
          {sourceTeamId ? ` • Source ID ${sourceTeamId}` : ''}
        </div>
      </div>

      {/* Search */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#c0cce0', marginBottom: 8 }}>Link to an existing master team</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setSearchById('') }} placeholder="Search by name…" style={inputStyle} />
          <input value={searchById} onChange={(e) => { setSearchById(e.target.value); setSearch('') }} placeholder="Search by Master ID…" style={{ ...inputStyle }} type="number" />
        </div>
        <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {loadingSearch ? (
            <div style={{ color: '#4a5568', fontSize: 12, padding: 8 }}>Searching…</div>
          ) : suggestions.map((t) => {
            const sel = String(selectedTargetId) === String(t.id)
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTargetId(String(t.id))}
                style={{
                  textAlign: 'left', background: sel ? '#0d1a0a' : '#0b111b',
                  border: `1px solid ${sel ? '#1a3a0a' : '#1a2030'}`, borderRadius: 8,
                  padding: '10px 12px', cursor: 'pointer', width: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#f0f4ff', fontWeight: 700, fontSize: 13 }}>{t.display_name}</div>
                    <div style={{ color: '#6b7a99', fontSize: 11, marginTop: 2 }}>
                      ID {t.id} • {t.ranking_division_key || '—'} • {t.bt_organizations?.org_name || 'No org'}
                    </div>
                  </div>
                  {t.score > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.score >= 90 ? '#5cb800' : '#d4a017', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {t.score}%
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          {!loadingSearch && suggestions.length === 0 && (
            <div style={{ color: '#4a5568', fontSize: 12, padding: 8 }}>No teams found.</div>
          )}
        </div>
      </div>

      {error && <div style={{ color: '#ff9d7a', fontSize: 12, padding: '8px 10px', background: '#1a0a0a', borderRadius: 8 }}>{error.message}</div>}

      <button
        onClick={handleLink}
        disabled={!selectedTargetId || saving}
        style={{
          background: selectedTargetId ? '#5cb800' : '#1a2030', color: selectedTargetId ? '#04060a' : '#4a5568',
          border: 'none', padding: '11px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
          cursor: selectedTargetId ? 'pointer' : 'default', width: '100%',
        }}
      >
        {saving ? 'Saving…' : selectedTargetId ? 'Link to Selected Team' : 'Select a master team above'}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#1a2030' }} />
        <span style={{ color: '#4a5568', fontSize: 11 }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#1a2030' }} />
      </div>

      {/* Create new */}
      {!creatingNew ? (
        <button
          onClick={() => setCreatingNew(true)}
          style={{ background: 'transparent', border: '1px solid #1a2030', color: '#c0cce0', padding: '11px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}
        >
          + Create New Master Team &amp; Link
        </button>
      ) : (
        <div style={panelStyle}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#c0cce0', marginBottom: 10 }}>Create new master team</div>
          <label style={{ ...labelStyle, marginBottom: 10 }}>
            Team Name
            <input value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} placeholder="Display name…" />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCreatingNew(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '9px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleCreateAndLink} disabled={!newName.trim() || creating} style={{ flex: 2, background: '#5cb800', border: 'none', color: '#04060a', padding: '9px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {creating ? 'Creating…' : 'Create & Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Drawer shell ───────────────────────────────────────────────────────────
export default function TeamQuickViewDrawer({ info, onClose, onLinked }) {
  if (!info) return null

  const { masterTeamId, teamName, sourceTeamId, rankingSource, rankingDivisionKey, gameDbId, teamSide } = info

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={drawerStyle}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#d8e0f0' }}>Team Quick View</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>
              {masterTeamId ? `Master ID ${masterTeamId}` : 'Unlinked team'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {masterTeamId ? (
          <LinkedTeamContent
            masterTeamId={masterTeamId}
            teamName={teamName}
            sourceTeamId={sourceTeamId}
            rankingSource={rankingSource}
            rankingDivisionKey={rankingDivisionKey}
            gameDbId={gameDbId}
            teamSide={teamSide}
            onClose={onClose}
            onLinked={onLinked}
          />
        ) : (
          <UnlinkedTeamContent
            teamName={teamName}
            sourceTeamId={sourceTeamId}
            rankingSource={rankingSource}
            rankingDivisionKey={rankingDivisionKey}
            gameDbId={gameDbId}
            teamSide={teamSide}
            onLinked={onLinked}
          />
        )}
      </div>
    </>
  )
}
