import { useNavigate } from 'react-router-dom'

const FEATURES = [
  { icon: '🏆', title: 'Tournament Creation', desc: 'Single or multi-day events. Multiple venues, gyms, and courts. Set divisions, registration deadlines, game lengths, and formats from one setup screen.', live: true },
  { icon: '📋', title: 'Team Registration', desc: 'Teams register directly from a public link. Approve, waitlist, or reject. Collect entry fees, track payment status, and manage divisions all in one place.', live: true },
  { icon: '📅', title: 'Auto Scheduling', desc: 'Generate pool play, round robin, or bracket schedules automatically. Conflict-aware — detects back-to-back games and avoids scheduling coaches against their own teams.', live: true },
  { icon: '◈', title: 'Brackets & Standings', desc: 'Single elimination, double elimination, pool play, and guaranteed games. Standings update live as scores come in.', live: true },
  { icon: '📊', title: 'Live Rankings', desc: 'Pull from multiple ranking providers. Win/loss records, strength of schedule, and power rankings updated in real time.', live: true },
  { icon: '🦺', title: 'Referee Management', desc: 'Add refs, assign to games, track availability. Auto-assign refs across the schedule with no double-booking.', live: true },
  { icon: '📦', title: 'Inventory & Budget', desc: 'Track concessions, merch, and equipment. Pack-based P&L with live profit margin — know exactly what you made on every hotdog.', live: true },
  { icon: '📢', title: 'Announcements', desc: 'Post updates to all registered teams. Schedule changes, court updates, urgent alerts — all in one broadcast.', live: true },
  { icon: '📈', title: 'Analytics & Financials', desc: 'Revenue breakdown by tournament, payment tracking, and team counts. Know your numbers at a glance.', live: true },
  { icon: '👥', title: 'Staff & Refs Portal', desc: 'Manage scorekeepers, coordinators, and referees. Assign roles and track who is working each event.', live: true },
  { icon: '🔔', title: 'Team Notifications', desc: 'Email and SMS alerts when the schedule drops, changes are made, or announcements are posted.', live: false },
  { icon: '📱', title: 'Mobile Scorekeeper', desc: 'Score games from any device. Live updates to the bracket as scores come in.', live: false },
]

const FORMATS = ['Pool Play', 'Round Robin', 'Single Elimination', 'Double Elimination', '2 Games Guaranteed', 'Pool → Bracket']

const PRICING = [
  {
    name: 'Starter', price: 0, period: 'Free forever',
    features: ['1 active tournament', 'Up to 16 teams', 'Basic scheduling', 'Public bracket page'],
    cta: 'Get Started Free', highlight: false,
  },
  {
    name: 'Director', price: 49, period: 'per month',
    features: ['Unlimited tournaments', 'Unlimited teams', 'Auto scheduler', 'Ref management', 'Inventory & budget', 'Analytics & financials', 'Email announcements', 'Priority support'],
    cta: 'Start Free Trial', highlight: true,
  },
  {
    name: 'Pro Org', price: 99, period: 'per month',
    features: ['Everything in Director', 'Multiple directors', 'SMS notifications', 'Custom branding', 'API access', 'Dedicated onboarding'],
    cta: 'Contact Us', highlight: false,
  },
]

