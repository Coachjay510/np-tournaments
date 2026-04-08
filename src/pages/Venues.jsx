import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Venues() {
  const navigate = useNavigate()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
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

    const { data } = await supabase
      .from('venues')
      .select('*')
      .order('name')

    setVenues(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadVenues()
  }, [])

  async function handleCreateVenue() {
    setSaving(true)

    const { data, error } = await supabase
      .from('venues')
      .insert({
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
      })
      .select()
      .single()

    if (!error && data) {
      const gyms = Array.from({ length: Number(form.gyms_count) }).map((_, i) => ({
        venue_id: data.id,
        name: `Gym ${i + 1}`,
      }))

      const { data: gymData } = await supabase
        .from('venue_gyms')
        .insert(gyms)
        .select()

      if (gymData?.length) {
        const courtRows = []

        gymData.forEach((gym) => {
          for (let i = 0; i < Number(form.courts_count); i++) {
            courtRows.push({
              venue_id: data.id,
              gym_id: gym.id,
              name: `Court ${i + 1}`,
            })
          }
        })

        await supabase.from('venue_courts').insert(courtRows)
      }

      setShowModal(false)
      setForm({
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        gyms_count: 1,
        courts_count: 1,
      })

      loadVenues()
    }

    setSaving(false)
  }

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Venues</h1>
          <div style={{ color: '#6b7a99', marginTop: 6 }}>
            Manage venues, gyms, and courts for tournaments.
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#5cb800',
            color: '#04060a',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Add Venue
        </button>
      </div>

      <div
        style={{
          background: '#080c12',
          border: '1px solid #1a2030',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr 1fr 140px',
            padding: '14px 18px',
            borderBottom: '1px solid #1a2030',
            color: '#6b7a99',
            fontSize: 11,
            textTransform: 'uppercase',
          }}
        >
          <div>Venue</div>
          <div>Address</div>
          <div>City</div>
          <div>State</div>
          <div></div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>
            Loading venues...
          </div>
        ) : venues.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7a99' }}>
            No venues added yet
          </div>
        ) : (
          venues.map((venue) => (
            <div
              key={venue.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr 1fr 140px',
                padding: '16px 18px',
                borderBottom: '1px solid #111827',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 600 }}>{venue.name}</div>
              <div style={{ color: '#94a3b8' }}>{venue.address}</div>
              <div>{venue.city}</div>
              <div>{venue.state}</div>

              <button
                onClick={() => navigate(`/venues/${venue.id}`)}
                style={{
                  background: '#111827',
                  color: '#fff',
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                View / Edit
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 700,
              background: '#080c12',
              border: '1px solid #1a2030',
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Create Venue</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {Object.keys(form).map((key) => (
                <input
                  key={key}
                  placeholder={key.replace(/_/g, ' ')}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{
                    background: '#04060a',
                    border: '1px solid #1a2030',
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: '#fff',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: '#111827',
                  color: '#fff',
                  border: '1px solid #1f2937',
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleCreateVenue}
                disabled={saving}
                style={{
                  background: '#5cb800',
                  color: '#04060a',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontWeight: 700,
                }}
              >
                {saving ? 'Saving...' : 'Create Venue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}