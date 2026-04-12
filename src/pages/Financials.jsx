import { useEffect, useState, useMemo } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

export default function Financials({ director }) {
  const [tournaments, setTournaments] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedTournament, setSelectedTournament] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!director?.id) return
    async function load() {
      const { data: tData } = await supabase.from('tournaments').select('*').eq('director_id', director.id).order('start_date', { ascending: false })
      const { data: ttData } = await supabase.from('tournament_teams').select('*, tournaments!inner(name, director_id, registration_fee)').eq('tournaments.director_id', director.id)
      setTournaments(tData || [])
      setTeams(ttData || [])
      setLoading(false)
    }
    load()
  }, [director?.id])

  const filtered = selectedTournament === 'all' ? teams : teams.filter(t => t.tournament_id === selectedTournament)
  const totalRevenue = filtered.reduce((sum, t) => sum + (parseFloat(t.custom_entry_fee) || 0), 0)
  const paidRevenue = filtered.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (parseFloat(t.custom_entry_fee) || 0), 0)
  const unpaidRevenue = totalRevenue - paidRevenue
  const formatCurrency = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="FINANCIALS" />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)} style={{ ...inputStyle, minWidth: 280 }}>
                <option value="all">All Tournaments</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>Total Expected</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: '#f0f4ff', lineHeight: 1 }}>{formatCurrency(totalRevenue)}</div>
                <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>{filtered.length} teams</div>
              </div>
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>Collected</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: '#5cb800', lineHeight: 1 }}>{formatCurrency(paidRevenue)}</div>
                <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>{filtered.filter(t => t.payment_status === 'paid').length} paid</div>
              </div>
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>Outstanding</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: unpaidRevenue > 0 ? '#d4a017' : '#5cb800', lineHeight: 1 }}>{formatCurrency(unpaidRevenue)}</div>
                <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>{filtered.filter(t => t.payment_status !== 'paid').length} unpaid</div>
              </div>
            </div>

            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>PAYMENT DETAILS</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0f1a' }}>
                    {['Tournament', 'Team ID', 'Entry Fee', 'Payment', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #0e1320' }}>
                      <td style={{ padding: '11px 14px', color: '#c0cce0', fontSize: 12 }}>{t.tournaments?.name || '—'}</td>
                      <td style={{ padding: '11px 14px', color: '#4a5568', fontSize: 12 }}>{t.team_id}</td>
                      <td style={{ padding: '11px 14px', color: '#d8e0f0', fontWeight: 600 }}>{t.custom_entry_fee ? formatCurrency(t.custom_entry_fee) : '—'}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 11, color: t.payment_status === 'paid' ? '#5cb800' : '#d4a017', fontWeight: 700 }}>
                          {t.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                          background: t.approval_status === 'approved' ? '#0d1a0a' : '#1a1500',
                          color: t.approval_status === 'approved' ? '#5cb800' : '#d4a017',
                          border: `1px solid ${t.approval_status === 'approved' ? '#1a3a0a' : '#3a3000'}` }}>
                          {t.approval_status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No payment data yet</td></tr>
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
