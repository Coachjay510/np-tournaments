import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

const cell = { padding: '12px 14px', color: '#c0cce0', fontSize: 13 }
const th = { padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030', textAlign: 'left', background: '#0a0f1a' }
const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }

function fmtHeight(in_) { return in_ ? `${Math.floor(in_ / 12)}'${in_ % 12}"` : '—' }
function statOf(stats, key) {
  if (!stats?.length) return '—'
  const latest = [...stats].sort((a, b) => (b.season || '').localeCompare(a.season || ''))[0]
  const v = latest?.[key]
  return v != null ? Number(v).toFixed(1) : '—'
}

export default function Players() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGrad, setFilterGrad] = useState('all')
  const [filterGender, setFilterGender] = useState('all')
  const [filterPos, setFilterPos] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, grad_year, height_inches, gender, np_team_name, photo_url, accolade, stats(ppg, rpg, apg, gp, season)')
        .eq('is_active', true)
        .order('grad_year', { ascending: true })
        .order('last_name', { ascending: true })
      if (error) console.error(error)
      setPlayers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const gradYears = useMemo(() => [...new Set(players.map(p => p.grad_year).filter(Boolean))].sort(), [players])
  const positions = useMemo(() => [...new Set(players.map(p => p.position).filter(Boolean))].sort(), [players])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return players.filter(p => {
      if (filterGrad !== 'all' && String(p.grad_year) !== filterGrad) return false
      if (filterGender !== 'all' && p.gender !== filterGender) return false
      if (filterPos !== 'all' && p.position !== filterPos) return false
      if (q && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(q) && !(p.np_team_name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [players, search, filterGrad, filterGender, filterPos])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="PLAYERS"
        actions={
          <div style={{ fontSize: 12, color: '#6b7a99' }}>
            {filtered.length} of {players.length} players
          </div>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or team…"
            style={{ ...inputStyle, width: 220 }}
          />
          <select value={filterGrad} onChange={e => setFilterGrad(e.target.value)} style={inputStyle}>
            <option value="all">All Grad Years</option>
            {gradYears.map(y => <option key={y} value={y}>Class of {y}</option>)}
          </select>
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)} style={inputStyle}>
            <option value="all">All Genders</option>
            <option value="M">Boys</option>
            <option value="F">Girls</option>
          </select>
          <select value={filterPos} onChange={e => setFilterPos(e.target.value)} style={inputStyle}>
            <option value="all">All Positions</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || filterGrad !== 'all' || filterGender !== 'all' || filterPos !== 'all') && (
            <button onClick={() => { setSearch(''); setFilterGrad('all'); setFilterGender('all'); setFilterPos('all') }}
              style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading players…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No players match your filters.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Name', 'Pos', 'Grad', 'Ht', 'Gender', 'Team', 'PPG', 'RPG', 'APG', 'GP', ''].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/player/${p.id}`)}
                    style={{ borderBottom: '1px solid #0e1320', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0b111b'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...cell, color: '#5cb800', fontWeight: 700, width: 36 }}>{p.jersey_number ?? '—'}</td>
                    <td style={{ ...cell, fontWeight: 700, color: '#f0f4ff' }}>
                      {p.first_name} {p.last_name}
                      {p.accolade && <span style={{ marginLeft: 6, fontSize: 10, color: '#d4a017' }}>{p.accolade}</span>}
                    </td>
                    <td style={cell}>{p.position || '—'}</td>
                    <td style={cell}>{p.grad_year || '—'}</td>
                    <td style={cell}>{fmtHeight(p.height_inches)}</td>
                    <td style={cell}>{p.gender === 'M' ? 'Boys' : p.gender === 'F' ? 'Girls' : '—'}</td>
                    <td style={{ ...cell, color: '#8a9ab8' }}>{p.np_team_name || '—'}</td>
                    <td style={{ ...cell, color: '#5cb800', fontWeight: 700 }}>{statOf(p.stats, 'ppg')}</td>
                    <td style={cell}>{statOf(p.stats, 'rpg')}</td>
                    <td style={cell}>{statOf(p.stats, 'apg')}</td>
                    <td style={{ ...cell, color: '#4a5568' }}>{statOf(p.stats, 'gp')}</td>
                    <td style={{ ...cell, textAlign: 'right', color: '#4a5568', fontSize: 16 }}>›</td>
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
