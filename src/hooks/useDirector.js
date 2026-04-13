import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const SUPER_ADMIN_EMAIL = 'nextplaysports.ca@gmail.com'

export function useDirector() {
  const [director, setDirector] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchDirector(session.user.id, session.user.email)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchDirector(session.user.id, session.user.email)
      else { setDirector(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchDirector(userId, email) {
    const { data, error } = await supabase
      .from('directors')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      // Attach super admin flag
      setDirector({ ...data, is_super_admin: email === SUPER_ADMIN_EMAIL })
    } else {
      // Auto-create director record if missing
      const { data: newDirector } = await supabase
        .from('directors')
        .insert({ user_id: userId, email, display_name: email.split('@')[0] })
        .select()
        .single()
      if (newDirector) setDirector({ ...newDirector, is_super_admin: email === SUPER_ADMIN_EMAIL })
    }
    setLoading(false)
  }

  return { director, loading }
}
