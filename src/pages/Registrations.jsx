import { useState, useEffect } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'
import { useRegistrations } from '../hooks/useRegistrations'

const statusColors = {
  approved: { bg: '#0d1a0a', color: '#5cb800', border: '#1a3a0a' },
  pending:  { bg: '#1a1500', color: '#d4a017', border: '#3a3000' },
  waitlisted: { bg: '#071525', color: '#4a9eff', border: '#0a2540' },
  rejected: { bg: '#1f0707', color: '#e05555', border: '#3a0a0a' },
}

function StatusBadge({ value, onChange }) {
  return (
    <select
      value={value || 'pending'}
      onChange={e => onChange(e.target.value)}
      style={{
        background: statusColors[value]?.bg || '#1a1500',
        color: statusColors[value]?.color || '#d4a017',
        border: `1px solid ${statusColors[value]?.border || '#3a3000'}`,
        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', outline: 'none', appearance: 'none',
        WebkitAppearance: 'none',
      }}
    >
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="waitlisted">Waitlisted</option>
      <option value="rejected">Rejected</option>
    </select>
  )
}

function PaymentBadge({ value, onChange }) {
  const paid = value === 'paid'
  return (
    <select
      value={value || 'unpaid'}
      onChange={e => onChange(e.target.value)}
      style={{
        background: paid ? '#0d1a0a' : '#1a1000',
        color: paid ? '#5cb800' : '#d4a017',
        border: `1px solid ${paid ? '#1a3a0a' : '#3a2a00'}`,
        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', outline: 'none', appearance: 'none',
        WebkitAppearance: 'none',
      }}
    >
      <option value="unpaid">⚠ Unpaid</option>
      <option value="paid">✓ Paid</option>
    </select>
  )
}

export default function Registrations({ director }) {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [filter, setFilter] = useState('all')
  const { registrations, loading, refetch } = useRegistrations(selectedTournament)

  useEffect(() => {
    if (!director?.id) return
    supabase.from('tournaments').select('id, name').eq('director_id', director.id)
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        setTournaments(data || [])
        if (data?.[0]) setSelectedTournament(data[0].id)
      })
  }, [director?.id])

  async function updateStatus(teamId, approval_status) {
    await supabase.from('tournament_teams').update({ approval_status }).eq('id', teamId)
    refetch()
  }

  async function updatePayment(teamId, payment_status) {
    await supabase.from('tournament_teams').update({ payment_status }).eq('id', teamId)
    refetch()
  }

  const filtered = filter === 'all'
    ? registrations
    : registrations.filter(r => r.registration_status === filter)

  const counts = {
    all: registrations.length,
    pending: registrations.filter(r => r.registration_status === 'pending').length,
    approved: registrations.filter(r => r.registration_status === 'approved').length,
    waitlisted: registrations.filter(r => r.registration_status === 'waitlisted').length,
    rejected: registrations.filter(r => r.registration_status === 'rejected').length,
  }

  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="REGISTRATIONS" />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedTournament || ''} onChange={e => setSelectedTournament(e.target.value)} style={{ ...inputStyle, minWidth: 240 }}>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(counts).map(([key, count]) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid', cursor: 'pointer',
                  background: filter === key ? '#5cb800' : 'transparent',
                  color: filter === key ? '#04060a' : '#6b7a99',
                  borderColor: filter === key ? '#5cb800' : '#1a2030',
                }}>
                {key.charAt(0).toUpperCase() + key.slice(1)} {count > 0 && `(${count})`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Teams', value: counts.all, accent: '#f0f4ff' },
            { label: 'Approved', value: counts.approved, accent: '#5cb800' },
            { label: 'Pending', value: counts.pending, accent: '#d4a017' },
            { label: 'Paid', value: registrations.filter(r => r.payment_status === 'paid').length, accent: '#4a9eff' },
          ].map(s => (
            <div key={s.label} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: s.accent, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Team list */}
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>REGISTERED TEAMS</span>
            <span style={{ fontSize: 11, color: '#4a5568' }}>{filtered.length} teams</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No {filter} registrations</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0a0f1a' }}>
                  {['Team', 'Org', 'Division', 'Entry Fee', 'Payment', 'Status', 'Notes'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(team => (
                  <tr key={team.id} style={{ borderBottom: '1px solid #0e1320' }}>
                    <td style={{ padding: '13px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{team.team_name}</div>
                      <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{team.gender} · {team.age_group}</div>
                    </td>
                    <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>{team.org_name}</td>
                    <td style={{ padding: '13px 14px', color: '#6b7a99', fontSize: 12 }}>{team.division_key}</td>
                    <td style={{ padding: '13px 14px', color: '#c0cce0', fontSize: 12 }}>
                      {team.custom_entry_fee ? `$${team.custom_entry_fee}` : '—'}
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <PaymentBadge value={team.payment_status} onChange={val => updatePayment(team.id, val)} />
                    </td>
                    <td style={{ padding: '13px 14px' }}>
                      <StatusBadge value={team.registration_status} onChange={val => updateStatus(team.id, val)} />
                    </td>
                    <td style={{ padding: '13px 14px', color: '#4a5568', fontSize: 12 }}>
                      {team.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
