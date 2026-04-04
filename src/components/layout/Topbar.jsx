export default function Topbar({ title, actions }) {
  return (
    <div style={{ background:'#080c12', borderBottom:'1px solid #1a2030', padding:'14px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <h1 style={{ fontFamily:'Anton, sans-serif', fontSize:22, color:'#f0f4ff', letterSpacing:'0.5px' }}>{title}</h1>
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        {actions}
      </div>
    </div>
  )
}
