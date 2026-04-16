import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const SUPER_ADMIN_EMAIL = 'nextplaysports.ca@gmail.com'

export function useDirector() {
  const [director, setDirector] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  useEffect(() => {
    // If there's a hash with access_token, let Supabase process it first
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname)
          fetchDirector(session.user.id, session.user.email)
        } else {
          // Try setting session from hash manually
          const params = new URLSearchParams(hash.substring(1))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token') || ''
          if (access_token) {
            supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
              if (data?.session) {
                window.history.replaceState({}, document.title, '/')
                fetchDirector(data.session.user.id, data.session.user.email)
              } else {
                console.error('setSession error:', error)
                setLoading(false)
              }
            })
          } else {
            setLoading(false)
          }
        }
      })
      return
    }

    // Normal session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchDirector(session.user.id, session.user.email)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'INITIAL_SESSION') return
      if (session) fetchDirector(session.user.id, session.user.email)
      else { setDirector(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchDirector(userId, email) {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const { data } = await supabase
        .from('directors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setDirector({ ...data, is_super_admin: email === SUPER_ADMIN_EMAIL })
        return
      }

      // New user - create director record
      const { data: newDirector, error: insertError } = await supabase
        .from('directors')
        .insert({ user_id: userId, email, display_name: email.split('@')[0], plan: 'free', onboarded: false })
        .select()
        .single()

      if (newDirector) {
        setDirector({ ...newDirector, is_super_admin: email === SUPER_ADMIN_EMAIL })
      } else {
        console.warn('Could not create director record:', insertError?.message)
        setDirector({ id: userId, user_id: userId, email, display_name: email.split('@')[0], plan: 'free', onboarded: false, is_super_admin: email === SUPER_ADMIN_EMAIL })
      }
    } catch (err) {
      console.error('fetchDirector error:', err)
      setDirector({ id: userId, user_id: userId, email, display_name: email.split('@')[0], plan: 'free', onboarded: false, is_super_admin: email === SUPER_ADMIN_EMAIL })
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  return { director, loading }
}
