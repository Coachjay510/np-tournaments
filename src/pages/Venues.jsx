import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Venues() {
  const navigate = useNavigate()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    gyms_count: 1,
    courts_count: 1,
  })

  async function loadVenues() {
    setLoading(true)
    const { data, error } = await supabase.from('venues').select('*').order('name')
    if (error) console.error('Load venues error:', error)
    setVenues(data || [])
    setLoading(false)
  }

  useEffect(() => { loadVenues() }, [])

  async function handleCreateVenue() {
    if (!form.name.trim()) { setSaveError('Venue name is required'); return }
    setSaving(true)
    setSaveError('')

    const { data, error } = await supabase
      .from('venues')
      .insert({
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postal_code: form.zip.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Venue insert error:', error)
      setSaveError(error.message)
      setSaving(false)
      return
    }

    if (data) {
      const gyms = Array.from({ length: Number(form.gyms_count) || 1 }).map((_, i) => ({
        venue_id: data.id,
        name: `Gym ${i + 1}`,
      }))

      const { data: gymData, error: gymError } = await supabase
        .from('venue_gyms')
        .insert(gyms)
        .select()

      if (gymError) console.error('Gym insert error:', gymError)

      if (gymData?.length) {
        const courtRows = []
        gymData.forEach((gym) => {
          for (let i = 0; i < (Number(form.courts_count) || 1); i++) {
            courtRows.push({ venue_id: data.id, gym_id: gym.id, name: `Court ${i + 1}` })
          }
        })
        const { error: courtError } = await supabase.from('venue_courts').insert(courtRows)
        if (courtError) console.error('Court insert error:', courtError)
      }

      setShowModal(false)
      setForm({ name: '', address: '', city: '', state: '', zip: '', gyms_count: 1, courts_count: 1 })
      loadVenues()
    }

    setSaving(false)
  }

  const inputStyle = {
    background: '#04060a', border: '1px solid #1a2030',
    borderRadius: 8, padding: '12px 14px', color: '#fff',
    fontSize: 13, outline: 'none', width: '100%',
  }

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Venues</h1>
          <div style={{ color: '#6b7a99', marginTop: 6 }}>Manage venues, gyms, and courts for tournaments.</div>
        </div>
        <button
          onClick={() => { setShowModal(true); setSaveError('') }}
          style={{ background: '#5cb800', color: '#04060a', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
        >
          + Add Venue
        </button>
      </div>

      <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 140px', padding: '14px 18px', borderBottom: '1px solid #1a2030', color: '#6b7a99', fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px' }}>
          <div>Venue</div><div>Address</div><div>City</div><div>State</div><div></div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>Loading venues...</div>
        ) : venues.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>No venues added yet</div>
        ) : (
          venues.map((venue) => (
            <div key={venue.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 140px', padding: '16px 18px', borderBottom: '1px solid #111827', alignItems: 'center' }}>
              <div style={{ fontWeight: 600 }}>{venue.name}</div>
              <div style={{ color: '#94a3b8' }}>{venue.address || '—'}</div>
              <div>{venue.city || '—'}</div>
              <div>{venue.state || '—'}</div>
              <button
                onClick={() => navigate(`/venues/${venue.id}`)}
                style={{ background: '#111827', color: '#fff', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}
              >
                View / Edit
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 560, background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20 }}>Create Venue</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Venue Name *</label>
                <input style={inputStyle} placeholder="e.g. Oakland Sports Complex" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Address</label>
                <input style={inputStyle} placeholder="123 Main St" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>City</label>
                  <input style={inputStyle} placeholder="Oakland" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>State</label>
                  <input style={inputStyle} placeholder="CA" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Zip</label>
                  <input style={inputStyle} placeholder="94601" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Number of Gyms</label>
                  <input style={inputStyle} type="number" min="1" max="20" value={form.gyms_count} onChange={(e) => setForm({ ...form, gyms_count: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Courts Per Gym</label>
                  <input style={inputStyle} type="number" min="1" max="20" value={form.courts_count} onChange={(e) => setForm({ ...form, courts_count: e.target.value })} />
                </div>
              </div>
            </div>

            {saveError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, fontSize: 12, color: '#e05555' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setShowModal(false); setSaveError('') }}
                style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVenue}
                disabled={saving}
                style={{ background: saving ? '#3a7a00' : '#5cb800', color: '#04060a', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}
              >
                {saving ? 'Creating...' : 'Create Venue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
