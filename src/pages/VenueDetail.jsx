import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const inputStyle = {
  background: '#04060a', border: '1px solid #1a2030', borderRadius: 8,
  padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', width: '100%',
}

export default function VenueDetail() {
  const { venueId } = useParams()
  const navigate = useNavigate()

  const [venue, setVenue] = useState(null)
  const [gyms, setGyms] = useState([])
  const [courts, setCourts] = useState([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({})

  // Gym/court add state
  const [addingGym, setAddingGym] = useState(false)
  const [newGymName, setNewGymName] = useState('')
  const [editingGym, setEditingGym] = useState(null)
  const [editingCourt, setEditingCourt] = useState(null)

  async function loadVenue() {
    const [{ data: venueData }, { data: gymData }, { data: courtData }] = await Promise.all([
      supabase.from('venues').select('*').eq('id', venueId).single(),
      supabase.from('venue_gyms').select('*').eq('venue_id', venueId).order('name'),
      supabase.from('venue_courts').select('*, venue_gyms(name)').eq('venue_id', venueId).order('name'),
    ])
    setVenue(venueData)
    setGyms(gymData || [])
    setCourts(courtData || [])
    if (venueData) setForm({
      name: venueData.name || '',
      address: venueData.address || '',
      city: venueData.city || '',
      state: venueData.state || '',
      postal_code: venueData.postal_code || '',
      notes: venueData.notes || '',
    })
  }

  useEffect(() => { loadVenue() }, [venueId])

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    const { error } = await supabase.from('venues').update({
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postal_code: form.postal_code.trim() || null,
      notes: form.notes.trim() || null,
    }).eq('id', venueId)
    if (error) { setError(error.message); setSaving(false); return }
    setSaving(false); setEditing(false); loadVenue()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('venue_courts').delete().eq('venue_id', venueId)
    await supabase.from('venue_gyms').delete().eq('venue_id', venueId)
    const { error } = await supabase.from('venues').delete().eq('id', venueId)
    if (error) { setError(error.message); setDeleting(false); return }
    navigate('/venues')
  }

  async function handleAddGym() {
    if (!newGymName.trim()) return
    const { data } = await supabase.from('venue_gyms').insert({ venue_id: venueId, name: newGymName.trim() }).select().single()
    if (data) { setNewGymName(''); setAddingGym(false); loadVenue() }
  }

  async function handleDeleteGym(gymId) {
    await supabase.from('venue_courts').delete().eq('gym_id', gymId)
    await supabase.from('venue_gyms').delete().eq('id', gymId)
    loadVenue()
  }

  async function handleSaveGym(gymId, name) {
    await supabase.from('venue_gyms').update({ name }).eq('id', gymId)
    setEditingGym(null); loadVenue()
  }

  async function handleSaveCourt(courtId, name) {
    await supabase.from('venue_courts').update({ name }).eq('id', courtId)
    setEditingCourt(null); loadVenue()
  }

  async function handleDeleteCourt(courtId) {
    await supabase.from('venue_courts').delete().eq('id', courtId)
    loadVenue()
  }

  if (!venue) return <div style={{ padding: 40, color: '#6b7a99' }}>Loading venue...</div>

  return (
    <div style={{ padding: 24, color: '#fff', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button onClick={() => navigate('/venues')} style={{ background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', fontSize: 12, padding: 0, marginBottom: 8 }}>
            ← Back to Venues
          </button>
          {!editing ? (
            <>
              <h1 style={{ margin: 0, fontSize: 28 }}>{venue.name}</h1>
              <div style={{ color: '#6b7a99', marginTop: 4, fontSize: 13 }}>
                {[venue.address, venue.city, venue.state, venue.postal_code].filter(Boolean).join(', ') || 'No address set'}
              </div>
              {venue.notes && <div style={{ color: '#4a5568', marginTop: 4, fontSize: 12 }}>{venue.notes}</div>}
            </>
          ) : (
            <h1 style={{ margin: 0, fontSize: 22 }}>Edit Venue</h1>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} style={{ background: '#1a2a4a', color: '#7eb3ff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                ✏️ Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} style={{ background: '#2a0f0f', color: '#ff9d7a', border: '1px solid #4b1d1d', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                🗑 Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditing(false); setError('') }} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#1f0707', border: '1px solid #3a0a0a', borderRadius: 8, fontSize: 12, color: '#e05555' }}>{error}</div>}

      {/* Edit form */}
      {editing && (
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'name', label: 'Venue Name *' },
              { key: 'address', label: 'Address' },
              { key: 'city', label: 'City' },
              { key: 'state', label: 'State' },
              { key: 'postal_code', label: 'Zip Code' },
              { key: 'notes', label: 'Notes' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{label}</label>
                <input style={inputStyle} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gyms & Courts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Gyms */}
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#c0cce0' }}>GYMS ({gyms.length})</h3>
            <button onClick={() => setAddingGym(true)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>+ Add</button>
          </div>

          {addingGym && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Gym name" value={newGymName} onChange={(e) => setNewGymName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddGym()} autoFocus />
              <button onClick={handleAddGym} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save</button>
              <button onClick={() => setAddingGym(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          )}

          {gyms.map((gym) => (
            <div key={gym.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #111827' }}>
              {editingGym === gym.id ? (
                <>
                  <input style={{ ...inputStyle, flex: 1, padding: '6px 10px' }} defaultValue={gym.name} id={`gym-${gym.id}`} autoFocus />
                  <button onClick={() => handleSaveGym(gym.id, document.getElementById(`gym-${gym.id}`).value)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✓</button>
                  <button onClick={() => setEditingGym(null)} style={{ background: 'transparent', color: '#6b7a99', border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 13 }}>{gym.name}</span>
                  <button onClick={() => setEditingGym(gym.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>✏️</button>
                  <button onClick={() => handleDeleteGym(gym.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>🗑</button>
                </>
              )}
            </div>
          ))}
          {gyms.length === 0 && <div style={{ color: '#4a5568', fontSize: 12 }}>No gyms added</div>}
        </div>

        {/* Courts */}
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#c0cce0' }}>COURTS ({courts.length})</h3>
          </div>
          {courts.map((court) => (
            <div key={court.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #111827' }}>
              {editingCourt === court.id ? (
                <>
                  <input style={{ ...inputStyle, flex: 1, padding: '6px 10px' }} defaultValue={court.name} id={`court-${court.id}`} autoFocus />
                  <button onClick={() => handleSaveCourt(court.id, document.getElementById(`court-${court.id}`).value)} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✓</button>
                  <button onClick={() => setEditingCourt(null)} style={{ background: 'transparent', color: '#6b7a99', border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{court.name}</div>
                    <div style={{ fontSize: 11, color: '#4a5568' }}>{court.venue_gyms?.name || '—'}</div>
                  </div>
                  <button onClick={() => setEditingCourt(court.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>✏️</button>
                  <button onClick={() => handleDeleteCourt(court.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}>🗑</button>
                </>
              )}
            </div>
          ))}
          {courts.length === 0 && <div style={{ color: '#4a5568', fontSize: 12 }}>No courts added</div>}
        </div>
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #3a0a0a', borderRadius: 14, padding: 28, width: 400 }}>
            <h3 style={{ margin: '0 0 12px', color: '#ff9d7a' }}>Delete Venue?</h3>
            <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 20px' }}>This will permanently delete <strong style={{ color: '#d8e0f0' }}>{venue.name}</strong> along with all its gyms and courts. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
