import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function VenueDetail() {
  const { venueId } = useParams()

  const [venue, setVenue] = useState(null)
  const [gyms, setGyms] = useState([])
  const [courts, setCourts] = useState([])

  async function loadVenue() {
    const [{ data: venueData }, { data: gymData }, { data: courtData }] = await Promise.all([
      supabase.from('venues').select('*').eq('id', venueId).single(),
      supabase.from('venue_gyms').select('*').eq('venue_id', venueId).order('name'),
      supabase.from('venue_courts').select('*').eq('venue_id', venueId).order('name'),
    ])

    setVenue(venueData)
    setGyms(gymData || [])
    setCourts(courtData || [])
  }

  useEffect(() => {
    loadVenue()
  }, [venueId])

  if (!venue) {
    return <div style={{ padding: 40, color: '#6b7a99' }}>Loading venue...</div>
  }

  return (
    <div style={{ padding: 24, color: '#fff' }}>
      <h1 style={{ margin: 0 }}>{venue.name}</h1>
      <div style={{ color: '#6b7a99', marginTop: 6 }}>
        {venue.address}, {venue.city}, {venue.state} {venue.zip}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Gyms</h3>
          {gyms.map((gym) => (
            <div key={gym.id} style={{ padding: '10px 0', borderBottom: '1px solid #111827' }}>
              {gym.name}
            </div>
          ))}
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Courts</h3>
          {courts.map((court) => (
            <div key={court.id} style={{ padding: '10px 0', borderBottom: '1px solid #111827' }}>
              {court.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}