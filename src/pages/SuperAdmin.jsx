import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

export default function SuperAdmin({ director }) {
  const [directors, setDirectors] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('directors')

  useEffect(() => {
    if (!director?.is_super_admin) return
    loadAll()
  }, [director?.is_super_admin])

  async function loadAll() {
    setLoading(true)
    const [dRes, tRes] = await Promise.all([
      supabase.from('directors').select('*').order('created_at', { ascending: false }),
      supabase.from('tournaments').select('*, directors(display_name, email)').order('created_at', { ascending: false }),
    ])
    setDirectors(dRes.data || [])
    setTournaments(tRes.data || [])
    setLoading(false)
  }

  if (!director?.is_super_admin) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Access denied</div>
  )

  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }
  const td = { padding: '12px 14px', borderBottom: '1px solid #0e1320' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="SUPER ADMIN" />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Directors', value: directors.length, accent: '#5cb800' },
            { label: 'Total Tournaments', value: tournaments.length, accent: '#4a9eff' },
            { label: 'Active Tournaments', value: tournaments.filter(t => t.status === 'in_progress' || t.status === 'registration_open').length, accent: '#d4a017' },
          ].map(s => (
            <div key={s.label} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['directors', 'Directors'], ['tournaments', 'All Tournaments']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: activeTab === id ? '#5cb800' : 'transparent', color: activeTab === id ? '#04060a' : '#6b7a99', border: `1px solid ${activeTab === id ? '#5cb800' : '#1a2030'}` }}>{label}</button>
          ))}
        </div>

        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div> : (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
            {activeTab === 'directors' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#0a0f1a' }}>{['Name','Email','Org','Joined',''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {directors.map(d => (
                    <tr key={d.id}>
                      <td style={{ ...td, color: '#d8e0f0', fontWeight: 600 }}>{d.display_name || '—'}</td>
                      <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{d.email}</td>
                      <td style={{ ...td, color: '#4a9eff', fontSize: 12 }}>{d.org_id || '—'}</td>
                      <td style={{ ...td, color: '#4a5568', fontSize: 12 }}>{d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</td>
                      <td style={td}>
                        {d.email === 'nextplaysports.ca@gmail.com' && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#1f0707', color: '#e05555', border: '1px solid #3a0a0a' }}>SUPER ADMIN</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'tournaments' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#0a0f1a' }}>{['Tournament','Director','Status','Teams','Created'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {tournaments.map(t => (
                    <tr key={t.id}>
                      <td style={{ ...td, color: '#d8e0f0', fontWeight: 600 }}>{t.name}</td>
                      <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{t.directors?.display_name || t.directors?.email || '—'}</td>
                      <td style={td}>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: t.status === 'in_progress' ? '#0d1a0a' : '#1a1500', color: t.status === 'in_progress' ? '#5cb800' : '#d4a017', border: `1px solid ${t.status === 'in_progress' ? '#1a3a0a' : '#3a3000'}` }}>
                          {t.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ ...td, color: '#c0cce0' }}>{t.total_teams_registered || 0}</td>
                      <td style={{ ...td, color: '#4a5568', fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
