import { Link } from 'react-router-dom'

export default function Venues() {
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
          padding: 20,
        }}
      >
        <div style={{ color: '#94a3b8', marginBottom: 12 }}>
          Venue management is ready for the next build phase.
        </div>

        <Link
          to="/venues/sample-venue"
          style={{
            color: '#5cb800',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Open sample venue detail
        </Link>
      </div>
    </div>
  )
}
