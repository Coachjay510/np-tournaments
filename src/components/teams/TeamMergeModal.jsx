import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
}

const modalStyle = {
  width: 'min(820px, 92vw)',
  maxHeight: '88vh',
  overflow: 'hidden',
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 16,
  boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
}

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

function normalizeName(name = '') {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarityScore(a = '', b = '') {
  const aa = normalizeName(a)
  const bb = normalizeName(b)

  if (!aa || !bb) return 0
  if (aa === bb) return 100
  if (aa.includes(bb) || bb.includes(aa)) return 92

  const aWords = new Set(aa.split(' '))
  const bWords = new Set(bb.split(' '))
  let overlap = 0

  for (const word of aWords) {
    if (bWords.has(word)) overlap += 1
  }

  return Math.round((overlap / Math.max(aWords.size, bWords.size, 1)) * 100)
}

export default function TeamMergeModal({ open, onClose, team, onMerged }) {
  const [search, setSearch] = useState('')
  const [searchById, setSearchById] = useState('')
  const [targets, setTargets] = useState([])
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const sourceName =
    team?.source_team_name ||
    team?.display_name ||
    team?.linked_sources?.[0]?.source_team_name ||
    ''

  const sourceDivision = team?.ranking_division_key || ''

  useEffect(() => {
    if (!open) return
    setSearch(sourceName)
    setSelectedTargetId('')
    setError(null)
  }, [open, sourceName])

  useEffect(() => {
    if (!open) return

    const loadTargets = async () => {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('bt_master_teams')
        .select(`
          id,
          display_name,
          ranking_division_key,
          organization_id,
          bt_organizations (
            id,
            org_name
          )
        `)
        .order('display_name', { ascending: true })
        .limit(100)

      if (searchById.trim()) {
        // Search by master ID directly
        const id = parseInt(searchById.trim())
        if (!isNaN(id)) {
          query = query.eq('id', id)
        }
      } else if (search.trim()) {
        query = query.ilike('display_name', `%${search.trim()}%`)
      }

      const { data, error } = await query

      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      const filtered = (data || []).filter((row) => Number(row.id) !== Number(team?.master_team_id))
      setTargets(filtered)
      setLoading(false)
    }

    loadTargets()
  }, [open, search, searchById, team])

  const suggestions = useMemo(() => {
    return [...targets]
      .map((target) => ({
        ...target,
        matchScore: similarityScore(sourceName, target.display_name),
      }))
      .sort((a, b) => b.matchScore - a.matchScore || a.display_name.localeCompare(b.display_name))
      .slice(0, 12)
  }, [targets, sourceName])

  if (!open || !team) return null

  async function handleMerge() {
    if (!selectedTargetId) return

    setSaving(true)
    setError(null)

    const sourceMasterId = team.master_team_id
    const targetId = Number(selectedTargetId)

    try {
      // 1. Update bt_team_links — point all source links to the target master
      if (sourceMasterId) {
        const { error: linksError } = await supabase
          .from('bt_team_links')
          .update({ master_team_id: targetId })
          .eq('master_team_id', Number(sourceMasterId))
        if (linksError) throw linksError
      } else if (team.id) {
        const { error: singleError } = await supabase
          .from('bt_team_links')
          .update({ master_team_id: targetId })
          .eq('id', team.id)
        if (singleError) throw singleError
      }

      // 2. Update tournament_teams — any tournament entries using old master ID
      if (sourceMasterId) {
        await supabase
          .from('tournament_teams')
          .update({ team_id: targetId })
          .eq('team_id', Number(sourceMasterId))
      }

      // 3. Reassign rankings to target master
      if (sourceMasterId) {
        await supabase
          .from('bt_team_results_normalized')
          .update({ team_id: targetId })
          .eq('team_id', Number(sourceMasterId))
      }

      // 4. Reassign games to target master
      if (sourceMasterId) {
        await supabase
          .from('bt_team_recent_games')
          .update({ home_team_id: targetId })
          .eq('home_team_id', Number(sourceMasterId))
        await supabase
          .from('bt_team_recent_games')
          .update({ away_team_id: targetId })
          .eq('away_team_id', Number(sourceMasterId))
      }

      // 5. Mark old master as merged
      if (sourceMasterId) {
        await supabase
          .from('bt_master_teams')
          .update({ merged_into_id: targetId, display_name: `[MERGED] ${team.display_name}` })
          .eq('id', Number(sourceMasterId))
      }

      setSaving(false)
      onMerged?.()
      onClose?.()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #1a2030' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#d8e0f0' }}>
            Merge Team
          </div>
          <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
            Move this team into another master team and keep Supabase in sync.
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 14 }}>
          <div style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Source Team
            </div>
            <div style={{ marginTop: 8, color: '#f0f4ff', fontWeight: 700 }}>
              {sourceName}
            </div>
            <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
              {team?.ranking_source || 'Master Team'} • {sourceDivision || '—'} • Current Master ID {team?.master_team_id || '—'}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#c0cce0', fontSize: 12, fontWeight: 700 }}>
              Search target master teams
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchById('') }}
                placeholder="Search by name..."
                style={inputStyle}
              />
              <input
                value={searchById}
                onChange={(e) => { setSearchById(e.target.value); setSearch('') }}
                placeholder="Search by Master ID..."
                style={inputStyle}
                type="number"
              />
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#c0cce0', fontSize: 12, fontWeight: 700 }}>
              Suggested targets
            </div>

            <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ color: '#6b7a99', fontSize: 12 }}>Loading suggestions...</div>
              ) : suggestions.length ? (
                suggestions.map((target) => {
                  const selected = String(selectedTargetId) === String(target.id)

                  return (
                    <button
                      key={target.id}
                      onClick={() => setSelectedTargetId(String(target.id))}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: selected ? '#0d1a0a' : '#0b111b',
                        border: selected ? '1px solid #1a3a0a' : '1px solid #1a2030',
                        borderRadius: 10,
                        padding: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ color: '#f0f4ff', fontWeight: 700 }}>
                            {target.display_name}
                          </div>
                          <div style={{ color: '#6b7a99', fontSize: 12, marginTop: 4 }}>
                            Master ID {target.id} • {target.ranking_division_key} • {target.bt_organizations?.org_name || 'No org'}
                          </div>
                        </div>

                        <div
                          style={{
                            color: target.matchScore >= 90 ? '#5cb800' : '#d4a017',
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {target.matchScore}% match
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div style={{ color: '#6b7a99', fontSize: 12 }}>No target teams found.</div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ color: '#ff9d7a', fontSize: 12 }}>
              {error.message}
            </div>
          )}
        </div>

        <div
          style={{
            padding: 18,
            borderTop: '1px solid #1a2030',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#c0cce0',
              border: '1px solid #1a2030',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleMerge}
            disabled={saving || !selectedTargetId}
            style={{
              background: '#ff7a1a',
              color: '#fff',
              border: 'none',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Save Merge
          </button>
        </div>
      </div>
    </div>
  )
}
