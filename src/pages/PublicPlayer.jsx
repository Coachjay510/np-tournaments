import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const cell = { padding: '10px 14px', color: '#c0cce0', fontSize: 13 }
const th = {
  padding: '8px 14px',
  fontSize: 11,
  color: '#6b7a99',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  borderBottom: '1px solid #1a2030',
  textAlign: 'left',
  background: '#0a0f1a',
}

function fmtHeight(in_) {
  return in_ ? `${Math.floor(in_ / 12)}'${in_ % 12}"` : '—'
}

function fmtDate(d) {
  return d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
}

function StatPill({ label, value, accent = '#c0cce0' }) {
  return (
    <div
      style={{
        background: '#080c12',
        border: '1px solid #1a2030',
        borderRadius: 10,
        padding: '12px 18px',
        minWidth: 80,
        textAlign: 'center',
      }}
    >
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

export default function PublicPlayer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState([])
  const [gameLogs, setGameLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [
        { data: playerData },
        { data: statsData },
        { data: logsData },
      ] = await Promise.all([
        supabase.from('players').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('stats')
          .select('*')
          .eq('player_id', id)
          .order('season', { ascending: false }),
        supabase
          .from('player_game_logs')
          .select('*')
          .eq('player_id', id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])
      setPlayer(playerData)
      setStats(statsData || [])
      setGameLogs(logsData || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: 14 }}>
        Loading player…
      </div>
    )
  }

  if (!player) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e05555', fontSize: 14 }}>
        Player not found.
      </div>
    )
  }

  const latestStats = stats[0]

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', color: '#c0cce0' }}>
      {/* Nav bar */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: '#6b7a99', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#5cb800', letterSpacing: '0.5px' }}>
          NP TOURNAMENTS
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        {/* Bio card */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {player.photo_url && (
            <img
              src={player.photo_url}
              alt=""
              style={{ width: 110, height: 110, borderRadius: 12, objectFit: 'cover', border: '2px solid #1a2030', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontFamily: 'Anton, sans-serif', fontSize: 32, color: '#f0f4ff', letterSpacing: '0.5px' }}>
                {player.first_name} {player.last_name}
              </h1>
              {player.jersey_number != null && (
                <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800' }}>
                  #{player.jersey_number}
                </span>
              )}
              {player.accolade && (
                <span style={{ fontSize: 11, color: '#d4a017', border: '1px solid #3a2800', borderRadius: 6, padding: '3px 9px' }}>
                  {player.accolade}
                </span>
              )}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                ['Position', player.position || '—'],
                ['Class of', player.grad_year || '—'],
                ['Height', fmtHeight(player.height_inches)],
                ['Division', player.gender === 'M' ? 'Boys' : player.gender === 'F' ? 'Girls' : '—'],
                ['Team', player.np_team_name || '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, color: '#c0cce0', fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Career highlight pills (latest season) */}
        {latestStats && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <StatPill label="PPG" value={latestStats.ppg != null ? Number(latestStats.ppg).toFixed(1) : '—'} accent="#5cb800" />
            <StatPill label="RPG" value={latestStats.rpg != null ? Number(latestStats.rpg).toFixed(1) : '—'} />
            <StatPill label="APG" value={latestStats.apg != null ? Number(latestStats.apg).toFixed(1) : '—'} />
            {latestStats.spg != null && <StatPill label="SPG" value={Number(latestStats.spg).toFixed(1)} />}
            {latestStats.bpg != null && <StatPill label="BPG" value={Number(latestStats.bpg).toFixed(1)} />}
            <StatPill label="GP" value={latestStats.gp ?? '—'} accent="#6b7a99" />
          </div>
        )}

        {/* Season stats table */}
        {stats.length > 0 && (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#6b7a99' }}>
              Season Stats
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Season', 'GP', 'PPG', 'RPG', 'APG', 'SPG', 'BPG'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0e1320' }}>
                    <td style={{ ...cell, color: '#d4a017', fontWeight: 700 }}>{s.season || '—'}</td>
                    <td style={{ ...cell, color: '#6b7a99' }}>{s.gp ?? '—'}</td>
                    <td style={{ ...cell, color: '#5cb800', fontWeight: 700 }}>{s.ppg != null ? Number(s.ppg).toFixed(1) : '—'}</td>
                    <td style={cell}>{s.rpg != null ? Number(s.rpg).toFixed(1) : '—'}</td>
                    <td style={cell}>{s.apg != null ? Number(s.apg).toFixed(1) : '—'}</td>
                    <td style={cell}>{s.spg != null ? Number(s.spg).toFixed(1) : '—'}</td>
                    <td style={cell}>{s.bpg != null ? Number(s.bpg).toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Game log */}
        {gameLogs.length > 0 && (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#6b7a99' }}>
              Game Log
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'MIN'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gameLogs.map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #0e1320' }}>
                    <td style={{ ...cell, color: '#8a9ab8', fontSize: 11 }}>{fmtDate(g.created_at)}</td>
                    <td style={{ ...cell, color: '#5cb800', fontWeight: 700 }}>{g.points ?? '—'}</td>
                    <td style={cell}>{g.rebounds ?? '—'}</td>
                    <td style={cell}>{g.assists ?? '—'}</td>
                    <td style={cell}>{g.steals ?? '—'}</td>
                    <td style={cell}>{g.blocks ?? '—'}</td>
                    <td style={{ ...cell, color: '#4a5568' }}>{g.minutes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {stats.length === 0 && gameLogs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#4a5568', fontSize: 13 }}>
            No stats or game log available yet.
          </div>
        )}
      </div>
    </div>
  )
}
