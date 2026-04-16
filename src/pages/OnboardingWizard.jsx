import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    color: '#5cb800',
    features: ['1 active tournament', 'Up to 16 teams', 'Basic scheduling', 'Public bracket page'],
    cta: 'Get Started Free',
    action: 'auto', // goes straight in
  },
  {
    id: 'director',
    name: 'Director',
    price: '$49',
    period: 'per month',
    color: '#4a9eff',
    features: ['Unlimited tournaments', 'Unlimited teams', 'Auto scheduler', 'Ref management', 'Inventory & budget', 'Analytics & financials', 'Email announcements'],
    cta: 'Request Access',
    action: 'email', // sends email to you
  },
  {
    id: 'pro',
    name: 'Pro Org',
    price: '$99',
    period: 'per month',
    color: '#d4a017',
    features: ['Everything in Director', 'Multiple directors', 'SMS notifications', 'Custom branding', 'API access', 'Dedicated onboarding'],
    cta: 'Request Access',
    action: 'email',
  },
]

export default function OnboardingWizard({ director }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0 = plan select, 1 = profile, 2 = done
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [name, setName] = useState(director?.display_name || '')
  const [orgName, setOrgName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handlePlanSelect(plan) {
    setSelectedPlan(plan)
    setStep(1)
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      // Update director profile
      await supabase.from('directors').update({
        display_name: name.trim(),
        plan: selectedPlan.id,
        onboarded: selectedPlan.action === 'auto',
      }).eq('id', director.id)

      if (selectedPlan.action === 'email') {
        // Send notification email via backend
        await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://np-backend-production.up.railway.app'}/api/tournaments/notify-signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: director.email,
            name: name.trim(),
            orgName: orgName.trim(),
            phone: phone.trim(),
            plan: selectedPlan.name,
            userId: director.user_id,
          })
        }).catch(e => console.warn('Email notification failed:', e))
        setSubmitted(true)
        setStep(2)
      } else {
        // Free plan — go straight in
        navigate('/')
      }
    } catch (err) {
      console.error('Onboarding error:', err)
    } finally {
      setLoading(false)
    }
  }

  const inp = { background: '#0e1320', border: '1px solid #1a2030', color: '#d8e0f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }

  // Step 2 — submitted confirmation
  if (step === 2) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🏆</div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 32, color: '#f0f4ff', marginBottom: 12, lineHeight: 0.95 }}>
          REQUEST RECEIVED
        </div>
        <p style={{ color: '#6b7a99', fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
          Thanks {name.split(' ')[0]}! We've received your {selectedPlan.name} plan request. 
          We'll reach out to <strong style={{ color: '#f0f4ff' }}>{director.email}</strong> within 24 hours to get you set up.
        </p>
        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>While you wait</div>
          <button onClick={() => navigate('/demo')} style={{ background: 'transparent', color: '#5cb800', border: '1px solid #1a3a0a', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%', marginBottom: 8 }}>
            👀 Explore the Live Demo
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', color: '#6b7a99', border: '1px solid #1a2030', padding: '10px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer', width: '100%' }}>
            Continue with Free Plan
          </button>
        </div>
      </div>
    </div>
  )

  // Step 1 — profile + contact info
  if (step === 1) return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800', letterSpacing: 1, marginBottom: 4 }}>NP TOURNAMENTS</div>
          <div style={{ fontSize: 12, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            {selectedPlan.name} Plan — Tell us about yourself
          </div>
        </div>

        {/* Plan badge */}
        <div style={{ background: '#080c12', border: `1px solid ${selectedPlan.color}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 18, color: selectedPlan.color }}>{selectedPlan.name}</div>
          <div style={{ fontSize: 13, color: '#6b7a99' }}>{selectedPlan.price}{selectedPlan.price !== 'Free' ? `/${selectedPlan.period.replace('per ', '')}` : ''}</div>
          <button onClick={() => setStep(0)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 12 }}>Change →</button>
        </div>

        <div style={{ background: '#080c12', border: '1px solid #1a2030', borderRadius: 14, padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Your Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="Coach Jay" autoFocus />
            </div>
            <div>
              <label style={lbl}>Organization Name</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inp} placeholder="Basketball Circuit, Delta Dubs AAU..." />
            </div>
            {selectedPlan.action === 'email' && (
              <div>
                <label style={lbl}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} style={inp} placeholder="So we can reach you quickly" type="tel" />
              </div>
            )}
            <div style={{ background: '#0a0f1a', border: '1px solid #1a2030', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, color: '#4a5568' }}>Signing in as</div>
              <div style={{ fontSize: 13, color: '#c0cce0', marginTop: 2 }}>{director.email}</div>
            </div>
          </div>

          {selectedPlan.action === 'email' && (
            <div style={{ background: '#071525', border: '1px solid #0a2540', borderRadius: 8, padding: '12px 14px', marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#4a9eff', lineHeight: 1.6 }}>
                📧 We'll send your contact info to our team and reach out within 24 hours to activate your {selectedPlan.name} plan.
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            style={{ width: '100%', background: selectedPlan.action === 'auto' ? '#5cb800' : '#1a2a4a', color: selectedPlan.action === 'auto' ? '#04060a' : '#7eb3ff', border: selectedPlan.action === 'auto' ? 'none' : '1px solid #1a3a6a', padding: '12px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 20, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Setting up...' : selectedPlan.action === 'auto' ? 'Launch Dashboard →' : 'Submit Request →'}
          </button>
        </div>
      </div>
    </div>
  )

  // Step 0 — plan selection
  return (
    <div style={{ minHeight: '100vh', background: '#04060a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 900 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#5cb800', letterSpacing: 1, marginBottom: 8 }}>NP TOURNAMENTS</div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 'clamp(32px, 5vw, 56px)', color: '#f0f4ff', lineHeight: 0.95, marginBottom: 16 }}>
            WELCOME,<br />{director.email?.split('@')[0].toUpperCase()}
          </div>
          <p style={{ color: '#6b7a99', fontSize: 16 }}>Choose the plan that fits your organization</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background: '#080c12', border: `1px solid #1a2030`, borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', position: 'relative', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = plan.color + '60'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1a2030'}
            >
              {plan.id === 'director' && (
                <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#4a9eff', color: '#04060a', fontSize: 10, fontWeight: 700, padding: '4px 16px', borderRadius: '0 0 8px 8px', letterSpacing: 1 }}>MOST POPULAR</div>
              )}
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 22, color: '#f0f4ff', marginBottom: 4 }}>{plan.name}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, color: plan.color }}>{plan.price}</span>
                {plan.price !== 'Free' && <span style={{ fontSize: 13, color: '#4a5568', marginLeft: 6 }}>{plan.period}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, flex: 1 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#c0cce0' }}>
                    <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handlePlanSelect(plan)}
                style={{ width: '100%', background: plan.id === 'free' ? '#5cb800' : plan.id === 'director' ? '#1a2a4a' : 'transparent', color: plan.id === 'free' ? '#04060a' : plan.id === 'director' ? '#7eb3ff' : '#6b7a99', border: plan.id === 'free' ? 'none' : `1px solid ${plan.id === 'director' ? '#1a3a6a' : '#1a2030'}`, padding: '11px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#4a5568' }}>
          Free plan requires no credit card · Paid plans activated within 24 hours
        </div>
      </div>
    </div>
  )
}
