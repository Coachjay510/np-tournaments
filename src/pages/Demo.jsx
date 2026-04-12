import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const MOVIE_TEAMS = [
  { name: 'Space Jam Tune Squad', org: 'Tune Squad', division: '13u_boys', record: '8-2', points: 1450 },
  { name: 'Blue Chips Western Univ.', org: 'Western University', division: '13u_boys', record: '7-3', points: 1320 },
  { name: 'Above the Rim Birdmen', org: 'Birdmen', division: '13u_boys', record: '6-4', points: 1180 },
  { name: 'Coach Carter Richmond', org: 'Richmond Oilers', division: '13u_boys', record: '9-1', points: 1520 },
  { name: 'He Got Game Coney Island', org: 'Coney Island', division: '13u_boys', record: '5-5', points: 980 },
  { name: 'White Men Cant Jump Venice', org: 'Venice Beach', division: '13u_boys', record: '4-6', points: 850 },
  { name: '6th Man UW Huskies', org: 'UW Huskies', division: '13u_boys', record: '7-3', points: 1280 },
  { name: 'Air Up There Winabi', org: 'Winabi Tribe', division: '13u_boys', record: '6-4', points: 1100 },
  { name: 'Love & Basketball Crenshaw', org: 'Crenshaw High', division: '13u_boys', record: '8-2', points: 1400 },
  { name: 'Like Mike LA Knights', org: 'LA Knights', division: '13u_boys', record: '5-5', points: 920 },
  { name: 'Luck of the Irish Kyle Squad', org: "Kyle's Squad", division: '14u_boys', record: '6-4', points: 1050 },
]

const DEMO_GAMES = [
  { home: 'Space Jam Tune Squad', away: 'Coach Carter Richmond', pool: 'Pool A', court: 'Court 1', time: '9:00 AM', score: '72-68', winner: 'away' },
  { home: 'Blue Chips Western Univ.', away: 'Above the Rim Birdmen', pool: 'Pool A', court: 'Court 2', time: '9:00 AM', score: '65-71', winner: 'away' },
  { home: 'He Got Game Coney Island', away: 'White Men Cant Jump Venice', pool: 'Pool B', court: 'Court 1', time: '10:30 AM', score: '80-55', winner: 'home' },
  { home: '6th Man UW Huskies', away: 'Air Up There Winabi', pool: 'Pool B', court: 'Court 2', time: '10:30 AM', score: '—', winner: null },
  { home: 'Love & Basketball Crenshaw', away: 'Like Mike LA Knights', pool: 'Pool C', court: 'Court 1', time: '12:00 PM', score: '—', winner: null },
  { home: 'Space Jam Tune Squad', away: 'Blue Chips Western Univ.', pool: 'Pool A', court: 'Court 2', time: '12:00 PM', score: '—', winner: null },
]

