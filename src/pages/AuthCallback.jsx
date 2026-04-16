import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthCallback() {
  const [status, setStatus] = useState('Processing...')

  useEffect(() => {
    async function handle() {
      // Try PKCE code exchange first
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        setStatus('Exchanging code...')
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) setStatus('Error: ' + error.message)
        else { setStatus('Success! Redirecting...'); window.location.replace('/') }
        return
      }

      // Try getting existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setStatus('Session found! Redirecting...'); window.location.replace('/') }
      else setStatus('No session found. Please try signing in again.')
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
