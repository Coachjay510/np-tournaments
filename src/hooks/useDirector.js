import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const SUPER_ADMIN_EMAIL = 'nextplaysports.ca@gmail.com'

export function useDirector() {
  const [director, setDirector] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  useEffect(() => {
    // Handle OAuth callback — exchange code for session
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data?.session) {
          window.history.replaceState({}, '', '/')
        }
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchDirector(session.user.id, session.user.email)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'INITIAL_SESSION') return // ignore — handled by getSession above
      if (session) fetchDirector(session.user.id, session.user.email)
      else { setDirector(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchDirector(userId, email) {
    if (fetchingRef.current) return // prevent duplicate calls
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('directors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setDirector({ ...data, is_super_admin: email === SUPER_ADMIN_EMAIL })
        return
      }

      // No record — create one
      const { data: newDirector, error: insertError } = await supabase
        .from('directors')
        .insert({ user_id: userId, email, display_name: email.split('@')[0], plan: 'free', onboarded: false })
        .select()
        .single()

      if (newDirector) {
        setDirector({ ...newDirector, is_super_admin: email === SUPER_ADMIN_EMAIL })
      } else {
        console.warn('Could not create director record:', insertError?.message)
        // Fallback minimal profile — will show onboarding
        setDirector({
          id: userId,
          user_id: userId,
          email,
          display_name: email.split('@')[0],
          plan: 'free',
          onboarded: false,
          is_super_admin: email === SUPER_ADMIN_EMAIL,
        })
      }
    } catch (err) {
      console.error('fetchDirector error:', err)
      setDirector({
        id: userId,
        user_id: userId,
        email,
        display_name: email.split('@')[0],
        plan: 'free',
        onboarded: false,
        is_super_admin: email === SUPER_ADMIN_EMAIL,
      })
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  return { director, loading }
}
