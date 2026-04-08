import { useParams } from 'react-router-dom'

export default function VenueDetail() {
  const { venueId } = useParams()

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      <h1 style={{ margin: 0, fontSize: 32 }}>Venue Detail</h1>
      <div style={{ color: '#6b7a99', marginTop: 6, marginBottom: 24 }}>
        Venue ID: {venueId}
      </div>

      <div
        style={{
          background: '#080c12',
          border: '1px solid #1a2030',
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Next build here:</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#94a3b8' }}>
          <li>Venue name and address</li>
          <li>Multiple gyms</li>
          <li>Multiple courts per gym</li>
          <li>Edit venue information</li>
          <li>Connect venue to tournaments</li>
        </ul>
      </div>
    </div>
  )
}
