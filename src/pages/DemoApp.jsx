import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Demo Data ──────────────────────────────────────────────────────────────
const DIRECTOR = { display_name: 'Coach Jay (Demo)', email: 'demo@nptournaments.com', org_id: 'demo' }

const TOURNAMENT = {
  id: 'demo-t1', name: 'All-Star Movie Classic 2026', slug: 'movie-classic-2026',
  status: 'registration_open', start_date: '2026-04-19', end_date: '2026-04-20',
  city: 'Oakland', state: 'CA', max_teams: 32, registration_fee: 150,
  bracket_format: 'pool_then_bracket', total_revenue: 1650,
}

const TEAMS = [
  { id: 1, team_name: 'Tune Squad', org_name: 'Space Jam', division_key: '13u_boys', gender: 'Boys', payment_status: 'paid', approval_status: 'approved' },
  { id: 2, team_name: 'Richmond Oilers', org_name: 'Coach Carter', division_key: '13u_boys', gender: 'Boys', payment_status: 'paid', approval_status: 'approved' },
  { id: 3, team_name: 'Birdmen', org_name: 'Above the Rim', division_key: '13u_boys', gender: 'Boys', payment_status: 'paid', approval_status: 'approved' },
  { id: 4, team_name: 'Western Univ.', org_name: 'Blue Chips', division_key: '13u_boys', gender: 'Boys', payment_status: 'unpaid', approval_status: 'approved' },
  { id: 5, team_name: 'Coney Island', org_name: 'He Got Game', division_key: '13u_boys', gender: 'Boys', payment_status: 'paid', approval_status: 'approved' },
  { id: 6, team_name: 'Venice Beach', org_name: "White Men Can't Jump", division_key: '13u_boys', gender: 'Boys', payment_status: 'unpaid', approval_status: 'pending' },
  { id: 7, team_name: 'UW Huskies', org_name: '6th Man', division_key: '14u_boys', gender: 'Boys', payment_status: 'paid', approval_status: 'approved' },
  { id: 8, team_name: 'Winabi Tribe', org_name: 'Air Up There', division_key: '14u_boys', gender: 'Boys', payment_status: 'paid', approval_status: 'approved' },
  { id: 9, team_name: 'Crenshaw High', org_name: 'Love & Basketball', division_key: '14u_boys', gender: 'Boys', payment_status: 'unpaid', approval_status: 'approved' },
  { id: 10, team_name: 'LA Knights', org_name: 'Like Mike', division_key: '14u_boys', gender: 'Boys', payment_status: 'paid', approval_status: 'approved' },
  { id: 11, team_name: 'Juwanna Stars', org_name: 'Juwanna Mann', division_key: '13u_girls', gender: 'Girls', payment_status: 'paid', approval_status: 'approved' },
]

const GAMES = [
  { id: 'g1', home_team_name: 'Tune Squad', away_team_name: 'Western Univ.', pool_name: 'Pool A', court: 'We Gym - Court 1', scheduled_date: '2026-04-19', scheduled_time: '09:00', status: 'completed', home_score: 72, away_score: 65 },
  { id: 'g2', home_team_name: 'Richmond Oilers', away_team_name: 'Coney Island', pool_name: 'Pool A', court: 'We Gym - Court 2', scheduled_date: '2026-04-19', scheduled_time: '09:00', status: 'completed', home_score: 68, away_score: 71 },
  { id: 'g3', home_team_name: 'Tune Squad', away_team_name: 'Coney Island', pool_name: 'Pool A', court: 'We Gym - Court 1', scheduled_date: '2026-04-19', scheduled_time: '10:30', status: 'scheduled' },
  { id: 'g4', home_team_name: 'Western Univ.', away_team_name: 'Richmond Oilers', pool_name: 'Pool A', court: 'We Gym - Court 2', scheduled_date: '2026-04-19', scheduled_time: '10:30', status: 'scheduled' },
  { id: 'g5', home_team_name: 'Birdmen', away_team_name: 'Venice Beach', pool_name: 'Pool B', court: 'We Gym - Court 1', scheduled_date: '2026-04-19', scheduled_time: '12:00', status: 'scheduled' },
  { id: 'g6', home_team_name: 'UW Huskies', away_team_name: 'Winabi Tribe', pool_name: 'Pool B', court: 'We Gym - Court 2', scheduled_date: '2026-04-19', scheduled_time: '12:00', status: 'scheduled' },
  { id: 'g7', home_team_name: 'TBD', away_team_name: 'TBD', round: 'Semifinal', bracket_slot: 'SF1', court: 'We Gym - Court 1', scheduled_date: '2026-04-20', scheduled_time: '14:00', status: 'scheduled' },
  { id: 'g8', home_team_name: 'TBD', away_team_name: 'TBD', round: 'Semifinal', bracket_slot: 'SF2', court: 'We Gym - Court 2', scheduled_date: '2026-04-20', scheduled_time: '14:00', status: 'scheduled' },
  { id: 'g9', home_team_name: 'TBD', away_team_name: 'TBD', round: 'Final', bracket_slot: 'FINAL', court: 'We Gym - Court 1', scheduled_date: '2026-04-20', scheduled_time: '16:00', status: 'scheduled' },
]

