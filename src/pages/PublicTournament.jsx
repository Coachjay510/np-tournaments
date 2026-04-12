import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function PublicTournament() {
  const { slug } = useParams()
  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('schedule') // 'schedule' | 'register'
  const [regForm, setRegForm] = useState({ team_name: '', contact_name: '', contact_email: '', contact_phone: '', division_key: '', age_group: '', gender: '' })
  const [regSaving, setRegSaving] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)
  const [regError, setRegError] = useState('')
  const [activeDiv, setActiveDiv] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('tournaments').select('*').eq('slug', slug).single()
      if (!t) { setLoading(false); return }
      setTournament(t)

      const [ttRes, gamesRes, courtsRes] = await Promise.all([
        supabase.from('tournament_teams').select('*').eq('tournament_id', t.id),
        supabase.from('scheduled_games').select('*').eq('tournament_id', t.id).order('scheduled_date').order('scheduled_time'),
        supabase.from('venue_courts').select('*, venues(name)').order('name'),
      ])

      // Join master teams
      const teamIds = [...new Set((ttRes.data || []).map(tt => Number(tt.team_id)).filter(Boolean))]
      let masterMap = {}
      if (teamIds.length) {
        const { data: md } = await supabase.from('bt_master_teams').select('id, display_name, ranking_division_key, age_group, gender').in('id', teamIds)
        ;(md || []).forEach(m => { masterMap[Number(m.id)] = m })
      }

      const mergedTeams = (ttRes.data || []).map(tt => ({
        ...tt,
        team_name: masterMap[Number(tt.team_id)]?.display_name || '—',
        division_key: masterMap[Number(tt.team_id)]?.ranking_division_key || '—',
      }))

      const courtsMap = {}
      ;(courtsRes.data || []).forEach(c => { courtsMap[c.id] = `${c.venues?.name || ''} ${c.name}`.trim() })

      setTeams(mergedTeams)
      setGames((gamesRes.data || []).map(g => ({ ...g, court_name: courtsMap[g.court_id] || null })))
      setLoading(false)
    }
    load()
  }, [slug])

  async function handleRegister() {
    if (!regForm.team_name || !regForm.contact_name || !regForm.contact_email) { setRegError('Please fill in all required fields'); return }
    setRegSaving(true); setRegError('')
    const { error } = await supabase.from('public_registrations').insert({
      tournament_id: tournament.id, ...regForm, status: tournament.require_approval ? 'pending' : 'approved',
    })
    if (error) { setRegError(error.message); setRegSaving(false); return }
    setRegSuccess(true); setRegSaving(false)
  }

  const divisionGroups = {}
  games.forEach(g => {
    const key = g.round || 'Games'
    if (!divisionGroups[key]) divisionGroups[key] = []
    divisionGroups[key].push(g)
  })

  const teamsByDiv = {}
  teams.forEach(t => {
    const k = t.division_key || 'TBD'
    if (!teamsByDiv[k]) teamsByDiv[k] = []
    teamsByDiv[k].push(t)
  })

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: '#5cb800' }}>NP TOURNAMENTS</div>
    </div>
  )

  if (!tournament) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f4ff' }}>
      <div>Tournament not found.</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#04060a', color: '#f0f4ff' }}>
      {/* Header */}
      <div style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: '0.5px' }}>NP TOURNAMENTS</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['schedule', 'teams', 'register'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
              background: view === v ? '#5cb800' : 'transparent', color: view === v ? '#04060a' : '#6b7a99', borderColor: view === v ? '#5cb800' : '#1a2030',
            }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament hero */}
      <div style={{ background: 'linear-gradient(180deg, #0d1a0a 0%, #04060a 100%)', padding: '32px 24px', borderBottom: '1px solid #1a2030' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: '#f0f4ff', letterSpacing: '0.5px', marginBottom: 8 }}>{tournament.name}</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#6b7a99' }}>
            <span>📅 {formatDate(tournament.start_date)}{tournament.end_date !== tournament.start_date ? ` – ${formatDate(tournament.end_date)}` : ''}</span>
            {tournament.city && <span>📍 {tournament.city}{tournament.state ? `, ${tournament.state}` : ''}</span>}
            <span>👥 {teams.length}/{tournament.max_teams || '∞'} teams</span>
            {tournament.registration_fee && <span>💰 ${tournament.registration_fee} entry</span>}
          </div>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600,
              background: tournament.status === 'registration_open' ? '#0d1a0a' : '#1a1500',
              color: tournament.status === 'registration_open' ? '#5cb800' : '#d4a017',
              border: `1px solid ${tournament.status === 'registration_open' ? '#1a3a0a' : '#3a3000'}` }}>
              {tournament.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        {/* Schedule view */}
        {view === 'schedule' && (
          <div>
            {games.length === 0 ? (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center', color: '#4a5568' }}>
                Schedule not yet posted. Check back soon.
              </div>
            ) : (
              <>
                {/* Division filter */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <button onClick={() => setActiveDiv(null)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: !activeDiv ? '#5cb800' : 'transparent', color: !activeDiv ? '#04060a' : '#6b7a99', borderColor: !activeDiv ? '#5cb800' : '#1a2030' }}>All</button>
                  {Object.keys(teamsByDiv).sort().map(div => (
                    <button key={div} onClick={() => setActiveDiv(div)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: activeDiv === div ? '#5cb800' : 'transparent', color: activeDiv === div ? '#04060a' : '#6b7a99', borderColor: activeDiv === div ? '#5cb800' : '#1a2030' }}>{div}</button>
                  ))}
                </div>

                <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0a0f1a' }}>
                        {['Date', 'Time', 'Home', 'Away', 'Court', 'Score'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {games.filter(g => !activeDiv || (teamsByDiv[activeDiv]?.some(t => String(t.team_id) === String(g.home_team_id) || String(t.team_id) === String(g.away_team_id)))).map(g => (
                        <tr key={g.id} style={{ borderBottom: '1px solid #0e1320' }}>
                          <td style={{ padding: '10px 14px', color: '#6b7a99', fontSize: 11 }}>{g.scheduled_date || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#6b7a99', fontSize: 11 }}>{g.scheduled_time || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#d8e0f0', fontWeight: 600 }}>{g.home_team_name}</td>
                          <td style={{ padding: '10px 14px', color: '#d8e0f0' }}>{g.away_team_name}</td>
                          <td style={{ padding: '10px 14px', color: '#4a9eff', fontSize: 11 }}>{g.court_name || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {g.status === 'completed'
                              ? <span style={{ color: '#5cb800', fontWeight: 700 }}>{g.home_score} - {g.away_score}</span>
                              : <span style={{ color: '#4a5568' }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Teams view */}
        {view === 'teams' && (
          <div>
            {Object.entries(teamsByDiv).sort().map(([div, divTeams]) => (
              <div key={div} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030' }}>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#5cb800' }}>{div}</span>
                  <span style={{ fontSize: 11, color: '#4a5568', marginLeft: 10 }}>{divTeams.length} teams</span>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {divTeams.map(t => (
                    <div key={t.id} style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{t.team_name}</div>
                      <div style={{ fontSize: 11, color: t.payment_status === 'paid' ? '#5cb800' : '#d4a017', marginTop: 4 }}>
                        {t.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {teams.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No teams registered yet</div>}
          </div>
        )}

        {/* Register view */}
        {view === 'register' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {regSuccess ? (
              <div style={{ background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800', marginBottom: 8 }}>REGISTRATION SUBMITTED!</div>
                <div style={{ fontSize: 13, color: '#6b7a99' }}>
                  {tournament.require_approval ? 'Your registration is pending approval. You\'ll be notified by email.' : 'You\'re registered! Check your email for confirmation.'}
                </div>
              </div>
            ) : (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 28 }}>
                <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#f0f4ff' }}>Register Your Team</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { key: 'team_name', label: 'Team Name *' },
                    { key: 'contact_name', label: 'Contact Name *' },
                    { key: 'contact_email', label: 'Contact Email *', type: 'email' },
                    { key: 'contact_phone', label: 'Contact Phone' },
                    { key: 'division_key', label: 'Division' },
                    { key: 'age_group', label: 'Age Group' },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{label}</label>
                      <input type={type || 'text'} value={regForm[key]} onChange={e => setRegForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Gender</label>
                    <select value={regForm.gender} onChange={e => setRegForm(p => ({ ...p, gender: e.target.value }))} style={inputStyle}>
                      <option value="">Select</option>
                      <option value="Boys">Boys</option>
                      <option value="Girls">Girls</option>
                      <option value="Coed">Coed</option>
                    </select>
                  </div>
                </div>
                {regError && <div style={{ marginTop: 12, padding: '10px 14px', background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, fontSize: 12, color: '#e05555' }}>{regError}</div>}
                <button onClick={handleRegister} disabled={regSaving} style={{ width: '100%', marginTop: 20, background: '#5cb800', color: '#04060a', border: 'none', padding: '12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  {regSaving ? 'Submitting...' : tournament.require_approval ? 'Request Registration' : 'Register Now'}
                </button>
                <div style={{ marginTop: 12, fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
                  {tournament.require_approval ? 'Registration requires approval from the director.' : 'Registration will be confirmed immediately.'}
                  {tournament.registration_fee && ` Entry fee: $${tournament.registration_fee}`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
