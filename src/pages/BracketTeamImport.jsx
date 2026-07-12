import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

// ── Capture script injected into BracketTeam browser console ─────────────────
// Shows a live review panel on the BracketTeam page.
// User reviews games per division, then clicks Upload.
// Only after Upload does data land in bt_raw_imports for processing here.
const CAPTURE_SCRIPT = `(function(){
  var SUPABASE_URL="https://qlmdtplswyylpxaabvqa.supabase.co";
  var SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbWR0cGxzd3l5bHB4YWFidnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjAwNzksImV4cCI6MjA5MDg5NjA3OX0.rr16fNele1WMYRnrZmdLC445mBwGllesfxZ1bZvxSgA";

  var NP = window.__NP__ = window.__NP__ || { captures:[], panel:null };

  function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function render(){
    if(!NP.panel) return;
    var pending = NP.captures.filter(function(c){return !c.uploaded;});
    var totalGames = pending.reduce(function(s,c){return s+c.matches.length;},0);
    var html = '<div style="padding:14px 18px;border-bottom:1px solid #1a2030;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
      +'<div style="font-size:15px;font-weight:700;color:#5cb800;letter-spacing:1px">⚡ NP CAPTURE</div>'
      +'<div style="display:flex;gap:8px;align-items:center">'
      +(pending.length>1?'<button data-a="all" style="background:#5cb800;color:#04060a;border:none;padding:7px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">Upload All ('+totalGames+' games)</button>':'')
      +'<button data-a="close" style="background:none;border:none;color:#6b7a99;font-size:22px;cursor:pointer;padding:0;line-height:1">&times;</button>'
      +'</div></div>'
      +'<div style="overflow-y:auto;flex:1">';
    if(NP.captures.length===0){
      html+='<div style="padding:28px;text-align:center;color:#6b7a99;font-size:13px">Navigate to a division schedule tab to capture games&hellip;</div>';
    } else {
      NP.captures.forEach(function(cap,i){
        var withScores=cap.matches.filter(function(m){return m.has_result;}).length;
        html+='<div style="padding:16px 18px;border-bottom:1px solid #0e1320">'
          +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">'
          +'<div><div style="font-size:13px;font-weight:700;color:#f0f4ff">'+esc(cap.divisionName)+'</div>'
          +'<div style="font-size:11px;color:#6b7a99;margin-top:2px">'+cap.matches.length+' games &middot; '+withScores+' with scores &middot; '+cap.teams.length+' teams</div></div>'
          +(cap.uploaded
            ?'<span style="font-size:11px;color:#5cb800;font-weight:700;background:#0d1a0a;padding:4px 10px;border-radius:20px;border:1px solid #1a3a0a">&check; Saved</span>'
            :cap.uploading
              ?'<span style="font-size:11px;color:#d4a017">Saving&hellip;</span>'
              :'<button data-a="upload" data-i="'+i+'" style="background:#0d1a0a;color:#5cb800;border:1px solid #1a3a0a;padding:6px 16px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">Upload '+cap.matches.length+' &rarr;</button>'
          )
          +'</div>'
          +'<div style="background:#04060a;border:1px solid #0e1320;border-radius:8px;overflow:hidden;max-height:180px;overflow-y:auto">';
        cap.matches.forEach(function(m){
          html+='<div style="padding:7px 12px;border-bottom:1px solid #080c12;display:flex;justify-content:space-between;align-items:center">'
            +'<div style="font-size:12px;color:#c0cce0">'+esc(m.home_team&&m.home_team.name||"?")+' <span style="color:#2d3748">vs</span> '+esc(m.away_team&&m.away_team.name||"?")+'</div>'
            +'<div style="font-size:12px;font-weight:700;color:'+(m.has_result?"#5cb800":"#2d3748")+';flex-shrink:0;margin-left:12px">'+(m.has_result?m.score_home_team+" – "+m.score_away_team:"–")+'</div>'
            +'</div>';
        });
        html+='</div></div>';
      });
    }
    html+='</div>';
    NP.panel.innerHTML=html;
    NP.panel.removeEventListener("click",NP._handler);
    NP._handler=function(e){
      var btn=e.target.closest("[data-a]"); if(!btn) return;
      var a=btn.getAttribute("data-a");
      if(a==="close"){NP.panel.remove();NP.panel=null;return;}
      if(a==="upload"){uploadOne(parseInt(btn.getAttribute("data-i")));return;}
      if(a==="all"){uploadAll();return;}
    };
    NP.panel.addEventListener("click",NP._handler);
  }

  function ensurePanel(){
    if(NP.panel&&document.contains(NP.panel)) return;
    NP.panel=document.createElement("div");
    NP.panel.style.cssText="position:fixed;top:16px;right:16px;z-index:2147483647;background:#080c12;border:1px solid #1a2030;border-radius:14px;width:440px;max-height:85vh;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.85)";
    document.body.appendChild(NP.panel);
    render();
  }

  async function uploadOne(i){
    var cap=NP.captures[i];
    if(!cap||cap.uploading||cap.uploaded) return;
    cap.uploading=true; render();
    try{
      var res=await fetch(SUPABASE_URL+"/rest/v1/bt_raw_imports",{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY,"Prefer":"return=representation"},
        body:JSON.stringify({source:"bracketteam",import_type:"division_schedule",event_id:cap.eventId,division_id:cap.divisionId,event_url:cap.eventUrl,payload:cap.payload})
      });
      if(!res.ok){var t=await res.text();throw new Error(t.slice(0,120));}
      cap.uploaded=true;cap.uploading=false;
    }catch(err){cap.uploading=false;cap.error=err.message;alert("Upload failed: "+err.message);}
    render();
  }

  async function uploadAll(){
    for(var i=0;i<NP.captures.length;i++){
      if(!NP.captures[i].uploaded&&!NP.captures[i].uploading) await uploadOne(i);
    }
  }

  var origOpen=XMLHttpRequest.prototype.open;
  var origSend=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(m,u){this._np_url=u;return origOpen.apply(this,arguments);};
  XMLHttpRequest.prototype.send=function(b){
    this.addEventListener("readystatechange",function(){
      try{
        if(this.readyState!==4||!this._np_url||!this._np_url.includes("get-division-schedule")) return;
        var raw=this.responseText||""; if(!raw.length) return;
        var payload; try{payload=JSON.parse(raw);}catch(e){return;}
        var content=payload&&payload.content; if(!content) return;
        var eventId=(location.pathname.match(/\\/event\\/(\\d+)\\//)||[])[1]||null;
        var fullUrl=new URL(this._np_url,location.origin);
        var divisionId=fullUrl.searchParams.get("division_id");
        var divisionName=(content.division&&content.division.division_name)||("Division "+divisionId);
        var matches=content.matches||[];
        var teams=content.division_teams||[];
        var idx=NP.captures.findIndex(function(c){return c.divisionId===divisionId;});
        var cap={divisionName:divisionName,matches:matches,teams:teams,eventId:eventId,divisionId:divisionId,eventUrl:location.href,payload:payload,uploaded:false,uploading:false};
        if(idx>=0){if(!NP.captures[idx].uploaded){NP.captures[idx]=cap;}}
        else{NP.captures.push(cap);}
        ensurePanel(); render();
      }catch(err){console.error("[NP]",err);}
    });
    return origSend.apply(this,arguments);
  };

  ensurePanel();
  console.log("[NP] BracketTeam capture ready — navigate to a division tab");
})();`

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const STEPS = [
  {
    num: '01',
    title: 'Open BracketTeam in your browser',
    detail: 'Navigate to the event page (bracketteam.net). Make sure you can see the division tabs with the game schedules.',
  },
  {
    num: '02',
    title: 'Open the browser Developer Console',
    detail: 'Windows/Linux: press F12, then click the Console tab. Mac: press Cmd + Option + J. You\'ll see a prompt where you can type or paste code.',
  },
  {
    num: '03',
    title: 'Copy and paste the capture script',
    detail: 'Click "Copy Capture Script" below, then paste it into the console and press Enter. A dark panel will appear in the top-right of the BracketTeam page.',
  },
  {
    num: '04',
    title: 'Click through each division tab',
    detail: 'As you click each division, its games automatically appear in the NP panel. You\'ll see team names, scores (if final), and game count.',
  },
  {
    num: '05',
    title: 'Review and upload division by division',
    detail: 'Each division shows its full game list. Click "Upload X →" to save that division, or "Upload All" to save everything at once.',
  },
  {
    num: '06',
    title: 'Come back here and click Process',
    detail: 'Saved imports appear in the Pending tab below. Click Process to write the games into bt_games and any new teams into bt_master_teams.',
  },
]

