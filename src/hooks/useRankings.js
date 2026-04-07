import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useRankings() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function loadRankings() {
      setLoading(true)

      const { data, error } = await supabase
        .from('bt_rankings_next_play_tiered')
        .select('*')
        .eq('ranking_source', 'Next Play Sports')
        .order('ranking_division_key', { ascending: true })
        .order('rank', { ascending: true })

      if (!mounted) return

      if (error) {
        console.error(error)
        setError(error)
        setRows([])
      } else {
        setRows(data || [])
      }

      setLoading(false)
    }

    loadRankings()

    return () => {
      mounted = false
    }
  }, [])

  const divisionOptions = useMemo(() => {
    return [...new Set(rows.map((row) => row.ranking_division_key).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: value.replaceAll('_', ' '),
      }))
  }, [rows])

  return {
    rows,
    divisionOptions,
    loading,
    error,
  }
}