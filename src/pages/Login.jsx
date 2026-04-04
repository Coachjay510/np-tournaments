import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/')
  }

  return (
    <div style={{ minHeight:'100vh', background:'#04060a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:360, padding:40, background:'#080c12', border:'1px solid #1a2030', borderRadius:16 }}>
        <div style={{ fontFamily:'Anton, sans-serif', fontSize:22, color:'#5cb800', letterSpacing:1, marginBottom:4 }}>NP TOURNAMENTS</div>
        <div style={{ fontSize:12, color:'#4a5568', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:32 }}>Director Portal</div>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, color:'#4a5568', textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="director@example.com"
              style={{ width:'100%' }}
              required
            />
          </div>
          <div>
            <label style={{ fontSize:11, color:'#4a5568', textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width:'100%' }}
              required
            />
          </div>
          {error && <div style={{ fontSize:12, color:'#e05555', background:'#1f0707', border:'1px solid #3a0a0a', padding:'8px 12px', borderRadius:6 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ background:'#5cb800', color:'#04060a', border:'none', padding:'11px', borderRadius:8, fontWeight:700, fontSize:14, marginTop:4, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
