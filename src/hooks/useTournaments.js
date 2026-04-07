import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useTournaments(directorId) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!directorId) return
    fetchTournaments()
  }, [directorId])

  async function fetchTournaments() {
    setLoading(true)

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('director_id', directorId)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Failed to fetch tournaments:', error)
      setTournaments([])
    } else {
      setTournaments(data || [])
    }

    setLoading(false)
  }

  async function createTournament(payload) {
    const { data, error } = await supabase
      .from('tournaments')
      .insert({ ...payload, director_id: directorId })
      .select()
      .single()

    if (!error) {
      setTournaments((prev) => [data, ...prev])
    }

    return { data, error }
  }

  async function updateTournament(id, payload) {
    const { data, error } = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      setTournaments((prev) =>
        prev.map((t) => (t.id === id ? data : t))
      )
    }

    return { data, error }
  }

  async function deleteTournament(id) {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (!error) {
      setTournaments((prev) =>
        prev.filter((t) => t.id !== id)
      )
    }

    return { error }
  }

  return {
    tournaments,
    loading,
    createTournament,
    updateTournament,
    deleteTournament,
    refetch: fetchTournaments,
  }
}