import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { useRankings } from '../hooks/useRankings'
import RankingFilters from '../components/rankings/RankingFilters'
import RankingsTable from '../components/rankings/RankingsTable'

const PER_PAGE = 25

const DIVISION_LABELS = {
  '8u_boys': '8U Boys',
  '8_9u_boys': '8/9U Boys',
  '9u_boys': '9U Boys',
  '9_10u_boys': '9/10U Boys',
  '10u_boys': '10U Boys',
  '10_11u_boys': '10/11U Boys',
  '11u_boys': '11U Boys',
  '11_12u_boys': '11/12U Boys',
  '12u_boys': '12U Boys',
  '12_13u_boys': '12/13U Boys',
  '13u_boys': '13U Boys',
  '13_14u_boys': '13/14U Boys',
  '14u_boys': '14U Boys',
  '14_15u_boys': '14/15U Boys',
  '15u_boys': '15U Boys',
  '15_16u_boys': '15/16U Boys',
  '16u_boys': '16U Boys',
  '16_17u_boys': '16/17U Boys',
  '17u_boys': '17U Boys',
  '10u_girls': '10U Girls',
  '11_12u_girls': '11/12U Girls',
  '12u_girls': '12U Girls',
  '13u_girls': '13U Girls',
  '13_14u_girls': '13/14U Girls',
  '14_15u_girls': '14/15U Girls',
  '15u_girls': '15U Girls',
  '15_16u_girls': '15/16U Girls',
  '16u_girls': '16U Girls',
  '16_17u_girls': '16/17U Girls',
  '17u_girls': '17U Girls',
  '3rd_girls': '3rd Girls',
  '3_4th_girls': '3/4th Girls',
  '4th_girls': '4th Girls',
  '4_5th_girls': '4/5th Girls',
  '5th_girls': '5th Girls',
  '5_6th_girls': '5/6th Girls',
  '6th_girls': '6th Girls',
  '6_7th_girls': '6/7th Girls',
  '7th_girls': '7th Girls',
  '7_8th_girls': '7/8th Girls',
  '8th_girls': '8th Girls',
  '8_9th_girls': '8/9th Girls',
  '9th_girls': '9th Girls',
}

const DIVISION_ORDER = [
  '8u_boys','8_9u_boys','9u_boys','9_10u_boys','10u_boys','10_11u_boys','11u_boys','11_12u_boys',
  '12u_boys','12_13u_boys','13u_boys','13_14u_boys','14u_boys','14_15u_boys','15u_boys','15_16u_boys',
  '16u_boys','16_17u_boys','17u_boys',
  '10u_girls','11_12u_girls','12u_girls','13u_girls','13_14u_girls','14_15u_girls','15u_girls',
  '15_16u_girls','16u_girls','16_17u_girls','17u_girls',
  '3rd_girls','3_4th_girls','4th_girls','4_5th_girls','5th_girls','5_6th_girls','6th_girls',
  '6_7th_girls','7th_girls','7_8th_girls','8th_girls','8_9th_girls','9th_girls',
]

function divisionLabel(key) {
  return DIVISION_LABELS[key] || key?.replaceAll('_', ' ') || '—'
}

function divisionSortIndex(key) {
  const index = DIVISION_ORDER.indexOf(key)
  return index === -1 ? 999 : index
}

function StatCard({ label, value, accent = '#f0f4ff' }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, color: accent, lineHeight: 1, letterSpacing: '0.5px' }}>
        {value}
      </div>
    </div>
  )
}

