import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useTeams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('bt_team_links')
        .select(`
          id,
          ranking_source,
          ranking_division_key,
          source_team_name,
          source_team_id,
          master_team_id,
          bt_master_teams (
            id,
            display_name,
            organization_id,
            ranking_division_key,
            bt_organizations (
              id,
              org_name
            )
          )
        `)

      if (error) throw error

      const grouped = new Map()

      for (const row of data || []) {
        const masterId = row.master_team_id || `source_${row.source_team_id}`

        if (!grouped.has(masterId)) {
          grouped.set(masterId, {
            master_team_id: row.master_team_id,
            display_name:
              row.bt_master_teams?.display_name || row.source_team_name,
            ranking_division_key:
              row.bt_master_teams?.ranking_division_key ||
              row.ranking_division_key,
            organization_id: row.bt_master_teams?.organization_id || null,
            organization_name:
              row.bt_master_teams?.bt_organizations?.org_name || null,
            source_count: 0,
            linked_sources: [],
          })
        }

        const existing = grouped.get(masterId)

        existing.source_count += 1
        existing.linked_sources.push({
          id: row.id,
          source_team_id: row.source_team_id,
          ranking_source: row.ranking_source,
          ranking_division_key: row.ranking_division_key,
          source_team_name: row.source_team_name,
        })
      }

      setTeams(Array.from(grouped.values()))
    } catch (err) {
      console.error('Error loading teams:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  return {
    teams,
    loading,
    error,
    refresh: fetchTeams,
  }
}

export function usePaginatedTeams(teams, page, pageSize, search, sortBy, sortDirection) {
  return useMemo(() => {
    let filtered = [...teams]

    if (search) {
      const lower = search.toLowerCase()
      filtered = filtered.filter(
        (team) =>
          team.display_name?.toLowerCase().includes(lower) ||
          team.organization_name?.toLowerCase().includes(lower) ||
          team.ranking_division_key?.toLowerCase().includes(lower)
      )
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      if (aValue == null) aValue = ''
      if (bValue == null) bValue = ''

      if (typeof aValue === 'string') {
        const compare = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? compare : -compare
      }

      const compare = Number(aValue || 0) - Number(bValue || 0)
      return sortDirection === 'asc' ? compare : -compare
    })

    const total = filtered.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const paginated = filtered.slice(start, start + pageSize)

    return {
      rows: paginated,
      total,
      totalPages,
    }
  }, [teams, page, pageSize, search, sortBy, sortDirection])
}
