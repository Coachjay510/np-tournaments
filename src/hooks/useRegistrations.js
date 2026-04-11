import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useRegistrations(tournamentId) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournamentId) return
    fetchRegistrations()

    const channel = supabase
      .channel(`tournament_teams:${tournamentId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tournament_teams',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => fetchRegistrations())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tournamentId])

  async function fetchRegistrations() {
    setLoading(true)
    // Fetch tournament teams
    const { data: ttData } = await supabase
      .from('tournament_teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })

    if (!ttData?.length) {
      setRegistrations([])
      setLoading(false)
      return
    }

    // Fetch master team details for all team_ids
    const teamIds = [...new Set(ttData.map(t => t.team_id).filter(Boolean))]
    const { data: masterTeams } = await supabase
      .from('bt_master_teams')
      .select('id, display_name, age_group, gender, ranking_division_key, bt_organizations(org_name)')
      .in('id', teamIds)

    const masterMap = {}
    ;(masterTeams || []).forEach(t => { masterMap[t.id] = t })

    const merged = ttData.map(tt => ({
      ...tt,
      team_name: masterMap[tt.team_id]?.display_name || '—',
      org_name: masterMap[tt.team_id]?.bt_organizations?.org_name || '—',
      age_group: masterMap[tt.team_id]?.age_group || '—',
      gender: masterMap[tt.team_id]?.gender || '—',
      division_key: masterMap[tt.team_id]?.ranking_division_key || '—',
      registration_status: tt.approval_status || 'pending',
    }))

    setRegistrations(merged)
    setLoading(false)
  }

  async function approveTeam(teamId) {
    const { error } = await supabase
      .from('tournament_teams')
      .update({ approval_status: 'approved' })
      .eq('id', teamId)
    if (!error) fetchRegistrations()
    return { error }
  }

  async function rejectTeam(teamId, reason) {
    const { error } = await supabase
      .from('tournament_teams')
      .update({ approval_status: 'rejected', notes: reason })
      .eq('id', teamId)
    if (!error) fetchRegistrations()
    return { error }
  }

  async function waitlistTeam(teamId) {
    const { error } = await supabase
      .from('tournament_teams')
      .update({ approval_status: 'waitlisted' })
      .eq('id', teamId)
    if (!error) fetchRegistrations()
    return { error }
  }

  return { registrations, loading, approveTeam, rejectTeam, waitlistTeam, refetch: fetchRegistrations }
}
