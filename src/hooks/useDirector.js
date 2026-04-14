import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const SUPER_ADMIN_EMAIL = 'nextplaysports.ca@gmail.com'

export function useDirector() {
  const [director, setDirector] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('=== getSession result:', session?.user?.id, session?.user?.email)
      if (session) fetchDirector(session.user.id, session.user.email)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('=== authStateChange:', _event, session?.user?.id)
      if (session) fetchDirector(session.user.id, session.user.email)
      else { setDirector(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchDirector(userId, email) {
    console.log('=== fetchDirector called:', userId, email)
    try {
      const { data, error } = await supabase
        .from('directors')
        .select('*')
        .eq('user_id', userId)
        .single()
      console.log('=== directors query result:', data, 'error:', error?.message)

      if (data) {
        setDirector({ ...data, is_super_admin: email === SUPER_ADMIN_EMAIL })
        setLoading(false)
        return
      }

      // No record found - try to create one
      const { data: newDirector, error: insertError } = await supabase
        .from('directors')
        .insert({ user_id: userId, email, display_name: email.split('@')[0] })
        .select()
        .single()

      if (newDirector) {
        setDirector({ ...newDirector, is_super_admin: email === SUPER_ADMIN_EMAIL })
      } else {
        // Insert failed (RLS?) - create a minimal director object so user can log in
        console.warn('Could not create director record:', insertError?.message)
        setDirector({
          id: userId,
          user_id: userId,
          email,
          display_name: email.split('@')[0],
          is_super_admin: email === SUPER_ADMIN_EMAIL,
        })
      }
    } catch (err) {
      console.error('fetchDirector error:', err)
      // Fallback — let user in with minimal profile
      setDirector({
        id: userId,
        user_id: userId,
        email,
        display_name: email.split('@')[0],
        is_super_admin: email === SUPER_ADMIN_EMAIL,
      })
    } finally {
      setLoading(false)
    }
  }

  return { director, loading }
}
