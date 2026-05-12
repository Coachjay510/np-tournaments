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

      const masterIds = (masterTeams || []).map((t) => t.id)

      // Ranking lookup goes through bt_team_links because the rankings view
      // uses a composite key: "{ranking_source}__{source_team_id}__{division_key}"
      // not the numeric bt_master_teams.id directly.
      let merged = masterTeams || []

      if (masterIds.length) {
        const { data: links } = await supabase
          .from('bt_team_links')
          .select('master_team_id, source_team_id, ranking_source, ranking_division_key')
          .in('master_team_id', masterIds)

        const rankingKeys = (links || [])
          .map((l) => `${l.ranking_source}__${l.source_team_id}__${l.ranking_division_key}`)
          .filter(Boolean)

        let rankings = []
        if (rankingKeys.length) {
          const { data } = await supabase
            .from('bt_rankings_next_play_tiered')
            .select('master_team_id, team_name, rank, wins, losses, ranking_points, games_played, ranking_division_key')
            .in('master_team_id', rankingKeys)
          rankings = data || []
        }

        // Build masterId → best ranking map via links
        const rankingByMasterId = {}
        for (const link of (links || [])) {
          const key = `${link.ranking_source}__${link.source_team_id}__${link.ranking_division_key}`
          const ranking = rankings.find((r) => r.master_team_id === key)
          if (ranking && !rankingByMasterId[link.master_team_id]) {
            rankingByMasterId[link.master_team_id] = ranking
          }
        }

        merged = (masterTeams || []).map((team) => ({
          ...team,
          ranking: rankingByMasterId[team.id] || null,
        }))
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
