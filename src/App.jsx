import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDirector } from './hooks/useDirector'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tournaments from './pages/Tournaments'
import TournamentDetail from './pages/TournamentDetail'
import Registrations from './pages/Registrations'
import PublicBracket from './pages/PublicBracket'

export default function App() {
  const { director, loading } = useDirector()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#04060a', color:'#5cb800', fontFamily:'Anton, sans-serif', fontSize:24, letterSpacing:1 }}>
      NP TOURNAMENTS
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/t/:slug/bracket" element={<PublicBracket />} />
        <Route path="/login" element={<Login />} />
        <Route element={director ? <AppShell director={director} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard director={director} />} />
          <Route path="/tournaments" element={<Tournaments director={director} />} />
          <Route path="/tournaments/:id" element={<TournamentDetail director={director} />} />
          <Route path="/registrations" element={<Registrations director={director} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
