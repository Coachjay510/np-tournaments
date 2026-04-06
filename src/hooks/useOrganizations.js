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

      const { data, error } = await supabase
        .from('bt_org_rankings_next_play')
        .select('*')
        .order('rank', { ascending: true })

      if (error) throw error
      setOrganizations(data || [])
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
