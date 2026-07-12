import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Topbar from '../components/layout/Topbar'

const FILTERS = ['pending', 'verified', 'rejected', 'all']

function StatusBadge({ status }) {
  const map = {
    pending:    { bg: '#2a1a00', color: '#d4a017', border: '#4a3000' },
    verified:   { bg: '#0d1a0a', color: '#5cb800', border: '#2a4010' },
    rejected:   { bg: '#2a0a0a', color: '#e05555', border: '#4a1010' },
    parsing:    { bg: '#0a1020', color: '#4a9eff', border: '#1a2040' },
    unverified: { bg: '#0e1320', color: '#6b7a99', border: '#1a2030' },
  }
  const s = map[status] ?? map.unverified
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
      padding: '3px 10px', borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  )
}

function ConfidenceDot({ score }) {
  const color = score >= 0.85 ? '#5cb800' : score >= 0.6 ? '#d4a017' : '#e05555'
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 5, flexShrink: 0 }} />
  )
}

export default function Verification() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [viewingDoc, setViewingDoc] = useState(null) // { url, isPDF }
  const [reviewing, setReviewing] = useState(null)
  const [rejectModal, setRejectModal] = useState(null) // player
  const [rejectNote, setRejectNote] = useState('')

  const loadPlayers = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('players')
      .select(`
        id, first_name, last_name, jersey_number, position, grad_year, gender,
        np_team_name, verification_status, verification_doc_url, verification_doc_type,
        verified_name, verified_dob, verified_grade, verified_gender,
        ai_confidence, verification_notes, verification_reviewed_at
      `)
      .not('verification_doc_url', 'is', null)
      .order('verification_reviewed_at', { ascending: true, nullsFirst: true })

    if (filter !== 'all') {
      query = query.eq('verification_status', filter)
    }

    const { data } = await query
    setPlayers(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { loadPlayers() }, [loadPlayers])

  async function handleViewDoc(player) {
    const { data } = await supabase.storage
      .from('verification-docs')
      .createSignedUrl(player.verification_doc_url, 300)
    if (data?.signedUrl) {
      const isPDF = player.verification_doc_type === 'pdf' ||
        player.verification_doc_url?.toLowerCase().endsWith('.pdf')
      setViewingDoc({ url: data.signedUrl, isPDF })
    }
  }

  async function handleApprove(player) {
    setReviewing(player.id)
    await supabase.from('players').update({
      verification_status: 'verified',
      verification_reviewed_at: new Date().toISOString(),
    }).eq('id', player.id)
    setReviewing(null)
    loadPlayers()
  }

  async function handleReject(player) {
    setRejectModal(player)
    setRejectNote('')
  }

  async function confirmReject() {
    if (!rejectModal) return
    setReviewing(rejectModal.id)
    await supabase.from('players').update({
      verification_status: 'rejected',
      verification_notes: rejectNote.trim() || null,
      verification_reviewed_at: new Date().toISOString(),
    }).eq('id', rejectModal.id)
    setRejectModal(null)
    setRejectNote('')
    setReviewing(null)
    loadPlayers()
  }

  const pendingCount = players.filter(p => p.verification_status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="AGE VERIFICATION"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? '#0d1a0a' : 'transparent',
                  color: filter === f ? '#5cb800' : '#6b7a99',
                  border: `1px solid ${filter === f ? '#2a4010' : '#1a2030'}`,
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {f}{f === 'pending' && pendingCount > 0 && filter !== 'pending' ? ` (${pendingCount})` : ''}
              </button>
            ))}
            <button
              onClick={loadPlayers}
              style={{ background: 'transparent', border: '1px solid #1a2030', color: '#d8e0f0', padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: 48 }}>Loading…</div>
        ) : players.length === 0 ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: 48, fontSize: 13 }}>
            No {filter === 'all' ? '' : filter} submissions.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {players.map(p => {
              const conf = p.ai_confidence || {}
              const borderColor =
                p.verification_status === 'verified' ? '#1a3a0a' :
                p.verification_status === 'rejected' ? '#3a0a0a' :
                p.verification_status === 'pending'  ? '#3a2800' : '#1a2030'

              return (
                <div
                  key={p.id}
                  style={{ background: '#080c12', border: `1px solid ${borderColor}`, borderRadius: 12, padding: '18px 20px' }}
                >
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {/* Player info */}
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Player</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>
                        {p.first_name} {p.last_name}
                        {p.jersey_number != null && <span style={{ marginLeft: 8, color: '#5cb800', fontFamily: 'Anton, sans-serif' }}>#{p.jersey_number}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7a99', marginTop: 3 }}>
                        {[p.np_team_name, p.position, p.grad_year ? `'${String(p.grad_year).slice(-2)}` : null, p.gender === 'M' ? 'Boys' : p.gender === 'F' ? 'Girls' : null].filter(Boolean).join(' · ')}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <StatusBadge status={p.verification_status} />
                      </div>
                      {p.verification_reviewed_at && (
                        <div style={{ marginTop: 5, fontSize: 10, color: '#4a5568' }}>
                          Reviewed {new Date(p.verification_reviewed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, background: '#1a2030', alignSelf: 'stretch', minHeight: 60 }} />

                    {/* AI extracted data */}
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        AI Extracted
                        {p.verification_doc_type && (
                          <span style={{ marginLeft: 8, color: '#4a9eff', fontSize: 10 }}>
                            ({p.verification_doc_type})
                          </span>
                        )}
                      </div>
                      {p.verified_name || p.verified_dob || p.verified_grade ? (
                        <div style={{ display: 'grid', gap: 5 }}>
                          {p.verified_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <ConfidenceDot score={conf.name ?? 0} />
                              <span style={{ color: '#6b7a99', fontSize: 11, width: 48, flexShrink: 0 }}>Name</span>
                              <span style={{ color: '#c0cce0' }}>{p.verified_name}</span>
                            </div>
                          )}
                          {p.verified_dob && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <ConfidenceDot score={conf.dob ?? 0} />
                              <span style={{ color: '#6b7a99', fontSize: 11, width: 48, flexShrink: 0 }}>DOB</span>
                              <span style={{ color: '#c0cce0' }}>{p.verified_dob}</span>
                            </div>
                          )}
                          {p.verified_grade && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <ConfidenceDot score={conf.grade ?? 0} />
                              <span style={{ color: '#6b7a99', fontSize: 11, width: 48, flexShrink: 0 }}>Grade</span>
                              <span style={{ color: '#c0cce0' }}>{p.verified_grade}</span>
                            </div>
                          )}
                          {p.verified_gender && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <ConfidenceDot score={conf.gender ?? 0} />
                              <span style={{ color: '#6b7a99', fontSize: 11, width: 48, flexShrink: 0 }}>Gender</span>
                              <span style={{ color: '#c0cce0' }}>{p.verified_gender === 'M' ? 'Male' : p.verified_gender === 'F' ? 'Female' : p.verified_gender}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: '#4a5568', fontSize: 12 }}>
                          {p.verification_status === 'parsing' ? 'AI is processing document…' : 'No data extracted'}
                        </div>
                      )}
                      {p.verification_notes && (
                        <div style={{ marginTop: 8, padding: '6px 10px', background: '#1a0a0a', border: '1px solid #3a1010', borderRadius: 6, fontSize: 12, color: '#e05555', fontStyle: 'italic' }}>
                          {p.verification_notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                      {p.verification_doc_url && (
                        <button
                          onClick={() => handleViewDoc(p)}
                          style={{ background: '#0e1320', border: '1px solid #1a2030', color: '#8a9ab8', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          View Document
                        </button>
                      )}
                      {p.verification_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(p)}
                            disabled={reviewing === p.id}
                            style={{ background: '#0d1a0a', border: '1px solid #2a4010', color: '#5cb800', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', minWidth: 110 }}
                          >
                            {reviewing === p.id ? '…' : '✓ Verify Player'}
                          </button>
                          <button
                            onClick={() => handleReject(p)}
                            disabled={reviewing === p.id}
                            style={{ background: 'transparent', border: '1px solid #3a1010', color: '#e05555', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', minWidth: 110 }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Document viewer */}
      {viewingDoc && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setViewingDoc(null)}
        >
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewingDoc(null)}
              style={{ position: 'absolute', top: -40, right: 0, background: 'transparent', border: '1px solid #1a2030', color: '#6b7a99', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              Close ×
            </button>
            {viewingDoc.isPDF ? (
              <iframe
                src={viewingDoc.url}
                style={{ width: '80vw', height: '85vh', border: 'none', borderRadius: 12 }}
                title="Verification document"
              />
            ) : (
              <img
                src={viewingDoc.url}
                alt="Verification document"
                style={{ maxWidth: '85vw', maxHeight: '88vh', borderRadius: 12, display: 'block' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #3a0a0a', borderRadius: 14, padding: 28, width: 420 }}>
            <h3 style={{ margin: '0 0 6px', color: '#e05555' }}>Reject Verification</h3>
            <p style={{ color: '#6b7a99', fontSize: 13, margin: '0 0 16px' }}>
              {rejectModal.first_name} {rejectModal.last_name}
            </p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Reason for rejection (optional — coach will see this)"
              rows={3}
              style={{ width: '100%', background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => { setRejectModal(null); setRejectNote('') }}
                style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
