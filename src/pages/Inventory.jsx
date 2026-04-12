import { useEffect, useState, useMemo } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../supabaseClient'

const CATEGORIES = ['food', 'beverage', 'merchandise', 'equipment', 'other']

function StatCard({ label, value, accent = '#f0f4ff', sub }) {
  return (
    <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4a5568', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 34, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

const emptyForm = {
  item_name: '', category: 'food', notes: '',
  tournament_id: '',
  // Pack info
  pack_size: 1,        // units per pack (e.g. 12 hotdogs per pack)
  pack_cost: '',       // cost per pack (e.g. $10)
  packs_bought: '',    // how many packs bought
  // Sell info
  sell_price: '',      // sell price per unit
  units_sold: '',      // units sold individually
}

export default function Inventory({ director }) {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!director?.id) return
    supabase.from('tournaments').select('id, name')
      .eq('director_id', director.id)
      .order('start_date', { ascending: false })
      .then(({ data }) => setTournaments(data || []))
    loadItems(director.id)
  }, [director?.id])

  async function loadItems(dirId) {
    setLoading(true)
    const { data } = await supabase
      .from('tournament_inventory')
      .select('*, tournaments(name)')
      .eq('director_id', dirId || director?.id)
      .order('category')
      .order('item_name')
    setItems(data || [])
    setLoading(false)
  }

  const filtered = selectedTournament === 'all'
    ? items
    : items.filter(i => i.tournament_id === selectedTournament)

  // Calculate stats using pack model
  const stats = useMemo(() => {
    let totalCost = 0, totalRevenue = 0, totalUnitsSold = 0, totalUnitsAvailable = 0
    filtered.forEach(i => {
      const packCost = parseFloat(i.pack_cost) || 0
      const packsBought = parseInt(i.packs_bought) || 0
      const packSize = parseInt(i.pack_size) || 1
      const sellPrice = parseFloat(i.sell_price) || 0
      const unitsSold = parseInt(i.units_sold) || 0
      totalCost += packCost * packsBought
      totalRevenue += sellPrice * unitsSold
      totalUnitsSold += unitsSold
      totalUnitsAvailable += packsBought * packSize
    })
    return { totalCost, totalRevenue, profit: totalRevenue - totalCost, totalUnitsSold, totalUnitsAvailable }
  }, [filtered])

  const byCategory = useMemo(() => {
    const map = {}
    filtered.forEach(i => {
      if (!map[i.category]) map[i.category] = []
      map[i.category].push(i)
    })
    return map
  }, [filtered])

  function resetForm() { setForm(emptyForm) }

  async function handleSave() {
    if (!form.item_name.trim()) return
    setSaving(true)
    const payload = {
      director_id: director.id,
      tournament_id: form.tournament_id || null,
      item_name: form.item_name.trim(),
      category: form.category,
      pack_size: parseInt(form.pack_size) || 1,
      pack_cost: parseFloat(form.pack_cost) || 0,
      packs_bought: parseInt(form.packs_bought) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      units_sold: parseInt(form.units_sold) || 0,
      notes: form.notes.trim() || null,
    }
    if (editItem) {
      await supabase.from('tournament_inventory').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('tournament_inventory').insert(payload)
    }
    setSaving(false)
    setShowAdd(false)
    setEditItem(null)
    resetForm()
    loadItems(director.id)
  }

  async function handleDelete(id) {
    await supabase.from('tournament_inventory').delete().eq('id', id)
    loadItems(director.id)
  }

  async function updateField(id, field, value) {
    await supabase.from('tournament_inventory').update({ [field]: field.includes('price') || field.includes('cost') ? parseFloat(value) || 0 : parseInt(value) || 0 }).eq('id', id)
    loadItems(director.id)
  }

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
  const inp = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', width: '100%' }
  const lbl = { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }
  const smallInp = { ...inp, padding: '5px 8px', fontSize: 12, width: 75 }

  // Live preview for form
  const preview = useMemo(() => {
    const packCost = parseFloat(form.pack_cost) || 0
    const packsBought = parseInt(form.packs_bought) || 0
    const packSize = parseInt(form.pack_size) || 1
    const sellPrice = parseFloat(form.sell_price) || 0
    const unitsSold = parseInt(form.units_sold) || 0
    const totalUnits = packsBought * packSize
    const totalCost = packCost * packsBought
    const totalRevenue = sellPrice * unitsSold
    const costPerUnit = totalUnits > 0 ? totalCost / totalUnits : 0
    return { totalUnits, totalCost, totalRevenue, profit: totalRevenue - totalCost, costPerUnit, remaining: totalUnits - unitsSold }
  }, [form])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="INVENTORY & BUDGET" actions={
        <button
          onClick={() => { setShowAdd(true); setEditItem(null); resetForm() }}
          style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + Add Item
        </button>
      } />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {/* Filter */}
        <div style={{ marginBottom: 20 }}>
          <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}
            style={{ ...inp, minWidth: 280, width: 'auto' }}>
            <option value="all">All Tournaments</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* P&L Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Total Cost" value={fmt(stats.totalCost)} accent="#ff9d7a" sub="Packs purchased" />
          <StatCard label="Total Revenue" value={fmt(stats.totalRevenue)} accent="#4a9eff" sub="Units sold" />
          <StatCard label="Profit / Loss" value={fmt(stats.profit)} accent={stats.profit >= 0 ? '#5cb800' : '#e05555'} sub={stats.profit >= 0 ? 'In profit ✓' : 'At a loss'} />
          <StatCard label="Units Remaining" value={stats.totalUnitsAvailable - stats.totalUnitsSold} accent="#d4a017" sub={`${stats.totalUnitsSold} sold of ${stats.totalUnitsAvailable}`} />
        </div>

        {/* Margin bar */}
        {stats.totalRevenue > 0 && (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#c0cce0', fontWeight: 700 }}>PROFIT MARGIN</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: stats.profit >= 0 ? '#5cb800' : '#e05555' }}>
                {((stats.profit / stats.totalRevenue) * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 10, background: '#0e1320', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, (stats.profit / stats.totalRevenue) * 100))}%`, background: stats.profit >= 0 ? '#5cb800' : '#e05555', borderRadius: 6 }} />
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ color: '#4a5568', fontSize: 13 }}>No items yet. Click "+ Add Item" to start tracking inventory.</div>
          </div>
        ) : (
          Object.entries(byCategory).map(([cat, catItems]) => {
            const catCost = catItems.reduce((s, i) => s + (parseFloat(i.pack_cost)||0) * (parseInt(i.packs_bought)||0), 0)
            const catRev = catItems.reduce((s, i) => s + (parseFloat(i.sell_price)||0) * (parseInt(i.units_sold)||0), 0)
            return (
              <div key={cat} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#c0cce0', textTransform: 'uppercase' }}>{cat}</span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ color: '#ff9d7a' }}>Cost: {fmt(catCost)}</span>
                    <span style={{ color: '#4a9eff' }}>Rev: {fmt(catRev)}</span>
                    <span style={{ color: catRev-catCost >= 0 ? '#5cb800' : '#e05555', fontWeight: 700 }}>P/L: {fmt(catRev-catCost)}</span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: '#0a0f1a' }}>
                        {['Item', 'Tournament', 'Pack Size', 'Pack Cost', 'Packs Bought', 'Total Units', 'Cost/Unit', 'Sell Price', 'Units Sold', 'Remaining', 'Revenue', 'Profit', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, color: '#6b7a99', textTransform: 'uppercase', borderBottom: '1px solid #1a2030', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map(item => {
                        const packSize = parseInt(item.pack_size) || 1
                        const packsBought = parseInt(item.packs_bought) || 0
                        const packCost = parseFloat(item.pack_cost) || 0
                        const sellPrice = parseFloat(item.sell_price) || 0
                        const unitsSold = parseInt(item.units_sold) || 0
                        const totalUnits = packsBought * packSize
                        const costPerUnit = totalUnits > 0 ? packCost * packsBought / totalUnits : 0
                        const cost = packCost * packsBought
                        const rev = sellPrice * unitsSold
                        const profit = rev - cost
                        const remaining = totalUnits - unitsSold
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #0e1320' }}>
                            <td style={{ padding: '9px 10px', color: '#d8e0f0', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.item_name}</td>
                            <td style={{ padding: '9px 10px', color: '#4a5568', fontSize: 11 }}>{item.tournaments?.name || '—'}</td>
                            <td style={{ padding: '9px 10px' }}>
                              <input type="number" defaultValue={item.pack_size} onBlur={e => updateField(item.id, 'pack_size', e.target.value)} style={smallInp} />
                            </td>
                            <td style={{ padding: '9px 10px' }}>
                              <input type="number" step="0.01" defaultValue={item.pack_cost} onBlur={e => updateField(item.id, 'pack_cost', e.target.value)} style={smallInp} />
                            </td>
                            <td style={{ padding: '9px 10px' }}>
                              <input type="number" defaultValue={item.packs_bought} onBlur={e => updateField(item.id, 'packs_bought', e.target.value)} style={smallInp} />
                            </td>
                            <td style={{ padding: '9px 10px', color: '#c0cce0', fontSize: 12 }}>{totalUnits}</td>
                            <td style={{ padding: '9px 10px', color: '#4a5568', fontSize: 12 }}>{fmt(costPerUnit)}</td>
                            <td style={{ padding: '9px 10px' }}>
                              <input type="number" step="0.01" defaultValue={item.sell_price} onBlur={e => updateField(item.id, 'sell_price', e.target.value)} style={smallInp} />
                            </td>
                            <td style={{ padding: '9px 10px' }}>
                              <input type="number" defaultValue={item.units_sold} onBlur={e => updateField(item.id, 'units_sold', e.target.value)} style={smallInp} />
                            </td>
                            <td style={{ padding: '9px 10px', color: remaining < 0 ? '#e05555' : remaining === 0 ? '#4a5568' : '#d4a017', fontSize: 12, fontWeight: 600 }}>{remaining}</td>
                            <td style={{ padding: '9px 10px', color: '#4a9eff', fontSize: 12 }}>{fmt(rev)}</td>
                            <td style={{ padding: '9px 10px', fontWeight: 700, color: profit >= 0 ? '#5cb800' : '#e05555' }}>{fmt(profit)}</td>
                            <td style={{ padding: '9px 10px' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => {
                                  setEditItem(item)
                                  setForm({ item_name: item.item_name, category: item.category, notes: item.notes || '', tournament_id: item.tournament_id || '', pack_size: item.pack_size, pack_cost: item.pack_cost, packs_bought: item.packs_bought, sell_price: item.sell_price, units_sold: item.units_sold })
                                  setShowAdd(true)
                                }} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', color: '#f0f4ff' }}>{editItem ? 'Edit Item' : 'Add Inventory Item'}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Item Name *</label>
                <input value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} placeholder="e.g. Hot Dogs" style={inp} autoFocus />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inp}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Tournament</label>
                <select value={form.tournament_id} onChange={e => setForm(p => ({ ...p, tournament_id: e.target.value }))} style={inp}>
                  <option value="">No specific tournament</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Pack info */}
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 10, padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#d4a017', fontWeight: 700, marginBottom: 12 }}>📦 PACK / BUNDLE INFO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Units Per Pack</label>
                  <input type="number" min="1" value={form.pack_size} onChange={e => setForm(p => ({ ...p, pack_size: e.target.value }))} placeholder="12" style={inp} />
                  <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>e.g. 12 hotdogs/pack</div>
                </div>
                <div>
                  <label style={lbl}>Cost Per Pack ($)</label>
                  <input type="number" step="0.01" value={form.pack_cost} onChange={e => setForm(p => ({ ...p, pack_cost: e.target.value }))} placeholder="10.00" style={inp} />
                  <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>e.g. $10 per pack</div>
                </div>
                <div>
                  <label style={lbl}>Packs Bought</label>
                  <input type="number" min="0" value={form.packs_bought} onChange={e => setForm(p => ({ ...p, packs_bought: e.target.value }))} placeholder="5" style={inp} />
                </div>
              </div>
            </div>

            {/* Sell info */}
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 10, padding: 16, marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#4a9eff', fontWeight: 700, marginBottom: 12 }}>💰 SALES INFO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Sell Price Per Unit ($)</label>
                  <input type="number" step="0.01" value={form.sell_price} onChange={e => setForm(p => ({ ...p, sell_price: e.target.value }))} placeholder="3.00" style={inp} />
                  <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>e.g. $3 per hotdog</div>
                </div>
                <div>
                  <label style={lbl}>Units Sold</label>
                  <input type="number" min="0" value={form.units_sold} onChange={e => setForm(p => ({ ...p, units_sold: e.target.value }))} placeholder="0" style={inp} />
                </div>
              </div>
            </div>

            {/* Live P&L preview */}
            {(form.pack_cost || form.sell_price) && (
              <div style={{ background: '#080c12', border: '1px solid #5cb800', borderRadius: 10, padding: 14, marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#5cb800', fontWeight: 700, marginBottom: 10 }}>LIVE P&L PREVIEW</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Total Units', value: preview.totalUnits, color: '#c0cce0' },
                    { label: 'Cost/Unit', value: fmt(preview.costPerUnit), color: '#ff9d7a' },
                    { label: 'Remaining', value: preview.remaining, color: preview.remaining < 0 ? '#e05555' : '#d4a017' },
                    { label: 'Total Cost', value: fmt(preview.totalCost), color: '#ff9d7a' },
                    { label: 'Total Revenue', value: fmt(preview.totalRevenue), color: '#4a9eff' },
                    { label: 'Profit / Loss', value: fmt(preview.profit), color: preview.profit >= 0 ? '#5cb800' : '#e05555' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase' }}>{s.label}</div>
                      <div style={{ fontSize: 18, fontFamily: 'Anton, sans-serif', color: s.color, marginTop: 4 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ ...lbl, marginTop: 12 }}>Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" style={inp} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowAdd(false); setEditItem(null); resetForm() }}
                style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.item_name.trim()}
                style={{ background: saving || !form.item_name.trim() ? '#3a7a00' : '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
