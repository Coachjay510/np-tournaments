import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useRankings(selectedDivisions = []) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadRankings() {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('bt_rankings_next_play_tiered')
        .select(`
          master_team_id,
          base_master_team_id,
          team_id,
          team_name,
          ranking_division_key,
          ranking_points,
          wins,
          losses,
          rank
        `)
        .order('ranking_division_key', { ascending: true })
        .order('rank', { ascending: true })

      if (selectedDivisions.length > 0) {
        query = query.in('ranking_division_key', selectedDivisions)
      }

      const { data, error } = await query

      if (!isMounted) return

      if (error) {
        console.error('Failed to load rankings', error)
        setError(error.message || 'Failed to load rankings')
        setRows([])
      } else {
        setRows(data || [])
      }

      setLoading(false)
    }

    loadRankings()

    return () => {
      isMounted = false
    }
  }, [selectedDivisions])

  const groupedRows = useMemo(() => {
    return rows.reduce((acc, row) => {
      const key = row.ranking_division_key || 'unknown'
      if (!acc[key]) acc[key] = []
      acc[key].push(row)
      return acc
    }, {})
  }, [rows])

  return {
    rows,
    groupedRows,
    loading,
    error,
  }
}