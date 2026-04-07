import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useSchedule(tournamentId) {
  const [games, setGames] = useState([])
  const [divisions, setDivisions] = useState([])
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!tournamentId) return
    setLoading(true)
    setError(null)

    const [gamesRes, divisionsRes, courtsRes] = await Promise.all([
      supabase
        .from('scheduled_games')
        .select('*, division:event_divisions(name, gender, age_group), court:courts(name, venue_name), ref_assignments(*, ref:refs(full_name))')
        .eq('tournament_id', tournamentId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true }),
      supabase
        .from('event_divisions')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('age_group'),
      supabase
        .from('courts')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('is_active', true)
        .order('name'),
    ])

    if (gamesRes.error) setError(gamesRes.error)
    else setGames(gamesRes.data || [])

    if (divisionsRes.error && !gamesRes.error) setError(divisionsRes.error)
    if (courtsRes.error && !gamesRes.error && !divisionsRes.error) setError(courtsRes.error)

    setDivisions(divisionsRes.data || [])
    setCourts(courtsRes.data || [])
    setLoading(false)
  }, [tournamentId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Auto-generate schedule for a division
  async function autoSchedule({ divisionId, teams, startDate, startTime, courtsToUse, format }) {
    if (!teams?.length || !divisionId) return { error: 'Missing required fields' }

    const games = generateGames({ divisionId, teams, startDate, startTime, courtsToUse, format })

    const { error } = await supabase.from('scheduled_games').insert(
      games.map(g => ({ ...g, tournament_id: tournamentId, is_auto_scheduled: true }))
    )
    if (!error) fetchAll()
    return { error }
  }

  async function updateGame(gameId, updates) {
    const { error } = await supabase
      .from('scheduled_games')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', gameId)
    if (!error) fetchAll()
    return { error }
  }

  async function updateScore(gameId, homeScore, awayScore) {
    const game = games.find(g => g.id === gameId)
    const winnerId = homeScore > awayScore ? game?.home_team_id : awayScore > homeScore ? game?.away_team_id : null
    return updateGame(gameId, {
      home_score: homeScore,
      away_score: awayScore,
      winner_team_id: winnerId,
      status: 'completed'
    })
  }

  async function addCourt(name, venueName) {
    const { error } = await supabase.from('courts').insert({
      tournament_id: tournamentId, name, venue_name: venueName
    })
    if (!error) fetchAll()
    return { error }
  }

  async function addDivision(data) {
    const { error } = await supabase.from('event_divisions').insert({
      ...data, tournament_id: tournamentId
    })
    if (!error) fetchAll()
    return { error }
  }

  async function deleteGame(gameId) {
    const { error } = await supabase.from('scheduled_games').delete().eq('id', gameId)
    if (!error) fetchAll()
    return { error }
  }

  return {
    games, divisions, courts, loading, error,
    refresh: fetchAll,
    autoSchedule, updateGame, updateScore,
    addCourt, addDivision, deleteGame
  }
}

// ─── Game generation logic ────────────────────────────────────────────────────

