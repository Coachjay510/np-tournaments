import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const SAVE_DEBOUNCE_MS = 5000
const LOCAL_KEY = (id) => `np_scoreboard_${id}`

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
    .replace(',', '')
}

function gameTitle(game) {
  const date = fmtDate(game.scheduled_date)
  const id = game.id ? `#${game.id.slice(0, 8)}` : ''
  return `${game.home_team_name} vs ${game.away_team_name}  ·  ${date}  ·  ${id}`
}

// ── Stat computation ─────────────────────────────────────────────────────────
function computeStats(plays, rosterId) {
  const pts = plays.reduce((sum, p) => {
    if (p.roster_id !== rosterId) return sum
    if (p.play_type === 'fg2_make') return sum + 2
    if (p.play_type === 'fg3_make') return sum + 3
    if (p.play_type === 'ft_make') return sum + 1
    return sum
  }, 0)
  const fgm = plays.filter(p => p.roster_id === rosterId && (p.play_type === 'fg2_make' || p.play_type === 'fg3_make')).length
  const fga = plays.filter(p => p.roster_id === rosterId && ['fg2_make', 'fg3_make', 'fg2_miss', 'fg3_miss'].includes(p.play_type)).length
  const fg3m = plays.filter(p => p.roster_id === rosterId && p.play_type === 'fg3_make').length
  const fg3a = plays.filter(p => p.roster_id === rosterId && ['fg3_make', 'fg3_miss'].includes(p.play_type)).length
  const ftm = plays.filter(p => p.roster_id === rosterId && p.play_type === 'ft_make').length
  const fta = plays.filter(p => p.roster_id === rosterId && ['ft_make', 'ft_miss'].includes(p.play_type)).length
  const reb = plays.filter(p => p.rebound_roster_id === rosterId).length
  const ast = plays.filter(p => p.assist_roster_id === rosterId).length
  const stl = plays.filter(p => p.roster_id === rosterId && p.play_type === 'steal').length
  const blk = plays.filter(p => p.roster_id === rosterId && p.play_type === 'block').length
  const to = plays.filter(p => p.roster_id === rosterId && p.play_type === 'turnover').length
  return { pts, fgm, fga, fg3m, fg3a, ftm, fta, reb, ast, stl, blk, to }
}

// ── Shared button ─────────────────────────────────────────────────────────────
function Btn({ label, onClick, color = '#c0cce0', bg = '#0e1320', small = false, disabled = false, style = {} }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: disabled ? '#1a2030' : pressed ? '#1a2030' : bg,
        border: `1px solid ${disabled ? '#1a2030' : '#1a2030'}`,
        color: disabled ? '#4a5568' : color,
        borderRadius: 10,
        padding: small ? '10px 12px' : '14px 0',
        fontSize: small ? 13 : 17,
        fontWeight: 700,
        fontFamily: 'Anton, sans-serif',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: small ? 44 : 60,
        flex: small ? undefined : 1,
        letterSpacing: '0.5px',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.08s',
        ...style,
      }}
    >
      {label}
    </button>
  )
}

