import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useTeams() {
  const [teams, setTeams] = useState([])
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
    const channel = supabase
      .channel('teams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchTeams)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchTeams() {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('org_name', { ascending: true })
    if (data) {
      setTeams(data)
      // Build unique org list
      const orgMap = {}
      data.forEach(t => {
        if (t.org_name) {
          if (!orgMap[t.org_name]) orgMap[t.org_name] = []
          orgMap[t.org_name].push(t)
        }
      })
      setOrgs(orgMap)
    }
    setLoading(false)
  }

  async function createTeam(teamData) {
    const { data, error } = await supabase
      .from('teams')
      .insert([teamData])
      .select()
      .single()
    if (!error) fetchTeams()
    return { data, error }
  }

  async function updateTeam(id, teamData) {
    const { data, error } = await supabase
      .from('teams')
      .update(teamData)
      .eq('id', id)
      .select()
      .single()
    if (!error) fetchTeams()
    return { data, error }
  }

  async function deleteTeam(id) {
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (!error) fetchTeams()
    return { error }
  }

  async function searchOrgs(query) {
    if (!query || query.length < 2) return []
    const { data } = await supabase
      .from('teams')
      .select('org_name')
      .ilike('org_name', `%${query}%`)
      .limit(10)
    if (!data) return []
    const unique = [...new Set(data.map(d => d.org_name))]
    return unique
  }

  async function bulkCreateTeams(teamsArray) {
    const { data, error } = await supabase
      .from('teams')
      .insert(teamsArray)
      .select()
    if (!error) fetchTeams()
    return { data, error }
  }

  return { teams, orgs, loading, createTeam, updateTeam, deleteTeam, searchOrgs, bulkCreateTeams }
}
