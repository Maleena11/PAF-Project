import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export default function OAuthCallback() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      setError('No token received from Google. Please try again.')
      return
    }

    const decoded = parseJwt(token)
    if (!decoded) {
      setError('Invalid token received. Please try again.')
      return
    }

    // Store the token and decoded user info
    login({ ...decoded, token })
    navigate('/dashboard', { replace: true })
  }, [])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '40px 48px',
          maxWidth: 400, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 12 }}>Login Failed</h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    }}>
      <div style={{ color: '#fff', fontSize: 18 }}>Signing you in…</div>
    </div>
  )
}
