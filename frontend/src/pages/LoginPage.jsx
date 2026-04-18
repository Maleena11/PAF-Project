import { useState } from 'react'
import { Building2, Mail, ArrowRight, ChevronRight, Shield, Users, BookOpen, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { BACKEND_URL } from '../services/api'

const DEMO_ACCOUNTS = [
  { label: 'Admin',     email: 'IT23616592@my.sliit.lk', role: 'ADMIN',   color: '#6d28d9', bg: '#ede9fe', dot: '#7c3aed' },
  { label: 'Staff',     email: 'IT23642164@my.sliit.lk', role: 'STAFF',   color: '#0369a1', bg: '#e0f2fe', dot: '#0284c7' },
  { label: 'Student 1', email: 'IT23657014@my.sliit.lk', role: 'STUDENT', color: '#065f46', bg: '#d1fae5', dot: '#059669' },
  { label: 'Student 2', email: 'IT23665866@my.sliit.lk', role: 'STUDENT', color: '#065f46', bg: '#d1fae5', dot: '#059669' },
]

const FEATURES = [
  { icon: BookOpen, label: 'Resource Booking',  desc: 'Reserve halls, labs & rooms' },
  { icon: Users,    label: 'Role Management',   desc: 'Admin, Staff & Student access' },
  { icon: Zap,      label: 'Real-time Alerts',  desc: 'Instant campus notifications' },
  { icon: Shield,   label: 'Secure Access',     desc: 'JWT & OAuth2 authentication' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]           = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [focused, setFocused]       = useState(false)
  const [quickLoading, setQuickLoading] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email })
      login(res.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'No account found with that email address.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (demoEmail) => {
    setError('')
    setQuickLoading(demoEmail)
    try {
      const res = await api.post('/auth/login', { email: demoEmail })
      login(res.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setQuickLoading(null)
    }
  }

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: '#f1f5f9',
    }}>
      {/* ── Left Panel ── */}
      <div style={{
        flex: '0 0 55%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
        padding: '36px 60px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background geometry */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 580, height: 580, borderRadius: '50%', background: 'rgba(99,102,241,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 500, height: 500, borderRadius: '50%', background: 'rgba(59,130,246,0.10)' }} />
          <div style={{ position: 'absolute', top: '55%', left: '65%', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          {/* Grid lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 580, width: '100%' }}>
          {/* Campus image */}
          <div style={{
            width: '100%', height: 310,
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 24,
            boxShadow: '0 20px 70px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}>
            <img
              src="/SLIIT-Kandy-UNI.jpg"
              alt="SLIIT Kandy Campus"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Brand badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 100, padding: '6px 16px',
            marginBottom: 12,
            backdropFilter: 'blur(8px)',
          }}>
            <Building2 size={14} color="#93c5fd" />
            <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              SLIIT Kandy Campus
            </span>
          </div>

          <h2 style={{
            color: '#ffffff', fontSize: 32, fontWeight: 800,
            margin: '0 0 8px', lineHeight: 1.15, letterSpacing: '-0.03em',
          }}>
            Smart Campus<br />
            <span style={{ color: '#93c5fd' }}>Management System</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 22px', lineHeight: 1.65, maxWidth: 480 }}>
            A unified platform for managing campus resources, bookings, and activities — built for the modern university.
          </p>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 14, padding: '12px 14px',
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: 'rgba(99,102,241,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={15} color="#a5b4fc" />
                </div>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                  <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#ffffff',
        padding: '32px 48px',
        overflow: 'hidden',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44,
                background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
              }}>
                <Building2 size={20} color="#2563eb" />
              </div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#2563eb',
                background: '#eff6ff', borderRadius: 100,
                padding: '4px 12px', letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                Secure Portal
              </div>
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: '#0f172a',
              margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1.2,
            }}>
              Welcome back
            </h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Sign in with your SLIIT campus email to access the Smart Campus portal.
            </p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleLogin} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600,
                color: '#374151', marginBottom: 7, letterSpacing: '0.01em',
              }}>
                Campus Email Address
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `2px solid ${focused ? '#2563eb' : '#e5e7eb'}`,
                borderRadius: 12, background: focused ? '#fafbff' : '#fafafa',
                transition: 'all 0.2s ease',
                boxShadow: focused ? '0 0 0 4px rgba(37,99,235,0.08)' : 'none',
              }}>
                <div style={{
                  padding: '0 14px',
                  color: focused ? '#2563eb' : '#9ca3af',
                  display: 'flex', transition: 'color 0.2s',
                }}>
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="IT23636229@my.sliit.lk"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: 14, color: '#111827',
                    padding: '11px 14px 11px 0',
                    background: 'transparent',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '11px 14px',
                color: '#dc2626', fontSize: 13, marginBottom: 18,
                fontWeight: 500,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fee2e2', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>!</span>
                </div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '12px 20px',
                background: loading
                  ? 'linear-gradient(135deg, #93c5fd, #a5b4fc)'
                  : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.4)',
                letterSpacing: '0.01em',
              }}
              onMouseOver={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.45)' } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.4)' }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.75s linear infinite', display: 'inline-block',
                  }} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In to Portal
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '4px 0 12px' }}>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => { window.location.href = `${BACKEND_URL}/oauth2/authorization/google` }}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '11px 20px',
              border: '1.5px solid #e5e7eb', borderRadius: 12,
              background: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600, color: '#374151',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              fontFamily: 'inherit',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#fafafa'
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.9 14.4-5l-6.7-5.5C29.6 36 26.9 37 24 37c-6.1 0-10.7-3.1-11.8-7.5l-7 5.4C8.6 41.4 15.7 45 24 45z"/>
              <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.9 6.3l6.7 5.5C41.8 36.8 45 31 45 24c0-1.3-.2-2.7-.5-4z"/>
            </svg>
            Continue with Google
          </button>

          {/* Demo Accounts */}
          <div style={{ marginTop: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Quick Access — Demo Accounts
              </span>
              <span style={{
                fontSize: 10, color: '#6b7280', background: '#f3f4f6',
                borderRadius: 100, padding: '3px 10px', fontWeight: 500,
              }}>
                Click to sign in
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {DEMO_ACCOUNTS.map(acc => {
                const isActive = quickLoading === acc.email
                return (
                  <button
                    key={acc.email}
                    onClick={() => handleQuickLogin(acc.email)}
                    disabled={!!quickLoading || loading}
                    style={{
                      padding: '9px 12px',
                      border: `1.5px solid ${isActive ? acc.dot : '#e5e7eb'}`,
                      borderRadius: 12,
                      background: isActive ? acc.bg : '#fafafa',
                      cursor: (quickLoading || loading) ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      boxShadow: isActive ? `0 0 0 3px ${acc.bg}` : '0 1px 3px rgba(0,0,0,0.05)',
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={e => {
                      if (!quickLoading && !loading) {
                        e.currentTarget.style.background = acc.bg
                        e.currentTarget.style.borderColor = acc.dot
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.08), 0 0 0 3px ${acc.bg}`
                      }
                    }}
                    onMouseOut={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#fafafa'
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                      }
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        marginBottom: 6,
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: acc.dot, flexShrink: 0 }} />
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: acc.color, letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}>
                          {acc.role}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                        {acc.label}
                      </div>
                      <div style={{
                        fontSize: 10, color: '#9ca3af',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 130,
                      }}>
                        {acc.email}
                      </div>
                    </div>
                    {isActive ? (
                      <span style={{
                        width: 14, height: 14, border: '2px solid rgba(0,0,0,0.15)',
                        borderTopColor: acc.dot, borderRadius: '50%',
                        animation: 'spin 0.75s linear infinite',
                        display: 'inline-block', flexShrink: 0,
                      }} />
                    ) : (
                      <ChevronRight size={13} color="#d1d5db" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
          }}>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>
              © {new Date().getFullYear()} SLIIT Kandy Campus · Smart Campus Portal
            </p>
            <p style={{ color: '#d1d5db', fontSize: 11, margin: '4px 0 0' }}>
              Authorized users only. All access is logged.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        @media (max-width: 860px) {
          div[style*="flex: 0 0 48%"] { display: none !important; }
          div[style*="flex: 1"][style*="background: #ffffff"] { padding: 40px 28px !important; }
        }
      `}</style>
    </div>
  )
}