export default function Rankings() {
  const [source, setSource] = useState('Next Play Sports')
  const { rankings, loading, error, refresh } = useRankings(source)

  const [division, setDivision] = useState('all')
  const [gender, setGender] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')
  const [topMode, setTopMode] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [source, division, gender, search, sortBy, sortDir, topMode])

  const divisionOptions = useMemo(() => {
    const values = [...new Set((rankings || []).map((r) => r.ranking_division_key).filter(Boolean))]
      .sort((a, b) => divisionSortIndex(a) - divisionSortIndex(b) || divisionLabel(a).localeCompare(divisionLabel(b)))

    return values.map((value) => ({
      value,
      label: divisionLabel(value),
    }))
  }, [rankings])

  const preparedRows = useMemo(() => {
    let rows = (rankings || []).map((row) => ({
      ...row,
      division_label: divisionLabel(row.ranking_division_key),
    }))

    if (division !== 'all') {
      rows = rows.filter((r) => r.ranking_division_key === division)
    }

    if (gender !== 'all') {
      rows = rows.filter((r) =>
        gender === 'boys'
          ? r.ranking_division_key?.includes('boys')
          : r.ranking_division_key?.includes('girls')
      )
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((r) => r.team_name?.toLowerCase().includes(q))
    }

    rows.sort((a, b) => {
      if (sortBy === 'team_name' || sortBy === 'division_label' || sortBy === 'skill_level') {
        const av = (a[sortBy] || '').toString().toLowerCase()
        const bv = (b[sortBy] || '').toString().toLowerCase()
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return divisionSortIndex(a.ranking_division_key) - divisionSortIndex(b.ranking_division_key)
      }

      if (sortBy === 'rank') {
        const sameDivision = a.ranking_division_key === b.ranking_division_key
        if (!sameDivision) {
          return divisionSortIndex(a.ranking_division_key) - divisionSortIndex(b.ranking_division_key)
        }
      }

      const av = Number(a[sortBy] || 0)
      const bv = Number(b[sortBy] || 0)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return (a.team_name || '').localeCompare(b.team_name || '')
    })

    if (topMode !== 'all') {
      rows = rows.slice(0, Number(topMode))
    }

    return rows
  }, [rankings, division, gender, search, sortBy, sortDir, topMode])

  const totalPages = Math.max(1, Math.ceil(preparedRows.length / PER_PAGE))
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return preparedRows.slice(start, start + PER_PAGE)
  }, [preparedRows, page])

  const topTeam = preparedRows[0]
  const uniqueTeams = new Set(preparedRows.map((r) => `${r.ranking_source}-${r.team_name}-${r.ranking_division_key}`)).size
  const uniqueDivisions = new Set(preparedRows.map((r) => r.ranking_division_key)).size

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="RANKINGS"
        actions={
          <button
            onClick={refresh}
            style={{
              background: '#5cb800',
              color: '#04060a',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Refresh Rankings
          </button>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Source" value={source} accent="#5cb800" />
          <StatCard label="Divisions" value={uniqueDivisions || 0} />
          <StatCard label="Teams" value={uniqueTeams || 0} />
          <StatCard label="Current #1" value={topTeam?.team_name || '—'} accent="#d4a017" />
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2030' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#c0cce0', letterSpacing: '0.3px' }}>
              {source.toUpperCase()} RANKINGS
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>
              Showing 25 per page • Use ↑ and ↓ to switch lowest / highest order
            </div>
          </div>

          <div style={{ padding: 18, borderBottom: '1px solid #1a2030' }}>
            <RankingFilters
              source={source}
              onSourceChange={setSource}
              division={division}
              onDivisionChange={setDivision}
              divisionOptions={divisionOptions}
              gender={gender}
              onGenderChange={setGender}
              search={search}
              onSearchChange={setSearch}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortDir={sortDir}
              onSortDirChange={setSortDir}
              topMode={topMode}
              onTopModeChange={setTopMode}
            />
          </div>

          {error ? (
            <div style={{ padding: 24, color: '#e05555', fontSize: 13 }}>
              Error: {error.message}
            </div>
          ) : loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>
              Loading rankings...
            </div>
          ) : (
            <>
              <RankingsTable rows={pagedRows} />

              <div
                style={{
                  padding: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #1a2030',
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: 'transparent',
                    color: page === 1 ? '#3b4558' : '#d8e0f0',
                    border: '1px solid #1a2030',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>

                <div style={{ color: '#6b7a99', fontSize: 12 }}>
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    background: 'transparent',
                    color: page === totalPages ? '#3b4558' : '#d8e0f0',
                    border: '1px solid #1a2030',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
