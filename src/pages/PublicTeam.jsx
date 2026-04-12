import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function PublicTeam() {
  const { teamId } = useParams()
  const [team, setTeam] = useState(null)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [followForm, setFollowForm] = useState({ name: '', email: '', relationship: 'parent' })
  const [following, setFollowing] = useState(false)
  const [followed, setFollowed] = useState(false)
  const [followError, setFollowError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: teamData } = await supabase.from('bt_master_teams')
        .select('*, bt_organizations(org_name)').eq('id', teamId).single()
      if (!teamData) { setLoading(false); return }
      setTeam(teamData)

      const { data: gamesData } = await supabase.from('bt_team_recent_games')
        .select('*').or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('game_date', { ascending: false }).limit(20)
      setGames(gamesData || [])
      setLoading(false)
    }
    load()
  }, [teamId])

  async function handleFollow() {
    if (!followForm.email) { setFollowError('Email is required'); return }
    setFollowing(true); setFollowError('')
    const { error } = await supabase.from('team_followers').upsert({
      master_team_id: Number(teamId), email: followForm.email,
      name: followForm.name || null, relationship: followForm.relationship,
    }, { onConflict: 'master_team_id,email' })
    if (error) { setFollowError(error.message); setFollowing(false); return }
    setFollowed(true); setFollowing(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: '#5cb800' }}>NP TOURNAMENTS</div>
    </div>
  )

  if (!team) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f4ff' }}>
      <div>Team not found.</div>
    </div>
  )

  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%' }
  const wins = games.filter(g => g.winner_team_id === Number(teamId)).length
  const losses = games.filter(g => g.status === 'completed' && g.winner_team_id && g.winner_team_id !== Number(teamId)).length

  return (
    <div style={{ minHeight: '100vh', background: '#04060a', color: '#f0f4ff' }}>
      <div style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '16px 24px' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800' }}>NP TOURNAMENTS</div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {/* Team header */}
        <div style={{ background: 'linear-gradient(135deg, #0d1a0a, #04060a)', border: '1px solid #1a3a0a', borderRadius: 16, padding: 28, marginBottom: 24 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: '#f0f4ff', marginBottom: 8 }}>{team.display_name}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#6b7a99' }}>
            {team.bt_organizations?.org_name && <span>🏢 {team.bt_organizations.org_name}</span>}
            {team.ranking_division_key && <span>📋 {team.ranking_division_key}</span>}
            {team.age_group && <span>🎂 {team.age_group}</span>}
            {team.gender && <span>⚧ {team.gender}</span>}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
            {[{ label: 'Wins', value: wins, color: '#5cb800' }, { label: 'Losses', value: losses, color: '#ff9d7a' }, { label: 'Games', value: games.length, color: '#4a9eff' }].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent games */}
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0' }}>RECENT GAMES</span>
            </div>
            {games.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No recent games</div>
            ) : games.slice(0, 10).map(g => {
              const isHome = String(g.home_team_id) === String(teamId)
              const opp = isHome ? g.away_team_name : g.home_team_name
              const myScore = isHome ? g.score_home : g.score_away
              const oppScore = isHome ? g.score_away : g.score_home
              const won = g.winner_team_id === Number(teamId)
              return (
                <div key={`${g.game_id}-${g.ranking_source}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid #0e1320' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#d8e0f0' }}>vs {opp}</div>
                    <div style={{ fontSize: 10, color: '#4a5568', marginTop: 2 }}>{g.game_date ? new Date(g.game_date).toLocaleDateString() : ''} · {g.ranking_source}</div>
                  </div>
                  {g.score_home != null && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: won ? '#5cb800' : '#ff9d7a' }}>{myScore} - {oppScore}</div>
                      <div style={{ fontSize: 10, color: won ? '#5cb800' : '#ff9d7a' }}>{won ? 'W' : 'L'}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Follow */}
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 4 }}>FOLLOW THIS TEAM</div>
            <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 20 }}>Get notified when the schedule drops, scores update, or announcements are posted.</div>
            {followed ? (
              <div style={{ background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                <div style={{ color: '#5cb800', fontWeight: 700, marginBottom: 4 }}>You're following {team.display_name}!</div>
                <div style={{ fontSize: 12, color: '#4a5568' }}>We'll email you with schedule updates and announcements.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Your Name</label>
                  <input value={followForm.name} onChange={e => setFollowForm(p => ({ ...p, name: e.target.value }))} placeholder="Parent or player name" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Email *</label>
                  <input type="email" value={followForm.email} onChange={e => setFollowForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>I am a</label>
                  <select value={followForm.relationship} onChange={e => setFollowForm(p => ({ ...p, relationship: e.target.value }))} style={inputStyle}>
                    <option value="parent">Parent</option>
                    <option value="player">Player</option>
                    <option value="coach">Coach</option>
                    <option value="fan">Fan</option>
                  </select>
                </div>
                {followError && <div style={{ fontSize: 12, color: '#e05555', padding: '8px 12px', background: '#1f0707', borderRadius: 6, border: '1px solid #3a0a0a' }}>{followError}</div>}
                <button onClick={handleFollow} disabled={following} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '11px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {following ? 'Following...' : '🔔 Follow Team'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
