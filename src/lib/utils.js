export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateRange(start, end) {
  if (!start || !end) return '—'
  const s = new Date(start)
  const e = new Date(end)
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  }
  return `${formatDate(start)} – ${formatDate(end)}`
}

export function getInitials(name) {
  if (!name) return '??'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function statusColor(status) {
  const map = {
    draft:                { bg:'#1a1600', color:'#d4a017', border:'#3a2d00' },
    registration_open:    { bg:'#0d1a0a', color:'#5cb800', border:'#1a3a0a' },
    registration_closed:  { bg:'#0e1320', color:'#6b7a99', border:'#1a2030' },
    in_progress:          { bg:'#071525', color:'#4a9eff', border:'#0a2540' },
    completed:            { bg:'#0e1320', color:'#4a5568', border:'#1a2030' },
    cancelled:            { bg:'#1f0707', color:'#e05555', border:'#3a0a0a' },
  }
  return map[status] || map.draft
}

export function registrationStatusColor(status) {
  const map = {
    pending:    { bg:'#1a1600', color:'#d4a017', border:'#3a2d00' },
    approved:   { bg:'#0d1a0a', color:'#5cb800', border:'#1a3a0a' },
    waitlisted: { bg:'#071525', color:'#4a9eff', border:'#0a2540' },
    rejected:   { bg:'#1f0707', color:'#e05555', border:'#3a0a0a' },
    withdrawn:  { bg:'#0e1320', color:'#4a5568', border:'#1a2030' },
  }
  return map[status] || map.pending
}
