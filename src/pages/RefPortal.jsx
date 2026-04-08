import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function RefPortal() {
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRefModal, setShowRefModal] = useState(false)
  const [editingRef, setEditingRef] = useState(null)

  const [refForm, setRefForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    certification_level: '',
    pay_rate: '',
    availability: '',
    notes: '',
    is_active: true,
  })

  useEffect(() => {
    loadRefs()
  }, [])

  async function loadRefs() {
    setLoading(true)

    const { data, error } = await supabase
      .from('bt_referees')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setRefs(data || [])
    }

    setLoading(false)
  }

  async function handleSaveRef() {
    const payload = {
      first_name: refForm.first_name,
      last_name: refForm.last_name,
      email: refForm.email,
      phone: refForm.phone,
      city: refForm.city,
      state: refForm.state,
      certification_level: refForm.certification_level,
      pay_rate: refForm.pay_rate ? Number(refForm.pay_rate) : null,
      availability: refForm.availability,
      notes: refForm.notes,
      is_active: refForm.is_active,
    }

    let response

    if (editingRef) {
      response = await supabase
        .from('bt_referees')
        .update(payload)
        .eq('id', editingRef.id)
    } else {
      response = await supabase
        .from('bt_referees')
        .insert(payload)
    }

    if (response.error) {
      console.error(response.error)
      return
    }

    setShowRefModal(false)
    setEditingRef(null)

    setRefForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      city: '',
      state: '',
      certification_level: '',
      pay_rate: '',
      availability: '',
      notes: '',
      is_active: true,
    })

    await loadRefs()
  }

  return (
    <div style={pageWrap}>
      <div style={headerRow}>
        <div>
          <h1 style={pageTitle}>Ref Portal</h1>
          <p style={pageSubtitle}>
            Manage referees, certifications, availability, and pay rates.
          </p>
        </div>

        <button
          onClick={() => {
            setShowRefModal(true)
            setEditingRef(null)
            setRefForm({
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              city: '',
              state: '',
              certification_level: '',
              pay_rate: '',
              availability: '',
              notes: '',
              is_active: true,
            })
          }}
          style={primaryButton}
        >
          Add Ref
        </button>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ color: '#94a3b8' }}>Loading referees...</div>
        ) : refs.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>No referees found.</div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Phone</th>
                <th style={th}>Location</th>
                <th style={th}>Certification</th>
                <th style={th}>Pay Rate</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {refs.map((ref) => (
                <tr key={ref.id}>
                  <td style={td}>
                    {ref.first_name} {ref.last_name}
                  </td>
                  <td style={td}>{ref.email || '—'}</td>
                  <td style={td}>{ref.phone || '—'}</td>
                  <td style={td}>
                    {[ref.city, ref.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td style={td}>{ref.certification_level || '—'}</td>
                  <td style={td}>
                    {ref.pay_rate ? `$${ref.pay_rate}/game` : '—'}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        color: ref.is_active ? '#4ade80' : '#f87171',
                        fontWeight: 600,
                      }}
                    >
                      {ref.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => {
                        setEditingRef(ref)
                        setRefForm({
                          first_name: ref.first_name || '',
                          last_name: ref.last_name || '',
                          email: ref.email || '',
                          phone: ref.phone || '',
                          city: ref.city || '',
                          state: ref.state || '',
                          certification_level: ref.certification_level || '',
                          pay_rate: ref.pay_rate || '',
                          availability: ref.availability || '',
                          notes: ref.notes || '',
                          is_active: ref.is_active,
                        })
                        setShowRefModal(true)
                      }}
                      style={secondaryButton}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showRefModal && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0 }}>
                {editingRef ? 'Edit Referee' : 'Add Referee'}
              </h2>

              <button
                onClick={() => setShowRefModal(false)}
                style={closeButton}
              >
                ×
              </button>
            </div>

            <div style={formGrid}>
              <input
                placeholder="First Name"
                value={refForm.first_name}
                onChange={(e) =>
                  setRefForm({ ...refForm, first_name: e.target.value })
                }
                style={input}
              />

              <input
                placeholder="Last Name"
                value={refForm.last_name}
                onChange={(e) =>
                  setRefForm({ ...refForm, last_name: e.target.value })
                }
                style={input}
              />

              <input
                placeholder="Email"
                value={refForm.email}
                onChange={(e) =>
                  setRefForm({ ...refForm, email: e.target.value })
                }
                style={input}
              />

              <input
                placeholder="Phone"
                value={refForm.phone}
                onChange={(e) =>
                  setRefForm({ ...refForm, phone: e.target.value })
                }
                style={input}
              />

              <input
                placeholder="City"
                value={refForm.city}
                onChange={(e) =>
                  setRefForm({ ...refForm, city: e.target.value })
                }
                style={input}
              />

              <input
                placeholder="State"
                value={refForm.state}
                onChange={(e) =>
                  setRefForm({ ...refForm, state: e.target.value })
                }
                style={input}
              />

              <input
                placeholder="Certification Level"
                value={refForm.certification_level}
                onChange={(e) =>
                  setRefForm({
                    ...refForm,
                    certification_level: e.target.value,
                  })
                }
                style={input}
              />

              <input
                placeholder="Pay Rate"
                value={refForm.pay_rate}
                onChange={(e) =>
                  setRefForm({ ...refForm, pay_rate: e.target.value })
                }
                style={input}
              />
            </div>

            <textarea
              placeholder="Availability"
              value={refForm.availability}
              onChange={(e) =>
                setRefForm({ ...refForm, availability: e.target.value })
              }
              style={textarea}
            />

            <textarea
              placeholder="Notes"
              value={refForm.notes}
              onChange={(e) =>
                setRefForm({ ...refForm, notes: e.target.value })
              }
              style={textarea}
            />

            <div style={checkboxRow}>
              <input
                type="checkbox"
                checked={refForm.is_active}
                onChange={(e) =>
                  setRefForm({ ...refForm, is_active: e.target.checked })
                }
              />
              <span>Active Referee</span>
            </div>

            <div style={buttonRow}>
              <button
                onClick={() => setShowRefModal(false)}
                style={secondaryButton}
              >
                Cancel
              </button>

              <button onClick={handleSaveRef} style={primaryButton}>
                Save Referee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const pageWrap = {
  padding: 24,
  color: '#fff',
}

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
}

const pageTitle = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 4,
}

const pageSubtitle = {
  color: '#94a3b8',
  margin: 0,
}

const card = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 16,
  padding: 20,
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
}

const th = {
  textAlign: 'left',
  padding: '12px',
  borderBottom: '1px solid #1e293b',
  color: '#94a3b8',
  fontSize: 12,
  textTransform: 'uppercase',
}

const td = {
  padding: '14px 12px',
  borderBottom: '1px solid #1e293b',
}

const input = {
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 10,
  padding: 12,
  color: '#fff',
  width: '100%',
}

const textarea = {
  width: '100%',
  minHeight: 90,
  background: '#111827',
  color: '#fff',
  border: '1px solid #374151',
  borderRadius: 10,
  padding: 12,
  marginBottom: 16,
}

const primaryButton = {
  background: '#5cb800',
  color: '#081018',
  border: 'none',
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButton = {
  background: 'transparent',
  border: '1px solid #374151',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 14px',
  cursor: 'pointer',
}

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalCard = {
  width: '900px',
  maxWidth: '95%',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 16,
  padding: 24,
}

const modalHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
}

const formGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  marginBottom: 16,
}

const closeButton = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 24,
}

const checkboxRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 20,
}

const buttonRow = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
}
