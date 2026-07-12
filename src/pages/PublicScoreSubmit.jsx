import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const inputStyle = {
  background: '#0e1320',
  border: '1px solid #1a2030',
  color: '#d8e0f0',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
}

function fmtDate(d) {
  return d
    ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
}

export default function PublicScoreSubmit() {
  const { gameId } = useParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [notes, setNotes] = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('scheduled_games')
        .select('id, game_date, home_team_name, away_team_name, home_score, away_score, status, tournament_name, round')
        .eq('id', gameId)
        .maybeSingle()
      setGame(data)
      setLoading(false)
    }
    load()
  }, [gameId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (homeScore === '' || awayScore === '') {
      setError('Both scores are required.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { error: err } = await supabase.from('score_submissions').insert({
      game_id: gameId,
      home_score: Number(homeScore),
      away_score: Number(awayScore),
      notes: notes.trim() || null,
      submitted_by_email: submitterEmail.trim() || null,
      status: 'pending',
    })

    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>
        Loading game…
      </div>
    )
  }

  if (!game) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e05555' }}>
        Game not found. Check your link.
      </div>
    )
  }

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800', letterSpacing: '0.5px' }}>
            NP TOURNAMENTS
          </div>
          <div style={{ fontSize: 11, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: 2 }}>
            Score Submission
          </div>
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28 }}>
          {/* Game info */}
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #1a2030' }}>
            {game.tournament_name && (
              <div style={{ fontSize: 11, color: '#d4a017', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                {game.tournament_name}{game.round ? ` · ${game.round}` : ''}
              </div>
            )}
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', marginBottom: 4 }}>
              {game.home_team_name} vs {game.away_team_name}
            </div>
            <div style={{ fontSize: 13, color: '#6b7a99' }}>{fmtDate(game.game_date)}</div>
            {game.status === 'completed' && game.home_score != null && (
              <div style={{ marginTop: 10, padding: '6px 12px', background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 8, fontSize: 13, color: '#5cb800', display: 'inline-block' }}>
                Final: {game.home_team_name} {game.home_score} – {game.away_score} {game.away_team_name}
              </div>
            )}
          </div>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#5cb800', marginBottom: 8 }}>Score Submitted</div>
              <div style={{ fontSize: 13, color: '#6b7a99', lineHeight: 1.6 }}>
                Your submission is pending review by a Next Play admin. Final scores will be posted once approved.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Final Scores</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#8a9ab8', marginBottom: 6 }}>{game.home_team_name}</div>
                    <input
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={e => setHomeScore(e.target.value)}
                      placeholder="0"
                      style={{ ...inputStyle, fontSize: 28, fontFamily: 'Anton, sans-serif', textAlign: 'center', padding: '14px' }}
                      required
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#8a9ab8', marginBottom: 6 }}>{game.away_team_name}</div>
                    <input
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={e => setAwayScore(e.target.value)}
                      placeholder="0"
                      style={{ ...inputStyle, fontSize: 28, fontFamily: 'Anton, sans-serif', textAlign: 'center', padding: '14px' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Your Email (Coach / Team Rep)
                </div>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={e => setSubmitterEmail(e.target.value)}
                  placeholder="coach@yourteam.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  Notes (optional)
                </div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Overtime, forfeit, protest, etc."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {error && (
                <div style={{ color: '#e05555', fontSize: 12, marginBottom: 14 }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  background: submitting ? '#1a2030' : '#5cb800',
                  color: submitting ? '#4a5568' : '#04060a',
                  border: 'none',
                  borderRadius: 8,
                  padding: '13px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Score for Review'}
              </button>

              <div style={{ marginTop: 12, fontSize: 11, color: '#4a5568', textAlign: 'center', lineHeight: 1.5 }}>
                Scores are reviewed and approved by Next Play staff before going live.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
