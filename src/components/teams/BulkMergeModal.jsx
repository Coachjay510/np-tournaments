import { useState } from 'react'
import { supabase } from '../../supabaseClient'

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
}
const modal = {
  width: 'min(560px, 92vw)', maxHeight: '88vh', overflow: 'hidden',
  background: '#080c12', border: '1px solid #1a2030', borderRadius: 16,
  display: 'flex', flexDirection: 'column',
}

async function mergeInto(sourceId, targetId) {
  // bt_team_results_normalized is a VIEW derived from bt_games — do not update it directly
  const steps = [
    supabase.from('bt_team_links').update({ master_team_id: targetId }).eq('master_team_id', sourceId),
    supabase.from('tournament_teams').update({ team_id: targetId }).eq('team_id', sourceId),
    supabase.from('bt_games').update({ normalized_home_team_id: targetId }).eq('normalized_home_team_id', sourceId),
    supabase.from('bt_games').update({ normalized_away_team_id: targetId }).eq('normalized_away_team_id', sourceId),
    supabase.from('bt_games').update({ normalized_winner_team_id: targetId }).eq('normalized_winner_team_id', sourceId),
  ]
  for (const step of steps) {
    const { error } = await step
    if (error) throw error
  }
  const { error } = await supabase
    .from('bt_master_teams')
    .update({ merged_into_id: targetId, display_name: `[MERGED] → ${targetId}` })
    .eq('id', sourceId)
  if (error) throw error
}

export default function BulkMergeModal({ selectedIds, teams, onClose, onMerged }) {
  const selected = teams.filter(t => selectedIds.has(t.id))
  const [primaryId, setPrimaryId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const primary = selected.find(t => t.id === primaryId)
  const toMerge = selected.filter(t => t.id !== primaryId)

  async function handleMerge() {
    if (!primaryId || toMerge.length === 0) return
    setSaving(true)
    setError(null)
    try {
      for (const team of toMerge) {
        await mergeInto(Number(team.id), Number(primaryId))
      }
      setDone(true)
      onMerged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (done) return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36 }}>✅</div>
        <div style={{ color: '#5cb800', fontWeight: 700, fontSize: 16 }}>Merge complete</div>
        <div style={{ color: '#6b7a99', fontSize: 13 }}>{toMerge.length} team{toMerge.length !== 1 ? 's' : ''} merged into <span style={{ color: '#f0f4ff', fontWeight: 600 }}>{primary?.display_name}</span></div>
        <button onClick={onClose} style={{ marginTop: 8, background: '#5cb800', color: '#04060a', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Done</button>
      </div>
    </div>
  )

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a2030', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: '#d8e0f0', fontSize: 15 }}>Merge Teams</div>
          <div style={{ color: '#6b7a99', fontSize: 12, marginTop: 4 }}>
            Click the team to keep as the primary. The others will be merged into it.
          </div>
        </div>

        {/* Team list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selected.map(team => {
            const isPrimary = team.id === primaryId
            return (
              <div
                key={team.id}
                onClick={() => setPrimaryId(isPrimary ? null : team.id)}
                style={{
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${isPrimary ? '#5cb800' : '#1a2030'}`,
                  background: isPrimary ? 'rgba(92,184,0,0.08)' : '#0b111b',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isPrimary ? '#5cb800' : '#2a3550'}`,
                  background: isPrimary ? '#5cb800' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isPrimary && <span style={{ color: '#04060a', fontSize: 11, fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isPrimary ? '#f0f4ff' : '#c0cce0', fontWeight: isPrimary ? 700 : 500, fontSize: 14 }}>
                    {team.display_name}
                  </div>
                  <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>
                    ID {team.id}
                    {team.ranking_division_key ? ` • ${team.ranking_division_key}` : ''}
                    {team.bt_organizations?.org_name ? ` • ${team.bt_organizations.org_name}` : ''}
                  </div>
                </div>
                {isPrimary && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#5cb800', background: 'rgba(92,184,0,0.12)', border: '1px solid rgba(92,184,0,0.3)', borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap' }}>
                    KEEP
                  </span>
                )}
                {!isPrimary && primaryId && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#e05555', background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 20, padding: '2px 10px', whiteSpace: 'nowrap' }}>
                    MERGE
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary + actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #1a2030', flexShrink: 0 }}>
          {primaryId ? (
            <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 12 }}>
              Merging <span style={{ color: '#e05555', fontWeight: 700 }}>{toMerge.length} team{toMerge.length !== 1 ? 's' : ''}</span> into{' '}
              <span style={{ color: '#5cb800', fontWeight: 700 }}>{primary?.display_name}</span>. This cannot be undone.
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 12 }}>Select the team to keep above.</div>
          )}
          {error && <div style={{ color: '#e05555', fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={!primaryId || saving}
              style={{
                background: primaryId && !saving ? '#d4630a' : '#1a2030',
                color: primaryId && !saving ? '#fff' : '#4a5568',
                border: 'none', padding: '9px 20px', borderRadius: 8,
                fontWeight: 700, fontSize: 13,
                cursor: primaryId && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Merging...' : primaryId ? `Merge ${toMerge.length} into ${primary?.display_name}` : 'Select a primary team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
