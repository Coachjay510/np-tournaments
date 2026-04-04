import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useDirector() {
  const [director, setDirector] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchDirector(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) fetchDirector(session.user.id)
        else { setDirector(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchDirector(userId) {
    const { data } = await supabase
      .from('directors')
      .select('*')
      .eq('user_id', userId)
      .single()
    setDirector(data)
    setLoading(false)
  }

  return { director, loading }
}
