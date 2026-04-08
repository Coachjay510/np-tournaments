import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function RefPortal() {
  const [refs, setRefs] = useState([])
  const [games, setGames] = useState([])
  const [assignments, setAssignments] = useState([])
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

  const [search, setSearch] = useState('')
  const [selectedGameId, setSelectedGameId] = useState('')
  const [selectedRefId, setSelectedRefId] = useState('')
  const [assignmentRole, setAssignmentRole] = useState('Referee')
  const [assignmentPayRate, setAssignmentPayRate] = useState('')
  const [assignmentStatus, setAssignmentStatus] = useState('pending')
  const [savingAssignment, setSavingAssignment] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadRefs(), loadGames(), loadAssignments()])
    setLoading(false)
  }

  async function loadRefs() {
    const { data, error } = await supabase
      .from('bt_referees')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) {
      console.error('Failed to load refs', error)
      setRefs([])
      return
    }

    setRefs(data || [])
  }

  async function loadGames() {
    const { data, error } = await supabase
      .from('scheduled_games')
      .select('*')
      .order('game_date', { ascending: true })
      .limit(300)

    if (error) {
      console.error('Failed to load games', error)
      setGames([])
      return
    }

    setGames(data || [])
  }

  async function loadAssignments() {
    const { data, error } = await supabase
      .from('bt_ref_assignments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load assignments', error)
      setAssignments([])
      return
    }

    setAssignments(data || [])
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

    resetRefModal()
    await loadRefs()
  }

  function resetRefModal() {
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
  }

  async function handleCreateAssignment() {
    if (!selectedGameId || !selectedRefId) return

    setSavingAssignment(true)

    const existing = assignments.find(
      (a) =>
        String(a.scheduled_game_id) === String(selectedGameId) &&
        String(a.referee_id) === String(selectedRefId)
    )

    if (existing) {
      console.error('Assignment already exists')
      setSavingAssignment(false)
      return
    }

    const referee = refs.find((r) => String(r.id) === String(selectedRefId))

    const payload = {
      scheduled_game_id: selectedGameId,
      referee_id: selectedRefId,
      role: assignmentRole,
      pay_rate: assignmentPayRate
        ? Number(assignmentPayRate)
        : referee?.pay_rate || null,
      payment_status: assignmentStatus,
    }

    const { error } = await supabase
      .from('bt_ref_assignments')
      .insert(payload)

    if (error) {
      console.error('Failed to create assignment', error)
      setSavingAssignment(false)
      return
    }

    setSelectedGameId('')
    setSelectedRefId('')
    setAssignmentRole('Referee')
    setAssignmentPayRate('')
    setAssignmentStatus('pending')

    await loadAssignments()
    setSavingAssignment(false)
  }

  async function handleDeleteAssignment(assignmentId) {
    const { error } = await supabase
      .from('bt_ref_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      console.error('Failed to delete assignment', error)
      return
    }

    await loadAssignments()
  }

  const filteredRefs = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return refs

    return refs.filter((ref) => {
      const fullName = `${ref.first_name || ''} ${ref.last_name || ''}`.toLowerCase()
      return (
        fullName.includes(q) ||
        (ref.email || '').toLowerCase().includes(q) ||
        (ref.phone || '').toLowerCase().includes(q)
      )
    })
  }, [refs, search])

  const assignmentsWithDetails = useMemo(() => {
    return assignments.map((assignment) => {
      const ref = refs.find((r) => String(r.id) === String(assignment.referee_id))
      const game = games.find((g) => String(g.id) === String(assignment.scheduled_game_id))

      return {
        ...assignment,
        ref_name: ref
          ? `${ref.first_name || ''} ${ref.last_name || ''}`.trim()
          : 'Unknown Ref',
        game_label: game
          ? `${game.game_date || '—'} | ${game.home_team_name || 'TBD'} vs ${game.away_team_name || 'TBD'}`
          : 'Unknown Game',
        division_name: game?.division_name || '—',
        court_name: game?.court_name || '—',
      }
    })
  }, [assignments, refs, games])

  const totalAssignedGames = assignments.length
  const totalOutstanding = assignmentsWithDetails
    .filter((a) => a.payment_status !== 'paid')
    .reduce((sum, a) => sum + Number(a.pay_rate || 0), 0)

  const averageRate = assignments.length
    ? Math.round(
        assignments.reduce((sum, a) => sum + Number(a.pay_rate || 0), 0) /
          assignments.length
      )
    : 0

  return (
    <div style={pageWrap}>
      <div style={headerRow}>
        <div>
          <h1 style={pageTitle}>Ref Portal</h1>
          <p style={pageSubtitle}>
            Manage referees, game assignments, payouts, and availability.
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

      <div style={statGrid}>
        <StatCard label="Refs" value={filteredRefs.length} />
        <StatCard label="Assignments" value={totalAssignedGames} accent="#4cafef" />
        <StatCard label="Outstanding Pay" value={`$${totalOutstanding}`} accent="#ff8a65" />
        <StatCard label="Average Rate" value={`$${averageRate}`} accent="#d4a017" />
      </div>

      <div style={card}>
        <div style={sectionTitle}>Assign Ref to Game</div>

        <div style={formGrid}>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            style={input}
          >
            <option value="">Select Game</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {`${game.game_date || '—'} | ${game.home_team_name || 'TBD'} vs ${game.away_team_name || 'TBD'}`}
              </option>
            ))}
          </select>

          <select
            value={selectedRefId}
            onChange={(e) => setSelectedRefId(e.target.value)}
            style={input}
          >
            <option value="">Select Ref</option>
            {refs
              .filter((ref) => ref.is_active)
              .map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {`${ref.first_name || ''} ${ref.last_name || ''}`.trim()}
                </option>
              ))}
          </select>

          <input
            value={assignmentRole}
            onChange={(e) => setAssignmentRole(e.target.value)}
            placeholder="Role"
            style={input}
          />

          <input
            value={assignmentPayRate}
            onChange={(e) => setAssignmentPayRate(e.target.value)}
            placeholder="Pay Rate"
            style={input}
          />

          <select
            value={assignmentStatus}
            onChange={(e) => setAssignmentStatus(e.target.value)}
            style={input}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleCreateAssignment}
            disabled={savingAssignment}
            style={primaryButton}
          >
            {savingAssignment ? 'Assigning...' : 'Assign Ref'}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>Referees</div>

        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search refs"
            style={searchInput}
          />
        </div>

        {loading ? (
          <div style={{ color: '#94a3b8' }}>Loading referees...</div>
        ) : filteredRefs.length === 0 ? (
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
              {filteredRefs.map((ref) => (
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
                  <td style={td}>{ref.pay_rate ? `$${ref.pay_rate}/game` : '—'}</td>
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

      <div style={card}>
        <div style={sectionTitle}>Assignments</div>

        {assignmentsWithDetails.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>No assignments yet.</div>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Ref</th>
                <th style={th}>Game</th>
                <th style={th}>Division</th>
                <th style={th}>Court</th>
                <th style={th}>Role</th>
                <th style={th}>Pay Rate</th>
                <th style={th}>Payment</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {assignmentsWithDetails.map((assignment) => (
                <tr key={assignment.id}>
                  <td style={td}>{assignment.ref_name}</td>
                  <td style={td}>{assignment.game_label}</td>
                  <td style={td}>{assignment.division_name}</td>
                  <td style={td}>{assignment.court_name}</td>
                  <td style={td}>{assignment.role || 'Referee'}</td>
                  <td style={td}>{assignment.pay_rate ? `$${assignment.pay_rate}` : '—'}</td>
                  <td style={td}>{assignment.payment_status || 'pending'}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      style={dangerButton}
                    >
                      Remove
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

              <button onClick={resetRefModal} style={closeButton}>
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
              <button onClick={resetRefModal} style={secondaryButton}>
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

function StatCard({ label, value, accent = '#5cb800' }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={{ ...statValue, color: accent }}>{value}</div>
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

const statGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16,
  marginBottom: 24,
}

const statCard = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 16,
  padding: 18,
}

const statLabel = {
  fontSize: 11,
  color: '#4a5568',
  textTransform: 'uppercase',
}

const statValue = {
  marginTop: 8,
  fontSize: 28,
  fontWeight: 700,
}

const card = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 16,
  padding: 20,
  marginBottom: 24,
}

const sectionTitle = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 16,
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

const searchInput = {
  width: 320,
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 10,
  padding: 12,
  color: '#fff',
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

const formGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
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

const dangerButton = {
  background: '#7f1d1d',
  border: 'none',
  color: '#fff',
  borderRadius: 10,
  padding: '8px 12px',
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