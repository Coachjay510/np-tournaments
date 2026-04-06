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
  width: 'min(760px, 92vw)',
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
  return name.toLowerCase().replace(/[^a-z0-9 ]/gi, '').replace(/\s+/g, ' ').trim()
}

function similarityHint(sourceName, targetName) {
  const a = normalizeName(sourceName)
  const b = normalizeName(targetName)
  if (!a || !b) return 0
  if (a === b) return 100
  if (a.includes(b) || b.includes(a)) return 90

  const aWords = new Set(a.split(' '))
  const bWords = new Set(b.split(' '))
  let overlap = 0
  for (const word of aWords) {
    if (bWords.has(word)) overlap += 1
  }
  return Math.round((overlap / Math.max(aWords.size, bWords.size, 1)) * 100)
}

export default function TeamMergeModal({ open, onClose, team, onMerged }) {
  const [search, setSearch] = useState('')
  const [masters, setMasters] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !team) return
    setSearch(team.source_team_name || '')
  }, [open, team])

  useEffect(() => {
    if (!open || !team) return

    const loadMasters = async () => {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('bt_master_teams')
        .select('id, display_name, ranking_division_key, age_group, gender')
        .eq('ranking_division_key', team.ranking_division_key)
        .order('display_name', { ascending: true })
        .limit(50)

      if (search.trim()) {
        query = query.ilike('display_name', `%${search.trim()}%`)
      }

      const { data, error } = await query
      if (error) setError(error)
      setMasters(data || [])
      setLoading(false)
    }

    loadMasters()
  }, [open, team, search])

  const suggestions = useMemo(() => {
    return [...masters]
      .map((m) => ({
        ...m,
        matchScore: similarityHint(team?.source_team_name || '', m.display_name || ''),
      }))
      .sort((a, b) => b.matchScore - a.matchScore || a.display_name.localeCompare(b.display_name))
      .slice(0, 8)
  }, [masters, team])

  if (!open || !team) return null

  async function handleMerge(masterTeamId) {
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('bt_team_links')
      .update({ master_team_id: masterTeamId })
      .eq('id', team.id)

    if (error) {
      setError(error)
      setSaving(false)
      return
    }

    setSaving(false)
    onMerged?.()
    onClose?.()
  }

  async function handleCreateAndMerge() {
    setSaving(true)
    setError(null)

    const displayName = search.trim() || team.source_team_name

    const { data: created, error: createError } = await supabase
      .from('bt_master_teams')
      .insert({
        master_team_key: `${normalizeName(displayName).replace(/\s+/g, '_')}__${team.ranking_division_key}__${Date.now()}`,
        display_name: displayName,
        ranking_division_key: team.ranking_division_key,
      })
      .select('id')
      .single()

    if (createError) {
      setError(createError)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('bt_team_links')
      .update({ master_team_id: created.id })
      .eq('id', team.id)

    if (updateError) {
      setError(updateError)
      setSaving(false)
      return
    }

    setSaving(false)
    onMerged?.()
    onClose?.()
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #1a2030' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#d8e0f0' }}>Merge Team</div>
          <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
            Link this source team to an existing master team, or create a new one.
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 14 }}>
          <div style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Source Team
            </div>
            <div style={{ marginTop: 8, color: '#f0f4ff', fontWeight: 700 }}>{team.source_team_name}</div>
            <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
              {team.ranking_source} • {team.ranking_division_key}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#c0cce0', fontSize: 12, fontWeight: 700 }}>
              Search existing master teams
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search master team..."
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#c0cce0', fontSize: 12, fontWeight: 700 }}>
              Suggested matches
            </div>

            <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ color: '#6b7a99', fontSize: 12 }}>Loading suggestions...</div>
              ) : suggestions.length ? (
                suggestions.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 12,
                      alignItems: 'center',
                      background: '#0b111b',
                      border: '1px solid #1a2030',
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <div>
                      <div style={{ color: '#f0f4ff', fontWeight: 600 }}>{m.display_name}</div>
                      <div style={{ color: '#6b7a99', fontSize: 12, marginTop: 4 }}>
                        Master ID {m.id} • {m.ranking_division_key}
                      </div>
                    </div>

                    <div
                      style={{
                        color: m.matchScore >= 90 ? '#5cb800' : '#d4a017',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {m.matchScore}% match
                    </div>

                    <button
                      onClick={() => handleMerge(m.id)}
                      disabled={saving}
                      style={{
                        background: '#5cb800',
                        color: '#04060a',
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
                  </div>
                ))
              ) : (
                <div style={{ color: '#6b7a99', fontSize: 12 }}>No suggestions found.</div>
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
            onClick={handleCreateAndMerge}
            disabled={saving}
            style={{
              background: '#1e88ff',
              color: '#fff',
              border: 'none',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Create New Master + Merge
          </button>
        </div>
      </div>
    </div>
  )
}
