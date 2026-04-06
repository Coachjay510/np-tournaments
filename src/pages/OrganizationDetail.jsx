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
  const { organization, teams, loading, error, refresh } = useOrganizationDetail(orgId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="ORGANIZATION DETAIL"
        actions={
          <button
            onClick={refresh}
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
            Refresh Org
          </button>
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
                {[organization.city, organization.state].filter(Boolean).join(', ') || 'No location yet'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              <StatCard label="Teams In Org" value={teams.length || 0} accent="#5cb800" />
              <StatCard label="Website" value={organization.website ? 'Linked' : '—'} />
              <StatCard label="Primary Color" value={organization.primary_color || '—'} accent={organization.primary_color || '#f0f4ff'} />
              <StatCard label="Secondary Color" value={organization.secondary_color || '—'} accent={organization.secondary_color || '#f0f4ff'} />
            </div>

            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0', letterSpacing: '0.3px' }}>
                  ORGANIZATION TEAMS
                </div>
                <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
                  All master teams currently assigned to this organization
                </div>
              </div>

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
                        <td style={{ padding: '13px 14px', color: '#d8e0f0', fontWeight: 600 }}>{team.display_name}</td>
                        <td style={{ padding: '13px 14px', color: '#6b7a99', fontSize: 12 }}>{team.ranking_division_key}</td>
                        <td style={{ padding: '13px 14px', color: '#d4a017', fontWeight: 700 }}>
                          {team.ranking?.rank ? `#${team.ranking.rank}` : '—'}
                        </td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{team.ranking?.skill_level || '—'}</td>
                        <td style={{ padding: '13px 14px', color: '#5cb800' }}>{team.ranking?.wins ?? 0}</td>
                        <td style={{ padding: '13px 14px', color: '#ff9d7a' }}>{team.ranking?.losses ?? 0}</td>
                        <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{team.ranking?.ranking_points ?? 0}</td>
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
