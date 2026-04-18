import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { BACKEND_URL } from '../services/api'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@campus.edu', role: 'ADMIN' },
  { label: 'Staff', email: 'bob@campus.edu', role: 'STAFF' },
  { label: 'Student1', email: 'alice@campus.edu', role: 'STUDENT' },
  { label: 'Student2', email: 'carol@campus.edu', role: 'STUDENT' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email })
      login(res.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Check your email.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (demoEmail) => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email: demoEmail })
      login(res.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 48px',
        width: '100%', maxWidth: 440,
        boxShadow: '0 25px 50px rgba(0,0,0,.35)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', background: '#dbeafe', borderRadius: 14, padding: 12, marginBottom: 12 }}>
            <Building2 size={30} color="#2563eb" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>SLIIT KANDY UNI</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Campus Resource Management System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              Campus Email
            </label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="you@campus.edu"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              style={{ fontSize: 15 }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px',
              color: '#b91c1c', fontSize: 13, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15, fontWeight: 600 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Google OAuth Button */}
        <div style={{ margin: '20px 0 0' }}>
          <button
            type="button"
            onClick={() => { window.location.href = `${BACKEND_URL}/oauth2/authorization/google` }}
            disabled={loading}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '11px', border: '1px solid #d1d5db', borderRadius: 8,
              background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600,
              color: '#374151', transition: 'background .15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.9 14.4-5l-6.7-5.5C29.6 36 26.9 37 24 37c-6.1 0-10.7-3.1-11.8-7.5l-7 5.4C8.6 41.4 15.7 45 24 45z"/>
              <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.9 6.3l6.7 5.5C41.8 36.8 45 31 45 24c0-1.3-.2-2.7-.5-4z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>Demo accounts</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {/* Quick Login Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {DEMO_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              onClick={() => handleQuickLogin(acc.email)}
              disabled={loading}
              style={{
                padding: '9px 12px', border: '1px solid #e2e8f0',
                borderRadius: 8, background: '#f8fafc',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background .15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{acc.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{acc.email}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}