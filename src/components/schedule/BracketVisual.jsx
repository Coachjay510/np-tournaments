// Visual bracket component for all tournament formats

const c = {
  bg: '#080c12',
  card: '#0a0f1a',
  border: '#1a2030',
  green: '#5cb800',
  gold: '#d4a017',
  text: '#d8e0f0',
  muted: '#4a5568',
  red: '#e05555',
  blue: '#4a9eff',
}

function GameSlot({ game, onScoreClick, compact }) {
  const isComplete = game.status === 'completed'
  const homeWon = isComplete && game.winner_team_id === game.home_team_id
  const awayWon = isComplete && game.winner_team_id === game.away_team_id

  return (
    <div style={{
      background: c.card, border: `1px solid ${c.border}`, borderRadius: 8,
      overflow: 'hidden', width: compact ? 160 : 200, flexShrink: 0
    }}>
      {/* Court + time */}
      {!compact && (
        <div style={{ padding: '4px 8px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: c.muted }}>{game.court?.name || 'TBD'}</span>
          <span style={{ fontSize: 10, color: c.muted }}>{game.scheduled_time || 'TBD'}</span>
        </div>
      )}
      {/* Home team */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 8px', background: homeWon ? '#0d1a0a' : 'transparent',
        borderBottom: `1px solid ${c.border}`
      }}>
        <span style={{ fontSize: 12, color: homeWon ? c.green : c.text, fontWeight: homeWon ? 700 : 400, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {game.home_team_name || 'TBD'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: homeWon ? c.green : isComplete ? c.muted : c.muted, minWidth: 20, textAlign: 'right' }}>
          {isComplete ? game.home_score ?? '-' : '-'}
        </span>
      </div>
      {/* Away team */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 8px', background: awayWon ? '#0d1a0a' : 'transparent',
      }}>
        <span style={{ fontSize: 12, color: awayWon ? c.green : c.text, fontWeight: awayWon ? 700 : 400, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {game.away_team_name || 'TBD'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: awayWon ? c.green : isComplete ? c.muted : c.muted, minWidth: 20, textAlign: 'right' }}>
          {isComplete ? game.away_score ?? '-' : '-'}
        </span>
      </div>
      {/* Score entry button */}
      {onScoreClick && game.status !== 'completed' && game.home_team_name !== 'TBD' && (
        <button onClick={() => onScoreClick(game)}
          style={{ width: '100%', padding: '4px', fontSize: 10, background: 'transparent', border: 'none', borderTop: `1px solid ${c.border}`, color: c.blue, cursor: 'pointer' }}>
          Enter Score
        </button>
      )}
    </div>
  )
}

function RoundColumn({ title, games, onScoreClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', minWidth: 210 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: c.muted, marginBottom: 4 }}>{title}</div>
      {games.map(g => (
        <GameSlot key={g.id} game={g} onScoreClick={onScoreClick} />
      ))}
    </div>
  )
}

function PoolBracket({ games, onScoreClick }) {
  const pools = {}
  games.filter(g => g.round === 'Pool Play').forEach(g => {
    const pool = g.pool_name || 'Pool A'
    if (!pools[pool]) pools[pool] = []
    pools[pool].push(g)
  })
  const bracketGames = games.filter(g => g.round !== 'Pool Play')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Pool play */}
      <div>
        <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Pool Play</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {Object.entries(pools).map(([poolName, poolGames]) => (
            <div key={poolName}>
              <div style={{ fontSize: 12, color: c.gold, marginBottom: 8, fontWeight: 600 }}>{poolName}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {poolGames.map(g => <GameSlot key={g.id} game={g} onScoreClick={onScoreClick} compact />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Bracket */}
      {bracketGames.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Bracket</div>
          <SingleElimBracket games={bracketGames} onScoreClick={onScoreClick} />
        </div>
      )}
    </div>
  )
}

function SingleElimBracket({ games, onScoreClick }) {
  const byRound = {}
  games.forEach(g => {
    const r = g.round || 'Round 1'
    if (!byRound[r]) byRound[r] = []
    byRound[r].push(g)
  })
  const roundOrder = ['Round 1','Round 2','Round 3','Quarterfinal','Semifinal','Final','Championship']
  const rounds = roundOrder.filter(r => byRound[r])
  if (!rounds.length) {
    const allRounds = Object.keys(byRound).sort()
    rounds.push(...allRounds)
  }

  return (
    <div style={{ display: 'flex', gap: 32, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
      {rounds.map(round => (
        <RoundColumn key={round} title={round} games={byRound[round] || []} onScoreClick={onScoreClick} />
      ))}
    </div>
  )
}

function DoubleElimBracket({ games, onScoreClick }) {
  const winners = games.filter(g => g.round?.startsWith('Winners') || g.round === 'Championship')
  const losers = games.filter(g => g.round?.startsWith('Losers'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 11, color: c.green, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Winners Bracket</div>
        <SingleElimBracket games={winners} onScoreClick={onScoreClick} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: c.red, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Losers Bracket</div>
        <SingleElimBracket games={losers} onScoreClick={onScoreClick} />
      </div>
    </div>
  )
}

function RoundRobinBracket({ games, onScoreClick }) {
  const byRound = {}
  games.forEach((g, i) => {
    const r = `Game ${i + 1}`
    byRound[r] = [g]
  })

  // Build standings
  const standings = {}
  games.forEach(g => {
    [g.home_team_name, g.away_team_name].forEach(name => {
      if (name && name !== 'TBD' && !standings[name]) {
        standings[name] = { name, w: 0, l: 0, pf: 0, pa: 0 }
      }
    })
    if (g.status === 'completed') {
      if (g.home_team_name && g.home_team_name !== 'TBD') {
        standings[g.home_team_name].pf += g.home_score || 0
        standings[g.home_team_name].pa += g.away_score || 0
        if (g.home_score > g.away_score) standings[g.home_team_name].w++
        else standings[g.home_team_name].l++
      }
      if (g.away_team_name && g.away_team_name !== 'TBD') {
        standings[g.away_team_name].pf += g.away_score || 0
        standings[g.away_team_name].pa += g.home_score || 0
        if (g.away_score > g.home_score) standings[g.away_team_name].w++
        else standings[g.away_team_name].l++
      }
    }
  })

  const sorted = Object.values(standings).sort((a, b) => b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa))

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      {/* Standings */}
      <div style={{ minWidth: 280 }}>
        <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Standings</div>
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 50px 50px', padding: '8px 12px', borderBottom: `1px solid ${c.border}` }}>
            {['Team', 'W', 'L', 'PF', 'PA'].map(h => (
              <div key={h} style={{ fontSize: 10, color: c.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
            ))}
          </div>
          {sorted.map((s, i) => (
            <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 50px 50px', padding: '10px 12px', borderBottom: `1px solid ${c.border}`, background: i === 0 ? '#0d1a0a' : 'transparent' }}>
              <div style={{ fontSize: 12, color: i === 0 ? c.green : c.text, fontWeight: i === 0 ? 700 : 400 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: c.green }}>{s.w}</div>
              <div style={{ fontSize: 12, color: c.red }}>{s.l}</div>
              <div style={{ fontSize: 12, color: c.text }}>{s.pf}</div>
              <div style={{ fontSize: 12, color: c.text }}>{s.pa}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Games */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: c.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Games</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {games.map(g => <GameSlot key={g.id} game={g} onScoreClick={onScoreClick} compact />)}
        </div>
      </div>
    </div>
  )
}

export default function BracketVisual({ games, format, onScoreClick }) {
  if (!games?.length) return (
    <div style={{ padding: 40, textAlign: 'center', color: c.muted, fontSize: 13 }}>
      No games scheduled yet. Use the Auto Scheduler to generate games.
    </div>
  )

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      {format === 'round_robin' && <RoundRobinBracket games={games} onScoreClick={onScoreClick} />}
      {format === 'single_elimination' && <SingleElimBracket games={games} onScoreClick={onScoreClick} />}
      {format === 'double_elimination' && <DoubleElimBracket games={games} onScoreClick={onScoreClick} />}
      {(format === 'pool_play' || format === 'pool_then_bracket') && <PoolBracket games={games} onScoreClick={onScoreClick} />}
      {!format && <SingleElimBracket games={games} onScoreClick={onScoreClick} />}
    </div>
  )
}
