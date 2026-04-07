import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useTeamDetail(teamId) {
  const [team, setTeam] = useState(null)
  const [games, setGames] = useState([])
  const [linkedSources, setLinkedSources] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchTeamDetail = useCallback(async () => {
    if (!teamId) return

    try {
      setLoading(true)
      setError(null)

      const { data: teamData, error: teamError } = await supabase
        .from('bt_master_teams')
        .select(`
          id,
          display_name,
          ranking_division_key,
          age_group,
          gender,
          organization_id,
          graduating_year,
          contact_name,
          contact_email,
          contact_phone
        `)
        .eq('id', teamId)
        .maybeSingle()

      if (teamError) throw teamError
      if (!teamData) {
        setTeam(null)
        setGames([])
        setLinkedSources([])
        setOrganizations([])
        setLoading(false)
        return
      }

      const { data: rankingRows, error: rankingError } = await supabase
        .from('bt_rankings_next_play_tiered')
        .select('*')
        .eq('master_team_id', teamId)
        .order('rank', { ascending: true })

      if (rankingError) throw rankingError

      const rankingData = Array.isArray(rankingRows) && rankingRows.length
        ? rankingRows[0]
        : null

      const { data: sourceLinks, error: linksError } = await supabase
        .from('bt_team_links')
        .select(`
          id,
          ranking_source,
          ranking_division_key,
          source_team_id,
          source_team_name,
          master_team_id
        `)
        .eq('master_team_id', teamId)
        .order('ranking_source', { ascending: true })
        .order('source_team_name', { ascending: true })

      if (linksError) throw linksError

      const { data: gamesData, error: gamesError } = await supabase
        .from('bt_team_recent_games')
        .select('*')
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('game_date', { ascending: false })
        .limit(25)

      if (gamesError) throw gamesError

      const { data: orgs, error: orgError } = await supabase
        .from('bt_organizations')
        .select('id, org_name')
        .order('org_name', { ascending: true })

      if (orgError) throw orgError

      setTeam({
        ...teamData,
        ranking: rankingData,
      })
      setLinkedSources(sourceLinks || [])
      setGames(gamesData || [])
      setOrganizations(orgs || [])
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

  const saveTeam = useCallback(
    async (updates) => {
      try {
        setSaving(true)
        setError(null)

        const { error } = await supabase
          .from('bt_master_teams')
          .update(updates)
          .eq('id', teamId)

        if (error) throw error

        await fetchTeamDetail()
      } catch (err) {
        console.error('Error saving team:', err)
        setError(err)
      } finally {
        setSaving(false)
      }
    },
    [teamId, fetchTeamDetail]
  )

  return {
    team,
    games,
    linkedSources,
    organizations,
    loading,
    saving,
    error,
    refresh: fetchTeamDetail,
    saveTeam,
  }
}
