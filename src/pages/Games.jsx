import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { useGameResults } from '../hooks/useGameResults'
import GameFilters from '../components/games/GameFilters'
import GamesTable from '../components/games/GamesTable'
import { supabase } from '../supabaseClient'

const PER_PAGE = 50

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div
      style={{
        background: '#080c12',
        border: '1px solid #1a2030',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          color: '#4a5568',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Anton, sans-serif',
          fontSize: 30,
          color: accent,
          lineHeight: 1,
          letterSpacing: '0.5px',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default function Games() {
  const [team, setTeam] = useState('')
  const [divisionKey, setDivisionKey] = useState('all')
  const [gender, setGender] = useState('all')
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [circuit, setCircuit] = useState('all')
  const [host, setHost] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const [editingGame, setEditingGame] = useState(null)

  const { rows, divisionOptions, circuitOptions, hostOptions, loading, error, refresh, counts } =
    useGameResults({
      team,
      divisionKey,
      gender,
      dateFrom,
      dateTo,
      circuit,
      host,
      status,
      scoredOnly: false, // admin sees everything
    })

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1)
  }, [team, divisionKey, gender, dateFrom, dateTo, circuit, host, status])

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE))
  const pagedRows = useMemo(
    () => rows.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [rows, page]
  )

  function clearFilters() {
    setTeam('')
    setDivisionKey('all')
    setGender('all')
    setDateFrom(null)
    setDateTo(null)
    setCircuit('all')
    setHost('all')
    setStatus('all')
  }

  return (
    <>
      <Topbar
        title="Games & Scores"
        actions={
          <button
            onClick={refresh}
            style={{
              background: '#0d1a0a',
              border: '1px solid #1a3a0a',
              color: '#5cb800',
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <StatCard label="Total Games" value={counts.total} />
          <StatCard label="Final / Scored" value={counts.scored} accent="#5cb800" />
          <StatCard label="NP Tournament" value={counts.tournament} accent="#d4a017" />
          <StatCard label="Circuit History" value={counts.circuit} accent="#4a9eff" />
        </div>

        <div
          style={{
            background: '#080c12',
            border: '1px solid #1a2030',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0', letterSpacing: '0.3px' }}>
              ALL GAMES
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
              {PER_PAGE} per page • Director view — shows scheduled games without scores
            </div>
          </div>

          <div style={{ padding: 18, borderBottom: '1px solid #1a2030' }}>
            <GameFilters
              team={team}
              onTeamChange={setTeam}
              divisionKey={divisionKey}
              onDivisionKeyChange={setDivisionKey}
              divisionOptions={divisionOptions}
              gender={gender}
              onGenderChange={setGender}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
              circuit={circuit}
              onCircuitChange={setCircuit}
              circuitOptions={circuitOptions}
              host={host}
              onHostChange={setHost}
              hostOptions={hostOptions}
              status={status}
              onStatusChange={setStatus}
              onClear={clearFilters}
            />
          </div>

          {error ? (
            <div style={{ padding: 24, color: '#e05555', fontSize: 13 }}>
              Error: {error.message || String(error)}
            </div>
          ) : loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>
              Loading games...
            </div>
          ) : (
            <>
              <GamesTable
                rows={pagedRows}
                adminMode
                onEditScore={setEditingGame}
                linkTeams
                linkTournaments
              />

              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderTop: '1px solid #1a2030',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#6b7a99' }}>
                    Page {page} of {totalPages} • {rows.length} games
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      style={pagerBtn(page === 1)}
                    >
                      Previous
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      style={pagerBtn(page === totalPages)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {editingGame && (
        <ScoreEditModal
          row={editingGame}
          onClose={() => setEditingGame(null)}
          onSaved={() => {
            setEditingGame(null)
            refresh()
          }}
        />
      )}
    </>
  )
}

function pagerBtn(disabled) {
  return {
    background: disabled ? 'transparent' : '#0e1320',
    border: '1px solid #1a2030',
    color: disabled ? '#2d3748' : '#c0cce0',
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
  }
}

// ── Inline score edit modal ────────────────────────────────────────────────
function ScoreEditModal({ row, onClose, onSaved }) {
  const [homeScore, setHomeScore] = useState(row.home_score ?? '')
  const [awayScore, setAwayScore] = useState(row.away_score ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function save() {
    setSaving(true)
    setErr(null)
    const hs = homeScore === '' ? null : Number(homeScore)
    const as = awayScore === '' ? null : Number(awayScore)
    const scheduledGameId = row.id.replace(/^sched:/, '')
    const winnerId = hs != null && as != null
      ? (hs > as ? row.home_team_id : as > hs ? row.away_team_id : null)
      : null

    const { error } = await supabase
      .from('scheduled_games')
      .update({
        home_score: hs,
        away_score: as,
        winner_team_id: winnerId,
        status: hs != null && as != null ? 'completed' : 'scheduled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduledGameId)

    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#080c12',
          border: '1px solid #1a2030',
          borderRadius: 14,
          padding: 28,
          width: 460,
          maxWidth: '90vw',
        }}
      >
        <h3 style={{ margin: '0 0 4px', color: '#f0f4ff', fontFamily: 'Anton, sans-serif', letterSpacing: '0.5px' }}>
          Update Score
        </h3>
        <p style={{ color: '#6b7a99', fontSize: 12, margin: '0 0 20px' }}>
          {row.tournament_name} {row.round ? `• ${row.round}` : ''}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {row.home_team_name} (Home)
            </div>
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              style={{
                width: '100%',
                background: '#0e1320',
                border: '1px solid #1a2030',
                color: '#f0f4ff',
                borderRadius: 8,
                padding: '12px',
                fontSize: 22,
                fontFamily: 'Anton, sans-serif',
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {row.away_team_name} (Away)
            </div>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              style={{
                width: '100%',
                background: '#0e1320',
                border: '1px solid #1a2030',
                color: '#f0f4ff',
                borderRadius: 8,
                padding: '12px',
                fontSize: 22,
                fontFamily: 'Anton, sans-serif',
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 14, color: '#e05555', fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#6b7a99',
              border: '1px solid #1a2030',
              padding: '9px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: '#5cb800',
              color: '#04060a',
              border: 'none',
              padding: '9px 18px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {saving ? 'Saving...' : 'Save Score'}
          </button>
        </div>
      </div>
    </div>
  )
}
