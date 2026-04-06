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

export default function TeamOrgModal({ open, onClose, team, onAssigned }) {
  const [orgs, setOrgs] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

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
    setSelectedOrgId(team?.bt_master_teams?.organization_id || '')
    setNewOrgName('')
  }, [open, team])

  if (!open || !team) return null

  async function handleSave() {
    if (!team.master_team_id) return

    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('bt_master_teams')
      .update({
        organization_id: selectedOrgId ? Number(selectedOrgId) : null,
      })
      .eq('id', team.master_team_id)

    if (error) {
      setError(error)
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

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #1a2030' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#d8e0f0' }}>Assign Team to Organization</div>
          <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
            Save to Supabase and keep org/team sync aligned
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 14 }}>
          <div style={{ background: '#0b111b', border: '1px solid #1a2030', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Team
            </div>
            <div style={{ marginTop: 8, color: '#f0f4ff', fontWeight: 700 }}>
              {team.bt_master_teams?.display_name || team.source_team_name}
            </div>
            <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
              Master Team ID {team.master_team_id || '—'}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, color: '#c0cce0', fontSize: 12, fontWeight: 700 }}>
              Choose existing organization
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
              placeholder="Create new org from here..."
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
                cursor: 'pointer',
              }}
            >
              Create Org
            </button>
          </div>

          {loading && <div style={{ color: '#6b7a99', fontSize: 12 }}>Loading organizations...</div>}
          {error && <div style={{ color: '#ff9d7a', fontSize: 12 }}>{error.message}</div>}
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
            disabled={saving || !team.master_team_id}
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
            Save Org Assignment
          </button>
        </div>
      </div>
    </div>
  )
}
