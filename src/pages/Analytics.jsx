import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

function StatCard({ label, value, accent = '#f0f4ff', sub }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export default function Analytics({ director }) {
  const [tournaments, setTournaments] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!director?.id) return
    async function load() {
      const [tRes, ttRes] = await Promise.all([
        supabase.from('tournaments').select('*').eq('director_id', director.id),
        supabase.from('tournament_teams').select('*, tournaments!inner(director_id)').eq('tournaments.director_id', director.id),
      ])
      setTournaments(tRes.data || [])
      setTeams(ttRes.data || [])
      setLoading(false)
    }
    load()
  }, [director?.id])

  const totalRevenue = teams.reduce((sum, t) => sum + (parseFloat(t.custom_entry_fee) || 0), 0)
  const paidTeams = teams.filter(t => t.payment_status === 'paid').length
  const approvedTeams = teams.filter(t => t.approval_status === 'approved').length
  const activeTournaments = tournaments.filter(t => ['registration_open','in_progress','registration_closed'].includes(t.status))

  const byTournament = useMemo(() => {
    const map = {}
    tournaments.forEach(t => {
      map[t.id] = { name: t.name, teams: 0, revenue: 0, paid: 0, status: t.status }
    })
    teams.forEach(tt => {
      if (map[tt.tournament_id]) {
        map[tt.tournament_id].teams++
        map[tt.tournament_id].revenue += parseFloat(tt.custom_entry_fee) || 0
        if (tt.payment_status === 'paid') map[tt.tournament_id].paid++
      }
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [tournaments, teams])

  const formatCurrency = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="ANALYTICS" />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
              <StatCard label="Total Tournaments" value={tournaments.length} sub={`${activeTournaments.length} active`} />
              <StatCard label="Total Teams" value={teams.length} accent="#5cb800" sub={`${approvedTeams} approved`} />
              <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} accent="#d4a017" sub={`${paidTeams} paid teams`} />
              <StatCard label="Avg Teams/Tournament" value={tournaments.length ? Math.round(teams.length / tournaments.length) : 0} accent="#4a9eff" />
            </div>

            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>TOURNAMENT BREAKDOWN</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0f1a' }}>
                    {['Tournament', 'Status', 'Teams', 'Paid', 'Revenue'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byTournament.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0e1320' }}>
                      <td style={{ padding: '12px 14px', color: '#d8e0f0', fontWeight: 600 }}>{t.name}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                          background: t.status === 'in_progress' ? '#0d1a0a' : t.status === 'completed' ? '#071525' : '#1a1500',
                          color: t.status === 'in_progress' ? '#5cb800' : t.status === 'completed' ? '#4a9eff' : '#d4a017',
                          border: `1px solid ${t.status === 'in_progress' ? '#1a3a0a' : t.status === 'completed' ? '#0a2540' : '#3a3000'}` }}>
                          {t.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#c0cce0' }}>{t.teams}</td>
                      <td style={{ padding: '12px 14px', color: t.paid === t.teams && t.teams > 0 ? '#5cb800' : '#d4a017' }}>{t.paid}/{t.teams}</td>
                      <td style={{ padding: '12px 14px', color: '#5cb800', fontWeight: 700 }}>{formatCurrency(t.revenue)}</td>
                    </tr>
                  ))}
                  {byTournament.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No tournament data yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
