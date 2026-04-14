import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [debug, setDebug] = useState('')
  const navigate = useNavigate()

  async function handleLogin() {
    setLoading(true)
    setError('')
    setDebug('Calling signInWithPassword...')
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      console.log('=== FULL signIn result:', JSON.stringify(result))
      setDebug('Result: ' + JSON.stringify(result).slice(0, 200))
      if (result.error) {
        setError(result.error.message)
        setLoading(false)
      } else if (result.data?.session) {
        setDebug('Session found! Navigating...')
        navigate('/')
      } else {
        setDebug('No error and no session: ' + JSON.stringify(result.data))
        setLoading(false)
      }
    } catch(err) {
      console.error('=== signIn threw:', err)
      setDebug('THREW: ' + err.message)
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#04060a", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:380, padding:40, background:"#080c12", border:"1px solid #1a2030", borderRadius:16 }}>
        <div style={{ fontFamily:"Anton, sans-serif", fontSize:22, color:"#5cb800", letterSpacing:1, marginBottom:4 }}>NP TOURNAMENTS</div>
        <div style={{ fontSize:12, color:"#4a5568", textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:24 }}>Director Portal</div>

        <button onClick={() => navigate('/demo')} style={{ width:"100%", background:"transparent", color:"#5cb800", border:"1px solid #1a3a0a", padding:"10px", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer", marginBottom:20 }}>
          👀 View Live Demo
        </button>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, color:"#4a5568", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="director@example.com"
              style={{ width:"100%", background:"#0e1320", border:"1px solid #1a2030", color:"#d8e0f0", borderRadius:8, padding:"10px 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize:11, color:"#4a5568", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width:"100%", background:"#0e1320", border:"1px solid #1a2030", color:"#d8e0f0", borderRadius:8, padding:"10px 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}
            />
          </div>

          {error && <div style={{ fontSize:12, color:"#e05555", background:"#1f0707", border:"1px solid #3a0a0a", padding:"8px 12px", borderRadius:6 }}>{error}</div>}
          {debug && <div style={{ fontSize:11, color:"#d4a017", background:"#1a1500", border:"1px solid #3a3000", padding:"8px 12px", borderRadius:6, wordBreak:"break-all" }}>{debug}</div>}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ background:"#5cb800", color:"#04060a", border:"none", padding:"11px", borderRadius:8, fontWeight:700, fontSize:14, marginTop:4, opacity: loading ? 0.6 : 1, cursor:"pointer" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  )
}
