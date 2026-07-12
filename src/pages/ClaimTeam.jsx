import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import TeamClaimSearch from '../components/TeamClaimSearch'

export default function ClaimTeam() {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data?.user?.email ?? null))
  }, [])

  return (
    <div style={{ background: '#04060a', minHeight: '100vh', color: '#c0cce0' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: '#6b7a99', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ← Back
        </button>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#5cb800', letterSpacing: '0.5px' }}>
          NP TOURNAMENTS
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 6px', fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#f0f4ff', letterSpacing: '0.5px' }}>
            LINK YOUR TEAM
          </h1>
          <p style={{ margin: 0, color: '#6b7a99', fontSize: 14, lineHeight: 1.6 }}>
            Search for your team in the NP database and claim it. This connects your account as coach and prevents duplicate entries.
          </p>
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 24 }}>
          {userEmail ? (
            <TeamClaimSearch
              userEmail={userEmail}
              onClaimed={() => {/* teams refresh handled inside component */}}
            />
          ) : (
            <div style={{ color: '#4a5568', fontSize: 13, textAlign: 'center', padding: 24 }}>
              Sign in to link your team.
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, padding: '14px 18px', background: '#080c12', border: '1px solid #1a2030', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Why link your team?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              "Submit scores for your games after they're played",
              'Manage your roster and player profiles',
              'Receive tournament invites directly',
              'Your players show up in the NP player directory',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#c0cce0' }}>
                <span style={{ color: '#5cb800', flexShrink: 0 }}>✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
