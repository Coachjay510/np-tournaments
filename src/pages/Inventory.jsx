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

export default function Inventory({ director }) {
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ item_name: '', category: 'food', buy_price: '', sell_price: '', quantity_bought: '', quantity_sold: '', notes: '' })

  useEffect(() => {
    if (!director?.id) return
    supabase.from('tournaments').select('id, name').eq('director_id', director.id).order('start_date', { ascending: false })
      .then(({ data }) => setTournaments(data || []))
    loadItems()
  }, [director?.id])

  async function loadItems() {
    setLoading(true)
    let q = supabase.from('tournament_inventory').select('*, tournaments(name)').eq('director_id', director?.id || '')
    const { data } = await q.order('category').order('item_name')
    setItems(data || [])
    setLoading(false)
  }

  const filtered = selectedTournament === 'all' ? items : items.filter(i => i.tournament_id === selectedTournament)

  const stats = useMemo(() => {
    const totalCost = filtered.reduce((s, i) => s + (parseFloat(i.buy_price) || 0) * (parseInt(i.quantity_bought) || 0), 0)
    const totalRevenue = filtered.reduce((s, i) => s + (parseFloat(i.sell_price) || 0) * (parseInt(i.quantity_sold) || 0), 0)
    const profit = totalRevenue - totalCost
    const totalItemsSold = filtered.reduce((s, i) => s + (parseInt(i.quantity_sold) || 0), 0)
    return { totalCost, totalRevenue, profit, totalItemsSold }
  }, [filtered])

  const byCategory = useMemo(() => {
    const map = {}
    filtered.forEach(i => {
      if (!map[i.category]) map[i.category] = []
      map[i.category].push(i)
    })
    return map
  }, [filtered])

  function resetForm() {
    setForm({ item_name: '', category: 'food', buy_price: '', sell_price: '', quantity_bought: '', quantity_sold: '', notes: '' })
  }

  async function handleSave() {
    if (!form.item_name.trim()) return
    setSaving(true)
    const payload = {
      director_id: director.id,
      tournament_id: selectedTournament !== 'all' ? selectedTournament : null,
      item_name: form.item_name.trim(),
      category: form.category,
      buy_price: parseFloat(form.buy_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      quantity_bought: parseInt(form.quantity_bought) || 0,
      quantity_sold: parseInt(form.quantity_sold) || 0,
      notes: form.notes.trim() || null,
    }
    if (editItem) {
      await supabase.from('tournament_inventory').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('tournament_inventory').insert(payload)
    }
    setSaving(false); setShowAdd(false); setEditItem(null); resetForm(); loadItems()
  }

  async function handleDelete(id) {
    await supabase.from('tournament_inventory').delete().eq('id', id)
    loadItems()
  }

  async function updateQty(id, field, value) {
    await supabase.from('tournament_inventory').update({ [field]: parseInt(value) || 0 }).eq('id', id)
    loadItems()
  }

  const formatCurrency = (n) => `$${parseFloat(n || 0).toFixed(2)}`
  const inputStyle = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Topbar title="INVENTORY & BUDGET" actions={
        <button onClick={() => { setShowAdd(true); setEditItem(null); resetForm() }}
          style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Add Item
        </button>
      } />

      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {/* Tournament filter */}
        <div style={{ marginBottom: 20 }}>
          <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}
            style={{ ...inputStyle, minWidth: 280, width: 'auto' }}>
            <option value="all">All Tournaments</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* P&L Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard label="Total Cost" value={formatCurrency(stats.totalCost)} accent="#ff9d7a" sub="Cost of goods" />
          <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} accent="#4a9eff" sub="Sales revenue" />
          <StatCard label="Profit / Loss" value={formatCurrency(stats.profit)} accent={stats.profit >= 0 ? '#5cb800' : '#e05555'} sub={stats.profit >= 0 ? 'In profit' : 'At a loss'} />
          <StatCard label="Items Sold" value={stats.totalItemsSold} accent="#d4a017" sub="Units moved" />
        </div>

        {/* P&L Bar */}
        {stats.totalRevenue > 0 && (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#c0cce0', fontWeight: 700 }}>PROFIT MARGIN</span>
              <span style={{ fontSize: 12, color: stats.profit >= 0 ? '#5cb800' : '#e05555', fontWeight: 700 }}>
                {stats.totalRevenue > 0 ? ((stats.profit / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div style={{ height: 12, background: '#0e1320', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, (stats.profit / stats.totalRevenue) * 100))}%`, background: stats.profit >= 0 ? '#5cb800' : '#e05555', borderRadius: 6, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#4a5568' }}>
              <span>Cost: {formatCurrency(stats.totalCost)}</span>
              <span>Revenue: {formatCurrency(stats.totalRevenue)}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 40, textAlign: 'center', color: '#4a5568' }}>
            No inventory items yet. Add items to track your budget.
          </div>
        ) : (
          Object.entries(byCategory).map(([cat, catItems]) => {
            const catCost = catItems.reduce((s, i) => s + (parseFloat(i.buy_price) || 0) * (parseInt(i.quantity_bought) || 0), 0)
            const catRev = catItems.reduce((s, i) => s + (parseFloat(i.sell_price) || 0) * (parseInt(i.quantity_sold) || 0), 0)
            const catProfit = catRev - catCost
            return (
              <div key={cat} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a2030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 14, color: '#c0cce0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat}</span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <span style={{ color: '#ff9d7a' }}>Cost: {formatCurrency(catCost)}</span>
                    <span style={{ color: '#4a9eff' }}>Rev: {formatCurrency(catRev)}</span>
                    <span style={{ color: catProfit >= 0 ? '#5cb800' : '#e05555', fontWeight: 700 }}>P/L: {formatCurrency(catProfit)}</span>
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      {['Item', 'Tournament', 'Buy Price', 'Sell Price', 'Qty Bought', 'Qty Sold', 'Total Cost', 'Total Rev', 'Profit', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10, color: '#6b7a99', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1a2030' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map(item => {
                      const cost = (parseFloat(item.buy_price) || 0) * (parseInt(item.quantity_bought) || 0)
                      const rev = (parseFloat(item.sell_price) || 0) * (parseInt(item.quantity_sold) || 0)
                      const profit = rev - cost
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #0e1320' }}>
                          <td style={{ padding: '10px 12px', color: '#d8e0f0', fontWeight: 600 }}>{item.item_name}</td>
                          <td style={{ padding: '10px 12px', color: '#4a5568', fontSize: 11 }}>{item.tournaments?.name || '—'}</td>
                          <td style={{ padding: '10px 12px', color: '#ff9d7a' }}>{formatCurrency(item.buy_price)}</td>
                          <td style={{ padding: '10px 12px', color: '#4a9eff' }}>{formatCurrency(item.sell_price)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <input type="number" defaultValue={item.quantity_bought} onBlur={e => updateQty(item.id, 'quantity_bought', e.target.value)}
                              style={{ ...inputStyle, width: 70, padding: '4px 8px', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <input type="number" defaultValue={item.quantity_sold} onBlur={e => updateQty(item.id, 'quantity_sold', e.target.value)}
                              style={{ ...inputStyle, width: 70, padding: '4px 8px', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '10px 12px', color: '#ff9d7a', fontSize: 12 }}>{formatCurrency(cost)}</td>
                          <td style={{ padding: '10px 12px', color: '#4a9eff', fontSize: 12 }}>{formatCurrency(rev)}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: profit >= 0 ? '#5cb800' : '#e05555' }}>{formatCurrency(profit)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => { setEditItem(item); setForm({ item_name: item.item_name, category: item.category, buy_price: item.buy_price, sell_price: item.sell_price, quantity_bought: item.quantity_bought, quantity_sold: item.quantity_sold, notes: item.notes || '' }); setShowAdd(true) }}
                                style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                              <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28, width: 520 }}>
            <h3 style={{ margin: '0 0 20px', color: '#f0f4ff' }}>{editItem ? 'Edit Item' : 'Add Inventory Item'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Item Name *</label>
                <input value={form.item_name} onChange={e => setForm(p => ({ ...p, item_name: e.target.value }))} placeholder="e.g. Hot Dog" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Tournament</label>
                <select value={form.tournament_id || ''} onChange={e => setForm(p => ({ ...p, tournament_id: e.target.value }))} style={inputStyle}>
                  <option value="">No specific tournament</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Buy Price ($)</label>
                <input type="number" step="0.01" value={form.buy_price} onChange={e => setForm(p => ({ ...p, buy_price: e.target.value }))} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Sell Price ($)</label>
                <input type="number" step="0.01" value={form.sell_price} onChange={e => setForm(p => ({ ...p, sell_price: e.target.value }))} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Qty Bought</label>
                <input type="number" value={form.quantity_bought} onChange={e => setForm(p => ({ ...p, quantity_bought: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Qty Sold</label>
                <input type="number" value={form.quantity_sold} onChange={e => setForm(p => ({ ...p, quantity_sold: e.target.value }))} placeholder="0" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" style={inputStyle} />
              </div>
            </div>

            {/* Live P&L preview */}
            {(form.buy_price || form.sell_price) && (
              <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: 12, marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'Total Cost', value: `$${((parseFloat(form.buy_price) || 0) * (parseInt(form.quantity_bought) || 0)).toFixed(2)}`, color: '#ff9d7a' },
                  { label: 'Total Revenue', value: `$${((parseFloat(form.sell_price) || 0) * (parseInt(form.quantity_sold) || 0)).toFixed(2)}`, color: '#4a9eff' },
                  { label: 'Profit', value: `$${(((parseFloat(form.sell_price) || 0) * (parseInt(form.quantity_sold) || 0)) - ((parseFloat(form.buy_price) || 0) * (parseInt(form.quantity_bought) || 0))).toFixed(2)}`, color: '#5cb800' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase' }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontFamily: 'Anton, sans-serif', color: s.color, marginTop: 4 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowAdd(false); setEditItem(null); resetForm() }} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