export default function TournamentLanding() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#04060a', color: '#f0f4ff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: '#5cb800', letterSpacing: '0.5px' }}>NP TOURNAMENTS</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/demo')} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
            👀 Live Demo
          </button>
          <button onClick={() => navigate('/login')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Get Started Free →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, #0a1a08 0%, #04060a 60%)', padding: '80px 32px 64px', textAlign: 'center', borderBottom: '1px solid #1a2030' }}>
        <div style={{ fontSize: 11, color: '#5cb800', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16 }}>// NP Tournaments</div>
        <h1 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.9, letterSpacing: 1, margin: '0 0 24px', color: '#f0f4ff' }}>
          RUN YOUR<br /><span style={{ color: '#5cb800' }}>TOURNAMENT</span><br />YOUR WAY
        </h1>
        <p style={{ fontSize: 18, color: '#6b7a99', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
          The only tournament management platform built by a coach who actually runs AAU events. From registration to final buzzer — everything in one place.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/login')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Start Free Trial →
          </button>
          <button onClick={() => navigate('/demo')} style={{ background: 'transparent', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            👀 View Live Demo
          </button>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: '#4a5568' }}>No credit card required · Free to start · Cancel anytime</div>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#080c12', borderBottom: '1px solid #1a2030', padding: '24px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, textAlign: 'center' }}>
          {[
            { value: '1,292+', label: 'Teams in Directory' },
            { value: '6', label: 'Bracket Formats' },
            { value: '∞', label: 'Courts & Venues' },
            { value: '100%', label: 'Built for AAU' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: '#5cb800' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo embed */}
      <div style={{ padding: '64px 32px', background: '#04060a', borderBottom: '1px solid #1a2030' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: '#5cb800', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>// See It In Action</div>
            <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(32px,5vw,56px)', margin: '0 0 16px', lineHeight: 0.95 }}>EXPLORE THE FULL APP</h2>
            <p style={{ color: '#6b7a99', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>Try the live demo with real data. Click through every page — no sign-up required.</p>
          </div>
          <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ background: '#0a0f1a', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #1a2030' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3a0a0a' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3a3000' }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0d1a0a' }} />
              <div style={{ fontSize: 12, color: '#4a5568', marginLeft: 8 }}>np-tournaments.vercel.app/demo</div>
            </div>
            <div style={{ padding: '48px 32px', textAlign: 'center', background: 'linear-gradient(135deg, #0a1a08, #071525)' }}>
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 28, color: '#f0f4ff', marginBottom: 8 }}>ALL-STAR MOVIE CLASSIC 2026</div>
              <div style={{ fontSize: 13, color: '#6b7a99', marginBottom: 32 }}>11 teams · 9 games · Oakland, CA · Apr 19–20</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px' }}>
                {[{l:'Teams',v:'11'},{l:'Games',v:'9'},{l:'Divisions',v:'3'},{l:'Revenue',v:'$1,350'}].map(s => (
                  <div key={s.l} style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 10, padding: '14px 8px' }}>
                    <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 24, color: '#5cb800' }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/demo')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Open Full Demo Dashboard →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '64px 32px', borderBottom: '1px solid #1a2030' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: '#5cb800', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>// Features</div>
            <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(32px,5vw,56px)', margin: 0, lineHeight: 0.95 }}>EVERYTHING YOU<br />NEED TO RUN IT</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2, border: '1px solid #1a2030', borderRadius: 12, overflow: 'hidden' }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: '#080c12', padding: '24px 20px', borderBottom: '1px solid #1a2030' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{f.icon}</span>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 700, background: f.live ? '#0d1a0a' : '#1a1500', color: f.live ? '#5cb800' : '#d4a017', border: `1px solid ${f.live ? '#1a3a0a' : '#3a3000'}` }}>
                    {f.live ? 'LIVE' : 'COMING SOON'}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4ff', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#6b7a99', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bracket formats */}
      <div style={{ padding: '48px 32px', background: '#080c12', borderBottom: '1px solid #1a2030' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 24 }}>Bracket Formats Supported</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {FORMATS.map(f => (
              <div key={f} style={{ padding: '8px 20px', border: '1px solid #1a3a0a', borderRadius: 20, fontSize: 13, color: '#5cb800', fontWeight: 600 }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: '64px 32px', borderBottom: '1px solid #1a2030' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: '#5cb800', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>// Pricing</div>
            <h2 style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(32px,5vw,56px)', margin: '0 0 16px', lineHeight: 0.95 }}>SIMPLE,<br />TRANSPARENT PRICING</h2>
            <p style={{ color: '#6b7a99', fontSize: 16 }}>Start free. Upgrade when you're ready.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {PRICING.map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? 'linear-gradient(135deg, #0d1a0a, #080c12)' : '#080c12', border: `1px solid ${plan.highlight ? '#2a5a00' : '#1a2030'}`, borderRadius: 16, padding: 28, position: 'relative' }}>
                {plan.highlight && <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#5cb800', color: '#04060a', fontSize: 10, fontWeight: 700, padding: '4px 16px', borderRadius: '0 0 8px 8px', letterSpacing: 1 }}>MOST POPULAR</div>}
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 40, color: plan.highlight ? '#5cb800' : '#f0f4ff' }}>{plan.price === 0 ? 'Free' : `$${plan.price}`}</span>
                  {plan.price > 0 && <span style={{ fontSize: 13, color: '#4a5568', marginLeft: 6 }}>{plan.period}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#c0cce0' }}>
                      <span style={{ color: '#5cb800', flexShrink: 0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/login')} style={{ width: '100%', background: plan.highlight ? '#5cb800' : 'transparent', color: plan.highlight ? '#04060a' : '#6b7a99', border: `1px solid ${plan.highlight ? '#5cb800' : '#1a2030'}`, padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '64px 32px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', background: 'linear-gradient(135deg, #0d1a0a, #071525)', border: '1px solid #1a3a0a', borderRadius: 20, padding: '56px 40px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(32px,5vw,56px)', lineHeight: 0.95, marginBottom: 16 }}>READY TO RUN<br /><span style={{ color: '#5cb800' }}>YOUR TOURNAMENT?</span></div>
          <p style={{ color: '#6b7a99', fontSize: 16, marginBottom: 32, lineHeight: 1.7 }}>Join directors already using NP Tournaments. Free to start, no credit card needed.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} style={{ background: '#5cb800', color: '#04060a', border: 'none', padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Get Started Free →
            </button>
            <button onClick={() => navigate('/demo')} style={{ background: 'transparent', color: '#7eb3ff', border: '1px solid #1a3a6a', padding: '14px 24px', borderRadius: 10, fontSize: 15, cursor: 'pointer' }}>
              View Demo First
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
