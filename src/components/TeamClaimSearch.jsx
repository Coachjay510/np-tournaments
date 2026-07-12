import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const inp = {
  background: '#0e1320',
  border: '1px solid #1a2030',
  color: '#d8e0f0',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function TeamClaimSearch({ userEmail, onClaimed }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [claimedIds, setClaimedIds] = useState(new Set())
  const [claimedTeams, setClaimedTeams] = useState([])
  const [claiming, setClaiming] = useState(null) // teamId being claimed
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ display_name: '', age_group: '', gender: 'Boys', graduating_year: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [dupWarnings, setDupWarnings] = useState([])
  const [createSuccess, setCreateSuccess] = useState(null)

  const debouncedQuery = useDebounce(query, 300)

  // Load already-claimed teams for this email
  useEffect(() => {
    if (!userEmail) return
    async function load() {
      const { data } = await supabase
        .from('team_roles')
        .select('team_id, role, bt_master_teams:team_id(id, display_name, age_group, gender, graduating_year)')
        .eq('email', userEmail)
      if (data) {
        setClaimedIds(new Set(data.map(r => r.team_id)))
        setClaimedTeams(data.filter(r => r.bt_master_teams).map(r => ({ ...r.bt_master_teams, role: r.role })))
      }
    }
    load()
  }, [userEmail])

  // Search teams
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([])
      return
    }
    async function search() {
      setSearching(true)
      const { data } = await supabase
        .from('bt_master_teams')
        .select('id, display_name, age_group, gender, graduating_year, ranking_division_key, bt_organizations:organization_id(org_name)')
        .ilike('display_name', `%${debouncedQuery}%`)
        .is('merged_into_id', null)
        .order('display_name')
        .limit(12)
      setResults(data || [])
      setSearching(false)
    }
    search()
  }, [debouncedQuery])

  // Check for duplicates while typing in create form
  const createNameDebounced = useDebounce(createForm.display_name, 400)
  useEffect(() => {
    if (!createNameDebounced.trim() || createNameDebounced.length < 3) {
      setDupWarnings([])
      return
    }
    async function checkDups() {
      const { data } = await supabase
        .from('bt_master_teams')
        .select('id, display_name, age_group, gender, graduating_year')
        .ilike('display_name', `%${createNameDebounced}%`)
        .is('merged_into_id', null)
        .limit(5)
      setDupWarnings(data || [])
    }
    checkDups()
  }, [createNameDebounced])

  async function handleClaim(teamId) {
    if (!userEmail) return
    setClaiming(teamId)
    const { error } = await supabase
      .from('team_roles')
      .upsert(
        { email: userEmail, team_id: Number(teamId), role: 'coach', invited_by: null },
        { onConflict: 'email,team_id' }
      )
    if (!error) {
      setClaimedIds(prev => new Set([...prev, teamId]))
      // Refresh claimed teams list
      const claimed = results.find(r => r.id === teamId)
      if (claimed) setClaimedTeams(prev => [...prev, { ...claimed, role: 'coach' }])
      onClaimed?.(teamId)
    }
    setClaiming(null)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.display_name.trim()) return
    setCreating(true)
    setCreateError(null)

    const { data: newTeam, error } = await supabase
      .from('bt_master_teams')
      .insert({
        display_name: createForm.display_name.trim(),
        age_group: createForm.age_group || null,
        gender: createForm.gender || null,
        graduating_year: createForm.graduating_year ? Number(createForm.graduating_year) : null,
      })
      .select('id, display_name')
      .single()

    if (error) {
      setCreateError(error.message)
      setCreating(false)
      return
    }

    // Auto-claim the new team
    await supabase.from('team_roles').insert({
      email: userEmail,
      team_id: Number(newTeam.id),
      role: 'coach',
    })

    setClaimedIds(prev => new Set([...prev, newTeam.id]))
    setClaimedTeams(prev => [...prev, { ...newTeam, role: 'coach' }])
    setCreateSuccess(newTeam.display_name)
    setCreateForm({ display_name: '', age_group: '', gender: 'Boys', graduating_year: '' })
    setShowCreate(false)
    setCreating(false)
    onClaimed?.(newTeam.id)
  }

  return (
    <div>
      {/* Already linked teams */}
      {claimedTeams.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Your Linked Teams
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {claimedTeams.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0d1a0a', border: '1px solid #1a3a0a', borderRadius: 8, padding: '9px 14px' }}>
                <span style={{ color: '#5cb800', fontSize: 13 }}>✓</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#f0f4ff', fontWeight: 600, fontSize: 13 }}>{t.display_name}</span>
                  <span style={{ marginLeft: 8, color: '#6b7a99', fontSize: 11 }}>
                    {[t.age_group, t.gender, t.graduating_year ? `'${String(t.graduating_year).slice(-2)}` : null].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#5cb800', background: '#0a1a06', border: '1px solid #1a3a0a', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {t.role}
                </span>
              </div>
            ))}
          </div>
          {createSuccess && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#5cb800' }}>✓ "{createSuccess}" created and linked.</div>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Search for your team
        </div>
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type team or org name…"
            style={inp}
            autoComplete="off"
          />
          {searching && (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#4a5568' }}>
              Searching…
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {results.map(team => {
            const isClaimed = claimedIds.has(team.id)
            const isClaiming = claiming === team.id
            const orgName = team.bt_organizations?.org_name
            return (
              <div
                key={team.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isClaimed ? '#0d1a0a' : '#0a0f1a',
                  border: `1px solid ${isClaimed ? '#1a3a0a' : '#1a2030'}`,
                  borderRadius: 8, padding: '10px 14px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f0f4ff', fontWeight: 600, fontSize: 13 }}>{team.display_name}</div>
                  <div style={{ color: '#6b7a99', fontSize: 11, marginTop: 2 }}>
                    {[orgName, team.age_group, team.gender, team.graduating_year ? `Class of ${team.graduating_year}` : null, team.ranking_division_key].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {isClaimed ? (
                  <span style={{ fontSize: 12, color: '#5cb800', fontWeight: 700 }}>✓ Linked</span>
                ) : (
                  <button
                    onClick={() => handleClaim(team.id)}
                    disabled={isClaiming}
                    style={{
                      background: '#0e1a08', color: '#5cb800', border: '1px solid #2a4010',
                      padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    {isClaiming ? '…' : 'This is my team'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <div style={{ fontSize: 13, color: '#6b7a99', marginBottom: 14, padding: '10px 0' }}>
          No teams found matching "{query}"
        </div>
      )}

      {/* Create new team */}
      <div style={{ borderTop: '1px solid #1a2030', paddingTop: 14, marginTop: 4 }}>
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
          >
            + Create a new team
          </button>
        ) : (
          <form onSubmit={handleCreate}>
            <div style={{ fontSize: 12, color: '#8a9ab8', marginBottom: 12, fontWeight: 600 }}>Create New Team</div>

            {/* Duplicate warnings */}
            {dupWarnings.length > 0 && (
              <div style={{ background: '#1a1400', border: '1px solid #3a2800', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#d4a017', fontWeight: 700, marginBottom: 6 }}>
                  ⚠ Similar teams already exist — check if one of these is yours:
                </div>
                {dupWarnings.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#c0cce0' }}>
                      {d.display_name}
                      <span style={{ marginLeft: 6, color: '#6b7a99', fontSize: 11 }}>
                        {[d.age_group, d.gender].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleClaim(d.id)}
                      disabled={claiming === d.id || claimedIds.has(d.id)}
                      style={{ background: 'transparent', color: claimedIds.has(d.id) ? '#5cb800' : '#d4a017', border: `1px solid ${claimedIds.has(d.id) ? '#2a4010' : '#3a2800'}`, padding: '3px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                    >
                      {claimedIds.has(d.id) ? '✓ Linked' : 'Claim'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Team Name *</div>
                <input
                  required
                  value={createForm.display_name}
                  onChange={e => setCreateForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder="e.g. Next Play Elite 2026"
                  style={inp}
                  autoFocus
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Age Group</div>
                <input
                  value={createForm.age_group}
                  onChange={e => setCreateForm(p => ({ ...p, age_group: e.target.value }))}
                  placeholder="e.g. 15U, 17U"
                  style={inp}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Grad Year</div>
                <input
                  value={createForm.graduating_year}
                  onChange={e => setCreateForm(p => ({ ...p, graduating_year: e.target.value }))}
                  placeholder="e.g. 2027"
                  style={inp}
                  type="number"
                  min="2024"
                  max="2035"
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Division</div>
                <select value={createForm.gender} onChange={e => setCreateForm(p => ({ ...p, gender: e.target.value }))} style={inp}>
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                </select>
              </div>
            </div>

            {createError && (
              <div style={{ color: '#e05555', fontSize: 12, marginBottom: 10 }}>{createError}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setDupWarnings([]) }}
                style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !createForm.display_name.trim()}
                style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                {creating ? 'Creating…' : 'Create & Link Team'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