export default function BracketTeamImport({ director }) {
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [processAll, setProcessAll] = useState(false)
  const [results, setResults] = useState({})
  const [filter, setFilter] = useState('pending')
  const [copied, setCopied] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

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

      // Upsert teams
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
        if (tErr) throw new Error('Teams: ' + tErr.message)
        teamsUpserted = teamRows.length
      }

      // Upsert games
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
        if (gErr) throw new Error('Games: ' + gErr.message)
        gamesUpserted = gameRows.length
      }

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
    for (const raw of imports.filter(r => !r.processed_at)) {
      await processImport(raw)
    }
    setProcessAll(false)
  }

  function copyScript() {
    navigator.clipboard.writeText(CAPTURE_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const pending = imports.filter(r => !r.processed_at)
  const matchCount = (raw) => raw.payload?.content?.matches?.length ?? '—'
  const teamCount = (raw) => raw.payload?.content?.division_teams?.length ?? '—'
  const divName = (raw) => raw.payload?.content?.division?.division_name || `Division ${raw.division_id}`
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
            {processAll ? 'Processing…' : `Process All Pending (${pending.length})`}
          </button>
        )
      } />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>

        {/* Instructions card */}
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
          <button
            onClick={() => setShowInstructions(v => !v)}
            style={{ width: '100%', background: 'none', border: 'none', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff' }}>How to Import from BracketTeam</div>
                <div style={{ fontSize: 11, color: '#6b7a99', marginTop: 2 }}>Step-by-step guide · takes about 2 minutes</div>
              </div>
            </div>
            <span style={{ color: '#4a5568', fontSize: 18 }}>{showInstructions ? '▲' : '▼'}</span>
          </button>

          {showInstructions && (
            <div style={{ borderTop: '1px solid #1a2030', padding: '20px 20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {STEPS.map((step, i) => (
                  <div key={step.num} style={{ display: 'flex', gap: 16, paddingBottom: i < STEPS.length - 1 ? 20 : 0, position: 'relative' }}>
                    {/* Step line */}
                    {i < STEPS.length - 1 && (
                      <div style={{ position: 'absolute', left: 19, top: 36, bottom: 0, width: 2, background: '#1a2030' }} />
                    )}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0d1a0a', border: '1px solid #1a3a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#5cb800', fontFamily: 'Anton, sans-serif' }}>{step.num}</span>
                    </div>
                    <div style={{ paddingTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#d8e0f0', marginBottom: 4 }}>{step.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7a99', lineHeight: 1.6 }}>{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Script copy area */}
              <div style={{ marginTop: 24, background: '#04060a', border: '1px solid #1a2030', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: '#0a0f1a', borderBottom: '1px solid #1a2030', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1 }}>Capture Script — paste into browser console</span>
                  <button
                    onClick={copyScript}
                    style={{ background: copied ? '#0d1a0a' : '#1a2030', color: copied ? '#5cb800' : '#c0cce0', border: `1px solid ${copied ? '#1a3a0a' : '#2a3040'}`, padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Script'}
                  </button>
                </div>
                <div style={{ padding: '12px 16px', maxHeight: 100, overflow: 'hidden', position: 'relative' }}>
                  <pre style={{ margin: 0, fontSize: 11, color: '#4a5568', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>
                    {CAPTURE_SCRIPT.slice(0, 200)}…
                  </pre>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, #04060a)' }} />
                </div>
              </div>

              <div style={{ marginTop: 14, padding: '12px 16px', background: '#071525', border: '1px solid #0a2540', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#4a9eff', lineHeight: 1.6 }}>
                  💡 <strong>What happens on BracketTeam:</strong> A dark panel appears in the top-right. Each division tab you click adds a game list to the panel. Review the games, then click <strong>Upload</strong> per division. Nothing saves here until you click Upload there.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter tabs + table */}
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
              {filter === 'pending' ? 'All captured data has been processed.' : 'Run the capture script on BracketTeam to get started.'}
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
                          <span style={{ color: '#5cb800', fontSize: 12 }}>✓ Done {fmtDate(raw.processed_at)}</span>
                        ) : (
                          <span style={{ color: '#d4a017', fontSize: 12 }}>⏳ Ready to process</span>
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
