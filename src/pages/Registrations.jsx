import { useState, useEffect } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'
import { useRegistrations } from '../hooks/useRegistrations'
import { registrationStatusColor } from '../lib/utils'

export default function Registrations({ director }) {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [filter, setFilter] = useState('pending')
  const { registrations, loading, approveTeam, rejectTeam, waitlistTeam } = useRegistrations(selectedTournament)

  useEffect(() => {
    if (!director?.id) return
    supabase.from('tournaments').select('id, name').eq('director_id', director.id).order('start_date', { ascending: false })
      .then(({ data }) => {
        setTournaments(data || [])
        if (data?.[0]) setSelectedTournament(data[0].id)
      })
  }, [director?.id])

  const filtered = filter === 'all' ? registrations : registrations.filter(r => r.registration_status === filter)
  const counts = { all: registrations.length, pending: registrations.filter(r => r.registration_status === 'pending').length, approved: registrations.filter(r => r.registration_status === 'approved').length, waitlisted: registrations.filter(r => r.registration_status === 'waitlisted').length }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <Topbar title="REGISTRATIONS" />
      <div style={{ padding:24, overflowY:'auto', flex:1 }}>

        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <select value={selectedTournament || ''} onChange={e => setSelectedTournament(e.target.value)}
            style={{ minWidth:240 }}>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div style={{ display:'flex', gap:6 }}>
            {Object.entries(counts).map(([key, count]) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:600, border:'1px solid', cursor:'pointer',
                  background: filter === key ? '#5cb800' : 'transparent',
                  color: filter === key ? '#04060a' : '#6b7a99',
                  borderColor: filter === key ? '#5cb800' : '#1a2030',
                }}>
                {key.charAt(0).toUpperCase() + key.slice(1)} {count > 0 && `(${count})`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#4a5568', fontSize:13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#4a5568', fontSize:13 }}>No {filter} registrations</div>
          ) : filtered.map(team => {
            const c = registrationStatusColor(team.registration_status)
            return (
              <div key={team.id} style={{ display:'flex', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #0e1320', gap:14 }}>
                <div style={{ width:38, height:38, borderRadius:8, background:'#0d1a0a', border:'1px solid #1a3a0a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#5cb800', flexShrink:0 }}>
                  {team.team_name?.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#d8e0f0' }}>{team.team_name}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:2 }}>
                    {team.org_name} · {team.division?.name || 'No division'} · {team.coach_email || 'No email'}
                  </div>
                </div>
                <span style={{ fontSize:11, color: team.payment_status === 'paid' ? '#5cb800' : '#d4a017', flexShrink:0 }}>
                  {team.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                </span>
                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}`, flexShrink:0 }}>
                  {team.registration_status}
                </span>
                {team.registration_status === 'pending' && (
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => approveTeam(team.id)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, background:'#0d1a0a', color:'#5cb800', border:'1px solid #1a3a0a', cursor:'pointer' }}>✓ Approve</button>
                    <button onClick={() => waitlistTeam(team.id)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, background:'#071525', color:'#4a9eff', border:'1px solid #0a2540', cursor:'pointer' }}>Waitlist</button>
                    <button onClick={() => rejectTeam(team.id)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, background:'#1f0707', color:'#e05555', border:'1px solid #3a0a0a', cursor:'pointer' }}>✕</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
