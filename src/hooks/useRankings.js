import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const DIVISION_LABELS = {
  '8u_boys': '8U Boys',
  '8_9u_boys': '8/9U Boys',
  '9u_boys': '9U Boys',
  '9_10u_boys': '9/10U Boys',
  '10u_boys': '10U Boys',
  '10_11u_boys': '10/11U Boys',
  '10u_girls': '10U Girls',
  '11u_boys': '11U Boys',
  '11_12u_boys': '11/12U Boys',
  '11_12u_girls': '11/12U Girls',
  '12u_boys': '12U Boys',
  '12_13u_boys': '12/13U Boys',
  '12u_girls': '12U Girls',
  '13u_boys': '13U Boys',
  '13_14u_boys': '13/14U Boys',
  '13u_girls': '13U Girls',
  '13_14u_girls': '13/14U Girls',
  '14u_boys': '14U Boys',
  '14_15u_boys': '14/15U Boys',
  '14_15u_girls': '14/15U Girls',
  '15u_boys': '15U Boys',
  '15_16u_boys': '15/16U Boys',
  '15u_girls': '15U Girls',
  '15_16u_girls': '15/16U Girls',
  '16u_boys': '16U Boys',
  '16_17u_boys': '16/17U Boys',
  '16u_girls': '16U Girls',
  '16_17u_girls': '16/17U Girls',
  '17u_boys': '17U Boys',
  '17u_girls': '17U Girls',
  '3rd_girls': '3rd Girls',
  '3_4th_girls': '3/4th Girls',
  '4th_girls': '4th Girls',
  '4_5th_girls': '4/5th Girls',
  '5th_girls': '5th Girls',
  '5_6th_girls': '5/6th Girls',
  '6th_girls': '6th Girls',
  '6_7th_girls': '6/7th Girls',
  '7th_girls': '7th Girls',
  '7_8th_girls': '7/8th Girls',
  '8th_girls': '8th Girls',
  '8_9th_girls': '8/9th Girls',
  '9th_girls': '9th Girls',
}

function divisionLabel(key) {
  return DIVISION_LABELS[key] || key?.replaceAll('_', ' ') || key
}

function getRankingView(source) {
  if (source === 'Covert Hoops') return 'bt_rankings_ch'
  if (source === 'Nothing But Net') return 'bt_rankings_nbn'
  return 'bt_rankings_np'
}

function addDivisionRanks(rows) {
  const grouped = rows.reduce((acc, row) => {
    const key = row.ranking_division_key || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const rankedRows = Object.values(grouped).flatMap((divisionRows) => {
    const sorted = [...divisionRows].sort((a, b) => {
      const pointsDiff = Number(b.ranking_points || 0) - Number(a.ranking_points || 0)
      if (pointsDiff !== 0) return pointsDiff

      const winsDiff = Number(b.wins || 0) - Number(a.wins || 0)
      if (winsDiff !== 0) return winsDiff

      const pointDiffDiff = Number(b.point_diff || 0) - Number(a.point_diff || 0)
      if (pointDiffDiff !== 0) return pointDiffDiff

      return (a.team_name || '').localeCompare(b.team_name || '')
    })

    return sorted.map((row, index) => ({
      ...row,
      rank: index + 1,
    }))
  })

  return rankedRows.sort((a, b) => {
    const divisionCompare = (a.ranking_division_key || '').localeCompare(b.ranking_division_key || '')
    if (divisionCompare !== 0) return divisionCompare
    return Number(a.rank || 0) - Number(b.rank || 0)
  })
}

export function useRankings(source = 'Next Play Sports') {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const viewName = getRankingView(source)

    const { data, error } = await supabase
      .from(viewName)
      .select('*')

    if (error) {
      console.error('Failed to load rankings', error)
      setError(error)
      setRankings([])
      setLoading(false)
      return
    }

    const rankedData = addDivisionRanks(data || [])
    setRankings(rankedData)
    setLoading(false)
  }, [source])

  useEffect(() => {
    refresh()
  }, [refresh])

  const divisionOptions = useMemo(() => {
    const unique = [
      ...new Set(
        (rankings || [])
          .map((row) => row.ranking_division_key)
          .filter(Boolean)
      ),
    ]

    return unique
      .sort((a, b) => divisionLabel(a).localeCompare(divisionLabel(b)))
      .map((value) => ({
        value,
        label: divisionLabel(value),
      }))
  }, [rankings])

  return {
    rankings,
    divisionOptions,
    loading,
    error,
    refresh,
  }
}