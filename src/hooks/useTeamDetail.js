import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useTeamDetail(teamId) {
  const [team, setTeam] = useState(null)
  const [games, setGames] = useState([])
  const [linkedSources, setLinkedSources] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [players, setPlayers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchTeamDetail = useCallback(async () => {
    if (!teamId) return

    try {
      setLoading(true)
      setError(null)

      const [
        { data: teamData, error: teamError },
        { data: rankingRows, error: rankingError },
        { data: sourceLinks, error: linksError },
        { data: gamesData, error: gamesError },
        { data: orgs, error: orgError },
        { data: playerLinks, error: playersError },
        { data: rolesData, error: rolesError },
      ] = await Promise.all([
        supabase
          .from('bt_master_teams')
          .select('id, display_name, ranking_division_key, age_group, gender, organization_id, graduating_year, contact_name, contact_email, contact_phone')
          .eq('id', teamId)
          .maybeSingle(),
        supabase
          .from('bt_rankings_next_play_tiered')
          .select('*')
          .eq('master_team_id', teamId)
          .order('rank', { ascending: true }),
        supabase
          .from('bt_team_links')
          .select('id, ranking_source, ranking_division_key, source_team_id, source_team_name, master_team_id')
          .eq('master_team_id', teamId)
          .order('ranking_source', { ascending: true })
          .order('source_team_name', { ascending: true }),
        supabase
          .from('bt_team_recent_games')
          .select('*')
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order('game_date', { ascending: false })
          .limit(25),
        supabase
          .from('bt_organizations')
          .select('id, org_name')
          .order('org_name', { ascending: true }),
        supabase
          .from('team_players')
          .select('id, player_id, linked_by, created_at, players(id, first_name, last_name, jersey_number, position, grad_year, height_inches, gender)')
          .eq('np_team_id', teamId),
        supabase
          .from('team_roles')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false }),
      ])

      if (teamError) throw teamError
      if (rankingError) throw rankingError
      if (linksError) throw linksError
      if (gamesError) throw gamesError
      if (orgError) throw orgError
      if (playersError) throw playersError
      if (rolesError) throw rolesError

      setTeam({ ...teamData, ranking: rankingRows?.[0] ?? null })
      setLinkedSources(sourceLinks || [])
      setGames(gamesData || [])
      setOrganizations(orgs || [])
      setPlayers(
        (playerLinks || [])
          .filter(l => l.players)
          .map(l => ({ ...l.players, linkId: l.id }))
      )
      setRoles(rolesData || [])
    } catch (err) {
      console.error('Error loading team detail:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => { fetchTeamDetail() }, [fetchTeamDetail])

  const saveTeam = useCallback(async (updates) => {
    try {
      setSaving(true)
      setError(null)
      const { error } = await supabase.from('bt_master_teams').update(updates).eq('id', teamId)
      if (error) throw error
      await fetchTeamDetail()
    } catch (err) {
      console.error('Error saving team:', err)
      setError(err)
    } finally {
      setSaving(false)
    }
  }, [teamId, fetchTeamDetail])

  const addPlayer = useCallback(async (playerData) => {
    const { data: newPlayer, error: pErr } = await supabase
      .from('players')
      .insert({
        first_name: playerData.first_name,
        last_name: playerData.last_name,
        jersey_number: playerData.jersey_number ? Number(playerData.jersey_number) : null,
        position: playerData.position || null,
        grad_year: playerData.grad_year ? Number(playerData.grad_year) : null,
        height_inches: playerData.height_inches ? Number(playerData.height_inches) : null,
        gender: playerData.gender || 'M',
        np_team_id: Number(teamId),
      })
      .select('id')
      .single()
    if (pErr) throw pErr
    const { error: lErr } = await supabase
      .from('team_players')
      .insert({ np_team_id: Number(teamId), player_id: newPlayer.id, linked_by: 'director' })
    if (lErr) throw lErr
    await fetchTeamDetail()
  }, [teamId, fetchTeamDetail])

  const removePlayer = useCallback(async (linkId) => {
    await supabase.from('team_players').delete().eq('id', linkId)
    await fetchTeamDetail()
  }, [fetchTeamDetail])

  const addRole = useCallback(async (email, role) => {
    const { error } = await supabase
      .from('team_roles')
      .upsert({ email, team_id: Number(teamId), role, invited_by: null }, { onConflict: 'email,team_id' })
    if (error) throw error
    await fetchTeamDetail()
  }, [teamId, fetchTeamDetail])

  const removeRole = useCallback(async (roleId) => {
    await supabase.from('team_roles').delete().eq('id', roleId)
    await fetchTeamDetail()
  }, [fetchTeamDetail])

  return {
    team, games, linkedSources, organizations, players, roles,
    loading, saving, error,
    refresh: fetchTeamDetail, saveTeam, addPlayer, removePlayer, addRole, removeRole,
  }
}
