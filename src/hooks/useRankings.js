import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const DIVISION_LABELS = {
  '8u_boys': '8U Boys',
  '8_9u_boys': '8/9U Boys',
  '9u_boys': '9U Boys',
  '9_10u_boys': '9/10U Boys',
  '10u_boys': '10U Boys',
  '10_11u_boys': '10/11U Boys',
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

export function useRankings(source = 'Next Play Sports') {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRankings = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('bt_rankings_next_play_tiered')
      .select(`
        ranking_source,
        master_team_id,
        base_master_team_id,
        team_id,
        team_name,
        ranking_division_key,
        skill_level,
        ranking_points,
        opponent_strength,
        points_for,
        points_against,
        point_diff,
        division_team_count,
        games_played,
        wins,
        losses,
        rank
      `)
      .order('ranking_division_key', { ascending: true })
      .order('rank', { ascending: true })

    if (source && source !== 'All') {
      query = query.eq('ranking_source', source)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to load rankings', error)
      setError(error)
      setRankings([])
    } else {
      setRankings(data || [])
    }

    setLoading(false)
  }, [source])

  useEffect(() => {
    loadRankings()
  }, [loadRankings])

  const divisionOptions = useMemo(() => {
    const uniqueKeys = [
      ...new Set(
        (rankings || [])
          .map((row) => row.ranking_division_key)
          .filter(Boolean)
      ),
    ]

    return uniqueKeys
      .sort((a, b) => divisionLabel(a).localeCompare(divisionLabel(b)))
      .map((key) => ({
        value: key,
        label: divisionLabel(key),
      }))
  }, [rankings])

  return {
    rankings,
    divisionOptions,
    loading,
    error,
    refresh: loadRankings,
  }
}