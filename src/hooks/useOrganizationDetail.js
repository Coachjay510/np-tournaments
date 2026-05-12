import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useOrganizationDetail(orgId) {
  const [organization, setOrganization] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchOrganizationDetail = useCallback(async () => {
    if (!orgId) return

    try {
      setLoading(true)
      setError(null)

      const { data: orgData, error: orgError } = await supabase
        .from('bt_organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgError) throw orgError

      const { data: masterTeams, error: teamError } = await supabase
        .from('bt_master_teams')
        .select('id, display_name, ranking_division_key, gender, age_group, organization_id')
        .eq('organization_id', orgId)
        .is('merged_into_id', null)
        .order('display_name', { ascending: true })

      if (teamError) throw teamError

      // Ranking lookup: bt_rankings_next_play_tiered uses "Next Play Sports" team IDs
      // which don't join to bt_team_links. Match directly by team name + division key.
      let merged = masterTeams || []

      if (masterTeams?.length) {
        const teamNames = masterTeams.map((t) => t.display_name).filter(Boolean)

        let rankings = []
        if (teamNames.length) {
          const { data } = await supabase
            .from('bt_rankings_next_play_tiered')
            .select('team_name, rank, wins, losses, ranking_points, games_played, ranking_division_key')
            .in('team_name', teamNames)
          rankings = data || []
        }

        // Match each master team to the best ranking by name + division key
        merged = masterTeams.map((team) => {
          const match = rankings.find(
            (r) =>
              r.team_name?.toLowerCase() === team.display_name?.toLowerCase() &&
              r.ranking_division_key === (team.ranking_division_key || team.ranking?.ranking_division_key)
          ) || rankings.find(
            (r) => r.team_name?.toLowerCase() === team.display_name?.toLowerCase()
          ) || null
          return { ...team, ranking: match }
        })
      }

      setOrganization(orgData)
      setTeams(merged)
    } catch (err) {
      console.error('Error loading organization detail:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchOrganizationDetail()
  }, [fetchOrganizationDetail])

  const saveOrganization = useCallback(
    async (updates) => {
      try {
        setSaving(true)
        setError(null)

        const { error } = await supabase
          .from('bt_organizations')
          .update(updates)
          .eq('id', orgId)

        if (error) throw error

        await fetchOrganizationDetail()
      } catch (err) {
        console.error('Error saving organization:', err)
        setError(err)
      } finally {
        setSaving(false)
      }
    },
    [orgId, fetchOrganizationDetail]
  )

  return {
    organization,
    teams,
    loading,
    saving,
    error,
    refresh: fetchOrganizationDetail,
    saveOrganization,
  }
}