const INVENTORY = [
  { id: 1, item_name: 'Hot Dogs', category: 'food', pack_size: 12, pack_cost: 10, packs_bought: 5, sell_price: 3, units_sold: 38 },
  { id: 2, item_name: 'Hot Dog Buns', category: 'food', pack_size: 8, pack_cost: 4, packs_bought: 8, sell_price: 0, units_sold: 0 },
  { id: 3, item_name: 'Water Bottles', category: 'beverage', pack_size: 24, pack_cost: 8, packs_bought: 4, sell_price: 2, units_sold: 67 },
  { id: 4, item_name: 'Gatorade', category: 'beverage', pack_size: 12, pack_cost: 14, packs_bought: 3, sell_price: 3, units_sold: 29 },
  { id: 5, item_name: 'NP Hoopz T-Shirt', category: 'merchandise', pack_size: 1, pack_cost: 8, packs_bought: 50, sell_price: 25, units_sold: 23 },
  { id: 6, item_name: 'Chips', category: 'food', pack_size: 30, pack_cost: 15, packs_bought: 2, sell_price: 2, units_sold: 41 },
]

const ANNOUNCEMENTS = [
  { id: 1, type: 'info', title: 'Schedule Posted', message: 'The full schedule for All-Star Movie Classic 2026 is now live. Check your pool assignments and game times.', created_at: '2026-04-10T10:00:00Z' },
  { id: 2, type: 'warning', title: 'Check-In Reminder', message: 'All teams must check in at least 30 minutes before their first game. Photo ID required for all players.', created_at: '2026-04-12T08:00:00Z' },
  { id: 3, type: 'urgent', title: 'Court Change', message: 'Pool B games have been moved from Court 3 to Court 2 starting at 12:00 PM. Please update your schedules.', created_at: '2026-04-12T09:30:00Z' },
]

const STAFF = [
  { id: 1, name: 'Marcus Williams', email: 'marcus@demo.com', role: 'referee', status: 'active' },
  { id: 2, name: 'Jerome Davis', email: 'jerome@demo.com', role: 'referee', status: 'active' },
  { id: 3, name: 'Lisa Chen', email: 'lisa@demo.com', role: 'scorekeeper', status: 'active' },
  { id: 4, name: 'Tony Alvarez', email: 'tony@demo.com', role: 'coordinator', status: 'invited' },
]

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  sidebar: { width: 220, background: '#080c12', borderRight: '1px solid #1a2030', display: 'flex', flexDirection: 'column', minHeight: '100vh', flexShrink: 0 },
  navItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 13, color: active ? '#5cb800' : '#6b7a99', cursor: 'pointer', marginBottom: 1, background: active ? '#0d1a0a' : 'transparent', border: 'none', width: '100%', textAlign: 'left' }),
  card: { background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' },
  td: { padding: '11px 14px', color: '#d8e0f0', fontSize: 13, borderBottom: '1px solid #0e1320' },
  badge: (color) => ({ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: color === 'green' ? '#0d1a0a' : color === 'yellow' ? '#1a1500' : color === 'red' ? '#1f0707' : '#071525', color: color === 'green' ? '#5cb800' : color === 'yellow' ? '#d4a017' : color === 'red' ? '#e05555' : '#4a9eff', border: `1px solid ${color === 'green' ? '#1a3a0a' : color === 'yellow' ? '#3a3000' : color === 'red' ? '#3a0a0a' : '#0a2540'}` }),
}

