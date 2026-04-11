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
            display_name,
            organization_id,
            bt_organizations (
              id,
              org_name
            )
          )
        `)
        .order('ranking_source', { ascending: true })
        .order('ranking_division_key', { ascending: true })
        .order('source_team_name', { ascending: true })
        .limit(5000)
        .limit(5000)

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

    // Realtime sync — re-fetch on any change to bt_team_links or bt_master_teams
    const channel = supabase
      .channel('teams-admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bt_team_links' }, () => {
        fetchTeams()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bt_master_teams' }, () => {
        fetchTeams()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTeams])

  return {
    teams,
    loading,
    error,
    refresh: fetchTeams,
  }
}
