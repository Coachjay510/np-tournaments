import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { useTournaments } from '../hooks/useTournaments'
import { formatCurrency, formatDateRange, statusColor, getInitials } from '../lib/utils'

function StatCard({ label, value, delta, valueColor }) {
  return (
    <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, padding:16 }}>
      <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'#4a5568', marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:'Anton, sans-serif', fontSize:32, color: valueColor || '#f0f4ff', lineHeight:1, letterSpacing:'0.5px' }}>{value}</div>
      {delta && <div style={{ fontSize:11, color:'#5cb800', marginTop:4 }}>{delta}</div>}
    </div>
  )
}

function Badge({ status }) {
  const c = statusColor(status)
  const labels = { draft:'Draft', registration_open:'Registration Open', registration_closed:'Reg. Closed', in_progress:'In Progress', completed:'Completed', cancelled:'Cancelled' }
  return (
    <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, letterSpacing:'0.3px', background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      {labels[status] || status}
    </span>
  )
}

export default function Dashboard({ director }) {
  const navigate = useNavigate()
  const { tournaments, loading } = useTournaments(director?.id)

  const activeTournaments = tournaments.filter(t => ['registration_open','registration_closed','in_progress'].includes(t.status))
  const totalTeams = tournaments.reduce((sum, t) => sum + (t.total_teams_registered || 0), 0)
  const totalRevenue = tournaments.reduce((sum, t) => sum + (parseFloat(t.total_revenue) || 0), 0)
  const pendingCount = 0 // will wire from registrations

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <Topbar
        title="DASHBOARD"
        actions={
          <>
            <button onClick={() => navigate('/tournaments')} style={{ background:'transparent', color:'#6b7a99', border:'1px solid #1a2030', padding:'8px 14px', borderRadius:8, fontSize:13 }}>
              View all
            </button>
            <button onClick={() => navigate('/tournaments')} style={{ background:'#5cb800', color:'#04060a', border:'none', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700 }}>
              + New Tournament
            </button>
          </>
        }
      />

      <div style={{ padding:24, overflowY:'auto', flex:1 }}>

        {/* Stat grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:28 }}>
          <StatCard label="Active Tournaments" value={activeTournaments.length} delta="This season" />
          <StatCard label="Teams Registered" value={totalTeams} delta="Across all events" />
          <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} delta="All tournaments" />
          <StatCard label="Pending Approvals" value={pendingCount} valueColor={pendingCount > 0 ? '#d4a017' : '#f0f4ff'} delta="Needs review" />
        </div>

        {/* Tournament list */}
        <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #1a2030', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#c0cce0', letterSpacing:'0.3px' }}>MY TOURNAMENTS</span>
            <span onClick={() => navigate('/tournaments')} style={{ fontSize:11, color:'#5cb800', cursor:'pointer' }}>View all →</span>
          </div>

          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#4a5568', fontSize:13 }}>Loading...</div>
          ) : tournaments.length === 0 ? (
            <div style={{ padding:40, textAlign:'center' }}>
              <div style={{ fontSize:13, color:'#4a5568', marginBottom:16 }}>No tournaments yet</div>
              <button onClick={() => navigate('/tournaments')} style={{ background:'#5cb800', color:'#04060a', border:'none', padding:'9px 20px', borderRadius:8, fontSize:13, fontWeight:700 }}>
                Create your first tournament
              </button>
            </div>
          ) : tournaments.slice(0, 5).map(t => (
            <div key={t.id} onClick={() => navigate(`/tournaments/${t.id}`)}
              style={{ display:'flex', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #0e1320', gap:14, cursor:'pointer', transition:'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background='#0a0f1a'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <div style={{ width:38, height:38, borderRadius:8, background:'#0d1a0a', border:'1px solid #1a3a0a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏆</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#d8e0f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize:11, color:'#4a5568', marginTop:2 }}>
                  {formatDateRange(t.start_date, t.end_date)}{t.city ? ` · ${t.city}, ${t.state}` : ''}
                </div>
                <div style={{ marginTop:6 }}><Badge status={t.status} /></div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#5cb800' }}>{formatCurrency(t.total_revenue)}</div>
                <div style={{ fontSize:11, color:'#4a5568', marginTop:2 }}>{t.total_teams_registered || 0} teams</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
