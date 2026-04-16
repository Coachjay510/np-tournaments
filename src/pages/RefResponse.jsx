import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://np-backend-production.up.railway.app'

export default function RefResponse() {
  const { inviteId } = useParams()
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action')
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function respond() {
      try {
        const res = await fetch(`${BACKEND}/api/tournaments/respond-ref/${inviteId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        const data = await res.json()
        if (data.success) {
          setStatus(action === 'accept' ? 'accepted' : 'declined')
          setMessage(action === 'accept'
            ? "You're confirmed! The director will be in touch with more details."
            : "No problem — the director has been notified.")
        } else {
          setStatus('error')
          setMessage(data.error || 'Something went wrong.')
        }
      } catch (err) {
        setStatus('error')
        setMessage('Could not connect. Please try again.')
      }
    }
    if (inviteId && action) respond()
  }, [inviteId, action])

  const icons = { accepted: '✅', declined: '👋', error: '❌', processing: '⏳' }
  const colors = { accepted: '#5cb800', declined: '#d4a017', error: '#e05555', processing: '#4a9eff' }

  return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800', letterSpacing: 1, marginBottom: 32 }}>NP TOURNAMENTS</div>
        <div style={{ background: '#080c12', border: `1px solid ${colors[status]}30`, borderRadius: 16, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{icons[status]}</div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: colors[status], marginBottom: 12 }}>
            {status === 'accepted' ? 'ASSIGNMENT ACCEPTED' :
             status === 'declined' ? 'ASSIGNMENT DECLINED' :
             status === 'error' ? 'SOMETHING WENT WRONG' : 'PROCESSING...'}
          </div>
          <div style={{ fontSize: 14, color: '#6b7a99', lineHeight: 1.7 }}>{message}</div>
        </div>
      </div>
    </div>
  )
}