const fmt = (n) => `$${parseFloat(n||0).toFixed(2)}`

// ── Pages ──────────────────────────────────────────────────────────────────
function Dashboard({ setPage }) {
  const paid = TEAMS.filter(t => t.payment_status === 'paid').length
  const revenue = TEAMS.filter(t => t.payment_status === 'paid').length * 150
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 4 }}>DASHBOARD</div>
      <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 24 }}>Welcome back, Coach Jay</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Tournaments', value: 1, accent: '#5cb800' },
          { label: 'Total Teams', value: TEAMS.length, accent: '#4a9eff' },
          { label: 'Revenue', value: fmt(revenue), accent: '#d4a017' },
          { label: 'Games Scheduled', value: GAMES.length, accent: '#f0f4ff' },
        ].map(s => (
          <div key={s.label} style={S.card}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.card}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#c0cce0', marginBottom: 14 }}>UPCOMING TOURNAMENT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', marginBottom: 6 }}>{TOURNAMENT.name}</div>
          <div style={{ fontSize: 13, color: '#6b7a99', marginBottom: 4 }}>📅 Apr 19–20, 2026 · Oakland, CA</div>
          <div style={{ fontSize: 13, color: '#6b7a99', marginBottom: 16 }}>👥 {TEAMS.length}/32 teams · {paid} paid</div>
          <button onClick={() => setPage('tournament')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            View Tournament →
          </button>
        </div>
        <div style={S.card}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#c0cce0', marginBottom: 14 }}>RECENT ANNOUNCEMENTS</div>
          {ANNOUNCEMENTS.slice(0,2).map(a => (
            <div key={a.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #0e1320' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={S.badge(a.type === 'urgent' ? 'red' : a.type === 'warning' ? 'yellow' : 'blue')}>{a.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{a.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7a99' }}>{a.message.substring(0, 80)}...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TournamentPage() {
  const paid = TEAMS.filter(t => t.payment_status === 'paid').length
  const pending = TEAMS.filter(t => t.approval_status === 'pending').length
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>TOURNAMENT DETAIL</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Teams', value: `${TEAMS.length}/32` },
          { label: 'Revenue', value: fmt(paid * 150), accent: '#5cb800' },
          { label: 'Divisions', value: 3, accent: '#d4a017' },
          { label: 'Pending', value: pending, accent: pending > 0 ? '#d4a017' : '#f0f4ff' },
        ].map(s => (
          <div key={s.label} style={S.card}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: s.accent || '#f0f4ff' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 16 }}>TOURNAMENT TEAMS ({TEAMS.length})</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0a0f1a' }}>
              {['Team', 'Org', 'Division', 'Payment', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {TEAMS.map(t => (
              <tr key={t.id}>
                <td style={{ ...S.td, fontWeight: 600 }}>{t.team_name}</td>
                <td style={{ ...S.td, color: '#6b7a99' }}>{t.org_name}</td>
                <td style={{ ...S.td, color: '#4a9eff', fontSize: 11 }}>{t.division_key}</td>
                <td style={S.td}><span style={S.badge(t.payment_status === 'paid' ? 'green' : 'yellow')}>{t.payment_status}</span></td>
                <td style={S.td}><span style={S.badge(t.approval_status === 'approved' ? 'green' : 'yellow')}>{t.approval_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SchedulePage() {
  const [activeDiv, setActiveDiv] = useState('13u_boys')
  const divs = [...new Set(TEAMS.map(t => t.division_key))]
  const pools = {}
  GAMES.filter(g => g.pool_name).forEach(g => {
    if (!pools[g.pool_name]) pools[g.pool_name] = []
    pools[g.pool_name].push(g)
  })
  const bracketGames = GAMES.filter(g => g.round)
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>SCHEDULE</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {divs.map(d => (
          <button key={d} onClick={() => setActiveDiv(d)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: activeDiv === d ? '#5cb800' : '#1a2a4a', color: activeDiv === d ? '#04060a' : '#7eb3ff' }}>{d}</button>
        ))}
      </div>
      {Object.entries(pools).map(([pool, games]) => (
        <div key={pool} style={{ ...S.card, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#d4a017' }}>{pool}</span>
            <span style={{ fontSize: 11, color: '#4a5568' }}>{games.length} games</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#0a0f1a' }}>{['#','Home','Away','Court','Time','Score'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {games.map((g, i) => (
                <tr key={g.id}>
                  <td style={{ ...S.td, color: '#4a5568' }}>{i+1}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: g.status === 'completed' && g.home_score > g.away_score ? '#5cb800' : '#d8e0f0' }}>{g.home_team_name}</td>
                  <td style={{ ...S.td, color: g.status === 'completed' && g.away_score > g.home_score ? '#5cb800' : '#d8e0f0' }}>{g.away_team_name}</td>
                  <td style={{ ...S.td, color: '#4a9eff', fontSize: 11 }}>{g.court}</td>
                  <td style={{ ...S.td, color: '#6b7a99', fontSize: 11 }}>{g.scheduled_time}</td>
                  <td style={S.td}>{g.status === 'completed' ? <span style={{ color: '#5cb800', fontWeight: 700 }}>{g.home_score} - {g.away_score}</span> : <span style={{ color: '#4a5568' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {bracketGames.length > 0 && (
        <div style={S.card}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#c0cce0', marginBottom: 16 }}>ELIMINATION BRACKET</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Semifinal', 'Final'].map(round => (
              <div key={round} style={{ minWidth: 200 }}>
                <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', marginBottom: 8 }}>{round}</div>
                {bracketGames.filter(g => g.round === round).map(g => (
                  <div key={g.id} style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, overflow: 'hidden', marginBottom: 8, width: 190 }}>
                    <div style={{ padding: '3px 8px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, color: '#4a9eff' }}>{g.court}</span>
                      <span style={{ fontSize: 9, color: '#4a5568' }}>{g.scheduled_time}</span>
                    </div>
                    {[g.home_team_name, g.away_team_name].map((name, i) => (
                      <div key={i} style={{ padding: '6px 8px', borderBottom: i === 0 ? '1px solid #1a2030' : 'none', fontSize: 11, color: '#d8e0f0' }}>{name}</div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsPage() {
  const revenue = TEAMS.filter(t => t.payment_status === 'paid').length * 150
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>ANALYTICS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Tournaments', value: 1 },
          { label: 'Total Teams', value: TEAMS.length, accent: '#5cb800' },
          { label: 'Total Revenue', value: fmt(revenue), accent: '#d4a017' },
          { label: 'Avg Teams', value: TEAMS.length, accent: '#4a9eff' },
        ].map(s => (
          <div key={s.label} style={S.card}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: s.accent || '#f0f4ff' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.card, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>TOURNAMENT BREAKDOWN</span></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#0a0f1a' }}>{['Tournament','Status','Teams','Paid','Revenue'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={{ ...S.td, fontWeight: 600 }}>{TOURNAMENT.name}</td>
              <td style={S.td}><span style={S.badge('green')}>registration open</span></td>
              <td style={S.td}>{TEAMS.length}</td>
              <td style={{ ...S.td, color: '#d4a017' }}>{TEAMS.filter(t=>t.payment_status==='paid').length}/{TEAMS.length}</td>
              <td style={{ ...S.td, color: '#5cb800', fontWeight: 700 }}>{fmt(revenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InventoryPage() {
  const totalCost = INVENTORY.reduce((s,i) => s + i.pack_cost * i.packs_bought, 0)
  const totalRev = INVENTORY.reduce((s,i) => s + i.sell_price * i.units_sold, 0)
  const profit = totalRev - totalCost
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>INVENTORY & BUDGET</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Cost', value: fmt(totalCost), accent: '#ff9d7a' },
          { label: 'Total Revenue', value: fmt(totalRev), accent: '#4a9eff' },
          { label: 'Profit / Loss', value: fmt(profit), accent: profit >= 0 ? '#5cb800' : '#e05555' },
          { label: 'Units Remaining', value: INVENTORY.reduce((s,i) => s + (i.packs_bought*i.pack_size - i.units_sold), 0), accent: '#d4a017' },
        ].map(s => (
          <div key={s.label} style={S.card}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.card, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>ITEMS</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead><tr style={{ background: '#0a0f1a' }}>{['Item','Category','Pack Size','Pack Cost','Packs Bought','Sell Price','Units Sold','Remaining','Revenue','Profit'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {INVENTORY.map(item => {
                const cost = item.pack_cost * item.packs_bought
                const rev = item.sell_price * item.units_sold
                const remaining = item.packs_bought * item.pack_size - item.units_sold
                return (
                  <tr key={item.id}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{item.item_name}</td>
                    <td style={{ ...S.td, color: '#6b7a99' }}>{item.category}</td>
                    <td style={S.td}>{item.pack_size}</td>
                    <td style={{ ...S.td, color: '#ff9d7a' }}>{fmt(item.pack_cost)}</td>
                    <td style={S.td}>{item.packs_bought}</td>
                    <td style={{ ...S.td, color: '#4a9eff' }}>{fmt(item.sell_price)}</td>
                    <td style={S.td}>{item.units_sold}</td>
                    <td style={{ ...S.td, color: remaining < 10 ? '#d4a017' : '#c0cce0' }}>{remaining}</td>
                    <td style={{ ...S.td, color: '#4a9eff' }}>{fmt(rev)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: rev-cost >= 0 ? '#5cb800' : '#e05555' }}>{fmt(rev-cost)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AnnouncementsPage() {
  const typeColors = { info: 'blue', warning: 'yellow', urgent: 'red', success: 'green' }
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>ANNOUNCEMENTS</div>
      <div style={{ display: 'grid', gap: 14 }}>
        {ANNOUNCEMENTS.map(a => (
          <div key={a.id} style={{ ...S.card, borderColor: a.type === 'urgent' ? '#3a0a0a' : a.type === 'warning' ? '#3a3000' : '#1a2030' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={S.badge(typeColors[a.type])}>{a.type}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>{a.title}</span>
              </div>
              <span style={{ fontSize: 11, color: '#4a5568' }}>{new Date(a.created_at).toLocaleDateString()}</span>
            </div>
            <p style={{ color: '#c0cce0', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{a.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function StaffPage() {
  const roleColors = { referee: 'blue', scorekeeper: 'green', coordinator: 'yellow', admin: 'red' }
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>STAFF</div>
      <div style={{ ...S.card, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>STAFF MEMBERS ({STAFF.length})</span></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#0a0f1a' }}>{['Name','Email','Role','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {STAFF.map(s => (
              <tr key={s.id}>
                <td style={{ ...S.td, fontWeight: 600 }}>{s.name}</td>
                <td style={{ ...S.td, color: '#6b7a99' }}>{s.email}</td>
                <td style={S.td}><span style={S.badge(roleColors[s.role])}>{s.role}</span></td>
                <td style={S.td}><span style={{ fontSize: 11, color: s.status === 'active' ? '#5cb800' : '#d4a017' }}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FinancialsPage() {
  const paid = TEAMS.filter(t => t.payment_status === 'paid')
  const unpaid = TEAMS.filter(t => t.payment_status !== 'paid')
  const paidRev = paid.length * 150
  const totalRev = TEAMS.length * 150
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>FINANCIALS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Expected', value: fmt(totalRev), accent: '#f0f4ff', sub: `${TEAMS.length} teams` },
          { label: 'Collected', value: fmt(paidRev), accent: '#5cb800', sub: `${paid.length} paid` },
          { label: 'Outstanding', value: fmt(totalRev - paidRev), accent: '#d4a017', sub: `${unpaid.length} unpaid` },
        ].map(s => (
          <div key={s.label} style={S.card}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: s.accent }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.card, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0' }}>PAYMENT DETAILS</span></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#0a0f1a' }}>{['Team','Division','Entry Fee','Payment','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {TEAMS.map(t => (
              <tr key={t.id}>
                <td style={{ ...S.td, fontWeight: 600 }}>{t.team_name}</td>
                <td style={{ ...S.td, color: '#4a9eff', fontSize: 11 }}>{t.division_key}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>$150.00</td>
                <td style={S.td}><span style={{ color: t.payment_status === 'paid' ? '#5cb800' : '#d4a017', fontWeight: 700 }}>{t.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}</span></td>
                <td style={S.td}><span style={S.badge(t.approval_status === 'approved' ? 'green' : 'yellow')}>{t.approval_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SettingsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 20 }}>SETTINGS</div>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 16 }}>DIRECTOR PROFILE</div>
        {[{ label: 'Display Name', value: 'Coach Jay (Demo)' }, { label: 'Email', value: 'demo@nptournaments.com' }, { label: 'Organization', value: 'NP Hoopz Demo' }].map(f => (
          <div key={f.label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{f.label}</label>
            <div style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#6b7a99', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{f.value}</div>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#1a1500', border: '1px solid #3a3000', borderRadius: 8, fontSize: 12, color: '#d4a017' }}>
          This is a demo account. Sign up to create your own director account.
        </div>
      </div>
    </div>
  )
}

// ── Main Demo App ──────────────────────────────────────────────────────────
const PAGES = [
  { id: 'dashboard', icon: '▦', label: 'Dashboard', group: 'main' },
  { id: 'tournament', icon: '🏆', label: 'Tournaments', group: 'main' },
  { id: 'schedule', icon: '📅', label: 'Schedule', group: 'main' },
  { id: 'registrations', icon: '📋', label: 'Registrations', group: 'main' },
  { id: 'analytics', icon: '📊', label: 'Analytics', group: 'reports' },
  { id: 'inventory', icon: '📦', label: 'Inventory', group: 'reports' },
  { id: 'financials', icon: '💰', label: 'Financials', group: 'reports' },
  { id: 'announcements', icon: '📢', label: 'Announcements', group: 'tools' },
  { id: 'staff', icon: '👥', label: 'Staff', group: 'tools' },
  { id: 'settings', icon: '⚙', label: 'Settings', group: 'tools' },
]

export default function DemoApp() {
  const [page, setPage] = useState('dashboard')
  const navigate = useNavigate()

  function renderPage() {
    switch(page) {
      case 'dashboard': return <Dashboard setPage={setPage} />
      case 'tournament': return <TournamentPage />
      case 'schedule': return <SchedulePage />
      case 'analytics': return <AnalyticsPage />
      case 'inventory': return <InventoryPage />
      case 'financials': return <FinancialsPage />
      case 'announcements': return <AnnouncementsPage />
      case 'staff': return <StaffPage />
      case 'settings': return <SettingsPage />
      default: return (
        <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#c0cce0', marginBottom: 8 }}>COMING IN DEMO</div>
          <div style={{ fontSize: 13 }}>Sign up to access this feature</div>
        </div>
      )
    }
  }

  const groups = ['main', 'reports', 'tools']
  const groupLabels = { main: 'Main', reports: 'Reports', tools: 'Tools' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#04060a' }}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1a2030' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: '0.5px' }}>NP TOURNAMENTS</div>
          <div style={{ fontSize: 10, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: 2 }}>Demo Mode</div>
        </div>
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {groups.map(group => (
            <div key={group}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#2d3748', padding: '8px 8px 4px', marginTop: group !== 'main' ? 8 : 0 }}>{groupLabels[group]}</div>
              {PAGES.filter(p => p.group === group).map(p => (
                <button key={p.id} onClick={() => setPage(p.id)} style={S.navItem(page === p.id)}>
                  <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '14px 16px', borderTop: '1px solid #1a2030' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#8898b8' }}>Coach Jay (Demo)</div>
          <div style={{ fontSize: 10, color: '#2d3748', marginTop: 2 }}>demo@nptournaments.com</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => navigate('/login')} style={{ flex: 1, padding: '7px', background: '#5cb800', border: 'none', borderRadius: 6, color: '#04060a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Sign Up →
            </button>
            <button onClick={() => navigate('/login')} style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid #1a2030', borderRadius: 6, color: '#4a5568', fontSize: 11, cursor: 'pointer' }}>
              Log In
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Demo banner */}
        <div style={{ background: '#1a1500', borderBottom: '1px solid #3a3000', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#d4a017' }}>👀 You're viewing a live demo with sample data</span>
          <button onClick={() => navigate('/login')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Get Started Free →
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderPage()}
        </div>
      </div>
    </div>
  )
}
