import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppShell({ director }) {
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-primary)' }}>
      <Sidebar director={director} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <Outlet />
      </div>
    </div>
  )
}
