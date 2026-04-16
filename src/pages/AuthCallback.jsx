import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true })
      else navigate('/login', { replace: true })
    })
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#04060a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ fontFamily:'Anton, sans-serif', fontSize:24, color:'#5cb800', letterSpacing:2 }}>NP TOURNAMENTS</div>
      <div style={{ fontSize:12, color:'#4a5568', letterSpacing:2 }}>SIGNING IN...</div>
    </div>
  )
}
