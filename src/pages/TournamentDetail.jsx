import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'
import { formatCurrency, formatDateRange, statusColor } from '../lib/utils'

export default function TournamentDetail({ director }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('tournaments').select('*, divisions(*)').eq('id', id).single(),
      supabase.from('teams').select('*, division:divisions(name)').eq('tournament_id', id).order('registered_at', { ascending: false })
    ]).then(([{ data: t }, { data: tm }]) => {
      setTournament(t)
      setTeams(tm || [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div style={{ padding:40, color:'#4a5568', fontSize:13 }}>Loading...</div>
  if (!tournament) return <div style={{ padding:40, color:'#e05555', fontSize:13 }}>Tournament not found</div>

  const c = statusColor(tournament.status)
  const approved = teams.filter(t => t.registration_status === 'approved').length
  const pending = teams.filter(t => t.registration_status === 'pending').length

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <Topbar title={tournament.name.toUpperCase()} actions={
        <>
          <button onClick={() => navigate('/registrations')} style={{ background:'transparent', color:'#6b7a99', border:'1px solid #1a2030', padding:'8px 14px', borderRadius:8, fontSize:13 }}>
            Registrations {pending > 0 && `(${pending})`}
          </button>
          <span style={{ fontSize:10, padding:'5px 10px', borderRadius:20, fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
            {tournament.status.replace(/_/g,' ')}
          </span>
        </>
      } />
      <div style={{ padding:24, overflowY:'auto', flex:1 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Teams', value:`${approved} / ${tournament.max_teams}` },
            { label:'Revenue', value:formatCurrency(tournament.total_revenue) },
            { label:'Divisions', value: tournament.divisions?.length || 0 },
            { label:'Pending', value:pending, color: pending > 0 ? '#d4a017' : '#f0f4ff' },
          ].map(s => (
            <div key={s.label} style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'#4a5568', marginBottom:8 }}>{s.label}</div>
              <div style={{ fontFamily:'Anton, sans-serif', fontSize:28, color: s.color || '#f0f4ff' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #1a2030' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#c0cce0' }}>REGISTERED TEAMS</span>
          </div>
          {teams.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'#4a5568', fontSize:13 }}>No teams registered yet</div>
          ) : teams.map(team => {
            const rc = statusColor(team.registration_status === 'approved' ? 'registration_open' : team.registration_status === 'rejected' ? 'cancelled' : 'draft')
            return (
              <div key={team.id} style={{ display:'flex', alignItems:'center', padding:'12px 18px', borderBottom:'1px solid #0e1320', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:8, background: team.color_primary || '#5cb800', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#04060a', flexShrink:0 }}>
                  {team.team_name.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#d8e0f0' }}>{team.team_name}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:2 }}>{team.org_name} · {team.division?.name || 'No division'}</div>
                </div>
                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, background:rc.bg, color:rc.color, border:`1px solid ${rc.border}` }}>
                  {team.registration_status}
                </span>
                <span style={{ fontSize:12, color: team.payment_status === 'paid' ? '#5cb800' : '#d4a017' }}>
                  {team.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
