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
        .order('display_name', { ascending: true })

      if (teamError) throw teamError

      const masterIds = (masterTeams || []).map((t) => t.id)

      let rankingRows = []
      if (masterIds.length) {
        const { data } = await supabase
          .from('bt_rankings_next_play_tiered')
          .select('*')
          .in('master_team_id', masterIds)
          .order('ranking_division_key', { ascending: true })
          .order('rank', { ascending: true })

        rankingRows = data || []
      }

      const merged = (masterTeams || []).map((team) => {
        const ranking = rankingRows.find((r) => Number(r.master_team_id) === Number(team.id))
        return {
          ...team,
          ranking,
        }
      })

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
