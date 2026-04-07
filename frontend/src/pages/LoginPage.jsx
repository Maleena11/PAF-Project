import React, { useState } from 'react'
import { Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@campus.edu', role: 'ADMIN' },
  { label: 'Staff', email: 'bob@campus.edu', role: 'STAFF' },
  { label: 'Student', email: 'alice@campus.edu', role: 'STUDENT' },
  { label: 'Student', email: 'carol@campus.edu', role: 'STUDENT' },
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
      setError(err.response?.data?.message || 'Login failed. Check your email.')
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
      setError(err.response?.data?.message || 'Login failed.')
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