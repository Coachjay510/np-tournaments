import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { uploadLogo } from '../lib/uploadLogo'

export default function OrganizationDetailPage() {
  const { orgId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [organization, setOrganization] = useState(null)
  const [teams, setTeams] = useState([])

  const [form, setForm] = useState({
    org_name: '',
    city: '',
    state: '',
    website: '',
    primary_color: '',
    secondary_color: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    logo_url: '',
  })

  useEffect(() => {
    async function loadOrganization() {
      setLoading(true)
      setError('')
      setSuccess('')

      const { data: orgData, error: orgError } = await supabase
        .from('bt_organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle()

      if (orgError) {
        console.error(orgError)
        setError('Failed to load organization.')
        setLoading(false)
        return
      }

      const { data: teamData, error: teamError } = await supabase
        .from('bt_master_teams')
        .select('id, team_name, division_key, gender, age_group, graduating_year')
        .eq('organization_id', orgId)
        .order('team_name', { ascending: true })

      if (teamError) {
        console.error(teamError)
      }

      setOrganization(orgData || null)
      setTeams(teamData || [])

      if (orgData) {
        setForm({
          org_name: orgData.org_name || orgData.name || '',
          city: orgData.city || '',
          state: orgData.state || '',
          website: orgData.website || '',
          primary_color: orgData.primary_color || '',
          secondary_color: orgData.secondary_color || '',
          contact_name: orgData.contact_name || '',
          contact_email: orgData.contact_email || '',
          contact_phone: orgData.contact_phone || '',
          logo_url: orgData.logo_url || '',
        })
      }

      setLoading(false)
    }

    loadOrganization()
  }, [orgId])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      org_name: form.org_name,
      city: form.city,
      state: form.state,
      website: form.website,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      logo_url: form.logo_url,
    }

    const { data, error } = await supabase
      .from('bt_organizations')
      .update(payload)
      .eq('id', orgId)
      .select()
      .maybeSingle()

    if (error) {
      console.error(error)
      setError('Failed to save organization.')
      setSaving(false)
      return
    }

    setOrganization(data || organization)
    setSuccess('Organization updated.')
    setSaving(false)
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')

    try {
      const uploadedUrl = await uploadLogo(file, 'organization-logos', `org-${orgId}`)
      if (!uploadedUrl) {
        setError('Logo upload failed.')
        return
      }

      setForm((prev) => ({ ...prev, logo_url: uploadedUrl }))
      setSuccess('Logo uploaded. Click Save to keep it.')
    } catch (err) {
      console.error(err)
      setError('Logo upload failed.')
    }
  }

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={{ color: '#6b7a99' }}>Loading organization...</div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div style={pageWrap}>
        <div style={{ color: '#e05555' }}>Organization not found.</div>
      </div>
    )
  }

  return (
    <div style={pageWrap}>
      <div style={headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={logoWrap}>
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt={form.org_name || 'Organization logo'}
                style={logoImage}
              />
            ) : (
              <div style={logoPlaceholder}>No Logo</div>
            )}
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: 32, color: '#fff' }}>
              {form.org_name || 'Organization'}
            </h1>
            <div style={{ color: '#6b7a99', marginTop: 6 }}>
              Manage organization profile, contacts, branding, and teams.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/organizations')}
          style={secondaryButton}
        >
          Back
        </button>
      </div>

      {error ? <div style={errorBanner}>{error}</div> : null}
      {success ? <div style={successBanner}>{success}</div> : null}

      <form onSubmit={handleSave} style={card}>
        <div style={sectionTitle}>Organization Profile</div>

        <div style={grid2}>
          <div>
            <label style={label}>Organization Name</label>
            <input
              value={form.org_name}
              onChange={(e) => updateField('org_name', e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Website</label>
            <input
              value={form.website}
              onChange={(e) => updateField('website', e.target.value)}
              style={input}
              placeholder="https://..."
            />
          </div>

          <div>
            <label style={label}>City</label>
            <input
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>State</label>
            <input
              value={form.state}
              onChange={(e) => updateField('state', e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Primary Color</label>
            <input
              value={form.primary_color}
              onChange={(e) => updateField('primary_color', e.target.value)}
              style={input}
              placeholder="#000000"
            />
          </div>

          <div>
            <label style={label}>Secondary Color</label>
            <input
              value={form.secondary_color}
              onChange={(e) => updateField('secondary_color', e.target.value)}
              style={input}
              placeholder="#ffffff"
            />
          </div>

          <div>
            <label style={label}>Contact Name</label>
            <input
              value={form.contact_name}
              onChange={(e) => updateField('contact_name', e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Contact Email</label>
            <input
              value={form.contact_email}
              onChange={(e) => updateField('contact_email', e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Contact Phone</label>
            <input
              value={form.contact_phone}
              onChange={(e) => updateField('contact_phone', e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Logo Upload</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={fileInput}
            />
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} style={primaryButton}>
            {saving ? 'Saving...' : 'Save Organization'}
          </button>
        </div>
      </form>

      <div style={card}>
        <div style={sectionTitle}>Organization Teams</div>

        {!teams || teams.length === 0 ? (
          <div style={{ color: '#6b7a99' }}>
            No teams assigned to this organization yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a0f1a' }}>
                <th style={th}>Team</th>
                <th style={th}>Division</th>
                <th style={th}>Gender</th>
                <th style={th}>Age Group</th>
                <th style={th}>Grad Year</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {teams.map((team) => (
                <tr key={team.id} style={{ borderBottom: '1px solid #111827' }}>
                  <td style={td}>
                    <Link
                      to={`/teams/${team.id}`}
                      style={{
                        color: '#5cb800',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {team.team_name}
                    </Link>
                  </td>

                  <td style={td}>{team.division_key || '—'}</td>
                  <td style={td}>{team.gender || '—'}</td>
                  <td style={td}>{team.age_group || '—'}</td>
                  <td style={td}>{team.graduating_year || '—'}</td>

                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/teams/${team.id}`)}
                        style={actionButton}
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/teams/${team.id}`)}
                        style={editButton}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const pageWrap = {
  padding: 24,
  color: '#fff',
}

const headerRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
}

const card = {
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
}

const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#d8e0f0',
  marginBottom: 16,
}

const grid2 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
}

const label = {
  display: 'block',
  marginBottom: 8,
  fontSize: 12,
  color: '#6b7a99',
}

const input = {
  width: '100%',
  background: '#04060a',
  color: '#fff',
  border: '1px solid #1a2030',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
}

const fileInput = {
  width: '100%',
  background: '#04060a',
  color: '#fff',
  border: '1px solid #1a2030',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
}

const primaryButton = {
  background: '#5cb800',
  color: '#04060a',
  border: 'none',
  borderRadius: 8,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButton = {
  background: 'transparent',
  color: '#d8e0f0',
  border: '1px solid #1a2030',
  borderRadius: 8,
  padding: '10px 14px',
  cursor: 'pointer',
}

const errorBanner = {
  background: '#2a1111',
  border: '1px solid #5a2323',
  color: '#ff8f8f',
  borderRadius: 10,
  padding: 12,
  marginBottom: 16,
}

const successBanner = {
  background: '#102311',
  border: '1px solid #1e4f22',
  color: '#7fe28a',
  borderRadius: 10,
  padding: 12,
  marginBottom: 16,
}

const logoWrap = {
  width: 84,
  height: 84,
  borderRadius: 12,
  overflow: 'hidden',
  border: '1px solid #1a2030',
  background: '#04060a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const logoImage = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const logoPlaceholder = {
  color: '#6b7a99',
  fontSize: 12,
}

const th = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 11,
  color: '#6b7a99',
  textTransform: 'uppercase',
  borderBottom: '1px solid #1a2030',
}

const td = {
  padding: '12px 14px',
  color: '#d8e0f0',
  fontSize: 13,
}

const actionButton = {
  background: 'transparent',
  color: '#d8e0f0',
  border: '1px solid #1a2030',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  cursor: 'pointer',
}

const editButton = {
  background: '#5cb800',
  color: '#04060a',
  border: 'none',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}