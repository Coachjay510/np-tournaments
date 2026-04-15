import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDirector } from './hooks/useDirector'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tournaments from './pages/Tournaments'
import TournamentDetail from './pages/TournamentDetail'
import Registrations from './pages/Registrations'
import PublicBracket from './pages/PublicBracket'
import Rankings from './pages/Rankings'
import Teams from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import Organizations from './pages/Organizations'
import OrganizationDetail from './pages/OrganizationDetail'
import Schedule from './pages/Schedule'
import RefPortal from './pages/RefPortal'
import Analytics from './pages/Analytics'
import Financials from './pages/Financials'
import Announcements from './pages/Announcements'
import Staff from './pages/Staff'
import Settings from './pages/Settings'
import SuperAdmin from './pages/SuperAdmin'
import Inventory from './pages/Inventory'
import Venues from './pages/Venues'
import PublicTournament from './pages/PublicTournament'
import PublicTeam from './pages/PublicTeam'
import Demo from './pages/Demo'
import DemoApp from './pages/DemoApp'
import TournamentLanding from './pages/TournamentLanding'
import OnboardingWizard from './pages/OnboardingWizard'
import VenueDetail from './pages/VenueDetail'

export default function App() {
  const { director, loading } = useDirector()

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#04060a',
          color: '#5cb800',
          fontFamily: 'Anton, sans-serif',
          fontSize: 24,
          letterSpacing: 1,
        }}
      >
        NP TOURNAMENTS
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:slug/bracket" element={<PublicBracket />} />
        <Route path="/t/:slug" element={<PublicTournament />} />
        <Route path="/team/:teamId" element={<PublicTeam />} />
        <Route path="/demo" element={<DemoApp />} />
        <Route path="/landing" element={<TournamentLanding />} />
        
        <Route path="/login" element={<Navigate to="/landing" replace />} />

        <Route
          element={
            director ? (director.onboarded === false ? <OnboardingWizard director={director} /> : <AppShell director={director} />) : <Navigate to="/login" />
          }
        >
          <Route path="/" element={<Dashboard director={director} />} />
          <Route path="/tournaments" element={<Tournaments director={director} />} />
          <Route
            path="/tournaments/:id"
            element={<TournamentDetail director={director} />}
          />
          <Route path="/venues" element={<Venues director={director} />} />
          <Route path="/venues/:venueId" element={<VenueDetail director={director} />} />
          <Route
            path="/registrations"
            element={<Registrations director={director} />}
          />
          <Route path="/rankings" element={<Rankings director={director} />} />
          <Route path="/teams" element={<Teams director={director} />} />
          <Route path="/teams/:teamId" element={<TeamDetail director={director} />} />
          <Route
            path="/organizations"
            element={<Organizations director={director} />}
          />
          <Route
            path="/organizations/:orgId"
            element={<OrganizationDetail director={director} />}
          />
          <Route path="/schedule" element={<Schedule director={director} />} />
          <Route path="/ref-portal" element={<RefPortal director={director} />} />
          <Route path="/analytics" element={<Analytics director={director} />} />
          <Route path="/financials" element={<Financials director={director} />} />
          <Route path="/announcements" element={<Announcements director={director} />} />
          <Route path="/staff" element={<Staff director={director} />} />
          <Route path="/settings" element={<Settings director={director} />} />
          <Route path="/super-admin" element={<SuperAdmin director={director} />} />
          <Route path="/inventory" element={<Inventory director={director} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}