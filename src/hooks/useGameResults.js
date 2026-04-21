import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

/**
 * useGameResults — unified games feed across tournament (scheduled_games)
 * and historical circuit games (bt_team_recent_games).
 *
 * Filters: team (name search), division_key, gender, date range, circuit (ranking_source),
 *          tournament_id (optional), scored_only (public view default)
 *
 * Pagination is client-side for simplicity and because circuit data is pre-joined
 * and tournament volume per director is bounded. If volume grows, swap to
 * server-side .range() on both queries.
 */
export function useGameResults({
  team = '',
  divisionKey = 'all',
  gender = 'all',
  dateFrom = null,
  dateTo = null,
  circuit = 'all',            // 'all' | 'tournaments' (live only) | a ranking_source string
  host = 'all',               // 'all' or a specific host name (from host_org / ranking_source)
  status = 'all',             // 'all' | 'final' | 'scheduled'
  tournamentId = null,        // scope to a single tournament (admin view)
  scoredOnly = false,         // true for public view
  includeScheduled = true,    // include scheduled_games source
  includeCircuit = true,      // include bt_team_recent_games source
} = {}) {
  const [scheduledGames, setScheduledGames] = useState([])
  const [circuitGames, setCircuitGames] = useState([])
  const [tournamentsById, setTournamentsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const tasks = []

      // ── Scheduled games (live tournament feed) ──────────────────────────
      // We only join event_divisions here because that FK is defined.
      // tournaments + courts are fetched/resolved separately to avoid
      // "Could not find a relationship" errors when no FK is configured.
      if (includeScheduled && circuit !== 'circuit-only') {
        let q = supabase
          .from('scheduled_games')
          .select(`
            id,
            tournament_id,
            scheduled_date,
            scheduled_time,
            home_team_id,
            away_team_id,
            home_team_name,
            away_team_name,
            home_score,
            away_score,
            status,
            round,
            pool_name,
            division:event_divisions(id, name, gender, age_group)
          `)
          .order('scheduled_date', { ascending: false })
          .order('scheduled_time', { ascending: false })

        if (tournamentId) q = q.eq('tournament_id', tournamentId)
        if (dateFrom) q = q.gte('scheduled_date', dateFrom)
        if (dateTo) q = q.lte('scheduled_date', dateTo)
        if (scoredOnly) q = q.not('home_score', 'is', null).not('away_score', 'is', null)

        tasks.push(q.limit(2000))
      } else {
        tasks.push(Promise.resolve({ data: [], error: null }))
      }

      // ── Circuit / historical games ──────────────────────────────────────
      const isCircuitSource = circuit && circuit !== 'all' && circuit !== 'tournaments' && circuit !== 'circuit-only'

      if (includeCircuit && circuit !== 'tournaments') {
        let q = supabase
          .from('bt_team_recent_games')
          .select(`
            game_id,
            game_date,
            ranking_source,
            ranking_division_key,
            home_team_id,
            away_team_id,
            home_team_name,
            away_team_name,
            score_home,
            score_away
          `)
          .order('game_date', { ascending: false })

        if (isCircuitSource) q = q.eq('ranking_source', circuit)
        if (dateFrom) q = q.gte('game_date', dateFrom)
        if (dateTo) q = q.lte('game_date', dateTo)
        if (scoredOnly) q = q.not('score_home', 'is', null).not('score_away', 'is', null)
        if (tournamentId) {
          // circuit games don't belong to a tournament; exclude when admin scoped
          q = q.eq('game_id', '__scope_out__')
        }

        tasks.push(q.limit(5000))
      } else {
        tasks.push(Promise.resolve({ data: [], error: null }))
      }

      const [schedRes, circuitRes] = await Promise.all(tasks)

      if (schedRes.error) throw schedRes.error
      if (circuitRes.error) throw circuitRes.error

      // ── Resolve tournament names in a separate query ─────────────────────
      // Avoids needing a FK relationship defined in Supabase.
      const tournamentIds = [...new Set(
        (schedRes.data || [])
          .map((g) => g.tournament_id)
          .filter(Boolean)
      )]

      let tournamentMap = {}
      if (tournamentIds.length) {
        const { data: tourneys, error: tErr } = await supabase
          .from('tournaments')
          .select('id, name, slug, host_org')
          .in('id', tournamentIds)
        if (tErr) throw tErr
        tournamentMap = Object.fromEntries((tourneys || []).map((t) => [t.id, t]))
      }

      setScheduledGames(schedRes.data || [])
      setCircuitGames(circuitRes.data || [])
      setTournamentsById(tournamentMap)
    } catch (err) {
      console.error('Error loading game results:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [
    tournamentId,
    dateFrom,
    dateTo,
    circuit,
    scoredOnly,
    includeScheduled,
    includeCircuit,
  ])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Normalize to a single shape, then filter client-side ─────────────────
  const rows = useMemo(() => {
    const normalizedScheduled = (scheduledGames || []).map((g) => {
      const t = tournamentsById[g.tournament_id]
      // event_divisions doesn't carry a division_key, so synthesize one
      // from age_group + gender so it can be matched against circuit data.
      const ageKey = (g.division?.age_group || '').toLowerCase().replace(/\s+/g, '')
      const genderKey = (g.division?.gender || '').toLowerCase()
      const synthesizedKey = ageKey && genderKey ? `${ageKey}_${genderKey}` : null
      const hostName = t?.host_org || null
      return {
        id: `sched:${g.id}`,
        source_type: 'tournament',
        circuit_label: t?.name || 'Next Play Tournament',
        ranking_source: null,
        host: hostName,
        tournament_id: g.tournament_id,
        tournament_name: t?.name || null,
        tournament_slug: t?.slug || null,
        date: g.scheduled_date,
        time: g.scheduled_time,
        division_key: synthesizedKey,
        division_name: g.division?.name || null,
        gender: g.division?.gender || null,
        age_group: g.division?.age_group || null,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        home_team_name: g.home_team_name || 'TBD',
        away_team_name: g.away_team_name || 'TBD',
        home_score: g.home_score,
        away_score: g.away_score,
        status: g.status,
        round: g.round,
        pool_name: g.pool_name,
        venue_name: null,
        court_name: null,
        scored: g.home_score != null && g.away_score != null,
        raw: g,
      }
    })

    const normalizedCircuit = (circuitGames || []).map((g) => ({
      id: `circuit:${g.game_id}:${g.ranking_source}`,
      source_type: 'circuit',
      circuit_label: g.ranking_source || 'Circuit',
      ranking_source: g.ranking_source,
      host: g.ranking_source || null,
      tournament_id: null,
      tournament_name: null,
      tournament_slug: null,
      date: (g.game_date || '').slice(0, 10) || null,   // "YYYY-MM-DD HH:mm" → "YYYY-MM-DD"
      time: extractTimeFromTimestamp(g.game_date),
      division_key: g.ranking_division_key,
      division_name: g.division_name || null,
      gender: inferGenderFromKey(g.ranking_division_key),
      age_group: inferAgeFromKey(g.ranking_division_key),
      home_team_id: g.home_team_id,
      away_team_id: g.away_team_id,
      home_team_name: g.home_team_name || 'TBD',
      away_team_name: g.away_team_name || 'TBD',
      home_score: g.score_home,
      away_score: g.score_away,
      status: g.score_home != null && g.score_away != null ? 'completed' : 'scheduled',
      round: null,
      pool_name: null,
      venue_name: null,
      court_name: null,
      scored: g.score_home != null && g.score_away != null,
      raw: g,
    }))

    let combined = [...normalizedScheduled, ...normalizedCircuit]

    // Client-side filters (team text, division, gender) — date/circuit done server-side
    const q = team.trim().toLowerCase()
    if (q) {
      combined = combined.filter((r) =>
        (r.home_team_name || '').toLowerCase().includes(q) ||
        (r.away_team_name || '').toLowerCase().includes(q)
      )
    }
    if (divisionKey !== 'all') {
      combined = combined.filter((r) => r.division_key === divisionKey)
    }
    if (gender !== 'all') {
      combined = combined.filter((r) => (r.gender || '').toLowerCase() === gender.toLowerCase())
    }
    if (host !== 'all') {
      combined = combined.filter((r) => r.host === host)
    }
    if (status === 'final') {
      combined = combined.filter((r) => r.scored)
    } else if (status === 'scheduled') {
      combined = combined.filter((r) => !r.scored)
    }

    // Sort newest first, with times as tiebreaker
    combined.sort((a, b) => {
      const da = a.date || ''
      const db = b.date || ''
      if (db !== da) return db.localeCompare(da)
      const ta = a.time || ''
      const tb = b.time || ''
      return tb.localeCompare(ta)
    })

    return combined
  }, [scheduledGames, circuitGames, tournamentsById, team, divisionKey, gender, host, status])

  // ── Derived option lists for filter dropdowns ────────────────────────────
  const divisionOptions = useMemo(() => {
    const seen = new Map()
    rows.forEach((r) => {
      if (!r.division_key) return
      if (!seen.has(r.division_key)) {
        seen.set(r.division_key, r.division_name || r.division_key)
      }
    })
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows])

  const circuitOptions = useMemo(() => {
    const set = new Set()
    circuitGames.forEach((g) => g.ranking_source && set.add(g.ranking_source))
    return [...set].sort()
  }, [circuitGames])

  // Host/Director options — combines tournament host_org values with
  // circuit ranking_source values so you can filter games by who ran them.
  const hostOptions = useMemo(() => {
    const set = new Set()
    Object.values(tournamentsById).forEach((t) => t?.host_org && set.add(t.host_org))
    circuitGames.forEach((g) => g.ranking_source && set.add(g.ranking_source))
    return [...set].sort()
  }, [tournamentsById, circuitGames])

  return {
    rows,
    divisionOptions,
    circuitOptions,
    hostOptions,
    loading,
    error,
    refresh: fetchAll,
    counts: {
      total: rows.length,
      scored: rows.filter((r) => r.scored).length,
      tournament: rows.filter((r) => r.source_type === 'tournament').length,
      circuit: rows.filter((r) => r.source_type === 'circuit').length,
    },
  }
}

// ── Helpers for inferring gender/age from circuit division keys ────────────
// e.g. "13u_boys" → gender="boys", age="13U"
function inferGenderFromKey(key) {
  if (!key) return null
  const lower = key.toLowerCase()
  if (lower.includes('girls')) return 'girls'
  if (lower.includes('boys')) return 'boys'
  return null
}

function inferAgeFromKey(key) {
  if (!key) return null
  const match = key.match(/^(\d+(?:_\d+)?u|\d+(?:_\d+)?(?:st|nd|rd|th)?)/i)
  return match ? match[1].toUpperCase() : null
}

// Pulls "HH:MM" from a "YYYY-MM-DD HH:MM:SS" timestamp string
function extractTimeFromTimestamp(ts) {
  if (!ts || typeof ts !== 'string') return null
  const parts = ts.split(/[ T]/)
  if (parts.length < 2) return null
  const timeStr = parts[1].slice(0, 5) // HH:MM
  return timeStr.match(/^\d{2}:\d{2}$/) ? timeStr : null
}
