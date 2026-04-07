import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

const navItems = [
  { to: '/', icon: '▦', label: 'Dashboard' },
  { to: '/tournaments', icon: '🏆', label: 'Tournaments' },
  { to: '/registrations', icon: '📋', label: 'Registrations' },
  { to: '/rankings', icon: '📈', label: 'Rankings' },
  { to: '/teams', icon: '⛹', label: 'Teams' },
  { to: '/organizations', icon: '🏢', label: 'Organizations' },
  { to: '/schedule', icon: '📅', label: 'Schedule' },
]

const reportItems = [
  { to: '/analytics', icon: '📊', label: 'Analytics', soon: true },
  { to: '/financials', icon: '💰', label: 'Financials', soon: true },
]

const toolItems = [
  { to: '/ref-portal', icon: '🦓', label: 'Ref Portal' },
  { to: '/announcements', icon: '📢', label: 'Announcements', soon: true },
  { to: '/staff', icon: '👥', label: 'Staff', soon: true },
  { to: '/settings', icon: '⚙', label: 'Settings', soon: true },
]

const s = {
  sidebar: { width: 220, background: '#080c12', borderRight: '1px solid #1a2030', display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: '100vh' },
  logo: { padding: '20px 16px 16px', borderBottom: '1px solid #1a2030' },
  logoText: { fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: '0.5px', lineHeight: 1.1 },
  logoSub: { fontSize: 10, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: 2 },
  nav: { padding: '12px 8px', flex: 1 },
  navLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#2d3748', padding: '8px 8px 4px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 13, color: '#6b7a99', cursor: 'pointer', marginBottom: 1, textDecoration: 'none', transition: 'all 0.15s' },
  footer: { padding: '14px 16px', borderTop: '1px solid #1a2030' },
}

export default function Sidebar({ director }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function NavItem({ item }) {
    if (item.soon) {
      return (
        <div style={{ ...s.navItem, opacity: 0.35, cursor: 'default' }}>
          <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
          {item.label}
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Soon</span>
        </div>
      )
    }

    return (
      <NavLink
        to={item.to}
        end={item.to === '/'}
        style={({ isActive }) => ({
          ...s.navItem,
          background: isActive ? '#0d1a0a' : 'transparent',
          color: isActive ? '#5cb800' : '#6b7a99',
        })}
      >
        <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
        {item.label}
      </NavLink>
    )
  }

  return (
    <div style={s.sidebar}>
      <div style={s.logo}>
        <div style={s.logoText}>NP TOURNAMENTS</div>
        <div style={s.logoSub}>Director Portal</div>
      </div>

      <nav style={s.nav}>
        <div style={s.navLabel}>Main</div>
        {navItems.map((item) => <NavItem key={item.to} item={item} />)}

        <div style={{ ...s.navLabel, marginTop: 8 }}>Reports</div>
        {reportItems.map((item) => <NavItem key={item.to} item={item} />)}

        <div style={{ ...s.navLabel, marginTop: 8 }}>Tools</div>
        {toolItems.map((item) => <NavItem key={item.to} item={item} />)}
      </nav>

      <div style={s.footer}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#8898b8' }}>{director?.display_name || 'Director'}</div>
        <div style={{ fontSize: 10, color: '#2d3748', marginTop: 2 }}>{director?.email}</div>
        <button
          onClick={handleSignOut}
          style={{ marginTop: 10, width: '100%', padding: '7px', background: 'transparent', border: '1px solid #1a2030', borderRadius: 6, color: '#4a5568', fontSize: 12 }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
