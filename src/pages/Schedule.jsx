import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

function Card({ title, value, accent = '#5cb800' }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '12px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', borderBottom: '1px solid #1a2030', letterSpacing: '1px' }
const td = { padding: '12px 14px', color: '#d8e0f0', fontSize: 13 }

export default function Schedule({ director }) {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState('all')
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTournaments() {
      const { data } = await supabase
        .from('tournaments')
        .select('id, name, start_date, status')
        .order('start_date', { ascending: false })
      setTournaments(data || [])
      if (data?.[0]) setSelectedTournament(data[0].id)
    }
    loadTournaments()
  }, [])

  useEffect(() => {
    if (!selectedTournament || selectedTournament === 'all') {
      setTeams([])
      setLoading(false)
      return
    }
    loadTeams(selectedTournament)
  }, [selectedTournament])

  async function loadTeams(tournamentId) {
    setLoading(true)

    const { data: ttData } = await supabase
      .from('tournament_teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true })

    if (!ttData?.length) {
      setTeams([])
      setLoading(false)
      return
    }

    const teamIds = [...new Set(ttData.map(t => t.team_id).filter(Boolean))]
    const { data: masterTeams } = await supabase
      .from('bt_master_teams')
      .select('id, display_name, age_group, gender, ranking_division_key, bt_organizations(org_name)')
      .in('id', teamIds)

    const masterMap = {}
    ;(masterTeams || []).forEach(t => { masterMap[t.id] = t })

    const merged = ttData.map(tt => ({
      ...tt,
      team_name: masterMap[tt.team_id]?.display_name || '—',
      org_name: masterMap[tt.team_id]?.bt_organizations?.org_name || '—',
      division_key: masterMap[tt.team_id]?.ranking_division_key || '—',
      age_group: masterMap[tt.team_id]?.age_group || '—',
      gender: masterMap[tt.team_id]?.gender || '—',
    }))

    setTeams(merged)
    setLoading(false)
  }

  const divisionGroups = useMemo(() => {
    const groups = {}
    teams.forEach(team => {
      const key = team.division_key || 'No Division'
      if (!groups[key]) groups[key] = []
      groups[key].push(team)
    })
    return groups
  }, [teams])

  const selectedTournamentName = tournaments.find(t => t.id === selectedTournament)?.name || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="SCHEDULE"
        actions={
          selectedTournament !== 'all' && (
            <button
              onClick={() => navigate(`/tournaments/${selectedTournament}`)}
              style={{ background: '#1a2a4a', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Open Tournament →
            </button>
          )
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

        {/* Tournament selector */}
        <div style={{ marginBottom: 20 }}>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, outline: 'none', minWidth: 300 }}
          >
            <option value="all">Select a tournament</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>Loading...</div>
        ) : selectedTournament === 'all' ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>Select a tournament to view its schedule</div>
        ) : teams.length === 0 ? (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#c0cce0', marginBottom: 8 }}>NO TEAMS REGISTERED</div>
            <div style={{ fontSize: 13, color: '#4a5568', marginBottom: 20 }}>Add teams to this tournament first</div>
            <button onClick={() => navigate(`/tournaments/${selectedTournament}`)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Go to Tournament →
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              <Card title="Teams" value={teams.length} />
              <Card title="Divisions" value={Object.keys(divisionGroups).length} accent="#d4a017" />
              <Card title="Paid" value={teams.filter(t => t.payment_status === 'paid').length} accent="#5cb800" />
              <Card title="Unpaid" value={teams.filter(t => t.payment_status !== 'paid').length} accent="#ff9d7a" />
            </div>

            {/* Teams by division */}
            {Object.entries(divisionGroups).sort().map(([division, divTeams]) => (
              <div key={division} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#5cb800', letterSpacing: '0.5px' }}>{division}</span>
                  <span style={{ fontSize: 11, color: '#4a5568' }}>{divTeams.length} teams</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      <th style={th}>Team</th>
                      <th style={th}>Org</th>
                      <th style={th}>Age Group</th>
                      <th style={th}>Gender</th>
                      <th style={th}>Payment</th>
                      <th style={th}>Status</th>
                      <th style={th}>Entry Fee</th>
                      <th style={th}>Conflicts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divTeams.map(team => (
                      <tr key={team.id} style={{ borderBottom: '1px solid #0e1320' }}>
                        <td style={{ ...td, fontWeight: 600 }}>{team.team_name}</td>
                        <td style={td}>{team.org_name}</td>
                        <td style={{ ...td, color: '#6b7a99' }}>{team.age_group}</td>
                        <td style={{ ...td, color: '#6b7a99' }}>{team.gender}</td>
                        <td style={td}>
                          <span style={{ fontSize: 11, color: team.payment_status === 'paid' ? '#5cb800' : '#d4a017', fontWeight: 700 }}>
                            {team.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: team.approval_status === 'approved' ? '#0d1a0a' : '#1a1a0a', color: team.approval_status === 'approved' ? '#5cb800' : '#d4a017', border: `1px solid ${team.approval_status === 'approved' ? '#1a3a0a' : '#3a3a0a'}` }}>
                            {team.approval_status || 'pending'}
                          </span>
                        </td>
                        <td style={td}>{team.custom_entry_fee ? `$${team.custom_entry_fee}` : '—'}</td>
                        <td style={{ ...td, color: team.notes ? '#d4a017' : '#4a5568' }}>
                          {team.notes || 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
