import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

function sourceAbbrev(source = '') {
  const map = {
    'Covert Hoops': 'CH',
    'Nothing But Net': 'NBN',
  }
  return map[source] || source
}

export function useTeams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: links, error: linksError } = await supabase
        .from('bt_team_links')
        .select(`
          id,
          ranking_source,
          ranking_division_key,
          source_team_name,
          source_team_id,
          master_team_id
        `)

      if (linksError) throw linksError

      const masterIds = [...new Set((links || []).map((r) => r.master_team_id).filter(Boolean))]
      let masterMap = new Map()

      if (masterIds.length) {
        const { data: masters, error: mastersError } = await supabase
          .from('bt_master_teams')
          .select(`
            id,
            display_name,
            organization_id,
            ranking_division_key
          `)
          .in('id', masterIds)

        if (mastersError) throw mastersError

        const orgIds = [...new Set((masters || []).map((m) => m.organization_id).filter(Boolean))]
        let orgMap = new Map()

        if (orgIds.length) {
          const { data: orgs, error: orgsError } = await supabase
            .from('bt_organizations')
            .select('id, org_name')
            .in('id', orgIds)

          if (orgsError) throw orgsError
          orgMap = new Map((orgs || []).map((o) => [Number(o.id), o]))
        }

        masterMap = new Map(
          (masters || []).map((m) => [
            Number(m.id),
            {
              ...m,
              org_name: m.organization_id ? orgMap.get(Number(m.organization_id))?.org_name || null : null,
            },
          ])
        )
      }

      const grouped = new Map()

      for (const row of links || []) {
        const masterId = row.master_team_id || `source_${row.source_team_id}`
        const master = row.master_team_id ? masterMap.get(Number(row.master_team_id)) : null

        if (!grouped.has(masterId)) {
          grouped.set(masterId, {
            row_key: String(masterId),
            master_team_id: row.master_team_id,
            display_name: master?.display_name || row.source_team_name,
            ranking_division_key: master?.ranking_division_key || row.ranking_division_key,
            organization_id: master?.organization_id || null,
            organization_name: master?.org_name || null,
            source_count: 0,
            source_labels: new Set(),
            linked_sources: [],
          })
        }

        const existing = grouped.get(masterId)
        existing.source_count += 1
        existing.source_labels.add(sourceAbbrev(row.ranking_source))
        existing.linked_sources.push({
          id: row.id,
          source_team_id: row.source_team_id,
          ranking_source: row.ranking_source,
          ranking_source_abbrev: sourceAbbrev(row.ranking_source),
          ranking_division_key: row.ranking_division_key,
          source_team_name: row.source_team_name,
        })
      }

      const finalRows = Array.from(grouped.values()).map((team) => ({
        ...team,
        source_names: Array.from(team.source_labels).sort().join(', '),
      }))

      setTeams(finalRows)
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
          team.ranking_division_key?.toLowerCase().includes(lower) ||
          team.source_names?.toLowerCase().includes(lower)
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
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const paginated = filtered.slice(start, start + pageSize)

    return {
      rows: paginated,
      total,
      totalPages,
    }
  }, [teams, page, pageSize, search, sortBy, sortDirection])
}
