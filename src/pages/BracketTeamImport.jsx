import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

// ── Bookmarklet script the director pastes into BracketTeam ──────────────────
const BOOKMARKLET_CODE = `javascript:(function(){const SUPABASE_URL="https://qlmdtplswyylpxaabvqa.supabase.co";const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbWR0cGxzd3l5bHB4YWFidnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjAwNzksImV4cCI6MjA5MDg5NjA3OX0.rr16fNele1WMYRnrZmdLC445mBwGllesfxZ1bZvxSgA";function showBadge(msg,ok){const b=document.createElement("div");b.style.cssText="position:fixed;top:16px;right:16px;z-index:99999;background:"+(ok?"#1a3a0a":"#3a0a0a")+";color:"+(ok?"#5cb800":"#e05555")+";border:1px solid "+(ok?"#2a6010":"#6a1010")+";padding:12px 18px;border-radius:10px;font-family:monospace;font-size:13px;font-weight:700;box-shadow:0 4px 20px rgba(0,0,0,0.5)";b.textContent=msg;document.body.appendChild(b);setTimeout(()=>b.remove(),4000)}const origOpen=XMLHttpRequest.prototype.open;const origSend=XMLHttpRequest.prototype.send;async function saveRaw(url,rawText){try{const eventId=(location.pathname.match(/\/event\/(\d+)\//)||[])[1]||null;const fullUrl=new URL(url,location.origin);const divisionId=fullUrl.searchParams.get("division_id");let payload;try{payload=JSON.parse(rawText)}catch{payload={raw_text:rawText}}const matchCount=(payload?.content?.matches||[]).length;const res=await fetch(SUPABASE_URL+"/rest/v1/bt_raw_imports",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY,"Prefer":"return=representation"},body:JSON.stringify({source:"bracketteam",import_type:"division_schedule",event_id:eventId,division_id:divisionId,event_url:location.href,payload})});if(!res.ok){const txt=await res.text();showBadge("✗ Save failed: "+txt,false);return}showBadge("✓ Captured "+matchCount+" games — go to NP Import page to process",true)}catch(err){showBadge("✗ Error: "+err.message,false)}}XMLHttpRequest.prototype.open=function(method,url){this._url=url;return origOpen.apply(this,arguments)};XMLHttpRequest.prototype.send=function(body){this.addEventListener("readystatechange",function(){try{if(this.readyState===4&&this._url&&this._url.includes("get-division-schedule")){const rawText=this.responseText||"";if(rawText.length>0)saveRaw(this._url,rawText)}}catch(err){console.error("[BT]",err)}});return origSend.apply(this,arguments)};console.log("[NP] BracketTeam capture active");showBadge("⚡ NP Capture active — navigate to a division schedule",true)})();`

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function BracketTeamImport({ director }) {
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null) // id being processed
  const [processAll, setProcessAll] = useState(false)
  const [results, setResults] = useState({}) // id → {games, teams, error}
  const [filter, setFilter] = useState('pending') // 'pending' | 'all'
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadImports() }, [filter])

  async function loadImports() {
    setLoading(true)
    let q = supabase
      .from('bt_raw_imports')
      .select('id, source, event_id, division_id, event_url, payload, created_at, processed_at, processed_games_count, processed_teams_count')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter === 'pending') q = q.is('processed_at', null)

    const { data } = await q
    setImports(data || [])
    setLoading(false)
  }

  async function processImport(raw) {
    setProcessing(raw.id)
    try {
      const content = raw.payload?.content
      if (!content) throw new Error('No content in payload')

      const matches = content.matches || []
      const divTeams = content.division_teams || []
      const divisionName = content.division?.division_name || ''

      // ── Upsert teams ────────────────────────────────────────────────────────
      let teamsUpserted = 0
      if (divTeams.length > 0) {
        const teamRows = divTeams.map(t => ({
          master_team_key: `bt_${t.id}`,
          display_name: t.name,
          ranking_division_key: `bt_${raw.division_id}`,
        }))
        const { error: tErr } = await supabase
          .from('bt_master_teams')
          .upsert(teamRows, { onConflict: 'master_team_key', ignoreDuplicates: false })
        if (tErr) throw new Error('Teams upsert: ' + tErr.message)
        teamsUpserted = teamRows.length
      }

      // ── Upsert games ────────────────────────────────────────────────────────
      const gameRows = matches.map(m => {
        const homeWins = m.has_result && m.score_home_team > m.score_away_team
        const awayWins = m.has_result && m.score_away_team > m.score_home_team
        return {
          game_id: String(m.id),
          raw_import_id: raw.id,
          ranking_source: 'bracketteam',
          event_id: String(m.tournament_id),
          division_id: String(m.division_id),
          division_name: divisionName,
          game_date: m.formatted_start_date || m.start_date_time || null,
          home_team_id: String(m.home_team_id),
          home_team_name: m.home_team?.name || null,
          away_team_id: String(m.away_team_id),
          away_team_name: m.away_team?.name || null,
          score_home: m.has_result ? m.score_home_team : null,
          score_away: m.has_result ? m.score_away_team : null,
          winner_team_id: homeWins ? String(m.home_team_id) : awayWins ? String(m.away_team_id) : null,
          winner_team_name: homeWins ? m.home_team?.name : awayWins ? m.away_team?.name : null,
          has_result: m.has_result ?? false,
          raw_payload: m,
        }
      })

      let gamesUpserted = 0
      if (gameRows.length > 0) {
        const { error: gErr } = await supabase
          .from('bt_games')
          .upsert(gameRows, { onConflict: 'game_id', ignoreDuplicates: false })
        if (gErr) throw new Error('Games upsert: ' + gErr.message)
        gamesUpserted = gameRows.length
      }

      // ── Mark processed ───────────────────────────────────────────────────────
      await supabase.from('bt_raw_imports').update({
        processed_at: new Date().toISOString(),
        processed_games_count: gamesUpserted,
        processed_teams_count: teamsUpserted,
      }).eq('id', raw.id)

      setResults(prev => ({ ...prev, [raw.id]: { games: gamesUpserted, teams: teamsUpserted } }))
      setImports(prev => prev.map(r => r.id === raw.id
        ? { ...r, processed_at: new Date().toISOString(), processed_games_count: gamesUpserted, processed_teams_count: teamsUpserted }
        : r
      ))
    } catch (err) {
      setResults(prev => ({ ...prev, [raw.id]: { error: err.message } }))
    }
    setProcessing(null)
  }

  async function handleProcessAll() {
    setProcessAll(true)
    const pending = imports.filter(r => !r.processed_at)
    for (const raw of pending) {
      await processImport(raw)
    }
    setProcessAll(false)
  }

  function copyBookmarklet() {
    navigator.clipboard.writeText(BOOKMARKLET_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pending = imports.filter(r => !r.processed_at)
  const matchCount = (raw) => raw.payload?.content?.matches?.length ?? '—'
  const teamCount = (raw) => raw.payload?.content?.division_teams?.length ?? '—'
  const divName = (raw) => raw.payload?.content?.division?.division_name || raw.division_id || '—'
  const eventName = (raw) => raw.payload?.content?.division?.tournament_name || `Event ${raw.event_id}`

  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }
  const td = { padding: '12px 14px', borderBottom: '1px solid #0e1320', fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="BRACKETTEAM IMPORT" actions={
        pending.length > 1 && (
          <button
            onClick={handleProcessAll}
            disabled={processAll}
            style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {processAll ? 'Processing…' : `Process All (${pending.length})`}
          </button>
        )
      } />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

        {/* Setup instructions */}
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: '#d4a017', fontWeight: 700, marginBottom: 10 }}>HOW TO CAPTURE FROM BRACKETTEAM</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              '1. Go to the BracketTeam event page in your browser',
              '2. Open the browser console (F12 → Console tab)',
              '3. Paste the capture script and press Enter',
              '4. Navigate to each division schedule tab — data auto-saves here',
              '5. Come back and click Process to write games into the database',
            ].map(s => (
              <div key={s} style={{ fontSize: 13, color: '#8a9ab8', display: 'flex', gap: 10 }}>
                <span style={{ color: '#5cb800', flexShrink: 0 }}>→</span>
                {s}
              </div>
            ))}
          </div>
          <button
            onClick={copyBookmarklet}
            style={{ marginTop: 14, background: copied ? '#0d1a0a' : '#1a2030', color: copied ? '#5cb800' : '#c0cce0', border: `1px solid ${copied ? '#1a3a0a' : '#2a3040'}`, padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {copied ? '✓ Copied to clipboard' : '📋 Copy Capture Script'}
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['pending', `Pending (${pending.length})`], ['all', 'All Imports']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: filter === id ? '#5cb800' : 'transparent',
              color: filter === id ? '#04060a' : '#6b7a99',
              border: `1px solid ${filter === id ? '#5cb800' : '#1a2030'}`,
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading…</div>
        ) : imports.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#4a5568' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏀</div>
            <div style={{ color: '#c0cce0', fontWeight: 600, marginBottom: 8 }}>
              {filter === 'pending' ? 'No pending imports' : 'No imports yet'}
            </div>
            <div style={{ fontSize: 13 }}>
              {filter === 'pending' ? 'All captured data has been processed.' : 'Capture a BracketTeam event to get started.'}
            </div>
          </div>
        ) : (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0a0f1a' }}>
                  {['Event', 'Division', 'Games', 'Teams', 'Captured', 'Status', ''].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {imports.map(raw => {
                  const res = results[raw.id]
                  const isProcessing = processing === raw.id
                  const isDone = !!raw.processed_at

                  return (
                    <tr key={raw.id}>
                      <td style={{ ...td, color: '#d8e0f0', fontWeight: 600 }}>
                        <div>{eventName(raw)}</div>
                        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>Event #{raw.event_id}</div>
                      </td>
                      <td style={{ ...td, color: '#c0cce0' }}>{divName(raw)}</td>
                      <td style={{ ...td, color: '#8a9ab8', textAlign: 'center' }}>
                        {isDone ? raw.processed_games_count : matchCount(raw)}
                      </td>
                      <td style={{ ...td, color: '#8a9ab8', textAlign: 'center' }}>
                        {isDone ? raw.processed_teams_count : teamCount(raw)}
                      </td>
                      <td style={{ ...td, color: '#6b7a99', fontSize: 12 }}>{fmtDate(raw.created_at)}</td>
                      <td style={td}>
                        {res?.error ? (
                          <span style={{ color: '#e05555', fontSize: 12 }}>✗ {res.error}</span>
                        ) : res ? (
                          <span style={{ color: '#5cb800', fontSize: 12 }}>✓ {res.games} games, {res.teams} teams</span>
                        ) : isDone ? (
                          <span style={{ color: '#5cb800', fontSize: 12 }}>✓ Processed {fmtDate(raw.processed_at)}</span>
                        ) : (
                          <span style={{ color: '#d4a017', fontSize: 12 }}>⏳ Pending</span>
                        )}
                      </td>
                      <td style={td}>
                        {!isDone && (
                          <button
                            onClick={() => processImport(raw)}
                            disabled={isProcessing || processAll}
                            style={{ background: isProcessing ? '#1a2030' : '#0d1a0a', color: isProcessing ? '#4a5568' : '#5cb800', border: `1px solid ${isProcessing ? '#1a2030' : '#1a3a0a'}`, padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: isProcessing ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {isProcessing ? 'Processing…' : 'Process →'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
