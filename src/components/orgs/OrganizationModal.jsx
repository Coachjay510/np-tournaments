import { useState } from 'react'
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
  width: 'min(620px, 92vw)',
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
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

export default function OrganizationModal({ open, onClose, onCreated }) {
  const [orgName, setOrgName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [website, setWebsite] = useState('')
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  async function handleCreate() {
    setSaving(true)
    setError(null)

    const payload = {
      org_key: slugify(orgName),
      org_name: orgName.trim(),
      city: city.trim() || null,
      state: state.trim() || null,
      website: website.trim() || null,
      primary_color: primaryColor.trim() || null,
      secondary_color: secondaryColor.trim() || null,
    }

    const { error } = await supabase
      .from('bt_organizations')
      .insert(payload)

    if (error) {
      setError(error)
      setSaving(false)
      return
    }

    setSaving(false)
    setOrgName('')
    setCity('')
    setState('')
    setWebsite('')
    setPrimaryColor('')
    setSecondaryColor('')
    onCreated?.()
    onClose?.()
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #1a2030' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#d8e0f0' }}>Create Organization</div>
          <div style={{ marginTop: 6, color: '#6b7a99', fontSize: 12 }}>
            Create a program / organization and later assign master teams to it.
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Organization name" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" style={inputStyle} />
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" style={inputStyle} />
          </div>
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="Primary color hex" style={inputStyle} />
            <input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="Secondary color hex" style={inputStyle} />
          </div>

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
            onClick={handleCreate}
            disabled={saving || !orgName.trim()}
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
      </div>
    </div>
  )
}
