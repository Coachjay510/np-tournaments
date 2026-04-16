import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthCallback() {
  const [status, setStatus] = useState('Processing...')
  const [details, setDetails] = useState('')

  useEffect(() => {
    const search = window.location.search
    const hash = window.location.hash
    setDetails(`search: ${search || '(empty)'} | hash: ${hash ? hash.substring(0,100) : '(empty)'}`)

    async function handle() {
      const code = new URLSearchParams(search).get('code')
      
      if (code) {
        setStatus('Exchanging PKCE code...')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('Exchange failed: ' + error.message)
        } else {
          setStatus('Success! Redirecting...')
          window.location.replace('/')
        }
        return
      }

      // Check hash for implicit token
      if (hash && hash.includes('access_token')) {
        setStatus('Found token in hash, setting session...')
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token') || ''
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) {
          setStatus('setSession failed: ' + error.message)
        } else {
          setStatus('Session set! Redirecting...')
          window.location.replace('/')
        }
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus('Existing session found! Redirecting...')
        window.location.replace('/')
      } else {
        setStatus('No session, no code, no token in hash.')
      }
    }
    handle()
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#04060a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, padding:24 }}>
      <div style={{ fontFamily:'Anton, sans-serif', fontSize:24, color:'#5cb800', letterSpacing:2 }}>NP TOURNAMENTS</div>
      <div style={{ fontSize:13, color:'#c0cce0' }}>{status}</div>
      <div style={{ fontSize:11, color:'#4a5568', maxWidth:600, wordBreak:'break-all', textAlign:'center' }}>{details}</div>
    </div>
  )
}