// ── Player picker grid ────────────────────────────────────────────────────────
function PlayerGrid({ players, onSelect, unknownLabel = 'UNKNOWN', skipLabel = null }) {
  const cellStyle = (bg = '#0e1320') => ({
    background: bg,
    border: '1px solid #1a2030',
    borderRadius: 10,
    padding: '10px 6px',
    cursor: 'pointer',
    textAlign: 'center',
    minHeight: 72,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      <button onClick={() => onSelect(null)} style={{ ...cellStyle('#0a0f1a'), gridColumn: skipLabel ? '1/2' : '1/4' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 13, color: '#6b7a99' }}>{unknownLabel}</div>
      </button>
      {skipLabel && (
        <button onClick={() => onSelect('skip')} style={{ ...cellStyle('#0a0f1a'), gridColumn: '2/4' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 13, color: '#6b7a99' }}>{skipLabel}</div>
        </button>
      )}
      {players.map(p => (
        <button key={p.id} onClick={() => onSelect(p)} style={cellStyle()}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#d4a017', lineHeight: 1 }}>#{p.jersey_number || '—'}</div>
          <div style={{ fontSize: 11, color: '#c0cce0', marginTop: 4, lineHeight: 1.2, maxWidth: 80, wordBreak: 'break-word' }}>{p.player_name}</div>
        </button>
      ))}
    </div>
  )
}

// ── Play Wizard ───────────────────────────────────────────────────────────────
// wizardConfig: { type, team, teamName, otherTeamName, homeRoster, awayRoster }
// type: 'fg2_make' | 'fg3_make' | 'fg_miss2' | 'fg_miss3' | 'ft' | 'turnover' | 'block'
function PlayWizard({ config, homeScore, awayScore, period, onCommit, onCancel }) {
  const { type, team, teamName, otherTeamName, homeRoster, awayRoster } = config
  const myRoster = team === 'home' ? homeRoster : awayRoster
  const oppRoster = team === 'home' ? awayRoster : homeRoster

  const [step, setStep] = useState(0)
  const [scorer, setScorer] = useState(undefined)       // player obj or null
  const [assist, setAssist] = useState(undefined)
  const [missBy, setMissBy] = useState(undefined)
  const [rebTeam, setRebTeam] = useState(undefined)    // 'home' | 'away' | 'skip'
  const [rebPlayer, setRebPlayer] = useState(undefined)
  const [ftShooter, setFtShooter] = useState(undefined)
  const [ftTotal, setFtTotal] = useState(null)
  const [ftResults, setFtResults] = useState([])       // array of 'make'|'miss'
  const [toBy, setToBy] = useState(undefined)
  const [stolen, setStolen] = useState(undefined)      // true|false
  const [stealBy, setStealBy] = useState(undefined)
  const [blockBy, setBlockBy] = useState(undefined)

  const isScorePT = type === 'fg2_make' ? 2 : type === 'fg3_make' ? 3 : 0
  const isMiss2 = type === 'fg_miss2'
  const isMiss3 = type === 'fg_miss3'
  const isMiss = isMiss2 || isMiss3

  const rebRoster = rebTeam === 'home' ? homeRoster : rebTeam === 'away' ? awayRoster : []
  const rebTeamName = rebTeam === 'home' ? config.gameHome : config.gameAway

  // Step labels and totals by wizard type
  let totalSteps = 1
  if (type === 'fg2_make' || type === 'fg3_make') totalSteps = 2
  if (isMiss) totalSteps = 3
  if (type === 'ft') totalSteps = ftTotal ? 2 + ftTotal : 2
  if (type === 'turnover') totalSteps = 3
  if (type === 'block') totalSteps = 3

  function titleLabel() {
    const side = team === 'home' ? teamName : teamName
    if (type === 'fg2_make') return `${side}: 2-POINT MAKE`
    if (type === 'fg3_make') return `${side}: 3-POINT MAKE`
    if (isMiss2) return `${side}: 2-POINT MISS`
    if (isMiss3) return `${side}: 3-POINT MISS`
    if (type === 'ft') return `${side}: FREE THROWS`
    if (type === 'turnover') return `${side}: TURNOVER`
    if (type === 'block') return `BLOCK vs ${side}`
    return ''
  }

  function commit() {
    const plays = []
    const now = new Date().toISOString()

    if (type === 'fg2_make' || type === 'fg3_make') {
      const pts = isScorePT
      const newHome = team === 'home' ? homeScore + pts : homeScore
      const newAway = team === 'away' ? awayScore + pts : awayScore
      plays.push({
        play_type: type,
        team,
        roster_id: scorer?.id || null,
        player_name: scorer?.player_name || null,
        assist_roster_id: assist?.id || null,
        assist_player_name: assist?.player_name || null,
        home_score_after: newHome,
        away_score_after: newAway,
        period,
        created_at: now,
      })
      onCommit(plays, newHome, newAway)
    } else if (isMiss) {
      const pts = 0
      plays.push({
        play_type: isMiss2 ? 'fg2_miss' : 'fg3_miss',
        team,
        roster_id: missBy?.id || null,
        player_name: missBy?.player_name || null,
        home_score_after: homeScore,
        away_score_after: awayScore,
        rebound_team: rebTeam !== 'skip' ? rebTeam : null,
        rebound_roster_id: rebPlayer?.id || null,
        rebound_player_name: rebPlayer?.player_name || null,
        period,
        created_at: now,
      })
      onCommit(plays, homeScore, awayScore)
    } else if (type === 'ft') {
      let hs = homeScore, as_ = awayScore
      ftResults.forEach((r, i) => {
        if (r === 'make') {
          if (team === 'home') hs++; else as_++
        }
        plays.push({
          play_type: r === 'make' ? 'ft_make' : 'ft_miss',
          team,
          roster_id: ftShooter?.id || null,
          player_name: ftShooter?.player_name || null,
          ft_number: i + 1,
          ft_total: ftTotal,
          home_score_after: team === 'home' ? (r === 'make' ? homeScore + plays.filter(p => p.play_type === 'ft_make').length + (r === 'make' ? 1 : 0) : homeScore + plays.filter(p => p.play_type === 'ft_make').length) : homeScore,
          away_score_after: team === 'away' ? (r === 'make' ? awayScore + plays.filter(p => p.play_type === 'ft_make').length + (r === 'make' ? 1 : 0) : awayScore + plays.filter(p => p.play_type === 'ft_make').length) : awayScore,
          period,
          created_at: now,
        })
      })
      // Recompute scores properly
      let finalH = homeScore, finalA = awayScore
      ftResults.forEach(r => {
        if (r === 'make') { if (team === 'home') finalH++; else finalA++ }
      })
      onCommit(plays, finalH, finalA)
    } else if (type === 'turnover') {
      plays.push({
        play_type: 'turnover',
        team,
        roster_id: toBy?.id || null,
        player_name: toBy?.player_name || null,
        home_score_after: homeScore,
        away_score_after: awayScore,
        period,
        created_at: now,
      })
      if (stolen && stealBy !== 'skip') {
        const stealTeam = team === 'home' ? 'away' : 'home'
        plays.push({
          play_type: 'steal',
          team: stealTeam,
          roster_id: stealBy?.id || null,
          player_name: stealBy?.player_name || null,
          home_score_after: homeScore,
          away_score_after: awayScore,
          period,
          created_at: now,
        })
      }
      onCommit(plays, homeScore, awayScore)
    } else if (type === 'block') {
      const blockTeam = team === 'home' ? 'away' : 'home'
      plays.push({
        play_type: 'block',
        team: blockTeam,
        roster_id: blockBy?.id || null,
        player_name: blockBy?.player_name || null,
        home_score_after: homeScore,
        away_score_after: awayScore,
        rebound_team: rebTeam !== 'skip' ? rebTeam : null,
        rebound_roster_id: rebPlayer?.id || null,
        rebound_player_name: rebPlayer?.player_name || null,
        period,
        created_at: now,
      })
      onCommit(plays, homeScore, awayScore)
    }
  }

  // ── FG Make steps ────────────────────────────────────────────────────────
  function renderFGMake() {
    if (step === 0) return (
      <>
        <WizardStepLabel title="WHO SCORED?" step={1} total={2} />
        <PlayerGrid players={myRoster} onSelect={p => { setScorer(p); setStep(1) }} />
        <SkipTracking onSkip={() => onCommit([], homeScore + isScorePT, awayScore)} />
      </>
    )
    if (step === 1) return (
      <>
        <WizardStepLabel title="ASSIST?" step={2} total={2} />
        <PlayerGrid
          players={myRoster.filter(p => p.id !== scorer?.id)}
          onSelect={p => { setAssist(p); commit() }}
          unknownLabel="NO ASSIST"
          skipLabel="SKIP"
        />
      </>
    )
  }

  // ── FG Miss steps ─────────────────────────────────────────────────────────
  function renderFGMiss() {
    if (step === 0) return (
      <>
        <WizardStepLabel title="WHO MISSED?" step={1} total={3} />
        <PlayerGrid players={myRoster} onSelect={p => { setMissBy(p); setStep(1) }} />
      </>
    )
    if (step === 1) return (
      <>
        <WizardStepLabel title="REBOUND — WHICH TEAM?" step={2} total={3} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => { setRebTeam('home'); setStep(2) }} style={bigBtnStyle('#0e1320', '#d8e0f0')}>{config.gameHome}</button>
          <button onClick={() => { setRebTeam('away'); setStep(2) }} style={bigBtnStyle('#0e1320', '#d8e0f0')}>{config.gameAway}</button>
          <button onClick={() => { setRebTeam('skip'); setRebPlayer(null); commitMissDirectly() }} style={bigBtnStyle('#080c12', '#4a5568')}>OUT OF BOUNDS / SKIP</button>
        </div>
      </>
    )
    if (step === 2) return (
      <>
        <WizardStepLabel title={`WHO REBOUNDED? (${rebTeamName})`} step={3} total={3} />
        <PlayerGrid players={rebRoster} onSelect={p => { setRebPlayer(p); commitMissWithReb(p) }} />
      </>
    )
  }

  function commitMissDirectly() {
    const now = new Date().toISOString()
    const plays = [{
      play_type: isMiss2 ? 'fg2_miss' : 'fg3_miss',
      team,
      roster_id: missBy?.id || null,
      player_name: missBy?.player_name || null,
      home_score_after: homeScore,
      away_score_after: awayScore,
      rebound_team: null,
      rebound_roster_id: null,
      rebound_player_name: null,
      period,
      created_at: now,
    }]
    onCommit(plays, homeScore, awayScore)
  }

  function commitMissWithReb(rebP) {
    const now = new Date().toISOString()
    const plays = [{
      play_type: isMiss2 ? 'fg2_miss' : 'fg3_miss',
      team,
      roster_id: missBy?.id || null,
      player_name: missBy?.player_name || null,
      home_score_after: homeScore,
      away_score_after: awayScore,
      rebound_team: rebTeam,
      rebound_roster_id: rebP?.id || null,
      rebound_player_name: rebP?.player_name || null,
      period,
      created_at: now,
    }]
    onCommit(plays, homeScore, awayScore)
  }

  // ── FT steps ──────────────────────────────────────────────────────────────
  function renderFT() {
    if (step === 0) return (
      <>
        <WizardStepLabel title="FREE THROW SHOOTER?" step={1} total="?" />
        <PlayerGrid players={myRoster} onSelect={p => { setFtShooter(p); setStep(1) }} />
      </>
    )
    if (step === 1) return (
      <>
        <WizardStepLabel title="HOW MANY SHOTS?" step={2} total="?" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['1 Shot', 1], ['2 Shots', 2], ['1-and-1', 'oneandone'], ['3 Shots', 3]].map(([label, val]) => (
            <button key={label} onClick={() => { setFtTotal(val === 'oneandone' ? 2 : val); setFtResults([]); setStep(2) }} style={bigBtnStyle('#0e1320', '#d8e0f0')}>{label}</button>
          ))}
        </div>
      </>
    )
    if (step >= 2 && ftTotal !== null) {
      const shotNum = ftResults.length + 1
      if (shotNum > ftTotal) {
        // All shots done — auto-commit
        setTimeout(() => commit(), 0)
        return <div style={{ color: '#5cb800', textAlign: 'center', fontSize: 18 }}>Done!</div>
      }
      return (
        <>
          <WizardStepLabel title={`SHOT ${shotNum} OF ${ftTotal}`} step={2 + ftResults.length} total={2 + ftTotal} />
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => {
              const r = [...ftResults, 'make']
              setFtResults(r)
              if (r.length >= ftTotal) {
                // commit now
                const now = new Date().toISOString()
                const plays = []
                let finalH = homeScore, finalA = awayScore
                r.forEach((res, i) => {
                  if (res === 'make') { if (team === 'home') finalH++; else finalA++ }
                  plays.push({
                    play_type: res === 'make' ? 'ft_make' : 'ft_miss',
                    team,
                    roster_id: ftShooter?.id || null,
                    player_name: ftShooter?.player_name || null,
                    ft_number: i + 1,
                    ft_total: ftTotal,
                    home_score_after: finalH,
                    away_score_after: finalA,
                    period,
                    created_at: now,
                  })
                })
                onCommit(plays, finalH, finalA)
              }
            }} style={bigBtnStyle('#0d1a0a', '#5cb800')}>MADE ✓</button>
            <button onClick={() => {
              const r = [...ftResults, 'miss']
              setFtResults(r)
              if (r.length >= ftTotal) {
                const now = new Date().toISOString()
                const plays = []
                let finalH = homeScore, finalA = awayScore
                r.forEach((res, i) => {
                  if (res === 'make') { if (team === 'home') finalH++; else finalA++ }
                  plays.push({
                    play_type: res === 'make' ? 'ft_make' : 'ft_miss',
                    team,
                    roster_id: ftShooter?.id || null,
                    player_name: ftShooter?.player_name || null,
                    ft_number: i + 1,
                    ft_total: ftTotal,
                    home_score_after: finalH,
                    away_score_after: finalA,
                    period,
                    created_at: now,
                  })
                })
                onCommit(plays, finalH, finalA)
              }
            }} style={bigBtnStyle('#1a0a0a', '#e05555')}>MISSED ✗</button>
          </div>
        </>
      )
    }
  }

  // ── Turnover steps ────────────────────────────────────────────────────────
  function renderTO() {
    if (step === 0) return (
      <>
        <WizardStepLabel title="TURNOVER BY?" step={1} total={3} />
        <PlayerGrid players={myRoster} onSelect={p => { setToBy(p); setStep(1) }} />
      </>
    )
    if (step === 1) return (
      <>
        <WizardStepLabel title="STEAL?" step={2} total={3} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => { setStolen(true); setStep(2) }} style={bigBtnStyle('#0e1320', '#d8e0f0')}>YES — STOLEN</button>
          <button onClick={() => {
            setStolen(false)
            const now = new Date().toISOString()
            onCommit([{ play_type: 'turnover', team, roster_id: toBy?.id || null, player_name: toBy?.player_name || null, home_score_after: homeScore, away_score_after: awayScore, period, created_at: now }], homeScore, awayScore)
          }} style={bigBtnStyle('#080c12', '#6b7a99')}>NO — OUT OF BOUNDS</button>
        </div>
      </>
    )
    if (step === 2) return (
      <>
        <WizardStepLabel title="STOLEN BY?" step={3} total={3} />
        <PlayerGrid players={oppRoster} onSelect={p => {
          const now = new Date().toISOString()
          const stealTeam = team === 'home' ? 'away' : 'home'
          onCommit([
            { play_type: 'turnover', team, roster_id: toBy?.id || null, player_name: toBy?.player_name || null, home_score_after: homeScore, away_score_after: awayScore, period, created_at: now },
            { play_type: 'steal', team: stealTeam, roster_id: p?.id || null, player_name: p?.player_name || null, home_score_after: homeScore, away_score_after: awayScore, period, created_at: now },
          ], homeScore, awayScore)
        }} unknownLabel="UNKNOWN" />
      </>
    )
  }

  // ── Block steps ───────────────────────────────────────────────────────────
  function renderBlock() {
    const blockTeam = team === 'home' ? 'away' : 'home'
    const blockRoster = blockTeam === 'home' ? homeRoster : awayRoster
    if (step === 0) return (
      <>
        <WizardStepLabel title="WHO BLOCKED IT?" step={1} total={3} />
        <PlayerGrid players={blockRoster} onSelect={p => { setBlockBy(p); setStep(1) }} />
      </>
    )
    if (step === 1) return (
      <>
        <WizardStepLabel title="REBOUND — WHICH TEAM?" step={2} total={3} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => { setRebTeam('home'); setStep(2) }} style={bigBtnStyle('#0e1320', '#d8e0f0')}>{config.gameHome}</button>
          <button onClick={() => { setRebTeam('away'); setStep(2) }} style={bigBtnStyle('#0e1320', '#d8e0f0')}>{config.gameAway}</button>
          <button onClick={() => {
            const now = new Date().toISOString()
            onCommit([{ play_type: 'block', team: blockTeam, roster_id: blockBy?.id || null, player_name: blockBy?.player_name || null, home_score_after: homeScore, away_score_after: awayScore, rebound_team: null, rebound_roster_id: null, rebound_player_name: null, period, created_at: now }], homeScore, awayScore)
          }} style={bigBtnStyle('#080c12', '#4a5568')}>SKIP</button>
        </div>
      </>
    )
    if (step === 2) return (
      <>
        <WizardStepLabel title={`WHO REBOUNDED?`} step={3} total={3} />
        <PlayerGrid players={rebRoster} onSelect={p => {
          const now = new Date().toISOString()
          onCommit([{ play_type: 'block', team: blockTeam, roster_id: blockBy?.id || null, player_name: blockBy?.player_name || null, home_score_after: homeScore, away_score_after: awayScore, rebound_team: rebTeam, rebound_roster_id: p?.id || null, rebound_player_name: p?.player_name || null, period, created_at: now }], homeScore, awayScore)
        }} />
      </>
    )
  }

  function goBack() {
    if (step > 0) setStep(step - 1)
  }

  function renderStep() {
    if (type === 'fg2_make' || type === 'fg3_make') return renderFGMake()
    if (isMiss) return renderFGMiss()
    if (type === 'ft') return renderFT()
    if (type === 'turnover') return renderTO()
    if (type === 'block') return renderBlock()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,10,0.95)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, padding: '16px 12px', overflowY: 'auto' }}>
      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 16, padding: '20px 16px', width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={step > 0 ? goBack : undefined} style={{ background: 'none', border: 'none', color: step > 0 ? '#6b7a99' : 'transparent', fontSize: 13, cursor: step > 0 ? 'pointer' : 'default', padding: 0 }}>← Back</button>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 15, color: '#d4a017', letterSpacing: 1, textAlign: 'center' }}>{titleLabel()}</div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 12, cursor: 'pointer', padding: 0 }}>Cancel</button>
        </div>
        {renderStep()}
      </div>
    </div>
  )
}

