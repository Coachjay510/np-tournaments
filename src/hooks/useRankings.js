import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useRankings(selectedSource = 'Next Play Sports') {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRankings = useCallback(async () => {
    setLoading(true)
    setError(null)

    const tableName =
      selectedSource === 'Next Play Sports'
        ? 'bt_rankings_next_play_tiered'
        : 'bt_rankings_tiered'

    let query = supabase
      .from(tableName)
      .select('*')
      .order('ranking_division_key', { ascending: true })
      .order('rank', { ascending: true })

    if (selectedSource !== 'Next Play Sports') {
      query = query.eq('ranking_source', selectedSource)
    }

    const { data, error } = await query

    if (error) {
      setError(error)
      setRankings([])
    } else {
      setRankings(data || [])
    }

    setLoading(false)
  }, [selectedSource])

  useEffect(() => {
    fetchRankings()
  }, [fetchRankings])

  return {
    rankings,
    loading,
    error,
    refresh: fetchRankings
  }
}
