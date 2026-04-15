import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const DIVISIONS = [
  '8U Boys','9U Boys','10U Boys','11U Boys','12U Boys','13U Boys','14U Boys','15U Boys','16U Boys','17U Boys',
  '8U Girls','9U Girls','10U Girls','11U Girls','12U Girls','13U Girls','14U Girls','15U Girls','16U Girls','17U Girls',
  'Varsity Boys','Varsity Girls','JV Boys','JV Girls',
]

export default function PublicTournament() {
  const { slug } = useParams()
  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('info')
  const [activeDiv, setActiveDiv] = useState(null)

  // Auth state
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Registration flow
  const [regStep, setRegStep] = useState('choose') // choose | form | confirm | success
  const [regForm, setRegForm] = useState({
    team_name: '', contact_name: '', contact_email: '',
    contact_phone: '', division_key: '', age_group: '', gender: '',
    notes: '',
  })
  const [regSaving, setRegSaving] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session?.user) {
        setRegForm(f => ({
          ...f,
          contact_name: session.user.user_metadata?.full_name || '',
          contact_email: session.user.email || '',
        }))
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session?.user) {
        setRegForm(f => ({
          ...f,
          contact_name: session.user.user_metadata?.full_name || f.contact_name,
          contact_email: session.user.email || f.contact_email,
        }))
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('tournaments').select('*').eq('slug', slug).single()
      if (!t) { setLoading(false); return }
      setTournament(t)

      const [ttRes, gamesRes] = await Promise.all([
        supabase.from('tournament_teams').select('*').eq('tournament_id', t.id),
        supabase.from('scheduled_games').select('*').eq('tournament_id', t.id).order('scheduled_date').order('scheduled_time'),
      ])

      const teamIds = [...new Set((ttRes.data || []).map(tt => Number(tt.team_id)).filter(Boolean))]
      let masterMap = {}
      if (teamIds.length) {
        const { data: md } = await supabase.from('bt_master_teams').select('id, display_name, ranking_division_key, age_group, gender').in('id', teamIds)
        ;(md || []).forEach(m => { masterMap[Number(m.id)] = m })
      }

      setTeams((ttRes.data || []).map(tt => ({
        ...tt,
        team_name: masterMap[Number(tt.team_id)]?.display_name || tt.custom_team_name || '—',
        division_key: masterMap[Number(tt.team_id)]?.ranking_division_key || '—',
      })))
      setGames(gamesRes.data || [])
      setLoading(false)
    }
    load()
  }, [slug])

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
  }

  async function handleRegister() {
    if (!regForm.team_name || !regForm.contact_name || !regForm.contact_email) {
      setRegError('Please fill in all required fields')
      return
    }
    setRegSaving(true)
    setRegError('')
    try {
      const { error } = await supabase.from('public_registrations').insert({
        tournament_id: tournament.id,
        team_name: regForm.team_name,
        contact_name: regForm.contact_name,
        contact_email: regForm.contact_email,
        contact_phone: regForm.contact_phone || null,
        division_key: regForm.division_key || null,
        age_group: regForm.age_group || null,
        gender: regForm.gender || null,
        notes: regForm.notes || null,
        status: tournament.require_approval ? 'pending' : 'approved',
        user_id: session?.user?.id || null,
      })
      if (error) throw error

      // Mark invite recipient as registered if applicable
      if (regForm.contact_email) {
        await supabase.from('tournament_invite_recipients')
          .update({ registered: true, registered_at: new Date().toISOString() })
          .eq('email', regForm.contact_email)
      }

      setRegSuccess(true)
      setRegStep('success')
    } catch (err) {
      setRegError(err.message)
    } finally {
      setRegSaving(false)
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const inp = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }

  const teamsByDiv = {}
  teams.forEach(t => {
    const k = t.division_key || 'TBD'
    if (!teamsByDiv[k]) teamsByDiv[k] = []
    teamsByDiv[k].push(t)
  })

  const spotsLeft = tournament?.max_teams ? tournament.max_teams - teams.length : null
  const registrationOpen = tournament?.status === 'registration_open' || tournament?.status === 'draft'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: '#5cb800' }}>NP TOURNAMENTS</div>
    </div>
  )

  if (!tournament) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f4ff' }}>
      Tournament not found.
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#04060a', color: '#f0f4ff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <div style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: '0.5px' }}>NP TOURNAMENTS</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['info', 'schedule', 'teams', 'register'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
              background: view === v ? '#5cb800' : 'transparent',
              color: view === v ? '#04060a' : '#6b7a99',
              borderColor: view === v ? '#5cb800' : '#1a2030',
            }}>
              {v === 'register' ? '📝 Register' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, #0d1a0a 0%, #04060a 60%)', padding: '32px 24px', borderBottom: '1px solid #1a2030' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(28px, 5vw, 48px)', color: '#f0f4ff', letterSpacing: '0.5px', marginBottom: 10, lineHeight: 1 }}>{tournament.name}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#6b7a99', marginBottom: 12 }}>
            <span>📅 {formatDate(tournament.start_date)}{tournament.end_date && tournament.end_date !== tournament.start_date ? ` – ${formatDate(tournament.end_date)}` : ''}</span>
            {tournament.city && <span>📍 {tournament.city}{tournament.state ? `, ${tournament.state}` : ''}</span>}
            <span>👥 {teams.length}{tournament.max_teams ? `/${tournament.max_teams}` : ''} teams</span>
            {tournament.registration_fee && <span>💰 ${tournament.registration_fee} entry fee</span>}
            {tournament.registration_deadline && <span>⏰ Deadline: {formatDate(tournament.registration_deadline)}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600,
              background: registrationOpen ? '#0d1a0a' : '#1a1500',
              color: registrationOpen ? '#5cb800' : '#d4a017',
              border: `1px solid ${registrationOpen ? '#1a3a0a' : '#3a3000'}` }}>
              {tournament.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
            {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
              <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600, background: '#1f0707', color: '#e05555', border: '1px solid #3a0a0a' }}>
                ⚡ Only {spotsLeft} spots left!
              </span>
            )}
            {registrationOpen && (
              <button onClick={() => setView('register')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Register Your Team →
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px' }}>

        {/* INFO */}
        {view === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Tournament Details</div>
              {[
                { label: 'Format', value: tournament.format?.replace(/_/g, ' ') },
                { label: 'Game Length', value: tournament.game_length_minutes ? `${tournament.game_length_minutes} min` : null },
                { label: 'Teams', value: tournament.max_teams ? `Max ${tournament.max_teams}` : 'Open' },
                { label: 'Entry Fee', value: tournament.registration_fee ? `$${tournament.registration_fee}` : 'Free' },
                { label: 'Deadline', value: tournament.registration_deadline ? formatDate(tournament.registration_deadline) : null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0e1320', fontSize: 13 }}>
                  <span style={{ color: '#4a5568' }}>{r.label}</span>
                  <span style={{ color: '#c0cce0', fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Registration</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: '#5cb800' }}>{teams.length}</div>
                <div style={{ fontSize: 12, color: '#4a5568' }}>Teams Registered{tournament.max_teams ? ` of ${tournament.max_teams}` : ''}</div>
              </div>
              {tournament.max_teams && (
                <div style={{ background: '#0a0f1a', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ height: '100%', background: '#5cb800', width: `${Math.min(100, (teams.length / tournament.max_teams) * 100)}%`, borderRadius: 6 }} />
                </div>
              )}
              {registrationOpen && (
                <button onClick={() => setView('register')} style={{ width: '100%', background: '#5cb800', color: '#04060a', border: 'none', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Register Now →
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCHEDULE */}
        {view === 'schedule' && (
          <div>
            {games.length === 0 ? (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center', color: '#4a5568' }}>
                Schedule not yet posted. Check back soon.
              </div>
            ) : (
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
                    {games.map(g => (
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
            )}
          </div>
        )}

        {/* TEAMS */}
        {view === 'teams' && (
          <div>
            {Object.entries(teamsByDiv).sort().map(([div, divTeams]) => (
              <div key={div} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#5cb800' }}>{div}</span>
                  <span style={{ fontSize: 11, color: '#4a5568' }}>{divTeams.length} teams</span>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {divTeams.map(t => (
                    <div key={t.id} style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>{t.team_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {teams.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>No teams registered yet</div>}
          </div>
        )}

        {/* REGISTER */}
        {view === 'register' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {!registrationOpen ? (
              <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#d4a017', marginBottom: 8 }}>REGISTRATION CLOSED</div>
                <div style={{ fontSize: 13, color: '#6b7a99' }}>Registration is not currently open for this tournament.</div>
              </div>
            ) : regStep === 'success' ? (
              <div style={{ background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: '#5cb800', marginBottom: 8 }}>YOU'RE IN!</div>
                <div style={{ fontSize: 14, color: '#c0cce0', marginBottom: 8, fontWeight: 600 }}>{regForm.team_name}</div>
                <div style={{ fontSize: 13, color: '#6b7a99', lineHeight: 1.7, marginBottom: 24 }}>
                  {tournament.require_approval
                    ? `Your registration is pending approval. We'll notify you at ${regForm.contact_email}.`
                    : `Registration confirmed! Check ${regForm.contact_email} for details.`}
                </div>
                {!session && (
                  <div style={{ background: '#071525', border: '1px solid #0a2540', borderRadius: 10, padding: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: '#4a9eff', fontWeight: 600, marginBottom: 8 }}>Want to track your registration?</div>
                    <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 12 }}>Create a free NP account to view your status, get schedule updates, and manage your team.</div>
                    <button onClick={handleGoogleSignIn} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', color: '#1a1a1a', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                      Create Free Account
                    </button>
                  </div>
                )}
                <button onClick={() => setView('teams')} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                  View Registered Teams
                </button>
              </div>
            ) : (
              <div>
                {/* Sign in prompt for existing users */}
                {!session && !authLoading && regStep === 'choose' && (
                  <div style={{ background: '#071525', border: '1px solid #0a2540', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: '#4a9eff', fontWeight: 600, marginBottom: 6 }}>Already have an NP account?</div>
                    <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 12 }}>Sign in to pre-fill your team information</div>
                    <button onClick={handleGoogleSignIn} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', color: '#1a1a1a', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                      Sign in with Google
                    </button>
                  </div>
                )}

                {session && (
                  <div style={{ background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>✓</span>
                    <div>
                      <div style={{ fontSize: 12, color: '#5cb800', fontWeight: 600 }}>Signed in as {session.user.email}</div>
                      <div style={{ fontSize: 11, color: '#4a5568' }}>Your contact info has been pre-filled</div>
                    </div>
                    <button onClick={() => supabase.auth.signOut()} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 11 }}>Sign out</button>
                  </div>
                )}

                <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 28 }}>
                  <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#f0f4ff', marginBottom: 4 }}>REGISTER YOUR TEAM</div>
                  <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 24 }}>{tournament.name}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={lbl}>Team Name *</label>
                      <input value={regForm.team_name} onChange={e => setRegForm(p => ({ ...p, team_name: e.target.value }))} style={inp} placeholder="e.g. Delta Dubs 15U" autoFocus />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>Division</label>
                        <select value={regForm.division_key} onChange={e => setRegForm(p => ({ ...p, division_key: e.target.value }))} style={inp}>
                          <option value="">Select division</option>
                          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Gender</label>
                        <select value={regForm.gender} onChange={e => setRegForm(p => ({ ...p, gender: e.target.value }))} style={inp}>
                          <option value="">Select</option>
                          <option value="Boys">Boys</option>
                          <option value="Girls">Girls</option>
                          <option value="Coed">Coed</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #1a2030', paddingTop: 14 }}>
                      <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Contact Info</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={lbl}>Contact Name *</label>
                          <input value={regForm.contact_name} onChange={e => setRegForm(p => ({ ...p, contact_name: e.target.value }))} style={inp} placeholder="Head Coach or Director" />
                        </div>
                        <div>
                          <label style={lbl}>Email *</label>
                          <input type="email" value={regForm.contact_email} onChange={e => setRegForm(p => ({ ...p, contact_email: e.target.value }))} style={inp} placeholder="coach@example.com" />
                        </div>
                        <div>
                          <label style={lbl}>Phone</label>
                          <input type="tel" value={regForm.contact_phone} onChange={e => setRegForm(p => ({ ...p, contact_phone: e.target.value }))} style={inp} placeholder="Optional" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>Notes / Scheduling Requests</label>
                      <textarea value={regForm.notes} onChange={e => setRegForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inp, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Any scheduling conflicts, special requests..." />
                    </div>
                  </div>

                  {tournament.registration_fee && (
                    <div style={{ background: '#071525', border: '1px solid #0a2540', borderRadius: 8, padding: '10px 14px', marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: '#4a9eff' }}>
                        💰 Entry fee: <strong>${tournament.registration_fee}</strong> — payment details will be sent after registration is confirmed.
                      </div>
                    </div>
                  )}

                  {regError && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, fontSize: 12, color: '#e05555' }}>{regError}</div>
                  )}

                  <button onClick={handleRegister} disabled={regSaving} style={{ width: '100%', marginTop: 20, background: '#5cb800', color: '#04060a', border: 'none', padding: '13px', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 700, opacity: regSaving ? 0.6 : 1 }}>
                    {regSaving ? 'Submitting...' : tournament.require_approval ? '📋 Request Registration' : '🏀 Register Now'}
                  </button>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
                    {tournament.require_approval ? 'Requires director approval' : 'Registration confirmed immediately'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
