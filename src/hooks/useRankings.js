import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useRankings() {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRankings = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('bt_rankings_with_place')
      .select('*')
      .order('ranking_division_key', { ascending: true })
      .order('rank', { ascending: true })
    if (error) { setError(error); setRankings([]) }
    else { setRankings(data || []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRankings() }, [fetchRankings])

  return { rankings, loading, error, refresh: fetchRankings }
}
