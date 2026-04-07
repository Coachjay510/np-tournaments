import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { useParams } from 'react-router-dom'
import { useOrganizationDetail } from '../hooks/useOrganizationDetail'

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: accent, lineHeight: 1, letterSpacing: '0.5px' }}>
        {value}
      </div>
    </div>
  )
}

export default function OrganizationDetail() {
  const { orgId } = useParams()
  const { organization, teams, loading, saving, error, refresh, saveOrganization } = useOrganizationDetail(orgId)

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
  })

  useEffect(() => {
    if (!organization) return
    setForm({
      org_name: organization.org_name || '',
      city: organization.city || '',
      state: organization.state || '',
      website: organization.website || '',
      primary_color: organization.primary_color || '',
      secondary_color: organization.secondary_color || '',
      contact_name: organization.contact_name || '',
      contact_email: organization.contact_email || '',
      contact_phone: organization.contact_phone || '',
    })
  }, [organization])

  async function handleSave() {
    await saveOrganization({
      org_name: form.org_name,
      city: form.city || null,
      state: form.state || null,
      website: form.website || null,
      primary_color: form.primary_color || null,
      secondary_color: form.secondary_color || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="ORGANIZATION DETAIL"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={refresh}
              style={{
                background: 'transparent',
                color: '#d8e0f0',
                border: '1px solid #1a2030',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Refresh
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#5cb800',
                color: '#04060a',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {saving ? 'Saving...' : 'Save Org'}
            </button>
          </div>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {error ? (
          <div style={{ color: '#ff9d7a', fontSize: 13 }}>Error: {error.message}</div>
        ) : loading ? (
          <div style={{ color: '#4a5568', fontSize: 13 }}>Loading organization...</div>
        ) : !organization ? (
          <div style={{ color: '#c0cce0', fontSize: 13 }}>Organization not found.</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 34, color: '#f0f4ff', lineHeight: 1 }}>
                {organization.org_name}
              </div>
              <div style={{ marginTop: 8, color: '#6b7a99', fontSize: 13 }}>
                Organization ID {organization.id}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              <StatCard label="Teams In Org" value={teams.length || 0} accent="#5cb800" />
              <StatCard label="Primary Color" value={organization.primary_color || '—'} accent={organization.primary_color || '#f0f4ff'} />
              <StatCard label="Secondary Color" value={organization.secondary_color || '—'} accent={organization.secondary_color || '#f0f4ff'} />
              <StatCard label="Website" value={organization.website ? 'Linked' : '—'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={panelStyle}>
                <div style={panelTitle}>Edit Organization</div>

                <div style={formGridStyle}>
                  <label style={labelStyle}>
                    Organization Name
                    <input value={form.org_name} onChange={(e) => setForm((prev) => ({ ...prev, org_name: e.target.value }))} style={inputStyle} />
                  </label>

                  <label style={labelStyle}>
                    Website
                    <input value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} style={inputStyle} />
                  </label>

                  <label style={labelStyle}>
                    City
                    <input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} style={inputStyle} />
                  </label>

                  <label style={labelStyle}>
                    State
                    <input value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} style={inputStyle} />
                  </label>

                  <label style={labelStyle}>
                    Primary Color
                    <input value={form.primary_color} onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))} style={inputStyle} />
                  </label>

                  <label style={labelStyle}>
                    Secondary Color
                    <input value={form.secondary_color} onChange={(e) => setForm((prev) => ({ ...prev, secondary_color: e.target.value }))} style={inputStyle} />
                  </label>
                </div>
              </div>

              <div style={panelStyle}>
                <div style={panelTitle}>Contact Information</div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={labelStyle}>
                    Contact Name
                    <input value={form.contact_name} onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))} style={inputStyle} />
                  </label>

                  <label style={labelStyle}>
                    Contact Email
                    <input value={form.contact_email} onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))} style={inputStyle} />
                  </label>

                  <label style={labelStyle}>
                    Contact Phone
                    <input value={form.contact_phone} onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))} style={inputStyle} />
                  </label>
                </div>
              </div>
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Organization Teams</div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Team', 'Division', 'Rank', 'Level', 'Wins', 'Losses', 'Points'].map((label) => (
                        <th
                          key={label}
                          style={{
                            textAlign: 'left',
                            padding: '12px 14px',
                            fontSize: 11,
                            color: '#6b7a99',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            borderBottom: '1px solid #1a2030',
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <tr key={team.id} style={{ borderBottom: '1px solid #0e1320' }}>
                        <td style={tableCellStyle}>{team.display_name}</td>
                        <td style={tableCellStyle}>{team.ranking_division_key}</td>
                        <td style={tableCellStyle}>{team.ranking?.rank ? `#${team.ranking.rank}` : '—'}</td>
                        <td style={tableCellStyle}>{team.ranking?.skill_level || '—'}</td>
                        <td style={{ ...tableCellStyle, color: '#5cb800' }}>{team.ranking?.wins ?? 0}</td>
                        <td style={{ ...tableCellStyle, color: '#ff9d7a' }}>{team.ranking?.losses ?? 0}</td>
                        <td style={tableCellStyle}>{team.ranking?.ranking_points ?? 0}</td>
                      </tr>
                    ))}

                    {!teams.length && (
                      <tr>
                        <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#4a5568' }}>
                          No teams assigned yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const panelStyle = {
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 12,
  padding: 16,
}

const panelTitle = {
  color: '#f0f4ff',
  fontWeight: 700,
  marginBottom: 14,
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
}

const labelStyle = {
  display: 'grid',
  gap: 6,
  color: '#c0cce0',
  fontSize: 12,
  fontWeight: 700,
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

const tableCellStyle = {
  padding: '13px 14px',
  color: '#c0cce0',
}