function WizardStepLabel({ title, step, total }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: '#4a5568' }}>Step {step} of {total}</div>
    </div>
  )
}

function SkipTracking({ onSkip }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 16 }}>
      <button onClick={onSkip} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>skip tracking →</button>
    </div>
  )
}

function bigBtnStyle(bg, color) {
  return {
    background: bg,
    border: '1px solid #1a2030',
    color,
    borderRadius: 10,
    padding: '16px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'Anton, sans-serif',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    WebkitTapHighlightColor: 'transparent',
  }
}

// ── Box Score ─────────────────────────────────────────────────────────────────
function BoxScore({ plays, homeRoster, awayRoster, homeTeamName, awayTeamName }) {
  function TeamTable({ roster, teamName }) {
    const rows = roster.map(p => ({ player: p, stats: computeStats(plays, p.id) }))
    const tot = {
      pts: rows.reduce((s, r) => s + r.stats.pts, 0),
      fgm: rows.reduce((s, r) => s + r.stats.fgm, 0),
      fga: rows.reduce((s, r) => s + r.stats.fga, 0),
      fg3m: rows.reduce((s, r) => s + r.stats.fg3m, 0),
      fg3a: rows.reduce((s, r) => s + r.stats.fg3a, 0),
      ftm: rows.reduce((s, r) => s + r.stats.ftm, 0),
      fta: rows.reduce((s, r) => s + r.stats.fta, 0),
      reb: rows.reduce((s, r) => s + r.stats.reb, 0),
      ast: rows.reduce((s, r) => s + r.stats.ast, 0),
      stl: rows.reduce((s, r) => s + r.stats.stl, 0),
      blk: rows.reduce((s, r) => s + r.stats.blk, 0),
      to: rows.reduce((s, r) => s + r.stats.to, 0),
    }
    const hdStyle = { fontSize: 9, color: '#4a5568', textTransform: 'uppercase', padding: '4px 4px', textAlign: 'right', whiteSpace: 'nowrap' }
    const cellStyle = { fontSize: 12, color: '#c0cce0', padding: '5px 4px', textAlign: 'right', borderTop: '1px solid #1a2030' }
    const totStyle = { ...cellStyle, color: '#d4a017', fontWeight: 700 }
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 12, color: '#5cb800', marginBottom: 6, textTransform: 'uppercase' }}>{teamName}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...hdStyle, textAlign: 'left' }}>#</th>
                <th style={{ ...hdStyle, textAlign: 'left' }}>Name</th>
                <th style={hdStyle}>PTS</th>
                <th style={hdStyle}>REB</th>
                <th style={hdStyle}>AST</th>
                <th style={hdStyle}>STL</th>
                <th style={hdStyle}>BLK</th>
                <th style={hdStyle}>TO</th>
                <th style={hdStyle}>FG</th>
                <th style={hdStyle}>3P</th>
                <th style={hdStyle}>FT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ player, stats }) => (
                <tr key={player.id}>
                  <td style={{ ...cellStyle, color: '#d4a017', fontFamily: 'Anton, sans-serif', textAlign: 'left' }}>{player.jersey_number || '—'}</td>
                  <td style={{ ...cellStyle, textAlign: 'left', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.player_name}</td>
                  <td style={cellStyle}>{stats.pts}</td>
                  <td style={cellStyle}>{stats.reb}</td>
                  <td style={cellStyle}>{stats.ast}</td>
                  <td style={cellStyle}>{stats.stl}</td>
                  <td style={cellStyle}>{stats.blk}</td>
                  <td style={cellStyle}>{stats.to}</td>
                  <td style={cellStyle}>{stats.fgm}/{stats.fga}</td>
                  <td style={cellStyle}>{stats.fg3m}/{stats.fg3a}</td>
                  <td style={cellStyle}>{stats.ftm}/{stats.fta}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ ...totStyle, textAlign: 'left', color: '#6b7a99' }}>TOTAL</td>
                <td style={totStyle}>{tot.pts}</td>
                <td style={totStyle}>{tot.reb}</td>
                <td style={totStyle}>{tot.ast}</td>
                <td style={totStyle}>{tot.stl}</td>
                <td style={totStyle}>{tot.blk}</td>
                <td style={totStyle}>{tot.to}</td>
                <td style={totStyle}>{tot.fgm}/{tot.fga}</td>
                <td style={totStyle}>{tot.fg3m}/{tot.fg3a}</td>
                <td style={totStyle}>{tot.ftm}/{tot.fta}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (homeRoster.length === 0 && awayRoster.length === 0) {
    return <div style={{ color: '#4a5568', fontSize: 13, textAlign: 'center', padding: 20 }}>No roster data. Add players in Roster Setup.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TeamTable roster={homeRoster} teamName={homeTeamName} />
      <TeamTable roster={awayRoster} teamName={awayTeamName} />
    </div>
  )
}

