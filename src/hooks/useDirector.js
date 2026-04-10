import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
export function useDirector() {
  const [director, setDirector] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Session on load:', session?.user?.id, session?.user?.email)
      if (session) fetchDirector(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('Auth state change:', _event, session?.user?.id)
        if (session) fetchDirector(session.user.id)
        else { setDirector(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])
  async function fetchDirector(userId) {
    console.log('Fetching director for userId:', userId)
    const { data, error } = await supabase
      .from('directors')
      .select('*')
      .eq('user_id', userId)
      .single()
    console.log('Director data:', data, 'Error:', error)
    setDirector(data)
    setLoading(false)
  }
  return { director, loading }
}