export default function Demo() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('schedule')

  return (
    <div style={{ minHeight: '100vh', background: '#04060a', color: '#f0f4ff' }}>
      {/* Header */}
      <div style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800' }}>NP TOURNAMENTS</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#1a1500', color: '#d4a017', border: '1px solid #3a3000' }}>DEMO MODE</span>
          <button onClick={() => navigate('/login')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Sign In →
          </button>
        </div>
      </div>

      {/* Tournament hero */}
      <div style={{ background: 'linear-gradient(180deg, #0d1a0a 0%, #04060a 100%)', padding: '32px 24px', borderBottom: '1px solid #1a2030' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#5cb800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Demo Tournament</div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 40, color: '#f0f4ff', marginBottom: 8 }}>ALL-STAR MOVIE CLASSIC</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6b7a99', flexWrap: 'wrap' }}>
            <span>📅 April 19–20, 2026</span>
            <span>📍 Oakland, CA</span>
            <span>👥 {MOVIE_TEAMS.length} teams registered</span>
            <span>💰 $150 entry</span>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 20, width: 'fit-content' }}>
            {[{ l: 'Teams', v: MOVIE_TEAMS.length }, { l: 'Divisions', v: 2 }, { l: 'Courts', v: 4 }, { l: 'Games', v: DEMO_GAMES.length }].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#5cb800' }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {['schedule', 'teams', 'bracket'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid',
              background: activeTab === tab ? '#5cb800' : 'transparent', color: activeTab === tab ? '#04060a' : '#6b7a99', borderColor: activeTab === tab ? '#5cb800' : '#1a2030',
            }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'schedule' && (
          <div>
            {['Pool A', 'Pool B', 'Pool C'].map(pool => (
              <div key={pool} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#d4a017' }}>{pool}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Home', 'Away', 'Court', 'Time', 'Score'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', borderBottom: '1px solid #1a2030' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_GAMES.filter(g => g.pool === pool).map((g, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #0e1320' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: g.winner === 'home' ? '#5cb800' : '#d8e0f0' }}>{g.home}</td>
                        <td style={{ padding: '11px 14px', color: g.winner === 'away' ? '#5cb800' : '#d8e0f0' }}>{g.away}</td>
                        <td style={{ padding: '11px 14px', color: '#4a9eff', fontSize: 11 }}>{g.court}</td>
                        <td style={{ padding: '11px 14px', color: '#6b7a99', fontSize: 11 }}>{g.time}</td>
                        <td style={{ padding: '11px 14px' }}>
                          {g.score !== '—' ? <span style={{ color: '#5cb800', fontWeight: 700 }}>{g.score}</span> : <span style={{ color: '#4a5568' }}>Upcoming</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'teams' && (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0a0f1a' }}>
                  {['Team', 'Org', 'Division', 'Record', 'Points'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', borderBottom: '1px solid #1a2030' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOVIE_TEAMS.sort((a, b) => b.points - a.points).map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0e1320' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#d8e0f0' }}>{t.name}</td>
                    <td style={{ padding: '12px 14px', color: '#6b7a99' }}>{t.org}</td>
                    <td style={{ padding: '12px 14px', color: '#4a9eff', fontSize: 11 }}>{t.division}</td>
                    <td style={{ padding: '12px 14px', color: '#c0cce0' }}>{t.record}</td>
                    <td style={{ padding: '12px 14px', color: '#5cb800', fontWeight: 700 }}>{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bracket' && (
          <div>
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#d4a017', marginBottom: 16 }}>SEMIFINALS</div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { home: 'Coach Carter Richmond', away: 'TBD (1st Pool B)', time: '2:00 PM', court: 'Court 1' },
                  { home: 'Above the Rim Birdmen', away: 'TBD (1st Pool C)', time: '2:00 PM', court: 'Court 2' },
                ].map((g, i) => (
                  <div key={i} style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, overflow: 'hidden', width: 200 }}>
                    <div style={{ padding: '3px 8px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, color: '#4a9eff' }}>{g.court}</span>
                      <span style={{ fontSize: 9, color: '#4a5568' }}>{g.time}</span>
                    </div>
                    {[g.home, g.away].map((team, j) => (
                      <div key={j} style={{ padding: '6px 8px', borderBottom: j === 0 ? '1px solid #1a2030' : 'none' }}>
                        <span style={{ fontSize: 11, color: '#d8e0f0' }}>{team}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#080c12', border: '1px solid #5cb800', borderRadius: 12, padding: 24 }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 16, color: '#5cb800', marginBottom: 16 }}>CHAMPIONSHIP</div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ background: '#0a0f1a', border: '1px solid #1a3a0a', borderRadius: 8, overflow: 'hidden', width: 200 }}>
                  <div style={{ padding: '3px 8px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, color: '#4a9eff' }}>Court 1</span>
                    <span style={{ fontSize: 9, color: '#4a5568' }}>4:00 PM</span>
                  </div>
                  {['TBD (SF Winner 1)', 'TBD (SF Winner 2)'].map((team, j) => (
                    <div key={j} style={{ padding: '6px 8px', borderBottom: j === 0 ? '1px solid #1a2030' : 'none' }}>
                      <span style={{ fontSize: 11, color: '#d8e0f0' }}>{team}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #0d1a0a, #071525)', border: '1px solid #1a3a0a', borderRadius: 16, padding: 32, marginTop: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#f0f4ff', marginBottom: 8 }}>READY TO RUN YOUR TOURNAMENT?</div>
          <div style={{ fontSize: 14, color: '#6b7a99', marginBottom: 24 }}>NP Tournaments gives you everything you need to manage brackets, schedules, registrations, and more.</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Get Started Free →
            </button>
            <button onClick={() => window.open('https://np-tournaments-landing.vercel.app', '_blank')} style={{ background: 'transparent', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
