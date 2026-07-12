import { useRef, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

const inp = {
  background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0',
  borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
}
const sel = { ...inp, cursor: 'pointer' }

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQ = !inQ }
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else { cur += c }
  }
  result.push(cur.trim())
  return result
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim())
  const rows = lines.slice(1).map(line => {
    const vals = parseCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').replace(/^"|"$/g, '').trim()]))
  })
  return { headers, rows }
}

// Try to auto-detect which CSV column maps to which game field
function autoDetect(headers) {
  const find = (...terms) => headers.find(h => terms.some(t => h.toLowerCase().includes(t))) || ''
  return {
    col_date:       find('date', 'game_date', 'played'),
    col_home:       find('home', 'home_team', 'team1'),
    col_away:       find('away', 'visitor', 'opponent', 'team2'),
    col_home_score: find('home_score', 'hscore', 'score_home', 'h_score', 'home score'),
    col_away_score: find('away_score', 'ascore', 'score_away', 'a_score', 'away score', 'visitor score'),
    col_event:      find('event', 'tournament', 'location', 'source'),
    col_division:   find('division', 'div', 'bracket', 'age', 'grade'),
  }
}

const FIELD_LABELS = [
  ['col_date', 'Game Date *'],
  ['col_home', 'Home Team *'],
  ['col_away', 'Away Team *'],
  ['col_home_score', 'Home Score'],
  ['col_away_score', 'Away Score'],
  ['col_event', 'Event / Tournament'],
  ['col_division', 'Division'],
]

