import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthCallback() {
  const [status, setStatus] = useState('Signing in...')

  useEffect(() => {
    async function handle() {
      // Always check for existing session first — even if there's an error in URL
      // The error might be a false alarm and the session may have been set
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.replace('/')
        return
      }

      // Try PKCE code exchange
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (data?.session) { window.location.replace('/'); return }
        if (error) setStatus('Error: ' + error.message + ' — redirecting to login...')
        setTimeout(() => window.location.replace('/login'), 2000)
        return
      }

      // No session, no code — redirect to login
      setStatus('No session found — redirecting...')
      setTimeout(() => window.location.replace('/login'), 1500)
    }
    handle()
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#04060a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontFamily:'Anton, sans-serif', fontSize:24, color:'#5cb800', letterSpacing:2 }}>NP TOURNAMENTS</div>
      <div style={{ fontSize:12, color:'#4a5568', letterSpacing:2 }}>{status}</div>
    </div>
  )
}
