import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useOrganizations() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: orgs, error: orgError } = await supabase
        .from('bt_organizations')
        .select('*')
        .order('org_name', { ascending: true })

      if (orgError) throw orgError

      const { data: rankings } = await supabase
        .from('bt_org_rankings_next_play')
        .select('*')

      const rankingMap = new Map((rankings || []).map((r) => [Number(r.organization_id), r]))

      const merged = (orgs || []).map((org) => ({
        ...org,
        ranking: rankingMap.get(Number(org.id)) || null,
      }))

      merged.sort((a, b) => {
        const ar = a.ranking?.rank ?? 999999
        const br = b.ranking?.rank ?? 999999
        if (ar !== br) return ar - br
        return (a.org_name || '').localeCompare(b.org_name || '')
      })

      setOrganizations(merged)
    } catch (err) {
      console.error('Error loading organizations:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  return {
    organizations,
    loading,
    error,
    refresh: fetchOrganizations,
  }
}
