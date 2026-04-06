import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useTeamsAdmin() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('bt_team_links')
        .select(`
          id,
          ranking_source,
          ranking_division_key,
          source_team_id,
          source_team_name,
          master_team_id,
          bt_master_teams (
            id,
            display_name
          )
        `)
        .order('ranking_source', { ascending: true })
        .order('ranking_division_key', { ascending: true })
        .order('source_team_name', { ascending: true })

      if (error) throw error

      setTeams(data || [])
    } catch (err) {
      console.error('Error loading teams:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  return {
    teams,
    loading,
    error,
    refresh: fetchTeams,
  }
}
