import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleMagicLink() {
    if (!email) { setError('Enter your email'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://np-tournaments.vercel.app/auth/callback' }
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://np-tournaments.vercel.app/auth/callback' }
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  const inp = { width:'100%', background:'#0e1320', border:'1px solid #1a2030', color:'#d8e0f0', borderRadius:8, padding:'11px 12px', fontSize:13, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ minHeight:'100vh', background:'#04060a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:380, padding:40, background:'#080c12', border:'1px solid #1a2030', borderRadius:16 }}>
        <div style={{ fontFamily:'Anton, sans-serif', fontSize:22, color:'#5cb800', letterSpacing:1, marginBottom:4 }}>NP TOURNAMENTS</div>
        <div style={{ fontSize:12, color:'#4a5568', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:32 }}>Director Portal</div>

        {sent ? (
          <div style={{ background:'#0d1a0a', border:'1px solid #1a3a0a', borderRadius:10, padding:20, textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📧</div>
            <div style={{ color:'#5cb800', fontWeight:700, marginBottom:8 }}>Check your email</div>
            <div style={{ fontSize:12, color:'#6b7a99', lineHeight:1.6 }}>We sent a sign-in link to <strong style={{color:'#c0cce0'}}>{email}</strong>. Click it to access your dashboard.</div>
          </div>
        ) : (
          <>
            <button onClick={handleGoogleLogin} disabled={googleLoading} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:'#fff', color:'#1a1a1a', border:'none', padding:'13px', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer', marginBottom:20, opacity: googleLoading ? 0.6 : 1 }}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:'#1a2030' }}/>
              <span style={{ fontSize:11, color:'#4a5568', textTransform:'uppercase', letterSpacing:1 }}>or</span>
              <div style={{ flex:1, height:1, background:'#1a2030' }}/>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#4a5568', textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inp} />
            </div>

            <button onClick={handleMagicLink} disabled={loading} style={{ width:'100%', background:'#1a2a4a', color:'#7eb3ff', border:'1px solid #1a3a6a', padding:'11px', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sending...' : '✉️ Send Magic Link'}
            </button>

            {error && <div style={{ marginTop:12, fontSize:12, color:'#e05555', background:'#1f0707', border:'1px solid #3a0a0a', padding:'8px 12px', borderRadius:6 }}>{error}</div>}

            <div style={{ marginTop:16, fontSize:11, color:'#4a5568', textAlign:'center' }}>
              New here? Signing in creates your free account automatically.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