export default function GameImport() {
  const fileRef = useRef(null)
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null) // { inserted, skipped, errors }
  const [eventName, setEventName] = useState('')
  const [parseError, setParseError] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target.result
      setCsvText(text)
      doParse(text)
    }
    reader.readAsText(file)
  }

  function doParse(text) {
    setParseError(null)
    setResult(null)
    try {
      const { headers, rows } = parseCSV(text)
      if (!headers.length) { setParseError('Could not read headers. Make sure the first row has column names.'); return }
      setParsed({ headers, rows })
      setMapping(autoDetect(headers))
    } catch (err) {
      setParseError('Parse error: ' + err.message)
    }
  }

  async function handleImport() {
    if (!parsed || !mapping.col_date || !mapping.col_home || !mapping.col_away) return
    setImporting(true)
    setResult(null)

    const records = []
    const skipped = []

    for (const row of parsed.rows) {
      const rawDate = row[mapping.col_date]
      const homeTeam = row[mapping.col_home]?.trim()
      const awayTeam = row[mapping.col_away]?.trim()
      if (!rawDate || !homeTeam || !awayTeam) { skipped.push(row); continue }

      // Parse date — try common formats
      let gameDate = null
      const formats = [
        rawDate, // ISO
        rawDate.replace(/(\d+)\/(\d+)\/(\d{4})/, '$3-$1-$2'), // M/D/YYYY
        rawDate.replace(/(\d+)-(\d+)-(\d{2})$/, '20$3-$1-$2'), // M-D-YY
      ]
      for (const f of formats) {
        const d = new Date(f)
        if (!isNaN(d)) { gameDate = d.toISOString(); break }
      }
      if (!gameDate) { skipped.push(row); continue }

      const homeScore = mapping.col_home_score ? parseInt(row[mapping.col_home_score]) : null
      const awayScore = mapping.col_away_score ? parseInt(row[mapping.col_away_score]) : null
      const hasResult = !isNaN(homeScore) && !isNaN(awayScore)

      records.push({
        ranking_source: 'manual_import',
        event_id: eventName.trim() || row[mapping.col_event] || 'import',
        division_name: mapping.col_division ? row[mapping.col_division] || null : null,
        game_date: gameDate,
        home_team_name: homeTeam,
        away_team_name: awayTeam,
        home_team_id: `manual_${homeTeam.toLowerCase().replace(/\s+/g, '_')}`,
        away_team_id: `manual_${awayTeam.toLowerCase().replace(/\s+/g, '_')}`,
        score_home: hasResult ? homeScore : null,
        score_away: hasResult ? awayScore : null,
        has_result: hasResult,
        winner_team_name: hasResult && homeScore > awayScore ? homeTeam : hasResult && awayScore > homeScore ? awayTeam : null,
        raw_payload: row,
      })
    }

    // Batch insert in chunks of 200
    let inserted = 0
    const errors = []
    for (let i = 0; i < records.length; i += 200) {
      const chunk = records.slice(i, i + 200)
      const { data, error } = await supabase.from('bt_games').insert(chunk).select('id')
      if (error) errors.push(error.message)
      else inserted += data.length
    }

    setResult({ inserted, skipped: skipped.length, errors })
    setImporting(false)
  }

  const previewRows = parsed?.rows?.slice(0, 8) ?? []
  const canImport = parsed && mapping.col_date && mapping.col_home && mapping.col_away

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar
        title="IMPORT GAME HISTORY"
        actions={
          <div style={{ fontSize: 12, color: '#6b7a99' }}>
            Bulk-import historical game results from a spreadsheet
          </div>
        }
      />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        <div style={{ maxWidth: 900, display: 'grid', gap: 20 }}>

          {/* Step 1: Upload */}
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 4 }}>
              1 — Upload or Paste CSV
            </div>
            <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 16, lineHeight: 1.6 }}>
              Export from Google Sheets, Excel, or any tournament platform. The first row must be column headers.
              <br />
              Expected columns (flexible naming): <span style={{ color: '#8a9ab8' }}>Date, Home Team, Away Team, Home Score, Away Score, Event, Division</span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ background: '#0e1a08', color: '#5cb800', border: '1px solid #2a4010', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Upload CSV File
              </button>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />
              {csvText && (
                <button
                  onClick={() => { setCsvText(''); setParsed(null); setResult(null) }}
                  style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}
                >
                  Clear
                </button>
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Or paste CSV text
              </div>
              <textarea
                value={csvText}
                onChange={e => { setCsvText(e.target.value); doParse(e.target.value) }}
                placeholder={`Date,Home Team,Away Team,Home Score,Away Score,Event,Division\n2024-03-15,Delta Dubs Elite,Team Alpha,65,58,Spring Classic,17U Boys\n2024-03-15,Next Play 2026,Rivals AAU,72,60,Spring Classic,17U Boys`}
                rows={6}
                style={{ ...inp, width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>

            {parseError && (
              <div style={{ marginTop: 10, color: '#e05555', fontSize: 12 }}>{parseError}</div>
            )}
            {parsed && (
              <div style={{ marginTop: 10, color: '#5cb800', fontSize: 12 }}>
                ✓ Parsed {parsed.rows.length} rows with {parsed.headers.length} columns
              </div>
            )}
          </div>

          {/* Step 2: Column mapping */}
          {parsed && (
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 4 }}>
                2 — Map Columns
              </div>
              <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 16 }}>
                We auto-detected the mapping below. Adjust if needed.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {FIELD_LABELS.map(([key, label]) => (
                  <label key={key} style={{ display: 'grid', gap: 5 }}>
                    <span style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
                    <select
                      value={mapping[key] || ''}
                      onChange={e => setMapping(p => ({ ...p, [key]: e.target.value }))}
                      style={{ ...sel, width: '100%' }}
                    >
                      <option value="">(not mapped)</option>
                      {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
                  Event / Source Label (overrides CSV column)
                </div>
                <input
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  placeholder="e.g. Spring Classic 2024, AAU District Tournament"
                  style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {parsed && previewRows.length > 0 && mapping.col_home && (
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', fontSize: 13, fontWeight: 700, color: '#c0cce0' }}>
                3 — Preview (first {previewRows.length} of {parsed.rows.length} rows)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Date', 'Home', 'Away', 'Score', 'Event', 'Division'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', fontSize: 11, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => {
                      const hs = mapping.col_home_score ? row[mapping.col_home_score] : '—'
                      const as_ = mapping.col_away_score ? row[mapping.col_away_score] : '—'
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #0e1320' }}>
                          <td style={{ padding: '9px 14px', color: '#8a9ab8', fontSize: 12 }}>{mapping.col_date ? row[mapping.col_date] : '—'}</td>
                          <td style={{ padding: '9px 14px', color: '#c0cce0', fontSize: 12 }}>{mapping.col_home ? row[mapping.col_home] : '—'}</td>
                          <td style={{ padding: '9px 14px', color: '#c0cce0', fontSize: 12 }}>{mapping.col_away ? row[mapping.col_away] : '—'}</td>
                          <td style={{ padding: '9px 14px', color: '#5cb800', fontSize: 12, fontFamily: 'Anton, sans-serif' }}>
                            {hs !== '—' && as_ !== '—' ? `${hs}–${as_}` : '—'}
                          </td>
                          <td style={{ padding: '9px 14px', color: '#6b7a99', fontSize: 11 }}>{mapping.col_event ? row[mapping.col_event] : eventName || '—'}</td>
                          <td style={{ padding: '9px 14px', color: '#6b7a99', fontSize: 11 }}>{mapping.col_division ? row[mapping.col_division] : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4: Import */}
          {canImport && (
            <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c0cce0', marginBottom: 12 }}>
                4 — Import
              </div>

              {result ? (
                <div>
                  <div style={{ fontSize: 14, color: result.errors.length ? '#e05555' : '#5cb800', fontWeight: 700, marginBottom: 8 }}>
                    {result.errors.length ? '⚠ Import completed with errors' : '✓ Import complete'}
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                    <div><span style={{ fontSize: 22, fontFamily: 'Anton, sans-serif', color: '#5cb800' }}>{result.inserted}</span><span style={{ fontSize: 12, color: '#6b7a99', marginLeft: 6 }}>inserted</span></div>
                    <div><span style={{ fontSize: 22, fontFamily: 'Anton, sans-serif', color: '#d4a017' }}>{result.skipped}</span><span style={{ fontSize: 12, color: '#6b7a99', marginLeft: 6 }}>skipped (missing required fields)</span></div>
                  </div>
                  {result.errors.length > 0 && (
                    <div style={{ fontSize: 12, color: '#e05555' }}>{result.errors.join(', ')}</div>
                  )}
                  <div style={{ marginTop: 12, fontSize: 12, color: '#6b7a99', lineHeight: 1.6 }}>
                    Go to <strong style={{ color: '#c0cce0' }}>Games</strong> → <strong style={{ color: '#c0cce0' }}>Auto-Link Teams</strong> to match imported team names to master team records.
                  </div>
                  <button
                    onClick={() => { setParsed(null); setCsvText(''); setResult(null); setMapping({}) }}
                    style={{ marginTop: 14, background: '#0e1a08', color: '#5cb800', border: '1px solid #2a4010', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Import More
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    style={{ background: importing ? '#1a2030' : '#5cb800', color: importing ? '#4a5568' : '#04060a', border: 'none', padding: '11px 24px', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {importing ? `Importing ${parsed.rows.length} games…` : `Import ${parsed.rows.length} Games →`}
                  </button>
                  <div style={{ fontSize: 12, color: '#4a5568' }}>
                    Will insert as <code style={{ color: '#8a9ab8' }}>ranking_source = 'manual_import'</code>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