function generateGames({ divisionId, teams, startDate, startTime, courtsToUse, format }) {
  const GAME_DURATION = 60 // minutes between slots
  const games = []
  let slotIndex = 0

  function getSlot(idx) {
    const courtIdx = idx % courtsToUse.length
    const timeOffset = Math.floor(idx / courtsToUse.length) * GAME_DURATION
    const [h, m] = startTime.split(':').map(Number)
    const totalMins = h * 60 + m + timeOffset
    const hour = Math.floor(totalMins / 60) % 24
    const min = totalMins % 60
    return {
      division_id: divisionId,
      court_id: courtsToUse[courtIdx]?.id || null,
      scheduled_date: startDate,
      scheduled_time: `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`,
    }
  }

  if (format === 'round_robin') {
    // Every team plays every other team once
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        games.push({
          ...getSlot(slotIndex++),
          home_team_id: teams[i].id,
          away_team_id: teams[j].id,
          home_team_name: teams[i].name,
          away_team_name: teams[j].name,
          round: 'Round Robin',
          round_number: slotIndex,
          status: 'scheduled'
        })
      }
    }
  } else if (format === 'pool_play' || format === 'pool_then_bracket') {
    // Split into pools of 3-4, round robin within pools
    const poolSize = teams.length <= 6 ? 3 : 4
    const pools = []
    for (let i = 0; i < teams.length; i += poolSize) {
      pools.push(teams.slice(i, i + poolSize))
    }
    pools.forEach((pool, poolIdx) => {
      const poolName = `Pool ${String.fromCharCode(65 + poolIdx)}`
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          games.push({
            ...getSlot(slotIndex++),
            home_team_id: pool[i].id,
            away_team_id: pool[j].id,
            home_team_name: pool[i].name,
            away_team_name: pool[j].name,
            round: 'Pool Play',
            round_number: slotIndex,
            pool_name: poolName,
            status: 'scheduled'
          })
        }
      }
    })
    // If pool_then_bracket, add TBD bracket slots
    if (format === 'pool_then_bracket') {
      const bracketSlots = ['Quarterfinal', 'Semifinal', 'Final']
      const bracketTeams = Math.min(pools.length * 2, 8)
      for (let i = 0; i < bracketTeams / 2; i++) {
        games.push({
          ...getSlot(slotIndex++),
          home_team_name: 'TBD', away_team_name: 'TBD',
          round: bracketTeams > 4 ? 'Quarterfinal' : 'Semifinal',
          bracket_slot: `QF${i + 1}`, status: 'scheduled'
        })
      }
    }
  } else if (format === 'single_elimination') {
    const rounds = Math.ceil(Math.log2(teams.length))
    let roundTeams = [...teams]
    for (let r = 0; r < rounds; r++) {
      const roundName = r === rounds - 1 ? 'Final' : r === rounds - 2 ? 'Semifinal' : r === rounds - 3 ? 'Quarterfinal' : `Round ${r + 1}`
      for (let i = 0; i < roundTeams.length; i += 2) {
        const home = roundTeams[i]
        const away = roundTeams[i + 1]
        games.push({
          ...getSlot(slotIndex++),
          home_team_id: home?.id || null,
          away_team_id: away?.id || null,
          home_team_name: home?.name || 'TBD',
          away_team_name: away?.name || 'TBD',
          round: roundName,
          round_number: r + 1,
          bracket_slot: `R${r + 1}G${Math.floor(i / 2) + 1}`,
          status: 'scheduled'
        })
      }
      // Next round is all TBD
      roundTeams = Array(Math.ceil(roundTeams.length / 2)).fill({ id: null, name: 'TBD' })
    }
  } else if (format === 'double_elimination') {
    // Simplified: winners bracket + losers bracket placeholders
    const rounds = Math.ceil(Math.log2(teams.length))
    let roundTeams = [...teams]
    for (let r = 0; r < rounds; r++) {
      const roundName = `Winners Round ${r + 1}`
      for (let i = 0; i < roundTeams.length; i += 2) {
        games.push({
          ...getSlot(slotIndex++),
          home_team_name: roundTeams[i]?.name || 'TBD',
          away_team_name: roundTeams[i + 1]?.name || 'TBD',
          home_team_id: roundTeams[i]?.id || null,
          away_team_id: roundTeams[i + 1]?.id || null,
          round: roundName, round_number: r + 1,
          bracket_slot: `W${r + 1}G${Math.floor(i / 2) + 1}`,
          status: 'scheduled'
        })
        // Losers bracket game
        games.push({
          ...getSlot(slotIndex++),
          home_team_name: 'TBD', away_team_name: 'TBD',
          round: `Losers Round ${r + 1}`, round_number: r + 1,
          bracket_slot: `L${r + 1}G${Math.floor(i / 2) + 1}`,
          status: 'scheduled'
        })
      }
      roundTeams = Array(Math.ceil(roundTeams.length / 2)).fill({ id: null, name: 'TBD' })
    }
    // Championship
    games.push({
      ...getSlot(slotIndex++),
      home_team_name: 'TBD', away_team_name: 'TBD',
      round: 'Championship', round_number: rounds + 1,
      bracket_slot: 'CHAMP', status: 'scheduled'
    })
  }

  return games
}
