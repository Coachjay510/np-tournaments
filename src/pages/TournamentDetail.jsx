import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import Topbar from '../components/layout/Topbar'
<div style={{ padding: 12, background: '#2a1111', color: '#fff', marginBottom: 12 }}>
  TOURNAMENT DETAIL NEW VERSION
</div>
import { supabase } from '../supabaseClient'
import { formatCurrency, statusColor } from '../lib/utils'

export default function TournamentDetail({ director }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingTeam, setAddingTeam] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '',
    status: 'draft',
    city: '',
    state: '',
    venue_name: '',
    venue_id: '',
    start_date: '',
    end_date: '',
    max_teams: '',
    registration_fee: '',
    bracket_format: '',
    registration_deadline: '',
    require_approval: false,
    allow_waitlist: false,
    is_public: true,
  })

  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [customFee, setCustomFee] = useState('')
  const [manualPaymentStatus, setManualPaymentStatus] = useState('unpaid')
  const [manualRegistrationStatus, setManualRegistrationStatus] = useState('approved')

  useEffect(() => {
    loadTournamentDetail()
  }, [id])

  async function loadTournamentDetail() {
    setLoading(true)
    setError('')
    setSuccess('')

    const [
      { data: tournamentData, error: tournamentError },
      { data: teamData, error: teamError },
      { data: allTeamData, error: allTeamError },
      { data: venueData, error: venueError },
    ] = await Promise.all([
      supabase
        .from('tournaments')
        .select('*, divisions(*), venues(*)')
        .eq('id', id)
        .single(),

      supabase
        .from('teams')
        .select('*, division:divisions(name)')
        .eq('tournament_id', id)
        .order('registered_at', { ascending: false }),

      supabase
        .from('teams')
        .select('id, team_name, org_name, tournament_id')
        .order('team_name', { ascending: true }),

      supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true }),
    ])

    if (tournamentError) {
      console.error(tournamentError)
      setError('Failed to load tournament.')
      setLoading(false)
      return
    }

    if (teamError) console.error(teamError)
    if (allTeamError) console.error(allTeamError)
    if (venueError) console.error(venueError)

    setTournament(tournamentData)
    setTeams(teamData || [])
    setAllTeams(allTeamData || [])
    setVenues(venueData || [])

    setForm({
      name: tournamentData?.name || '',
      status: tournamentData?.status || 'draft',
      city: tournamentData?.city || '',
      state: tournamentData?.state || '',
      venue_name: tournamentData?.venue_name || '',
      venue_id: tournamentData?.venue_id || '',
      start_date: tournamentData?.start_date ? String(tournamentData.start_date).slice(0, 10) : '',
      end_date: tournamentData?.end_date ? String(tournamentData.end_date).slice(0, 10) : '',
      max_teams: tournamentData?.max_teams ?? '',
      registration_fee: tournamentData?.registration_fee ?? '',
      bracket_format: tournamentData?.bracket_format || '',
      registration_deadline: tournamentData?.registration_deadline
        ? String(tournamentData.registration_deadline).slice(0, 10)
        : '',
      require_approval: Boolean(tournamentData?.require_approval),
      allow_waitlist: Boolean(tournamentData?.allow_waitlist),
      is_public: tournamentData?.is_public ?? true,
    })

    setLoading(false)
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveTournament() {
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      name: form.name,
      status: form.status,
      city: form.city,
      state: form.state,
      venue_name: form.venue_name,
      venue_id: form.venue_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      max_teams: form.max_teams === '' ? null : Number(form.max_teams),
      registration_fee: form.registration_fee === '' ? null : Number(form.registration_fee),
      bracket_format: form.bracket_format || null,
      registration_deadline: form.registration_deadline || null,
      require_approval: form.require_approval,
      allow_waitlist: form.allow_waitlist,
      is_public: form.is_public,
    }

    const { data, error } = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', id)
      .select('*, divisions(*), venues(*)')
      .single()

    if (error) {
      console.error(error)
      setError(error.message || 'Failed to update tournament.')
      setSaving(false)
      return
    }

    setTournament(data)
    setSuccess('Tournament updated.')
    setSaving(false)
  }

  async function handleAddTeam() {
    if (!selectedTeamId) return

    setAddingTeam(true)
    setError('')
    setSuccess('')

    const payload = {
      tournament_id: id,
      payment_status: manualPaymentStatus,
      registration_status: manualRegistrationStatus,
    }

    if (customFee !== '') {
      payload.custom_entry_fee = Number(customFee)
    }

    const { error } = await supabase
      .from('teams')
      .update(payload)
      .eq('id', selectedTeamId)

    if (error) {
      console.error(error)
      setError(error.message || 'Failed to add team.')
      setAddingTeam(false)
      return
    }

    setSelectedTeamId('')
    setCustomFee('')
    setManualPaymentStatus('unpaid')
    setManualRegistrationStatus('approved')
    setSuccess('Team added to tournament.')
    setAddingTeam(false)
    loadTournamentDetail()
  }

  async function handleRemoveTeam(teamId) {
    const { error } = await supabase
      .from('teams')
      .update({
        tournament_id: null,
        custom_entry_fee: null,
      })
      .eq('id', teamId)

    if (error) {
      console.error(error)
      setError(error.message || 'Failed to remove team.')
      return
    }

    setSuccess('Team removed from tournament.')
    loadTournamentDetail()
  }

  const availableTeams = useMemo(() => {
    const existingIds = new Set(teams.map((team) => String(team.id)))
    return allTeams.filter((team) => !existingIds.has(String(team.id)))
  }, [allTeams, teams])

  if (loading) {
    return (
      <div style={{ padding: 40, color: '#4a5568', fontSize: 13 }}>
        Loading...
      </div>
    )
  }

  if (!tournament) {
    return (
      <div style={{ padding: 40, color: '#e05555', fontSize: 13 }}>
        Tournament not found
      </div>
    )
  }

  const c = statusColor(tournament.status)
  const approved = teams.filter((t) => t.registration_status === 'approved').length
  const pending = teams.filter((t) => t.registration_status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title={tournament.name?.toUpperCase() || 'TOURNAMENT'}
        actions={
          <>
            <button
              onClick={() => navigate('/registrations')}
              style={ghostButton}
            >
              Registrations {pending > 0 && `(${pending})`}
            </button>
            <span
              style={{
                fontSize: 10,
                padding: '5px 10px',
                borderRadius: 20,
                fontWeight: 600,
                background: c.bg,
                color: c.color,
                border: `1px solid ${c.border}`,
              }}
            >
              {String(tournament.status || 'draft').replace(/_/g, ' ')}
            </span>
          </>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {error ? <div style={errorBanner}>{error}</div> : null}
        {success ? <div style={successBanner}>{success}</div> : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Teams', value: `${approved} / ${tournament.max_teams || 0}` },
            { label: 'Revenue', value: formatCurrency(tournament.total_revenue || 0) },
            { label: 'Divisions', value: tournament.divisions?.length || 0 },
            { label: 'Pending', value: pending, color: pending > 0 ? '#d4a017' : '#f0f4ff' },
          ].map((s) => (
            <div key={s.label} style={statCard}>
              <div style={statLabel}>{s.label}</div>
              <div style={{ ...statValue, color: s.color || '#f0f4ff' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={panel}>
          <div style={panelHeader}>TOURNAMENT SETTINGS</div>

          <div style={formGrid}>
            <div>
              <label style={label}>Tournament Name</label>
              <input
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                style={input}
              >
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label style={label}>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>City</label>
              <input
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>State</label>
              <input
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>Venue</label>
              <select
                value={form.venue_id}
                onChange={(e) => updateField('venue_id', e.target.value)}
                style={input}
              >
                <option value="">Select venue</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label}>Venue Name (fallback)</label>
              <input
                value={form.venue_name}
                onChange={(e) => updateField('venue_name', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>Max Teams</label>
              <input
                type="number"
                value={form.max_teams}
                onChange={(e) => updateField('max_teams', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>Registration Fee</label>
              <input
                type="number"
                value={form.registration_fee}
                onChange={(e) => updateField('registration_fee', e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>Bracket Format</label>
              <input
                value={form.bracket_format}
                onChange={(e) => updateField('bracket_format', e.target.value)}
                style={input}
                placeholder="single elimination / pool play + bracket"
              />
            </div>

            <div>
              <label style={label}>Registration Deadline</label>
              <input
                type="date"
                value={form.registration_deadline}
                onChange={(e) => updateField('registration_deadline', e.target.value)}
                style={input}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={form.require_approval}
                onChange={(e) => updateField('require_approval', e.target.checked)}
              />
              Require Approval
            </label>

            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={form.allow_waitlist}
                onChange={(e) => updateField('allow_waitlist', e.target.checked)}
              />
              Allow Waitlist
            </label>

            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={form.is_public}
                onChange={(e) => updateField('is_public', e.target.checked)}
              />
              Public Tournament
            </label>
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              onClick={handleSaveTournament}
              disabled={saving}
              style={primaryButton}
            >
              {saving ? 'Saving...' : 'Save Tournament'}
            </button>
          </div>
        </div>

        <div style={panel}>
          <div style={panelHeader}>ADD TEAM TO TOURNAMENT</div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12 }}>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              style={input}
            >
              <option value="">Select Team</option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.team_name} - {team.org_name || 'No Org'}
                </option>
              ))}
            </select>

            <input
              value={customFee}
              onChange={(e) => setCustomFee(e.target.value)}
              placeholder="Custom Fee"
              style={input}
            />

            <select
              value={manualPaymentStatus}
              onChange={(e) => setManualPaymentStatus(e.target.value)}
              style={input}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>

            <select
              value={manualRegistrationStatus}
              onChange={(e) => setManualRegistrationStatus(e.target.value)}
              style={input}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={handleAddTeam}
              disabled={addingTeam}
              style={primaryButton}
            >
              {addingTeam ? 'Adding...' : 'Add Team'}
            </button>
          </div>
        </div>

        <div style={panel}>
          <div style={panelHeader}>REGISTERED TEAMS</div>

          {teams.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>
              No teams registered yet
            </div>
          ) : (
            teams.map((team) => {
              const rc = statusColor(
                team.registration_status === 'approved'
                  ? 'registration_open'
                  : team.registration_status === 'rejected'
                    ? 'cancelled'
                    : 'draft'
              )

              return (
                <div key={team.id} style={teamRow}>
                  <div style={teamBadge}>
                    {team.team_name?.slice(0, 2).toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#d8e0f0' }}>
                      {team.team_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>
                      {team.org_name} · {team.division?.name || 'No division'}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 20,
                      fontWeight: 600,
                      background: rc.bg,
                      color: rc.color,
                      border: `1px solid ${rc.border}`,
                    }}
                  >
                    {team.registration_status}
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      color: team.payment_status === 'paid' ? '#5cb800' : '#d4a017',
                    }}
                  >
                    {team.payment_status === 'paid' ? '✓ Paid' : '⚠ Unpaid'}
                  </span>

                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    style={dangerButton}
                  >
                    Remove
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const ghostButton = {
  background: 'transparent',
  color: '#6b7a99',
  border: '1px solid #1a2030',
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
}

const statCard = {
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 12,
  padding: 16,
}

const statLabel = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '1.2px',
  color: '#4a5568',
  marginBottom: 8,
}

const statValue = {
  fontFamily: 'Anton, sans-serif',
  fontSize: 28,
}

const panel = {
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 12,
  overflow: 'hidden',
  padding: 18,
  marginBottom: 20,
}

const panelHeader = {
  fontSize: 13,
  fontWeight: 600,
  color: '#c0cce0',
  marginBottom: 16,
}

const formGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2,1fr)',
  gap: 12,
}

const label = {
  display: 'block',
  marginBottom: 6,
  fontSize: 12,
  color: '#6b7a99',
}

const input = {
  width: '100%',
  background: '#04060a',
  color: '#fff',
  border: '1px solid #1a2030',
  borderRadius: 8,
  padding: '12px 14px',
}

const checkboxLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  color: '#d8e0f0',
}

const primaryButton = {
  background: '#5cb800',
  color: '#04060a',
  border: 'none',
  borderRadius: 8,
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
}

const dangerButton = {
  background: '#2a1111',
  color: '#ff8f8f',
  border: '1px solid #5a2323',
  borderRadius: 8,
  padding: '8px 12px',
  cursor: 'pointer',
}

const teamRow = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid #0e1320',
  gap: 12,
}

const teamBadge = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: '#5cb800',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#04060a',
  flexShrink: 0,
}

const errorBanner = {
  background: '#2a1111',
  color: '#ff8f8f',
  border: '1px solid #5a2323',
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
}

const successBanner = {
  background: '#102311',
  color: '#7fe28a',
  border: '1px solid #1e4f22',
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
}