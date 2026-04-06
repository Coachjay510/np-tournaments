import { useParams } from 'react-router-dom'

export default function PublicBracket() {
  const { slug } = useParams()
  return (
    <div style={{ minHeight:'100vh', background:'#04060a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#f0f4ff' }}>
      <div style={{ fontFamily:'Anton, sans-serif', fontSize:28, color:'#5cb800', letterSpacing:1, marginBottom:8 }}>NP TOURNAMENTS</div>
      <div style={{ fontSize:14, color:'#4a5568', marginBottom:40 }}>PUBLIC BRACKET — {slug}</div>
      <div style={{ fontSize:13, color:'#6b7a99' }}>Bracket view coming in Phase 2 🏆</div>
    </div>
  )
}
