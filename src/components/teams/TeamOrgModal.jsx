import { useEffect, useState } from 'react'
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
  width: 'min(720px, 92vw)',
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

function slugify(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '_')
}

/**
 * TeamOrgModal
 *
 * Accepts either:
 *   - team: a single team row from bt_master_teams (has `id`, `display_name`, `organization_id`)
 *   - teams: an array of team rows (bulk assignment)
 *
 * If both are passed, `teams` takes precedence.
 */
export default function TeamOrgModal({ open, onClose, team, teams, onAssigned }) {
  const [orgs, setOrgs] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Derive the working set of teams. Single-team mode = one-element array.
  const targetTeams = teams?.length ? teams : (team ? [team] : [])
  const isBulk = targetTeams.length > 1

  async function loadOrgs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bt_organizations')
      .select('id, org_name')
      .order('org_name', { ascending: true })

    if (error) setError(error)
    setOrgs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    loadOrgs()
    // Pre-select: in single mode use the team's current org; in bulk leave empty
    if (!isBulk && targetTeams[0]) {
      const currentOrg = targetTeams[0].organization_id
        || targetTeams[0].bt_organizations?.id
        || ''
      setSelectedOrgId(currentOrg ? String(currentOrg) : '')
    } else {
      setSelectedOrgId('')
    }
    setNewOrgName('')
    setError(null)
  }, [open, team, teams])

  if (!open || targetTeams.length === 0) return null

  async function handleSave() {
    // Collect the master team IDs. Try `id` first (rows from bt_master_teams),
    // fall back to `master_team_id` (rows from bt_team_links, legacy shape).
    const masterIds = targetTeams
      .map(t => t.id ?? t.master_team_id)
      .filter(Boolean)
      .map(id => Number(id))

    if (masterIds.length === 0) {
      setError(new Error('No valid team IDs to update'))
      return
    }

    setSaving(true)
    setError(null)

    // .select('id') forces Supabase to return affected rows so we can detect
    // when RLS silently filters everything out (data=null, error=null).
    const { data, error: updateErr } = await supabase
      .from('bt_master_teams')
      .update({ organization_id: selectedOrgId ? Number(selectedOrgId) : null })
      .in('id', masterIds)
      .select('id')

    if (updateErr) {
      setError(updateErr)
      setSaving(false)
      return
    }

    if (!data || data.length === 0) {
      setError(new Error('Update ran but no rows were changed. This usually means a permissions policy blocked the update.'))
      setSaving(false)
      return
    }

    setSaving(false)
    onAssigned?.()
    onClose?.()
  }

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return

    setSaving(true)
    setError(null)

    const { data, error } = await supabase
      .from('bt_organizations')
      .insert({
        org_key: slugify(newOrgName),
        org_name: newOrgName.trim(),
      })
      .select('id, org_name')
      .single()

    if (error) {
      setError(error)
      setSaving(false)
      return
    }

    await loadOrgs()
    setSelectedOrgId(String(data.id))
    setNewOrgName('')
    setSaving(false)
  }

  const headerLabel = isBulk
    ? `Assign ${targetTeams.length} Teams to Organization`
    : 'Assign Team to Organization'

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #1a2030' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#d8e0f0' }}>{headerLabel}</div>
          <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
            Save to Supabase and keep org/team sync aligned
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 14 }}>
          {isBulk ? (
            <div style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 14, maxHeight: 160, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Applying to {targetTeams.length} teams
              </div>
              <div style={{ fontSize: 12, color: '#c0cce0', lineHeight: 1.6 }}>
                {targetTeams.slice(0, 12).map(t => t.display_name || t.source_team_name || `Team ${t.id}`).join(', ')}
                {targetTeams.length > 12 && <span style={{ color: '#6b7a99' }}>, and {targetTeams.length - 12} more…</span>}
              </div>
            </div>
          ) : (
            <div style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Team
              </div>
              <div style={{ marginTop: 8, color: '#f0f4ff', fontWeight: 700 }}>
                {targetTeams[0].display_name || targetTeams[0].source_team_name || '—'}
              </div>
              <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
                Master Team ID {targetTeams[0].id ?? targetTeams[0].master_team_id ?? '—'}
              </div>
            </div>
          )}

          <div>
            <div style={{ marginBottom: 8, color: '#c0cce0', fontSize: 12, fontWeight: 700 }}>
              Choose organization
            </div>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              style={inputStyle}
            >
              <option value="">No organization</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.org_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Create new org..."
              style={inputStyle}
            />
            <button
              onClick={handleCreateOrg}
              disabled={saving || !newOrgName.trim()}
              style={{
                background: '#5cb800',
                color: '#04060a',
                border: 'none',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: saving || !newOrgName.trim() ? 'default' : 'pointer',
                opacity: saving || !newOrgName.trim() ? 0.5 : 1,
              }}
            >
              Create Org
            </button>
          </div>

          {loading && <div style={{ color: '#6b7a99', fontSize: 12 }}>Loading organizations...</div>}
          {error && (
            <div style={{ color: '#ff9d7a', fontSize: 12, background: '#1f0707', padding: 10, borderRadius: 8, border: '1px solid #3a0a0a' }}>
              {error.message || String(error)}
            </div>
          )}
        </div>

        <div style={{ padding: 18, borderTop: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
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
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#1e88ff',
              color: '#fff',
              border: 'none',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : (isBulk ? `Save ${targetTeams.length} Assignments` : 'Save Org Assignment')}
          </button>
        </div>
      </div>
    </div>
  )
}
