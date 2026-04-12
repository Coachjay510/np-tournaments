import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

export default function Settings({ director }) {
  const [form, setForm] = useState({ display_name: '', email: '', org_id: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!director) return
    setForm({
      display_name: director.display_name || '',
      email: director.email || '',
      org_id: director.org_id || '',
    })
  }, [director])

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false)
    const { error } = await supabase.from('directors').update({
      display_name: form.display_name.trim(),
    }).eq('id', director.id)
    if (error) { setError(error.message) } else { setSaved(true) }
    setSaving(false)
  }

  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="SETTINGS" />
      <div style={{ padding: 24, overflowY: 'auto', flex: 1, maxWidth: 600 }}>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 18 }}>DIRECTOR PROFILE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Display Name</label>
              <input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Email</label>
              <input value={form.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>Email cannot be changed here</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Organization ID</label>
              <input value={form.org_id} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
          </div>
          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, fontSize: 12, color: '#e05555' }}>{error}</div>}
          {saved && <div style={{ marginTop: 12, padding: '10px 14px', background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 8, fontSize: 12, color: '#5cb800' }}>Settings saved!</div>}
          <button onClick={handleSave} disabled={saving} style={{ marginTop: 16, background: '#5cb800', color: '#04060a', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 18 }}>ACCOUNT INFO</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Director ID', value: director?.id },
              { label: 'Account Type', value: director?.org_id === 'np-hoopz' ? 'Super Admin' : 'Director' },
              { label: 'Member Since', value: director?.created_at ? new Date(director.created_at).toLocaleDateString() : '—' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #0e1320' }}>
                <span style={{ fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: '#c0cce0' }}>{item.value || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ff9d7a', marginBottom: 8 }}>DANGER ZONE</div>
          <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 16 }}>Permanently delete your account and all associated data. This cannot be undone.</div>
          <button style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            onClick={() => alert('Please contact support to delete your account.')}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
