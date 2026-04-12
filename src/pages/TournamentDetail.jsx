import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'
import { formatCurrency, statusColor } from '../lib/utils'

const emptyTeamForm = {
  team_id: '',
  custom_entry_fee: '',
  payment_status: 'unpaid',
  registration_status: 'approved',
  notes: '',
  no_conflicts: true,
  shared_coach_group: '',
  preferred_day: '',
  unavailable_days: [],
  earliest_start_time: '',
  latest_start_time: '',
  min_rest_minutes: 0,
}

const emptyScheduleForm = {
  day_label: '',
  event_date: '',
  gym_open_time: '',
  gym_close_time: '',
  slot_minutes: 60,
  buffer_minutes: 10,
}

export default function TournamentDetail({ director }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [allTeams, setAllTeams] = useState([])
  const [venues, setVenues] = useState([])
  const [scheduleSettings, setScheduleSettings] = useState([])
  const [teamConstraints, setTeamConstraints] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [copying, setCopying] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showAddTeamModal, setShowAddTeamModal] = useState(false)
  const [selectedTeamIds, setSelectedTeamIds] = useState([])
  const [showEditTeamModal, setShowEditTeamModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)

  const [selectedTournamentTeam, setSelectedTournamentTeam] = useState(null)
  const [selectedDirectoryTeam, setSelectedDirectoryTeam] = useState(null)
  const [teamSearch, setTeamSearch] = useState('')
  const [teamDivisionFilter, setTeamDivisionFilter] = useState('')
  const [teamGenderFilter, setTeamGenderFilter] = useState('')
  const [tournamentTeamSearch, setTournamentTeamSearch] = useState('')
  const [tournamentTeamDivFilter, setTournamentTeamDivFilter] = useState('')
  const [tournamentTeamGenderFilter, setTournamentTeamGenderFilter] = useState('')
  const [tournamentTeamPaymentFilter, setTournamentTeamPaymentFilter] = useState('')
  const [tournamentTeamSort, setTournamentTeamSort] = useState({ field: 'team_name', dir: 'asc' })
  const [copyName, setCopyName] = useState('')

  const [teamForm, setTeamForm] = useState(emptyTeamForm)
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm)

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

  useEffect(() => {
    loadTournamentDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadTournamentDetail() {
    setLoading(true)
    setError('')
    setSuccess('')

    const [
      tournamentRes,
      teamRes,
      allTeamsRes,
      venueRes,
      scheduleRes,
      constraintsRes,
    ] = await Promise.all([
      supabase
        .from('tournaments')
        .select('*, divisions(*), venues(*)')
        .eq('id', id)
        .single(),

      supabase
        .from('tournament_teams')
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: false }),

      supabase
        .from('bt_master_teams')
        .select('id, display_name, age_group, gender, ranking_division_key, bt_organizations(org_name)')
        .order('display_name', { ascending: true }),

      supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true }),

      supabase
        .from('tournament_schedule_settings')
        .select('*')
        .eq('tournament_id', id)
        .order('event_date', { ascending: true }),

      supabase
        .from('tournament_team_constraints')
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (tournamentRes.error) {
      console.error(tournamentRes.error)
      setError(tournamentRes.error.message || 'Failed to load tournament.')
      setLoading(false)
      return
    }

    const t = tournamentRes.data

    setTournament(t)
    const masterTeamsMap = {}
    ;(allTeamsRes.data || []).forEach(t => { masterTeamsMap[t.id] = t })
    const teamsWithNames = (teamRes.data || []).map(t => ({
      ...t,
      bt_master_teams: masterTeamsMap[t.team_id] || null,
      team_name: masterTeamsMap[t.team_id]?.display_name || '—',
      org_name: masterTeamsMap[t.team_id]?.bt_organizations?.org_name || '—',
    }))
    setTeams(teamsWithNames)
    setAllTeams((allTeamsRes.data || []).map(t => ({
      ...t,
      team_name: t.display_name,
      org_name: t.bt_organizations?.org_name || '',
    })))
    setVenues(venueRes.data || [])
    setScheduleSettings(scheduleRes.data || [])
    setTeamConstraints(constraintsRes.data || [])

    setForm({
      name: t?.name || '',
      status: t?.status || 'draft',
      city: t?.city || '',
      state: t?.state || '',
      venue_name: t?.venue_name || '',
      venue_id: t?.venue_id || '',
      start_date: t?.start_date ? String(t.start_date).slice(0, 10) : '',
      end_date: t?.end_date ? String(t.end_date).slice(0, 10) : '',
      max_teams: t?.max_teams ?? '',
      registration_fee: t?.registration_fee ?? '',
      bracket_format: t?.bracket_format || '',
      registration_deadline: t?.registration_deadline
        ? String(t.registration_deadline).slice(0, 10)
        : '',
      require_approval: Boolean(t?.require_approval),
      allow_waitlist: Boolean(t?.allow_waitlist),
      is_public: t?.is_public ?? true,
    })

    setLoading(false)
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function getConstraintForTeam(teamId) {
    return teamConstraints.find((c) => String(c.team_id) === String(teamId))
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
      registration_fee:
        form.registration_fee === '' ? null : Number(form.registration_fee),
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

  function openAddTeamModal() {
    setSelectedTeamIds([])
    setSelectedTournamentTeam(null)
    setSelectedDirectoryTeam(null)
    setTeamSearch('')
    setTeamForm({
      ...emptyTeamForm,
      custom_entry_fee:
        tournament?.registration_fee != null
          ? String(tournament.registration_fee)
          : '',
    })
    setShowAddTeamModal(true)
  }

  function handleSelectTeam(team) {
    setSelectedDirectoryTeam(team)
    setTeamForm((prev) => ({
      ...prev,
      team_id: team.id,
      custom_entry_fee:
        tournament?.registration_fee != null
          ? String(tournament.registration_fee)
          : prev.custom_entry_fee,
    }))
  }

  function openEditTeamModal(team) {
    const existingConstraint = getConstraintForTeam(team.id)

    setSelectedTournamentTeam(team)
    setTeamForm({
      team_id: team.id,
      custom_entry_fee: team.custom_entry_fee ?? '',
      payment_status: team.payment_status || 'unpaid',
      registration_status: team.registration_status || 'approved',
      notes: team.team_notes || '',
      no_conflicts: existingConstraint ? !existingConstraint.has_conflicts : true,
      shared_coach_group: existingConstraint?.shared_coach_group || '',
      preferred_day: existingConstraint?.preferred_day || '',
      unavailable_days: existingConstraint?.unavailable_days || [],
      earliest_start_time: existingConstraint?.earliest_start_time || '',
      latest_start_time: existingConstraint?.latest_start_time || '',
      min_rest_minutes: existingConstraint?.min_rest_minutes || 0,
    })
    setShowEditTeamModal(true)
  }

  async function saveTeamConflict(teamId) {
    const existingConstraint = getConstraintForTeam(teamId)

    const constraintPayload = {
      tournament_id: id,
      team_id: teamId,
      has_conflicts: !teamForm.no_conflicts,
      shared_coach_group: teamForm.no_conflicts
        ? null
        : teamForm.shared_coach_group || null,
      preferred_day: teamForm.no_conflicts
        ? null
        : teamForm.preferred_day || null,
      unavailable_days: teamForm.no_conflicts
        ? null
        : teamForm.unavailable_days.length > 0
          ? teamForm.unavailable_days
          : null,
      earliest_start_time: teamForm.no_conflicts
        ? null
        : teamForm.earliest_start_time || null,
      latest_start_time: teamForm.no_conflicts
        ? null
        : teamForm.latest_start_time || null,
      min_rest_minutes: teamForm.no_conflicts
        ? 0
        : Number(teamForm.min_rest_minutes || 0),
    }

    if (existingConstraint) {
      const { error } = await supabase
        .from('tournament_team_constraints')
        .update(constraintPayload)
        .eq('id', existingConstraint.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('tournament_team_constraints')
        .insert(constraintPayload)

      if (error) throw error
    }
  }

  async function handleAddTeam() {
    if (!teamForm.team_id) {
      setError('Please select a team first.')
      return
    }

    setSavingTeam(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        tournament_id: id,
        team_id: Number(teamForm.team_id),
        payment_status: teamForm.payment_status,
        approval_status: teamForm.registration_status,
        notes: teamForm.notes || null,
        custom_entry_fee:
          teamForm.custom_entry_fee === ''
            ? null
            : Number(teamForm.custom_entry_fee),
      }

      const { error } = await supabase
        .from('tournament_teams')
        .insert(payload)

      if (error) throw error

      await saveTeamConflict(teamForm.team_id)

      setShowAddTeamModal(false)
      setSelectedDirectoryTeam(null)
      setTeamForm(emptyTeamForm)
      setSuccess('Team added to tournament.')
      setSavingTeam(false)
      loadTournamentDetail()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to add team.')
      setSavingTeam(false)
    }
  }

  async function handleUpdateTeamAssignment() {
    if (!selectedTournamentTeam?.id) return

    setSavingTeam(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        payment_status: teamForm.payment_status,
        approval_status: teamForm.registration_status,
        notes: teamForm.notes || null,
        custom_entry_fee:
          teamForm.custom_entry_fee === ''
            ? null
            : Number(teamForm.custom_entry_fee),
      }

      const { error } = await supabase
        .from('tournament_teams')
        .update(payload)
        .eq('id', selectedTournamentTeam.id)

      if (error) throw error

      await saveTeamConflict(selectedTournamentTeam.team_id)

      setShowEditTeamModal(false)
      setSelectedTournamentTeam(null)
      setSuccess('Tournament team updated.')
      setSavingTeam(false)
      loadTournamentDetail()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update team assignment.')
      setSavingTeam(false)
    }
  }

  async function handleRemoveTeam(teamId) {
    try {
      const { error } = await supabase
        .from('tournament_teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      const existingConstraint = getConstraintForTeam(teamId)
      if (existingConstraint) {
        await supabase
          .from('tournament_team_constraints')
          .delete()
          .eq('id', existingConstraint.id)
      }

      setSuccess('Team removed from tournament.')
      loadTournamentDetail()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to remove team.')
    }
  }

  async function handleDeleteTournament() {
    setDeleting(true)
    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      setError(error.message || 'Failed to delete tournament.')
      setDeleting(false)
      return
    }

    navigate('/tournaments')
  }

  async function handleCopyTournament() {
    setCopying(true)
    setError('')
    setSuccess('')

    const payload = {
      ...tournament,
      name: copyName || `${tournament.name} Copy`,
      copied_from_tournament_id: tournament.id,
    }

    delete payload.id
    delete payload.created_at
    delete payload.updated_at
    delete payload.divisions
    delete payload.venues

    const { data, error } = await supabase
      .from('tournaments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error(error)
      setError(error.message || 'Failed to copy tournament.')
      setCopying(false)
      return
    }

    setShowCopyModal(false)
    setCopyName('')
    setSuccess('Tournament copied.')
    setCopying(false)
    navigate(`/tournaments/${data.id}`)
  }

  async function handleAddScheduleSetting() {
    setSavingSchedule(true)
    setError('')
    setSuccess('')

    const payload = {
      tournament_id: id,
      day_label: scheduleForm.day_label,
      event_date: scheduleForm.event_date || null,
      gym_open_time: scheduleForm.gym_open_time || null,
      gym_close_time: scheduleForm.gym_close_time || null,
      slot_minutes: Number(scheduleForm.slot_minutes || 60),
      buffer_minutes: Number(scheduleForm.buffer_minutes || 10),
    }

    const { error } = await supabase
      .from('tournament_schedule_settings')
      .insert(payload)

    if (error) {
      console.error(error)
      setError(error.message || 'Failed to add schedule setting.')
      setSavingSchedule(false)
      return
    }

    setScheduleForm(emptyScheduleForm)
    setSuccess('Schedule setting added.')
    setSavingSchedule(false)
    loadTournamentDetail()
  }

  async function handleDeleteScheduleSetting(settingId) {
    const { error } = await supabase
      .from('tournament_schedule_settings')
      .delete()
      .eq('id', settingId)

    if (error) {
      console.error(error)
      setError(error.message || 'Failed to remove schedule setting.')
      return
    }

    setSuccess('Schedule setting removed.')
    loadTournamentDetail()
  }

  const directoryTeams = useMemo(() => {
    return [...allTeams].sort((a, b) =>
      (a.team_name || '').localeCompare(b.team_name || '')
    )
  }, [allTeams])

  const filteredDirectoryTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase()
    return directoryTeams.filter((team) => {
      if (teamDivisionFilter && team.ranking_division_key !== teamDivisionFilter) return false
      if (teamGenderFilter && (team.gender || '').toLowerCase() !== teamGenderFilter.toLowerCase()) return false
      if (!q) return true
      const name = (team.team_name || '').toLowerCase()
      const org = (team.org_name || '').toLowerCase()
      const age = (team.age_group || '').toLowerCase()
      return name.includes(q) || org.includes(q) || age.includes(q)
    })
  }, [directoryTeams, teamSearch, teamDivisionFilter, teamGenderFilter])

  const divisionOptions = useMemo(() => {
    return [...new Set(directoryTeams.map(t => t.ranking_division_key).filter(Boolean))].sort()
  }, [directoryTeams])

  if (loading) {
    return <div style={{ padding: 40, color: '#4a5568', fontSize: 13 }}>Loading...</div>
  }

  if (!tournament) {
    return <div style={{ padding: 40, color: '#e05555', fontSize: 13 }}>Tournament not found</div>
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
            <button onClick={() => navigate('/registrations')} style={ghostButton}>
              Registrations {pending > 0 && `(${pending})`}
            </button>

            <button onClick={() => setShowCopyModal(true)} style={ghostButton}>
              Copy Tournament
            </button>

            <button onClick={() => setShowDeleteModal(true)} style={dangerButton}>
              Delete Tournament
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
            { label: 'Teams', value: `${teams.length} / ${tournament.max_teams || 0}` },
            { label: 'Revenue', value: formatCurrency(teams.reduce((sum, t) => sum + (parseFloat(t.custom_entry_fee) || parseFloat(tournament.registration_fee) || 0), 0)) },
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
            <Field label="Tournament Name">
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} style={input} />
            </Field>

            <Field label="Status">
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)} style={input}>
                <option value="draft">Draft</option>
                <option value="registration_open">Registration Open</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>

            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={(e) => updateField('start_date', e.target.value)} style={input} />
            </Field>

            <Field label="End Date">
              <input type="date" value={form.end_date} onChange={(e) => updateField('end_date', e.target.value)} style={input} />
            </Field>

            <Field label="City">
              <input value={form.city} onChange={(e) => updateField('city', e.target.value)} style={input} />
            </Field>

            <Field label="State">
              <input value={form.state} onChange={(e) => updateField('state', e.target.value)} style={input} />
            </Field>

            <Field label="Venue">
              <select value={form.venue_id} onChange={(e) => {
                updateField('venue_id', e.target.value)
                const v = venues.find(v => v.id === e.target.value)
                if (v) {
                  if (v.city) updateField('city', v.city)
                  if (v.state) updateField('state', v.state)
                  updateField('venue_name', v.name)
                }
              }} style={input}>
                <option value="">Select venue</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Venue Name (fallback)">
              <input value={form.venue_name} onChange={(e) => updateField('venue_name', e.target.value)} style={input} />
            </Field>

            <Field label="Max Teams">
              <input type="number" value={form.max_teams} onChange={(e) => updateField('max_teams', e.target.value)} style={input} />
            </Field>

            <Field label="Registration Fee">
              <input type="number" value={form.registration_fee} onChange={(e) => updateField('registration_fee', e.target.value)} style={input} />
            </Field>

            <Field label="Bracket Format">
              <select value={form.bracket_format} onChange={(e) => updateField('bracket_format', e.target.value)} style={input}>
                <option value="">Select format</option>
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="pool_play">Pool Play Only</option>
                <option value="pool_then_bracket">Pool Play → Bracket</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </Field>

            <Field label="Registration Deadline">
              <input
                type="date"
                value={form.registration_deadline}
                onChange={(e) => updateField('registration_deadline', e.target.value)}
                style={input}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
            <Checkbox
              checked={form.require_approval}
              onChange={(v) => updateField('require_approval', v)}
              label="Require Approval"
            />
            <Checkbox
              checked={form.allow_waitlist}
              onChange={(v) => updateField('allow_waitlist', v)}
              label="Allow Waitlist"
            />
            <Checkbox
              checked={form.is_public}
              onChange={(v) => updateField('is_public', v)}
              label="Public Tournament"
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <button onClick={handleSaveTournament} disabled={saving} style={primaryButton}>
              {saving ? 'Saving...' : 'Save Tournament'}
            </button>
          </div>
        </div>

        <div style={panel}>
          <div style={{ ...panelHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>TOURNAMENT TEAMS</span>
            <button onClick={openAddTeamModal} style={primaryButton}>
              Add Team
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "10px 0" }}>
            <input placeholder="Search team or org..." value={tournamentTeamSearch} onChange={e => setTournamentTeamSearch(e.target.value)} style={input} />
            <select value={tournamentTeamDivFilter} onChange={e => setTournamentTeamDivFilter(e.target.value)} style={input}>
              <option value="">All Divisions</option>
              {[...new Set(teams.map(t => t.division_key).filter(Boolean))].sort().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={tournamentTeamGenderFilter} onChange={e => setTournamentTeamGenderFilter(e.target.value)} style={input}>
              <option value="">All Genders</option>
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>
            <select value={tournamentTeamPaymentFilter} onChange={e => setTournamentTeamPaymentFilter(e.target.value)} style={input}>
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          {(() => {
            const filtered = teams.filter(t => {
              if (tournamentTeamDivFilter && t.division_key !== tournamentTeamDivFilter) return false
              if (tournamentTeamGenderFilter && t.gender !== tournamentTeamGenderFilter) return false
              if (tournamentTeamPaymentFilter && t.payment_status !== tournamentTeamPaymentFilter) return false
              if (tournamentTeamSearch) { const q = tournamentTeamSearch.toLowerCase(); if (!(t.team_name||"").toLowerCase().includes(q) && !(t.org_name||"").toLowerCase().includes(q)) return false }
              return true
            })
            const sorted = [...filtered].sort((a, b) => {
              const { field, dir } = tournamentTeamSort
              const av = (a[field] || "").toString().toLowerCase()
              const bv = (b[field] || "").toString().toLowerCase()
              return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
            })
            function SortTh({ label, field }) {
              const active = tournamentTeamSort.field === field
              return (
                <th style={{ ...th, cursor: "pointer", userSelect: "none", color: active ? "#5cb800" : "#6b7a99" }}
                  onClick={() => setTournamentTeamSort(prev => ({ field, dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc" }))}>
                  {label} {active ? (tournamentTeamSort.dir === "asc" ? "↑" : "↓") : ""}
                </th>
              )
            }
            return filtered.length === 0 ? (
              <div style={{ padding: 20, color: "#6b7a99" }}>No teams match filters</div>
            ) : (
            <table style={table}>
              <thead>
                <tr>
                  <SortTh label="Team" field="team_name" />
                  <SortTh label="Org" field="org_name" />
                  <SortTh label="Division" field="division_key" />
                  <th style={th}>Registration</th>
                  <SortTh label="Payment" field="payment_status" />
                  <SortTh label="Fee" field="custom_entry_fee" />
                  <th style={th}>Conflicts</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((team) => {
                  const rc = statusColor(
                    team.registration_status === 'approved'
                      ? 'registration_open'
                      : team.registration_status === 'rejected'
                        ? 'cancelled'
                        : 'draft'
                  )

                  const conflict = getConstraintForTeam(team.team_id || team.id)

                  return (
                    <tr key={team.id}>
                      <td style={td}>{team.bt_master_teams?.display_name || team.team_name || "—"}</td>
                      <td style={td}>{team.bt_master_teams?.bt_organizations?.org_name || "—"}</td>
                      <td style={td}>{team.bt_master_teams?.ranking_division_key || "—"}</td>
                      <td style={td}>
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
                      </td>
                      <td style={td}>{team.payment_status || 'unpaid'}</td>
                      <td style={td}>
                        {team.custom_entry_fee != null
                          ? formatCurrency(team.custom_entry_fee)
                          : '—'}
                      </td>
                      <td style={td}>
                        {conflict?.has_conflicts ? 'Has conflicts' : 'No conflicts'}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEditTeamModal(team)} style={ghostButtonSmall}>
                            Edit
                          </button>
                          <button onClick={() => handleRemoveTeam(team.id)} style={dangerButtonSmall}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            )
          })()}
          )}
        </div>

        <div style={panel}>
          <div style={panelHeader}>SCHEDULING SETTINGS</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }}>
            <input
              placeholder="Day Label"
              value={scheduleForm.day_label}
              onChange={(e) => setScheduleForm((p) => ({ ...p, day_label: e.target.value }))}
              style={input}
            />
            <input
              type="date"
              value={scheduleForm.event_date}
              onChange={(e) => setScheduleForm((p) => ({ ...p, event_date: e.target.value }))}
              style={input}
            />
            <input
              type="time"
              value={scheduleForm.gym_open_time}
              onChange={(e) => setScheduleForm((p) => ({ ...p, gym_open_time: e.target.value }))}
              style={input}
            />
            <input
              type="time"
              value={scheduleForm.gym_close_time}
              onChange={(e) => setScheduleForm((p) => ({ ...p, gym_close_time: e.target.value }))}
              style={input}
            />
            <input
              type="number"
              placeholder="Slot Minutes"
              value={scheduleForm.slot_minutes}
              onChange={(e) => setScheduleForm((p) => ({ ...p, slot_minutes: e.target.value }))}
              style={input}
            />
            <input
              type="number"
              placeholder="Buffer"
              value={scheduleForm.buffer_minutes}
              onChange={(e) => setScheduleForm((p) => ({ ...p, buffer_minutes: e.target.value }))}
              style={input}
            />
          </div>

          <button onClick={handleAddScheduleSetting} disabled={savingSchedule} style={primaryButton}>
            {savingSchedule ? 'Saving...' : 'Add Schedule Rule'}
          </button>

          <div style={{ marginTop: 16 }}>
            {scheduleSettings.length === 0 ? (
              <div style={{ color: '#6b7a99' }}>No schedule settings added yet.</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Day</th>
                    <th style={th}>Date</th>
                    <th style={th}>Open</th>
                    <th style={th}>Close</th>
                    <th style={th}>Slot</th>
                    <th style={th}>Buffer</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleSettings.map((setting) => (
                    <tr key={setting.id}>
                      <td style={td}>{setting.day_label}</td>
                      <td style={td}>{setting.event_date || '—'}</td>
                      <td style={td}>{setting.gym_open_time || '—'}</td>
                      <td style={td}>{setting.gym_close_time || '—'}</td>
                      <td style={td}>{setting.slot_minutes} min</td>
                      <td style={td}>{setting.buffer_minutes} min</td>
                      <td style={td}>
                        <button onClick={() => handleDeleteScheduleSetting(setting.id)} style={dangerButtonSmall}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showAddTeamModal && (
        <Modal
          title={selectedDirectoryTeam ? 'Add Team To Tournament' : 'Select Team'}
          onClose={() => {
            setShowAddTeamModal(false)
            setSelectedDirectoryTeam(null)
            setTeamForm(emptyTeamForm)
            setTeamDivisionFilter('')
            setTeamGenderFilter('')
          }}
        >
          {!selectedDirectoryTeam ? (
            <>
              <input
                placeholder="Search teams or orgs"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                style={{ ...input, marginBottom: 8 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <select value={teamDivisionFilter} onChange={e => setTeamDivisionFilter(e.target.value)} style={input}>
                  <option value="">All Divisions</option>
                  {divisionOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={teamGenderFilter} onChange={e => setTeamGenderFilter(e.target.value)} style={input}>
                  <option value="">All Genders</option>
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                </select>
              </div>

              <div style={{ color: '#6b7a99', fontSize: 12, marginBottom: 10 }}>
                Showing {filteredDirectoryTeams.length} teams from directory
              </div>

              <div style={{ fontSize: 11, color: '#4a9eff', marginBottom: 8 }}>
                Click to select multiple teams, then click "Add Selected Teams"
              </div>
              <div style={pickerList}>
                {filteredDirectoryTeams.map((team) => {
                  const alreadyAdded = teams.some(t => String(t.team_id) === String(team.id))
                  const isSelected = selectedTeamIds.includes(team.id)
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        if (alreadyAdded) return
                        setSelectedTeamIds(prev =>
                          prev.includes(team.id) ? prev.filter(id => id !== team.id) : [...prev, team.id]
                        )
                      }}
                      style={{
                        ...pickerItem,
                        opacity: alreadyAdded ? 0.35 : 1,
                        cursor: alreadyAdded ? 'not-allowed' : 'pointer',
                        background: isSelected ? '#0d1a0a' : alreadyAdded ? '#08100a' : pickerItem.background,
                        border: isSelected ? '1px solid #1a3a0a' : pickerItem.border,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, color: alreadyAdded ? '#4a5568' : '#d8e0f0' }}>{team.team_name}</div>
                        {alreadyAdded && <span style={{ fontSize: 10, color: '#4a5568' }}>Added</span>}
                        {isSelected && <span style={{ fontSize: 10, color: '#5cb800', fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 4 }}>
                        {team.org_name || 'No Org'} · {team.age_group || '—'} · {team.gender || '—'}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ ...modalActions, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#6b7a99' }}>{selectedTeamIds.length} selected</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setShowAddTeamModal(false)
                      setSelectedDirectoryTeam(null)
                      setSelectedTeamIds([])
                      setTeamForm(emptyTeamForm)
                    }}
                    style={ghostButton}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={selectedTeamIds.length === 0 || savingTeam}
                    onClick={async () => {
                      if (!selectedTeamIds.length) return
                      setSavingTeam(true)
                      for (const teamId of selectedTeamIds) {
                        const team = allTeams.find(t => t.id === teamId)
                        await supabase.from('tournament_teams').insert({
                          tournament_id: id,
                          team_id: Number(teamId),
                          payment_status: 'unpaid',
                          approval_status: 'approved',
                          custom_entry_fee: tournament?.registration_fee || null,
                        })
                      }
                      setSavingTeam(false)
                      setShowAddTeamModal(false)
                      setSelectedTeamIds([])
                      setSuccess(`Added ${selectedTeamIds.length} team(s)!`)
                      loadTournamentDetail()
                    }}
                    style={{ ...primaryButton, opacity: selectedTeamIds.length === 0 ? 0.5 : 1 }}
                  >
                    {savingTeam ? 'Adding...' : `Add ${selectedTeamIds.length || ''} Team${selectedTeamIds.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  background: '#04060a',
                  border: '1px solid #1a2030',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 700 }}>{selectedDirectoryTeam.team_name}</div>
                <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 4 }}>
                  {selectedDirectoryTeam.org_name || 'No Org'} · {selectedDirectoryTeam.age_group || '—'} · {selectedDirectoryTeam.gender || '—'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                <input
                  placeholder="Custom Fee"
                  value={teamForm.custom_entry_fee}
                  onChange={(e) => setTeamForm((p) => ({ ...p, custom_entry_fee: e.target.value }))}
                  style={input}
                />
                <select
                  value={teamForm.payment_status}
                  onChange={(e) => setTeamForm((p) => ({ ...p, payment_status: e.target.value }))}
                  style={input}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                </select>
                <select
                  value={teamForm.registration_status}
                  onChange={(e) => setTeamForm((p) => ({ ...p, registration_status: e.target.value }))}
                  style={input}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <textarea
                placeholder="Notes"
                value={teamForm.notes}
                onChange={(e) => setTeamForm((p) => ({ ...p, notes: e.target.value }))}
                style={textarea}
              />

              <div style={{ marginTop: 16 }}>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={teamForm.no_conflicts}
                    onChange={(e) =>
                      setTeamForm((p) => ({
                        ...p,
                        no_conflicts: e.target.checked,
                      }))
                    }
                  />
                  No conflicts
                </label>
              </div>

              {!teamForm.no_conflicts && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
                  <input
                    placeholder="Shared Coach Group"
                    value={teamForm.shared_coach_group}
                    onChange={(e) => setTeamForm((p) => ({ ...p, shared_coach_group: e.target.value }))}
                    style={input}
                  />

                  <select
                    value={teamForm.preferred_day}
                    onChange={(e) => setTeamForm((p) => ({ ...p, preferred_day: e.target.value }))}
                    style={input}
                  >
                    <option value="">Preferred Day</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>

                  <input
                    placeholder="Unavailable Days (comma separated)"
                    value={teamForm.unavailable_days.join(', ')}
                    onChange={(e) =>
                      setTeamForm((p) => ({
                        ...p,
                        unavailable_days: e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                      }))
                    }
                    style={input}
                  />

                  <input
                    type="time"
                    value={teamForm.earliest_start_time}
                    onChange={(e) => setTeamForm((p) => ({ ...p, earliest_start_time: e.target.value }))}
                    style={input}
                  />

                  <input
                    type="time"
                    value={teamForm.latest_start_time}
                    onChange={(e) => setTeamForm((p) => ({ ...p, latest_start_time: e.target.value }))}
                    style={input}
                  />

                  <input
                    type="number"
                    placeholder="Min Rest Minutes"
                    value={teamForm.min_rest_minutes}
                    onChange={(e) => setTeamForm((p) => ({ ...p, min_rest_minutes: e.target.value }))}
                    style={input}
                  />
                </div>
              )}

              <div style={modalActions}>
                <button
                  onClick={() => {
                    setSelectedDirectoryTeam(null)
                    setTeamForm({
                      ...emptyTeamForm,
                      custom_entry_fee:
                        tournament?.registration_fee != null
                          ? String(tournament.registration_fee)
                          : '',
                    })
                  }}
                  style={secondaryButton}
                >
                  Back
                </button>

                <button onClick={handleAddTeam} disabled={savingTeam} style={primaryButton}>
                  {savingTeam ? 'Adding...' : 'Save Team'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {showEditTeamModal && (
        <Modal title="Edit Tournament Team" onClose={() => setShowEditTeamModal(false)}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            {selectedTournamentTeam?.team_name}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <input
              placeholder="Custom Fee"
              value={teamForm.custom_entry_fee}
              onChange={(e) => setTeamForm((p) => ({ ...p, custom_entry_fee: e.target.value }))}
              style={input}
            />
            <select
              value={teamForm.payment_status}
              onChange={(e) => setTeamForm((p) => ({ ...p, payment_status: e.target.value }))}
              style={input}
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>
            <select
              value={teamForm.registration_status}
              onChange={(e) => setTeamForm((p) => ({ ...p, registration_status: e.target.value }))}
              style={input}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <textarea
            placeholder="Notes"
            value={teamForm.notes}
            onChange={(e) => setTeamForm((p) => ({ ...p, notes: e.target.value }))}
            style={textarea}
          />

          <div style={{ marginTop: 16 }}>
            <label style={checkboxLabel}>
              <input
                type="checkbox"
                checked={teamForm.no_conflicts}
                onChange={(e) =>
                  setTeamForm((p) => ({
                    ...p,
                    no_conflicts: e.target.checked,
                  }))
                }
              />
              No conflicts
            </label>
          </div>

          {!teamForm.no_conflicts && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
              <input
                placeholder="Shared Coach Group"
                value={teamForm.shared_coach_group}
                onChange={(e) => setTeamForm((p) => ({ ...p, shared_coach_group: e.target.value }))}
                style={input}
              />

              <select
                value={teamForm.preferred_day}
                onChange={(e) => setTeamForm((p) => ({ ...p, preferred_day: e.target.value }))}
                style={input}
              >
                <option value="">Preferred Day</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>

              <input
                placeholder="Unavailable Days (comma separated)"
                value={teamForm.unavailable_days.join(', ')}
                onChange={(e) =>
                  setTeamForm((p) => ({
                    ...p,
                    unavailable_days: e.target.value
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean),
                  }))
                }
                style={input}
              />

              <input
                type="time"
                value={teamForm.earliest_start_time}
                onChange={(e) => setTeamForm((p) => ({ ...p, earliest_start_time: e.target.value }))}
                style={input}
              />

              <input
                type="time"
                value={teamForm.latest_start_time}
                onChange={(e) => setTeamForm((p) => ({ ...p, latest_start_time: e.target.value }))}
                style={input}
              />

              <input
                type="number"
                placeholder="Min Rest Minutes"
                value={teamForm.min_rest_minutes}
                onChange={(e) => setTeamForm((p) => ({ ...p, min_rest_minutes: e.target.value }))}
                style={input}
              />
            </div>
          )}

          <div style={modalActions}>
            <button onClick={() => setShowEditTeamModal(false)} style={ghostButton}>
              Cancel
            </button>
            <button onClick={handleUpdateTeamAssignment} disabled={savingTeam} style={primaryButton}>
              {savingTeam ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Delete Tournament" onClose={() => setShowDeleteModal(false)}>
          <div style={{ color: '#ffb4b4', marginBottom: 16 }}>
            This will permanently delete this tournament.
          </div>
          <div style={modalActions}>
            <button onClick={() => setShowDeleteModal(false)} style={ghostButton}>
              Cancel
            </button>
            <button onClick={handleDeleteTournament} disabled={deleting} style={dangerButton}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {showCopyModal && (
        <Modal title="Copy Tournament" onClose={() => setShowCopyModal(false)}>
          <input
            placeholder="New tournament name"
            value={copyName}
            onChange={(e) => setCopyName(e.target.value)}
            style={input}
          />
          <div style={modalActions}>
            <button onClick={() => setShowCopyModal(false)} style={ghostButton}>
              Cancel
            </button>
            <button onClick={handleCopyTournament} disabled={copying} style={primaryButton}>
              {copying ? 'Copying...' : 'Copy Tournament'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={checkboxLabel}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <div style={modalHeader}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={closeButton}>×</button>
        </div>
        {children}
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
  cursor: 'pointer',
}

const secondaryButton = {
  background: '#111827',
  color: '#fff',
  border: '1px solid #1f2937',
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
}

const ghostButtonSmall = {
  background: 'transparent',
  color: '#d8e0f0',
  border: '1px solid #1a2030',
  padding: '6px 10px',
  borderRadius: 8,
  fontSize: 12,
  cursor: 'pointer',
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

const labelStyle = {
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

const textarea = {
  width: '100%',
  minHeight: 90,
  background: '#04060a',
  color: '#fff',
  border: '1px solid #1a2030',
  borderRadius: 8,
  padding: '12px 14px',
  marginTop: 12,
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

const dangerButtonSmall = {
  background: '#2a1111',
  color: '#ff8f8f',
  border: '1px solid #5a2323',
  borderRadius: 8,
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: 12,
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
}

const th = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 11,
  color: '#6b7a99',
  textTransform: 'uppercase',
  borderBottom: '1px solid #1a2030',
}

const td = {
  padding: '12px 14px',
  color: '#d8e0f0',
  fontSize: 13,
  borderBottom: '1px solid #0e1320',
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
  width: 860,
  maxWidth: '95%',
  background: '#080c12',
  border: '1px solid #1a2030',
  borderRadius: 14,
  padding: 24,
}

const modalHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
}

const closeButton = {
  background: 'transparent',
  color: '#fff',
  border: 'none',
  fontSize: 24,
  cursor: 'pointer',
}

const modalActions = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 16,
}

const pickerList = {
  maxHeight: 360,
  overflowY: 'auto',
  display: 'grid',
  gap: 8,
}

const pickerItem = {
  background: '#04060a',
  border: '1px solid #1a2030',
  borderRadius: 10,
  padding: 12,
  textAlign: 'left',
  color: '#fff',
  cursor: 'pointer',
}