import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/layout/Topbar'
import { useTeamsAdmin } from '../hooks/useTeamsAdmin'
import TeamMergeModal from '../components/teams/TeamMergeModal'
import TeamOrgModal from '../components/teams/TeamOrgModal'
import { supabase } from '../supabaseClient'

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: accent, lineHeight: 1, letterSpacing: '0.5px' }}>{value}</div>
      {/* Age-Up Modal */}
      {showAgeUp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 20, color: '#f0f4ff', marginBottom: 4 }}>📅 AGE-UP PREVIEW</div>
            <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 16 }}>
              {ageUpPreview.length} teams will be updated. September 1 season reset.
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0a0f1a' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#4a5568' }}>TEAM</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#4a5568' }}>AGE</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#4a5568' }}>DIVISION</th>
                  </tr>
                </thead>
                <tbody>
                  {ageUpPreview.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #0d1320' }}>
                      <td style={{ padding: '8px 12px', color: '#c0cce0' }}>{t.name}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ color: '#ef4444' }}>{t.oldAge}</span>
                        <span style={{ color: '#4a5568', margin: '0 6px' }}>→</span>
                        <span style={{ color: '#5cb800' }}>{t.newAge}</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ color: '#ef4444', fontSize: 11 }}>{t.oldDiv}</span>
                        <span style={{ color: '#4a5568', margin: '0 6px' }}>→</span>
                        <span style={{ color: '#5cb800', fontSize: 11 }}>{t.newDiv}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAgeUp(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAgeUp} disabled={agingUp} style={{ background: '#d4a017', color: '#04060a', border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {agingUp ? 'Updating...' : `Age Up ${ageUpPreview.length} Teams`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
