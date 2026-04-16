import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const SUPER_ADMIN_EMAIL = 'nextplaysports.ca@gmail.com'

export function useDirector() {
  const [director, setDirector] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  useEffect(() => {
    let subscription

    async function init() {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchDirector(session.user.id, session.user.email)
      } else {
        setLoading(false)
      }

      // Listen for auth changes
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (_event === 'INITIAL_SESSION') return
        if (_event === 'SIGNED_IN' && session?.user) {
          await fetchDirector(session.user.id, session.user.email)
        }
        if (_event === 'SIGNED_OUT') {
          setDirector(null)
          setLoading(false)
          fetchingRef.current = false
        }
      })
      subscription = data.subscription
    }

    init()
    return () => subscription?.unsubscribe()
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

      // New user — create director record with free plan
      const { data: newDirector, error: insertError } = await supabase
        .from('directors')
        .insert({
          user_id: userId,
          email,
          display_name: email.split('@')[0],
          plan: 'free',
          onboarded: false,
        })
        .select()
        .single()

      if (newDirector) {
        setDirector({ ...newDirector, is_super_admin: email === SUPER_ADMIN_EMAIL })
      } else {
        console.warn('Could not create director record:', insertError?.message)
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
