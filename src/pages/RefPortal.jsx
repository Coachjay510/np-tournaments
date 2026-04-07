import { useMemo, useState } from 'react'

const mockRefs = [
  {
    id: 1,
    name: 'Marcus Hill',
    level: 'Varsity',
    gamesAssigned: 12,
    rate: 40,
    paid: false,
    availability: 'Available',
  },
  {
    id: 2,
    name: 'Chris Johnson',
    level: 'JV / Youth',
    gamesAssigned: 8,
    rate: 35,
    paid: true,
    availability: 'Available',
  },
  {
    id: 3,
    name: 'Tony Williams',
    level: 'Tournament Certified',
    gamesAssigned: 15,
    rate: 45,
    paid: false,
    availability: 'Limited',
  },
]

function StatCard({ label, value, accent = '#5cb800' }) {
  return (
    <div
      style={{
        background: '#080c12',
        border: '1px solid #1a2030',
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#4a5568',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 28,
          fontWeight: 700,
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  )
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
}

export default function RefPortal() {
  const [search, setSearch] = useState('')

  const filteredRefs = useMemo(() => {
    return mockRefs.filter((ref) =>
      ref.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const totalGames = filteredRefs.reduce(
    (sum, ref) => sum + ref.gamesAssigned,
    0
  )

  const totalOwed = filteredRefs.reduce(
    (sum, ref) => sum + ref.gamesAssigned * ref.rate,
    0
  )

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
          <h1 style={{ margin: 0, fontSize: 32 }}>Ref Portal</h1>

          <div style={{ color: '#6b7a99', marginTop: 6 }}>
            Manage referee assignments, payouts, and availability.
          </div>
        </div>

        <button
          style={{
            background: '#5cb800',
            color: '#04060a',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 700,
          }}
        >
          Add Ref
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard label="Refs" value={filteredRefs.length} />
        <StatCard label="Assigned Games" value={totalGames} accent="#4cafef" />
        <StatCard label="Outstanding Pay" value={`$${totalOwed}`} accent="#ff8a65" />
        <StatCard label="Average Rate" value="$40" accent="#d4a017" />
      </div>

      <div
        style={{
          background: '#080c12',
          border: '1px solid #1a2030',
          borderRadius: 12,
          padding: 18,
          marginBottom: 20,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search refs"
          style={{
            width: 320,
            background: '#04060a',
            color: '#fff',
            border: '1px solid #1a2030',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        />
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
            padding: 16,
            borderBottom: '1px solid #1a2030',
            fontWeight: 700,
          }}
        >
          Ref Assignments
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0a0f1a' }}>
              <th style={th}>Ref</th>
              <th style={th}>Level</th>
              <th style={th}>Games</th>
              <th style={th}>Rate</th>
              <th style={th}>Total</th>
              <th style={th}>Availability</th>
              <th style={th}>Paid</th>
            </tr>
          </thead>

          <tbody>
            {filteredRefs.map((ref) => (
              <tr key={ref.id} style={{ borderBottom: '1px solid #111827' }}>
                <td style={td}>{ref.name}</td>
                <td style={td}>{ref.level}</td>
                <td style={td}>{ref.gamesAssigned}</td>
                <td style={td}>${ref.rate}</td>
                <td style={td}>${ref.gamesAssigned * ref.rate}</td>
                <td style={td}>{ref.availability}</td>
                <td style={td}>{ref.paid ? 'Paid' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
