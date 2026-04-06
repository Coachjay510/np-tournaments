import { useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { useRankings } from '../hooks/useRankings'
import RankingFilters from '../components/rankings/RankingFilters'
import RankingsTable from '../components/rankings/RankingsTable'

function StatCard({ label, value, accent='#f0f4ff' }) {
  return (
    <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, padding:16 }}>
      <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'#4a5568', marginBottom:8 }}>{label}</div>
      <div style={{ fontFamily:'Anton, sans-serif', fontSize:30, color:accent, lineHeight:1, letterSpacing:'0.5px' }}>{value}</div>
    </div>
  )
}

export default function Rankings() {
  const { rankings, loading, error, refresh } = useRankings()
  const [division, setDivision] = useState('all')
  const [search, setSearch] = useState('')

  const divisionOptions = useMemo(() => {
    const opts = [...new Set((rankings || []).map(r => r.ranking_division_key).filter(Boolean))]
    return opts.sort((a, b) => a.localeCompare(b))
  }, [rankings])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (rankings || []).filter(row => {
      const divisionMatch = division === 'all' || row.ranking_division_key === division
      const searchMatch = !q || row.team_name?.toLowerCase().includes(q)
      return divisionMatch && searchMatch
    })
  }, [rankings, division, search])

  const topTeam = filtered[0]
  const uniqueTeams = new Set(filtered.map(r => r.team_id)).size
  const uniqueDivisions = new Set(filtered.map(r => r.ranking_division_key)).size

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <Topbar
        title="RANKINGS"
        actions={
          <button
            onClick={refresh}
            style={{ background:'#5cb800', color:'#04060a', border:'none', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700 }}
          >
            Refresh Rankings
          </button>
        }
      />
      <div style={{ padding:24, overflowY:'auto', flex:1 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:20 }}>
          <StatCard label="Divisions" value={uniqueDivisions || 0} accent="#5cb800" />
          <StatCard label="Teams Ranked" value={uniqueTeams || 0} />
          <StatCard label="Current #1" value={topTeam?.team_name || '—'} accent="#d4a017" />
        </div>
        <div style={{ background:'#080c12', border:'1px solid #1a2030', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid #1a2030' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#c0cce0', letterSpacing:'0.3px' }}>BASKETBALL CIRCUIT RANKINGS</div>
            <div style={{ fontSize:11, color:'#4a5568', marginTop:4 }}>Live standings · CH Ranking (Basketball Circuit)</div>
          </div>
          <div style={{ padding:18, borderBottom:'1px solid #1a2030' }}>
            <RankingFilters
              division={division}
              onDivisionChange={setDivision}
              divisionOptions={divisionOptions}
              search={search}
              onSearchChange={setSearch}
            />
          </div>
          {error ? (
            <div style={{ padding:24, color:'#e05555', fontSize:13 }}>Error: {error.message}</div>
          ) : loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#4a5568', fontSize:13 }}>Loading rankings...</div>
          ) : (
            <RankingsTable rows={filtered} />
          )}
        </div>
      </div>
    </div>
  )
}
