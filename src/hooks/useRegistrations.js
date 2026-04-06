import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useRegistrations(tournamentId) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tournamentId) return
    fetchRegistrations()

    const channel = supabase
      .channel(`teams:${tournamentId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'teams',
        filter: `tournament_id=eq.${tournamentId}`
      }, () => fetchRegistrations())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [tournamentId])

  async function fetchRegistrations() {
    const { data } = await supabase
      .from('teams')
      .select('*, division:divisions(name)')
      .eq('tournament_id', tournamentId)
      .order('registered_at', { ascending: false })
    setRegistrations(data || [])
    setLoading(false)
  }

  async function approveTeam(teamId) {
    const { error } = await supabase
      .from('teams')
      .update({ registration_status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', teamId)
    if (!error) fetchRegistrations()
    return { error }
  }

  async function rejectTeam(teamId, reason) {
    const { error } = await supabase
      .from('teams')
      .update({ registration_status: 'rejected', notes: reason })
      .eq('id', teamId)
    if (!error) fetchRegistrations()
    return { error }
  }

  async function waitlistTeam(teamId) {
    const { error } = await supabase
      .from('teams')
      .update({ registration_status: 'waitlisted' })
      .eq('id', teamId)
    if (!error) fetchRegistrations()
    return { error }
  }

  return { registrations, loading, approveTeam, rejectTeam, waitlistTeam, refetch: fetchRegistrations }
}