// ── Roster Setup ──────────────────────────────────────────────────────────────
function RosterSetup({ game, onStart, onSkip }) {
  const [homeRoster, setHomeRoster] = useState([])
  const [awayRoster, setAwayRoster] = useState([])
  const [homeJersey, setHomeJersey] = useState('')
  const [homeName, setHomeName] = useState('')
  const [awayJersey, setAwayJersey] = useState('')
  const [awayName, setAwayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Load existing game_rosters
      const { data: existing } = await supabase
        .from('game_rosters')
        .select('*')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true })
      if (existing && existing.length > 0) {
        setHomeRoster(existing.filter(r => r.team === 'home'))
        setAwayRoster(existing.filter(r => r.team === 'away'))
        setLoading(false)
        return
      }
      // Try to auto-load from team_players JOIN players
      const homeId = game.home_team_id
      const awayId = game.away_team_id
      const idLooksLike = id => id && /^\d+$/.test(String(id))
      let homeP = [], awayP = []
      if (idLooksLike(homeId)) {
        const { data: tp } = await supabase
          .from('team_players')
          .select('players(id, first_name, last_name, jersey_number)')
          .eq('np_team_id', homeId)
        if (tp) homeP = tp.map(r => r.players).filter(Boolean).map(p => ({ id: crypto.randomUUID(), player_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(), jersey_number: p.jersey_number || '', player_id: p.id }))
      }
      if (idLooksLike(awayId)) {
        const { data: tp } = await supabase
          .from('team_players')
          .select('players(id, first_name, last_name, jersey_number)')
          .eq('np_team_id', awayId)
        if (tp) awayP = tp.map(r => r.players).filter(Boolean).map(p => ({ id: crypto.randomUUID(), player_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(), jersey_number: p.jersey_number || '', player_id: p.id }))
      }
      setHomeRoster(homeP)
      setAwayRoster(awayP)
      setLoading(false)
    }
    load()
  }, [game.id])

  function addPlayer(team) {
    const jersey = team === 'home' ? homeJersey : awayJersey
    const name = team === 'home' ? homeName : awayName
    if (!name.trim()) return
    const entry = { id: crypto.randomUUID(), player_name: name.trim(), jersey_number: jersey.trim(), player_id: null, _new: true }
    if (team === 'home') { setHomeRoster(r => [...r, entry]); setHomeJersey(''); setHomeName('') }
    else { setAwayRoster(r => [...r, entry]); setAwayJersey(''); setAwayName('') }
  }

  function removePlayer(team, id) {
    if (team === 'home') setHomeRoster(r => r.filter(p => p.id !== id))
    else setAwayRoster(r => r.filter(p => p.id !== id))
  }

  async function handleStart() {
    setSaving(true)
    const newHome = homeRoster.filter(p => p._new)
    const newAway = awayRoster.filter(p => p._new)
    const inserts = [
      ...newHome.map(p => ({ game_id: game.id, team: 'home', player_name: p.player_name, jersey_number: p.jersey_number, player_id: p.player_id || null })),
      ...newAway.map(p => ({ game_id: game.id, team: 'away', player_name: p.player_name, jersey_number: p.jersey_number, player_id: p.player_id || null })),
    ]
    if (inserts.length > 0) {
      const { data: inserted } = await supabase.from('game_rosters').insert(inserts).select()
      if (inserted) {
        const insertedHome = inserted.filter(r => r.team === 'home')
        const insertedAway = inserted.filter(r => r.team === 'away')
        // merge IDs
        const finalHome = homeRoster.map(p => p._new ? (insertedHome.find(i => i.player_name === p.player_name && i.jersey_number === p.jersey_number) || p) : p)
        const finalAway = awayRoster.map(p => p._new ? (insertedAway.find(i => i.player_name === p.player_name && i.jersey_number === p.jersey_number) || p) : p)
        setSaving(false)
        onStart(finalHome, finalAway)
        return
      }
    }
    setSaving(false)
    onStart(homeRoster, awayRoster)
  }

  const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0e1320', border: '1px solid #1a2030', borderRadius: 20, padding: '4px 10px 4px 8px', fontSize: 12, color: '#c0cce0', margin: '3px' }

  function TeamColumn({ team, roster, jersey, setJersey, name, setName }) {
    const label = team === 'home' ? game.home_team_name : game.away_team_name
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 13, color: team === 'home' ? '#5cb800' : '#4a9eff', marginBottom: 10, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ marginBottom: 8, minHeight: 32 }}>
          {roster.map(p => (
            <span key={p.id} style={chipStyle}>
              <span style={{ fontFamily: 'Anton, sans-serif', color: '#d4a017' }}>#{p.jersey_number || '?'}</span>
              <span>{p.player_name}</span>
              <button onClick={() => removePlayer(team, p.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          {roster.length === 0 && <div style={{ fontSize: 11, color: '#2d3748' }}>No players added</div>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={jersey}
            onChange={e => setJersey(e.target.value)}
            placeholder="#"
            style={{ width: 40, background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '8px 6px', fontSize: 13, outline: 'none', textAlign: 'center' }}
          />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer(team)}
            placeholder="Player name"
            style={{ flex: 1, background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 6, padding: '8px 10px', fontSize: 13, outline: 'none' }}
          />
          <button onClick={() => addPlayer(team)} style={{ background: '#1a2030', border: 'none', color: '#5cb800', borderRadius: 6, padding: '8px 12px', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>+</button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>Loading roster…</div>

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2030' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 13, color: '#5cb800', letterSpacing: 1 }}>ROSTER SETUP</div>
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{game.home_team_name} vs {game.away_team_name}</div>
      </div>
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <TeamColumn team="home" roster={homeRoster} jersey={homeJersey} setJersey={setHomeJersey} name={homeName} setName={setHomeName} />
          <TeamColumn team="away" roster={awayRoster} jersey={awayJersey} setJersey={setAwayJersey} name={awayName} setName={setAwayName} />
        </div>
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2030', display: 'flex', gap: 10 }}>
        <button onClick={onSkip} style={{ background: 'transparent', border: '1px solid #1a2030', color: '#4a5568', borderRadius: 10, padding: '12px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
          Skip — No Roster
        </button>
        <button onClick={handleStart} disabled={saving} style={{ flex: 1, background: saving ? '#1a2030' : '#5cb800', color: saving ? '#4a5568' : '#04060a', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, fontFamily: 'Anton, sans-serif', cursor: saving ? 'default' : 'pointer' }}>
          {saving ? 'Saving…' : 'Start Game →'}
        </button>
      </div>
    </div>
  )
}

// ── Director All Courts view ──────────────────────────────────────────────────
function AllCourtsView({ onSelectGame }) {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('scheduled_games')
      .select('id, home_team_name, away_team_name, scheduled_date, scheduled_time, status, home_score, away_score, court_id, courts(name)')
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true })
    // Also get sessions
    const gameIds = (data || []).map(g => g.id)
    let sessions = []
    if (gameIds.length > 0) {
      const { data: s } = await supabase.from('scoreboard_sessions').select('*').in('game_id', gameIds)
      sessions = s || []
    }
    const merged = (data || []).map(g => {
      const sess = sessions.find(s => s.game_id === g.id)
      return { ...g, session: sess }
    })
    setGames(merged)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const statusColor = (status) => {
    if (status === 'in_progress' || status === 'active') return '#5cb800'
    if (status === 'completed') return '#4a5568'
    return '#d4a017'
  }

  const statusLabel = (g) => {
    if (g.session?.status === 'active') return 'IN PROGRESS'
    if (g.status === 'completed' || g.session?.status === 'completed') return 'FINAL'
    return 'SCHEDULED'
  }

  return (
    <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#4a9eff' }}>ALL COURTS — TODAY</div>
        <button onClick={load} style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#6b7a99', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>↻ Refresh</button>
      </div>
      {loading ? (
        <div style={{ color: '#4a5568', textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {games.map(g => {
            const isLive = g.session?.status === 'active'
            const isDone = g.status === 'completed' || g.session?.status === 'completed'
            const hs = g.session?.home_score ?? g.home_score ?? 0
            const as_ = g.session?.away_score ?? g.away_score ?? 0
            const period = g.session?.period
            return (
              <button key={g.id} onClick={() => onSelectGame(g)} style={{ background: '#080c12', border: `2px solid ${isLive ? '#5cb800' : isDone ? '#2d3748' : '#1a2030'}`, borderRadius: 12, padding: '14px 14px', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
                <div style={{ fontSize: 10, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{g.courts?.name || 'Court —'}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', marginBottom: 2 }}>{g.home_team_name}</div>
                <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 2 }}>vs</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff', marginBottom: 8 }}>{g.away_team_name}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: isLive ? '#5cb800' : '#c0cce0' }}>{hs} – {as_}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: statusColor(isLive ? 'active' : g.status), fontWeight: 700, textTransform: 'uppercase' }}>{statusLabel(g)}</span>
                  {period && isLive && <span style={{ fontSize: 10, color: '#4a5568' }}>· Q{period}</span>}
                  {g.scheduled_time && <span style={{ fontSize: 10, color: '#4a5568' }}>· {g.scheduled_time.slice(0, 5)}</span>}
                </div>
              </button>
            )
          })}
          {games.length === 0 && <div style={{ color: '#4a5568', fontSize: 13 }}>No games today.</div>}
        </div>
      )}
    </div>
  )
}

// ── GameCard ──────────────────────────────────────────────────────────────────
function GameCard({ game, onSelect, highlight = false, savedGames = [] }) {
  const isSaved = savedGames.includes(game.id)
  return (
    <button
      onClick={() => onSelect(game)}
      style={{
        background: highlight ? '#080f04' : '#080c12',
        border: `1px solid ${highlight ? '#1e3a0a' : '#1a2030'}`,
        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
        textAlign: 'left', width: '100%',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = highlight ? '#3a6014' : '#2a4010')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = highlight ? '#1e3a0a' : '#1a2030')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {(game.round || game.pool_name) && (
            <div style={{ fontSize: 10, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {[game.round, game.pool_name].filter(Boolean).join(' · ')}
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff' }}>{game.home_team_name}</div>
          <div style={{ fontSize: 11, color: '#6b7a99', margin: '1px 0' }}>vs</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff' }}>{game.away_team_name}</div>
          <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>
            {fmtDate(game.scheduled_date)} · #{game.id?.slice(0, 8)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
          {game.scheduled_time && (
            <div style={{ fontSize: 12, color: '#8a9ab8' }}>{game.scheduled_time.slice(0, 5)}</div>
          )}
          {(game.home_score != null || game.away_score != null) && (
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 17, color: '#5cb800', marginTop: 4 }}>
              {game.home_score ?? 0} – {game.away_score ?? 0}
            </div>
          )}
          {isSaved && (
            <div style={{ fontSize: 10, color: '#5cb800', fontWeight: 700, marginTop: 4 }}>● SAVED</div>
          )}
          {!isSaved && <div style={{ marginTop: 6, fontSize: 10, color: '#5cb800', fontWeight: 700, textTransform: 'uppercase' }}>Score →</div>}
        </div>
      </div>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function Scoreboard() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [staffRecord, setStaffRecord] = useState(null)
  const [staffLoading, setStaffLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [authError, setAuthError] = useState(null)

  // ── Game selection ─────────────────────────────────────────────────────────
  const [myCourtGames, setMyCourtGames] = useState([])
  const [otherGames, setOtherGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState(null)
  const [savedGames, setSavedGames] = useState([]) // game ids with local saves
  const [showAllCourts, setShowAllCourts] = useState(false)

  // ── Manual game form ───────────────────────────────────────────────────────
  const [showManualForm, setShowManualForm] = useState(false)
  const [mHome, setMHome] = useState('')
  const [mAway, setMAway] = useState('')
  const [mRound, setMRound] = useState('')
  const [addingManual, setAddingManual] = useState(false)
  const [manualError, setManualError] = useState(null)

  // ── Roster + play tracking ────────────────────────────────────────────────
  const [showRosterSetup, setShowRosterSetup] = useState(false)
  const [homeRoster, setHomeRoster] = useState([])
  const [awayRoster, setAwayRoster] = useState([])
  const [plays, setPlays] = useState([])
  const [wizard, setWizard] = useState(null)  // wizard config or null
  const [scoreView, setScoreView] = useState('score') // 'score' | 'boxscore'
  const [trackingEnabled, setTrackingEnabled] = useState(true)

  // ── Score state ───────────────────────────────────────────────────────────
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [period, setPeriod] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [completing, setCompleting] = useState(false)

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState('idle')
  const [lastSaved, setLastSaved] = useState(null)
  const saveTimer = useRef(null)
  const [resumeData, setResumeData] = useState(null)

  // ── Auth init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session) loadStaffRecord(session.user.email)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadStaffRecord(session.user.email)
      } else {
        setStaffRecord(null)
        setMyCourtGames([])
        setOtherGames([])
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Check saved games in localStorage
  useEffect(() => {
    if (!myCourtGames.length && !otherGames.length) return
    const all = [...myCourtGames, ...otherGames]
    const ids = all.filter(g => {
      const local = localStorage.getItem(LOCAL_KEY(g.id))
      if (!local) return false
      try { const d = JSON.parse(local); return d.home_score > 0 || d.away_score > 0 || d.period > 1 } catch { return false }
    }).map(g => g.id)
    setSavedGames(ids)
  }, [myCourtGames, otherGames])

  async function loadStaffRecord(userEmail) {
    setStaffLoading(true)
    const { data: staff } = await supabase
      .from('tournament_staff')
      .select('*, courts(id, name, tournament_id)')
      .eq('email', userEmail)
      .in('role', ['scorekeeper', 'coordinator', 'admin'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (staff) {
      setStaffRecord(staff)
      setStaffLoading(false)
      loadGames(staff)
      return
    }
    const { data: director } = await supabase
      .from('directors')
      .select('id, display_name, email')
      .eq('email', userEmail)
      .maybeSingle()
    if (director) {
      const rec = { id: director.id, name: director.display_name, email: director.email, role: 'director', court_id: null, courts: null }
      setStaffRecord(rec)
      setStaffLoading(false)
      loadGames(rec)
      return
    }
    setStaffRecord(null)
    setStaffLoading(false)
  }

  async function loadGames(staff) {
    setLoadingGames(true)
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('scheduled_games')
      .select('id, home_team_name, away_team_name, scheduled_date, scheduled_time, round, pool_name, home_score, away_score, status, tournament_id, court_id, home_team_id, away_team_id')
      .eq('scheduled_date', today)
      .neq('status', 'completed')
      .order('scheduled_time', { ascending: true })
    const all = data || []
    if (staff?.court_id) {
      setMyCourtGames(all.filter(g => g.court_id === staff.court_id))
      setOtherGames(all.filter(g => g.court_id !== staff.court_id))
    } else {
      setMyCourtGames([])
      setOtherGames(all)
    }
    setLoadingGames(false)
  }

  async function handleSendOtp() {
    if (!email.trim()) return
    setSendingOtp(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/scoreboard` },
    })
    if (error) setAuthError(error.message)
    else setOtpSent(true)
    setSendingOtp(false)
  }

  async function handleSignOut() {
    clearTimeout(saveTimer.current)
    await supabase.auth.signOut()
    setSelectedGame(null)
    setResumeData(null)
    setStaffRecord(null)
    setMyCourtGames([])
    setOtherGames([])
    setOtpSent(false)
    setEmail('')
  }

  // ── Manual game ────────────────────────────────────────────────────────────
  async function handleAddManualGame() {
    if (!mHome.trim() || !mAway.trim()) return
    setAddingManual(true)
    setManualError(null)
    const today = new Date().toISOString().slice(0, 10)
    const payload = {
      home_team_name: mHome.trim(),
      away_team_name: mAway.trim(),
      round: mRound.trim() || null,
      scheduled_date: today,
      status: 'scheduled',
      court_id: staffRecord?.court_id || null,
      tournament_id: staffRecord?.courts?.tournament_id || null,
    }
    const { data, error } = await supabase.from('scheduled_games').insert(payload).select().single()
    if (error) {
      setManualError(error.message)
      setAddingManual(false)
      return
    }
    setShowManualForm(false)
    setMHome(''); setMAway(''); setMRound('')
    setAddingManual(false)
    startGameFlow(data, 0, 0, 1)
  }

  // ── Select a game ──────────────────────────────────────────────────────────
  const handleSelectGame = useCallback(async (game) => {
    const local = localStorage.getItem(LOCAL_KEY(game.id))
    const { data: remote } = await supabase
      .from('scoreboard_sessions')
      .select('*')
      .eq('game_id', game.id)
      .maybeSingle()
    const existing = remote || (local ? JSON.parse(local) : null)
    if (existing && (existing.home_score > 0 || existing.away_score > 0 || existing.period > 1)) {
      setResumeData({ game, session: existing })
    } else {
      startGameFlow(game, 0, 0, 1)
    }
  }, [])

  // startGameFlow: go to roster setup (or direct if rosters already exist for resume)
  async function startGameFlow(game, hs = 0, as_ = 0, p = 1, skipRoster = false) {
    setSelectedGame(game)
    setHomeScore(hs)
    setAwayScore(as_)
    setPeriod(p)
    setGameOver(false)
    setResumeData(null)
    setSaveStatus('idle')
    setPlays([])
    setScoreView('score')

    // Fetch existing plays
    const { data: existingPlays } = await supabase
      .from('game_plays')
      .select('*')
      .eq('game_id', game.id)
      .order('created_at', { ascending: true })
    if (existingPlays && existingPlays.length > 0) setPlays(existingPlays)

    // Check roster
    const { data: existingRoster } = await supabase
      .from('game_rosters')
      .select('*')
      .eq('game_id', game.id)
    if (existingRoster && existingRoster.length > 0) {
      setHomeRoster(existingRoster.filter(r => r.team === 'home'))
      setAwayRoster(existingRoster.filter(r => r.team === 'away'))
      setTrackingEnabled(true)
      setShowRosterSetup(false)
    } else if (skipRoster) {
      setHomeRoster([])
      setAwayRoster([])
      setTrackingEnabled(false)
      setShowRosterSetup(false)
    } else {
      setHomeRoster([])
      setAwayRoster([])
      setShowRosterSetup(true)
    }
  }

  function startGame(game, hs = 0, as_ = 0, p = 1) {
    setSelectedGame(game)
    setHomeScore(hs)
    setAwayScore(as_)
    setPeriod(p)
    setGameOver(false)
    setResumeData(null)
    setSaveStatus('idle')
  }

  // ── Save logic ─────────────────────────────────────────────────────────────
  const doSaveToSupabase = useCallback(async (game, hs, as_, p) => {
    if (!game) return
    setSaveStatus('saving')
    try {
      await supabase.from('scoreboard_sessions').upsert(
        { game_id: game.id, home_score: hs, away_score: as_, period: p, status: 'active', updated_at: new Date().toISOString() },
        { onConflict: 'game_id' }
      )
      await supabase.from('scheduled_games').update({ home_score: hs, away_score: as_, updated_at: new Date().toISOString() }).eq('id', game.id)
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch {
      setSaveStatus('error')
    }
  }, [])

  const scheduleAutoSave = useCallback((game, hs, as_, p) => {
    localStorage.setItem(LOCAL_KEY(game.id), JSON.stringify({ home_score: hs, away_score: as_, period: p, updated_at: new Date().toISOString() }))
    setSaveStatus('pending')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSaveToSupabase(game, hs, as_, p), SAVE_DEBOUNCE_MS)
  }, [doSaveToSupabase])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  // ── Score helpers ─────────────────────────────────────────────────────────
  function addHome(n) {
    const next = Math.max(0, homeScore + n)
    setHomeScore(next)
    scheduleAutoSave(selectedGame, next, awayScore, period)
  }
  function addAway(n) {
    const next = Math.max(0, awayScore + n)
    setAwayScore(next)
    scheduleAutoSave(selectedGame, homeScore, next, period)
  }

  // ── Wizard commit ─────────────────────────────────────────────────────────
  async function handleWizardCommit(newPlays, newHome, newAway) {
    setWizard(null)
    // Update scores
    setHomeScore(newHome)
    setAwayScore(newAway)
    scheduleAutoSave(selectedGame, newHome, newAway, period)

    if (newPlays.length === 0) return

    // Insert plays with game_id
    const toInsert = newPlays.map(p => ({ ...p, game_id: selectedGame.id }))
    const { data: inserted } = await supabase.from('game_plays').insert(toInsert).select()
    if (inserted) setPlays(prev => [...prev, ...inserted])
    else setPlays(prev => [...prev, ...toInsert])
  }

  function openWizard(type, team) {
    if (!trackingEnabled || (homeRoster.length === 0 && awayRoster.length === 0)) {
      // Skip wizard, just score
      if (type === 'fg2_make') { if (team === 'home') addHome(2); else addAway(2) }
      else if (type === 'fg3_make') { if (team === 'home') addHome(3); else addAway(3) }
      else if (type === 'ft') { if (team === 'home') addHome(1); else addAway(1) }
      return
    }
    setWizard({
      type, team,
      teamName: team === 'home' ? selectedGame.home_team_name : selectedGame.away_team_name,
      otherTeamName: team === 'home' ? selectedGame.away_team_name : selectedGame.home_team_name,
      gameHome: selectedGame.home_team_name,
      gameAway: selectedGame.away_team_name,
      homeRoster,
      awayRoster,
    })
  }

  async function handleComplete() {
    setCompleting(true)
    clearTimeout(saveTimer.current)
    const winnerId =
      homeScore > awayScore ? selectedGame.home_team_id :
      awayScore > homeScore ? selectedGame.away_team_id : null
    await supabase.from('scheduled_games').update({
      home_score: homeScore, away_score: awayScore,
      winner_team_id: winnerId, status: 'completed',
      updated_at: new Date().toISOString(),
    }).eq('id', selectedGame.id)
    await supabase.from('scoreboard_sessions').upsert({
      game_id: selectedGame.id, home_score: homeScore, away_score: awayScore,
      period, status: 'completed', updated_at: new Date().toISOString(),
    }, { onConflict: 'game_id' })
    localStorage.removeItem(LOCAL_KEY(selectedGame.id))
    setGameOver(true)
    setCompleting(false)
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Saving…' :
    saveStatus === 'pending' ? 'Unsaved' :
    saveStatus === 'error' ? '⚠ Save failed' :
    saveStatus === 'saved' && lastSaved
      ? `Saved ${Math.round((Date.now() - lastSaved) / 1000)}s ago`
      : ''

  // ── Filtered game lists ───────────────────────────────────────────────────
  const q = searchQuery.toLowerCase()
  const filteredMyCourt = q ? myCourtGames.filter(g => `${g.home_team_name} ${g.away_team_name}`.toLowerCase().includes(q)) : myCourtGames
  const filteredOther = q ? otherGames.filter(g => `${g.home_team_name} ${g.away_team_name}`.toLowerCase().includes(q)) : otherGames

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: auth loading
  // ════════════════════════════════════════════════════════════════════════════
  if (authLoading || staffLoading) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#5cb800', letterSpacing: 1 }}>NP SCOREBOARD</div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: sign-in
  // ════════════════════════════════════════════════════════════════════════════
  if (!session) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>NP SCOREBOARD</div>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 40 }}>Scorekeeper Login</div>
        {otpSent ? (
          <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 10 }}>CHECK YOUR EMAIL</div>
            <div style={{ color: '#6b7a99', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a login link to <strong style={{ color: '#c0cce0' }}>{email}</strong>.<br />
              Tap the link in your email to open the scoreboard.
            </div>
            <button onClick={() => { setOtpSent(false); setEmail('') }} style={{ background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              Use a different email
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: 380, width: '100%' }}>
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 13, color: '#8a9ab8', marginBottom: 20, lineHeight: 1.6 }}>
                Enter the email your tournament director registered you with. We'll send you a one-tap login link.
              </div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Your Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="you@example.com"
                style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 14 }}
                autoFocus
              />
              {authError && (
                <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, padding: '10px 14px', color: '#e05555', fontSize: 13, marginBottom: 14 }}>{authError}</div>
              )}
              <button
                onClick={handleSendOtp}
                disabled={sendingOtp || !email.trim()}
                style={{ width: '100%', background: sendingOtp || !email.trim() ? '#1a2030' : '#5cb800', color: sendingOtp || !email.trim() ? '#4a5568' : '#04060a', border: 'none', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: sendingOtp || !email.trim() ? 'default' : 'pointer', fontFamily: 'Anton, sans-serif', letterSpacing: '0.5px' }}
              >
                {sendingOtp ? 'Sending…' : 'Send Login Link →'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: not registered
  // ════════════════════════════════════════════════════════════════════════════
  if (!staffRecord) {
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#f0f4ff', marginBottom: 10 }}>NOT REGISTERED</div>
        <div style={{ color: '#6b7a99', fontSize: 14, maxWidth: 340, lineHeight: 1.6, marginBottom: 28 }}>
          {session.user.email} is not registered as a scorekeeper.<br />
          Contact your tournament director to be added.
        </div>
        <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Sign out</button>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: resume modal
  // ════════════════════════════════════════════════════════════════════════════
  if (resumeData) {
    const { game, session: saved } = resumeData
    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#080c12', border: '1px solid #d4a017', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#d4a017', marginBottom: 6 }}>RESUME GAME?</div>
          <div style={{ color: '#c0cce0', fontSize: 14, marginBottom: 20 }}>A saved session was found for this game:</div>
          <div style={{ background: '#0a0f1a', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#f0f4ff', marginBottom: 8 }}>
              {game.home_team_name} vs {game.away_team_name}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Score</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#5cb800' }}>{saved.home_score} – {saved.away_score}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Period</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 26, color: '#c0cce0' }}>{saved.period}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => startGameFlow(game, 0, 0, 1)} style={{ flex: 1, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: 11, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Start Over</button>
            <button onClick={() => startGameFlow(game, saved.home_score, saved.away_score, saved.period, true)} style={{ flex: 2, background: '#5cb800', color: '#04060a', border: 'none', padding: 11, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Resume →</button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: roster setup
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedGame && showRosterSetup) {
    return (
      <RosterSetup
        game={selectedGame}
        onStart={(hr, ar) => {
          setHomeRoster(hr)
          setAwayRoster(ar)
          setTrackingEnabled(true)
          setShowRosterSetup(false)
        }}
        onSkip={() => {
          setTrackingEnabled(false)
          setShowRosterSetup(false)
        }}
      />
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: live scoreboard
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedGame) {
    const winner = homeScore > awayScore ? selectedGame.home_team_name
      : awayScore > homeScore ? selectedGame.away_team_name : null

    const periodLabel = (p) => p === 5 ? 'OT' : `Q${p}`

    return (
      <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Wizard overlay */}
        {wizard && (
          <PlayWizard
            config={wizard}
            homeScore={homeScore}
            awayScore={awayScore}
            period={period}
            onCommit={handleWizardCommit}
            onCancel={() => setWizard(null)}
          />
        )}

        {/* Top bar */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button onClick={() => { clearTimeout(saveTimer.current); setSelectedGame(null); setShowRosterSetup(false) }} style={{ background: 'transparent', border: 'none', color: '#6b7a99', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Games</button>
          <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 11, color: '#5cb800', letterSpacing: 1 }}>
              {periodLabel(period)} · {saveLabel || '💾 Auto-saves every 5s'}
            </div>
            <div style={{ fontSize: 10, color: '#4a5568', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              #{selectedGame.id?.slice(0, 8)} · {fmtDate(selectedGame.scheduled_date)}
            </div>
          </div>
          <div style={{ fontSize: 11, color: saveStatus === 'error' ? '#e05555' : saveStatus === 'saved' ? '#5cb800' : '#4a5568', flexShrink: 0 }}>
            {saveStatus === 'saved' ? '● SAVED' : saveStatus === 'pending' ? '○ …' : saveStatus === 'saving' ? '↑' : ''}
          </div>
        </div>

        {/* Round / pool label */}
        {(selectedGame.round || selectedGame.pool_name) && (
          <div style={{ padding: '4px 14px', background: '#080c12', borderBottom: '1px solid #1a2030', fontSize: 10, color: '#6b7a99', textAlign: 'center' }}>
            {[selectedGame.round, selectedGame.pool_name].filter(Boolean).join(' · ')}
          </div>
        )}

        {gameOver ? (
          // ── Final screen ───────────────────────────────────────────────────
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
            <div style={{ fontSize: 11, color: '#5cb800', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>FINAL</div>
            <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#8a9ab8', marginBottom: 6, maxWidth: 130 }}>{selectedGame.home_team_name}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 72, color: homeScore > awayScore ? '#5cb800' : '#f0f4ff', lineHeight: 1 }}>{homeScore}</div>
              </div>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#2d3748' }}>–</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#8a9ab8', marginBottom: 6, maxWidth: 130 }}>{selectedGame.away_team_name}</div>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 72, color: awayScore > homeScore ? '#5cb800' : '#f0f4ff', lineHeight: 1 }}>{awayScore}</div>
              </div>
            </div>
            {winner && <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#d4a017', letterSpacing: 1 }}>{winner} WINS</div>}
            <button onClick={() => { setSelectedGame(null); setGameOver(false); setPlays([]) }} style={{ marginTop: 20, background: '#5cb800', color: '#04060a', border: 'none', padding: '13px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              Score Another Game
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 12, overflowY: 'auto' }}>
            {/* Period tabs */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {[1, 2, 3, 4].map(p => (
                <button key={p} onClick={() => { setPeriod(p); scheduleAutoSave(selectedGame, homeScore, awayScore, p) }}
                  style={{ background: period === p ? '#0d1a0a' : '#0e1320', color: period === p ? '#5cb800' : '#4a5568', border: `1px solid ${period === p ? '#2a4010' : '#1a2030'}`, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Q{p}</button>
              ))}
              <button onClick={() => { setPeriod(5); scheduleAutoSave(selectedGame, homeScore, awayScore, 5) }}
                style={{ background: period === 5 ? '#1a1400' : '#0e1320', color: period === 5 ? '#d4a017' : '#4a5568', border: `1px solid ${period === 5 ? '#3a2800' : '#1a2030'}`, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OT</button>
            </div>

            {/* Score / Box toggle */}
            <div style={{ display: 'flex', gap: 0, justifyContent: 'center' }}>
              {['score', 'boxscore'].map(v => (
                <button key={v} onClick={() => setScoreView(v)} style={{ background: scoreView === v ? '#0d1a0a' : '#080c12', color: scoreView === v ? '#5cb800' : '#4a5568', border: `1px solid ${scoreView === v ? '#2a4010' : '#1a2030'}`, padding: '6px 18px', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: v === 'score' ? '8px 0 0 8px' : '0 8px 8px 0' }}>
                  {v === 'score' ? 'SCORE' : 'BOX SCORE'}
                </button>
              ))}
            </div>

            {scoreView === 'boxscore' ? (
              <BoxScore plays={plays} homeRoster={homeRoster} awayRoster={awayRoster} homeTeamName={selectedGame.home_team_name} awayTeamName={selectedGame.away_team_name} />
            ) : (
              <>
                {/* Score display */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'start' }}>
                  {/* HOME */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#8a9ab8', marginBottom: 6, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2 }}>{selectedGame.home_team_name}</div>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 80, color: '#f0f4ff', lineHeight: 1, letterSpacing: '-2px' }}>{homeScore}</div>

                    {/* Action buttons — HOME */}
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>MADE</div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => openWizard('ft', 'home')} style={actionBtnStyle('#c0cce0')}>+1 FT</button>
                        <button onClick={() => openWizard('fg2_make', 'home')} style={actionBtnStyle('#5cb800')}>+2</button>
                        <button onClick={() => openWizard('fg3_make', 'home')} style={actionBtnStyle('#d4a017')}>+3</button>
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                        <button onClick={() => openWizard('fg_miss2', 'home')} style={actionBtnStyle('#4a5568', '#0a0f18')}>MISS</button>
                        <button onClick={() => openWizard('turnover', 'home')} style={actionBtnStyle('#4a5568', '#0a0f18')}>TO</button>
                        <button onClick={() => openWizard('block', 'home')} style={actionBtnStyle('#4a5568', '#0a0f18')}>BLK</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
                        <button onClick={() => addHome(-1)} style={{ background: 'transparent', border: 'none', color: '#2d3748', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>−1 undo</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: '#1a2030', textAlign: 'center', paddingTop: 38 }}>—</div>

                  {/* AWAY */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#8a9ab8', marginBottom: 6, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2 }}>{selectedGame.away_team_name}</div>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 80, color: '#f0f4ff', lineHeight: 1, letterSpacing: '-2px' }}>{awayScore}</div>

                    {/* Action buttons — AWAY */}
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>MADE</div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => openWizard('ft', 'away')} style={actionBtnStyle('#c0cce0')}>+1 FT</button>
                        <button onClick={() => openWizard('fg2_make', 'away')} style={actionBtnStyle('#5cb800')}>+2</button>
                        <button onClick={() => openWizard('fg3_make', 'away')} style={actionBtnStyle('#d4a017')}>+3</button>
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                        <button onClick={() => openWizard('fg_miss2', 'away')} style={actionBtnStyle('#4a5568', '#0a0f18')}>MISS</button>
                        <button onClick={() => openWizard('turnover', 'away')} style={actionBtnStyle('#4a5568', '#0a0f18')}>TO</button>
                        <button onClick={() => openWizard('block', 'away')} style={actionBtnStyle('#4a5568', '#0a0f18')}>BLK</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
                        <button onClick={() => addAway(-1)} style={{ background: 'transparent', border: 'none', color: '#2d3748', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>−1 undo</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Roster toggle */}
                {!trackingEnabled && (
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#4a5568' }}>
                    Stat tracking disabled.{' '}
                    <button onClick={() => setShowRosterSetup(true)} style={{ background: 'none', border: 'none', color: '#5cb800', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Add Roster</button>
                  </div>
                )}
              </>
            )}

            {/* Bottom bar */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              <button onClick={handleComplete} disabled={completing} style={{ width: '100%', background: completing ? '#1a2030' : '#5cb800', color: completing ? '#4a5568' : '#04060a', border: 'none', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: 'Anton, sans-serif', cursor: completing ? 'default' : 'pointer' }}>
                {completing ? 'Finalizing…' : 'Complete Game →'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#2d3748' }}>
                💾 Auto-saves every {SAVE_DEBOUNCE_MS / 1000}s · Safe to leave and return
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: game picker
  // ════════════════════════════════════════════════════════════════════════════
  const courtName = staffRecord.courts?.name
  const isDirector = staffRecord?.role === 'director'
  const totalGames = filteredMyCourt.length + filteredOther.length

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 17, color: '#5cb800', letterSpacing: 1 }}>NP SCOREBOARD</div>
          {courtName ? (
            <div style={{ fontSize: 10, color: '#d4a017', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>{courtName}</div>
          ) : isDirector && (
            <div style={{ fontSize: 10, color: '#4a9eff', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>Director · All Games</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isDirector && (
            <button
              onClick={() => setShowAllCourts(v => !v)}
              style={{ background: showAllCourts ? '#0d1a24' : '#0e1320', border: `1px solid ${showAllCourts ? '#4a9eff' : '#1a2030'}`, color: showAllCourts ? '#4a9eff' : '#6b7a99', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              All Courts
            </button>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#8a9ab8', fontWeight: 600 }}>{staffRecord.name}</div>
            <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: 10, cursor: 'pointer', padding: 0, marginTop: 1 }}>Sign out</button>
          </div>
        </div>
      </div>

      {showAllCourts && isDirector ? (
        <AllCourtsView onSelectGame={(g) => { setShowAllCourts(false); handleSelectGame(g) }} />
      ) : (
        <div style={{ flex: 1, padding: '16px', maxWidth: 520, width: '100%', margin: '0 auto' }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search any team…"
            style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 18 }}
          />

          {loadingGames ? (
            <div style={{ color: '#4a5568', textAlign: 'center', padding: 40 }}>Loading today's games…</div>
          ) : totalGames === 0 ? (
            <div style={{ color: '#4a5568', textAlign: 'center', padding: 40, fontSize: 13 }}>
              {searchQuery ? 'No matching games.' : 'No games scheduled for today.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {filteredMyCourt.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#d4a017', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📍 {courtName || 'Your Court'}</span>
                    <span style={{ color: '#4a5568' }}>— {filteredMyCourt.length} game{filteredMyCourt.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredMyCourt.map(g => <GameCard key={g.id} game={g} onSelect={handleSelectGame} highlight savedGames={savedGames} />)}
                  </div>
                </div>
              )}
              {filteredOther.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    {filteredMyCourt.length > 0 ? 'All Other Games' : `Today · ${filteredOther.length} game${filteredOther.length !== 1 ? 's' : ''}`}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredOther.map(g => <GameCard key={g.id} game={g} onSelect={handleSelectGame} savedGames={savedGames} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Manual Game */}
          <div style={{ marginTop: 20, paddingBottom: 8 }}>
            <button onClick={() => { setShowManualForm(true); setManualError(null) }} style={{ width: '100%', background: 'transparent', border: '1px dashed #2a3a50', color: '#4a5568', borderRadius: 12, padding: '13px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Add Game Manually
            </button>
          </div>
        </div>
      )}

      {/* Manual game overlay */}
      {showManualForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,10,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}
          onClick={e => { if (e.target === e.currentTarget) setShowManualForm(false) }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#f0f4ff', marginBottom: 4 }}>ADD GAME</div>
            <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 22 }}>This game will be saved and scored immediately.</div>

            <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Home Team</label>
            <input value={mHome} onChange={e => setMHome(e.target.value)} placeholder="Home team name" autoFocus style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

            <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Away Team</label>
            <input value={mAway} onChange={e => setMAway(e.target.value)} placeholder="Away team name" style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

            <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 5 }}>Round / Label <span style={{ color: '#2d3748', fontWeight: 400 }}>(optional)</span></label>
            <input value={mRound} onChange={e => setMRound(e.target.value)} placeholder="e.g. Pool A, Quarterfinal" onKeyDown={e => e.key === 'Enter' && handleAddManualGame()} style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 18 }} />

            {manualError && (
              <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, padding: '10px 14px', color: '#e05555', fontSize: 13, marginBottom: 12 }}>{manualError}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowManualForm(false)} style={{ flex: 1, background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: 13, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Cancel</button>
              <button onClick={handleAddManualGame} disabled={addingManual || !mHome.trim() || !mAway.trim()} style={{ flex: 2, background: addingManual || !mHome.trim() || !mAway.trim() ? '#1a2030' : '#5cb800', color: addingManual || !mHome.trim() || !mAway.trim() ? '#4a5568' : '#04060a', border: 'none', padding: 13, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {addingManual ? 'Creating…' : 'Start Scoring →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function actionBtnStyle(color, bg = '#0e1320') {
  return {
    flex: 1,
    background: bg,
    border: '1px solid #1a2030',
    color,
    borderRadius: 8,
    padding: '11px 0',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'Anton, sans-serif',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    minHeight: 48,
  }
}
