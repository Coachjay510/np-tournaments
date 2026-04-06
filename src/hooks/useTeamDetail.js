import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useTeamDetail(teamId) {
  const [team, setTeam] = useState(null)
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTeamDetail = useCallback(async () => {
    if (!teamId) return

    try {
      setLoading(true)
      setError(null)

      const { data: teamData, error: teamError } = await supabase
        .from('bt_rankings_next_play_tiered')
        .select('*')
        .eq('master_team_id', teamId)
        .single()

      if (teamError) throw teamError

      setTeam(teamData)

      const { data: gamesData, error: gamesError } = await supabase
        .from('bt_team_recent_games')
        .select('*')
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('game_date', { ascending: false })
        .limit(25)

      if (gamesError) throw gamesError

      setGames(gamesData || [])
    } catch (err) {
      console.error('Error loading team detail:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchTeamDetail()
  }, [fetchTeamDetail])

  return {
    team,
    games,
    loading,
    error,
    refresh: fetchTeamDetail,
  }
}
