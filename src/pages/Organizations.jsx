import { Link } from 'react-router-dom'
import { useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { useOrganizations } from '../hooks/useOrganizations'
import OrganizationModal from '../components/orgs/OrganizationModal'

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

export default function Organizations() {
  const { organizations, loading, error, refresh } = useOrganizations()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="ORGANIZATIONS"
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
              onClick={() => setOpen(true)}
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
              Create Org
            </button>
          </div>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Organizations" value={organizations.length || 0} accent="#5cb800" />
          <StatCard label="Current #1" value={organizations[0]?.org_name || '—'} />
          <StatCard label="Top Ranked Teams" value={organizations[0]?.ranked_teams || 0} accent="#d4a017" />
          <StatCard label="Top Org Points" value={organizations[0]?.ranking_points || 0} accent="#1e88ff" />
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0', letterSpacing: '0.3px' }}>
              NEXT PLAY ORG RANKINGS
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
              Program rankings based on all linked teams in each organization
            </div>
          </div>

          {error ? (
            <div style={{ padding: 24, color: '#ff9d7a', fontSize: 13 }}>Error: {error.message}</div>
          ) : loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>Loading organizations...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0f1a' }}>
                    {['Rank', 'Organization', 'Teams', 'Wins', 'Losses', 'Points', 'SOS', 'Actions'].map((label) => (
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
                  {organizations.map((org) => (
                    <tr key={org.organization_id} style={{ borderBottom: '1px solid #0e1320' }}>
                      <td style={{ padding: '13px 14px', color: '#d4a017', fontWeight: 700 }}>#{org.rank}</td>
                      <td style={{ padding: '13px 14px', color: '#d8e0f0', fontWeight: 600 }}>{org.org_name}</td>
                      <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{org.ranked_teams}</td>
                      <td style={{ padding: '13px 14px', color: '#5cb800' }}>{org.wins}</td>
                      <td style={{ padding: '13px 14px', color: '#ff9d7a' }}>{org.losses}</td>
                      <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{org.ranking_points}</td>
                      <td style={{ padding: '13px 14px', color: '#c0cce0' }}>{Number(org.opponent_strength || 0).toFixed(2)}</td>
                      <td style={{ padding: '13px 14px' }}>
                        <Link
                          to={`/organizations/${org.organization_id}`}
                          style={{
                            background: '#1e88ff',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <OrganizationModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
    </div>
  )
}
