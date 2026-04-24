import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Ticket,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PublicAuthLayout from '../components/PublicAuthLayout'
import api, { BACKEND_URL } from '../services/api'

const SHOW_DEMO_LOGIN = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(value) {
  const normalized = value.trim()
  if (!normalized) return 'Email is required'
  if (!EMAIL_PATTERN.test(normalized)) return 'Enter a valid email address'
  return ''
}

function validatePassword(value) {
  if (!value) return 'Password is required'
  return ''
}

function GoogleButton({ disabled }) {
  return (
    <button
      type="button"
      className="auth-social-button"
      onClick={() => { window.location.href = `${BACKEND_URL}/oauth2/authorization/google` }}
      disabled={disabled}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.5-4z" />
        <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z" />
        <path fill="#FBBC05" d="M24 45c5.5 0 10.5-1.9 14.4-5l-6.7-5.5C29.6 36 26.9 37 24 37c-6.1 0-10.7-3.1-11.8-7.5l-7 5.4C8.6 41.4 15.7 45 24 45z" />
        <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.6-2.6 4.8-4.9 6.3l6.7 5.5C41.8 36.8 45 31 45 24c0-1.3-.2-2.7-.5-4z" />
      </svg>
      Continue with Google
    </button>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState({ email: false, password: false })
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()
    setTouched({ email: true, password: true })

    const nextEmailError = validateEmail(email)
    const nextPasswordError = validatePassword(password)
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextEmailError || nextPasswordError) return

    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email: email.trim(), password })
      login(response.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicAuthLayout
      mode="login"
      badge="SLIIT Faculty of Computing - 2026"
      title="Sign In to "
      accent="Smart Campus"
      description="Access your campus bookings, resources, notifications, and support tools from one secure portal."
      stats={[
        { value: '500+', label: 'Resources Available' },
        { value: '2,000+', label: 'Active Students' },
        { value: '24/7', label: 'System Uptime' },
      ]}
      highlights={[
        {
          icon: <CalendarDays size={18} />,
          title: 'Lab A101',
          status: 'Booked',
          meta: 'Tomorrow, 10:00 AM',
          tone: 'light',
        },
        {
          icon: <CheckCheck size={18} />,
          title: 'Booking',
          status: 'Approved',
          meta: 'Conference Room B',
          tone: 'accent',
        },
        {
          icon: <Ticket size={18} />,
          title: 'Ticket #045',
          status: 'Resolved',
          meta: 'Projector fixed',
          tone: 'light',
        },
      ]}
    >
      <div id="auth-panel" className="auth-form-shell">
        <div className="auth-form-header">
          <div>
            <span className="auth-form-eyebrow">Secure Sign In</span>
            <h2>Welcome back</h2>
            <p>Use your email and password to enter the portal and manage your bookings, resources, and notifications.</p>
          </div>
          <div className="auth-form-mini-stat">
            <span>Portal</span>
            <strong>24/7</strong>
          </div>
        </div>

        <div className="auth-form-note">
          <CheckCheck size={16} />
          Campus identity is verified before you enter protected modules.
        </div>

        <form onSubmit={handleLogin} className="auth-form-body">
          <div className="auth-field-group">
            <label htmlFor="login-email">
              Email Address <span>*</span>
            </label>

            <div className={`auth-input-wrap${emailError ? ' has-error' : ''}${focused.email ? ' is-focused' : ''}`}>
              <div className="auth-input-icon">
                <Mail size={18} />
              </div>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                  if (touched.email) setEmailError(validateEmail(event.target.value))
                }}
                onFocus={() => setFocused((current) => ({ ...current, email: true }))}
                onBlur={() => {
                  setFocused((current) => ({ ...current, email: false }))
                  setTouched((current) => ({ ...current, email: true }))
                  setEmailError(validateEmail(email))
                }}
              />
            </div>

            {emailError ? (
              <div className="auth-field-feedback is-error">
                <AlertTriangle size={12} />
                {emailError}
              </div>
            ) : (
              <div className="auth-field-feedback">Use your campus or institutional email address.</div>
            )}
          </div>

          <div className="auth-field-group">
            <label htmlFor="login-password">
              Password <span>*</span>
            </label>

            <div className={`auth-input-wrap${passwordError ? ' has-error' : ''}${focused.password ? ' is-focused' : ''}`}>
              <div className="auth-input-icon">
                <Lock size={18} />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError('')
                  if (touched.password) setPasswordError(validatePassword(event.target.value))
                }}
                onFocus={() => setFocused((current) => ({ ...current, password: true }))}
                onBlur={() => {
                  setFocused((current) => ({ ...current, password: false }))
                  setTouched((current) => ({ ...current, password: true }))
                  setPasswordError(validatePassword(password))
                }}
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {passwordError ? (
              <div className="auth-field-feedback is-error">
                <AlertTriangle size={12} />
                {passwordError}
              </div>
            ) : (
              <div className="auth-field-feedback">&nbsp;</div>
            )}
          </div>

          {error && (
            <div className="auth-alert">
              <div className="auth-alert-icon">!</div>
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit-button" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign In to Portal
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-inline-cta">
          <div>
            <strong>Need a portal account?</strong>
            <span>Create a new student access account in a few steps.</span>
          </div>
          <Link to="/signup" className="auth-inline-link">Create account</Link>
        </div>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <GoogleButton disabled={loading} />

        {SHOW_DEMO_LOGIN ? (
          <div className="auth-quick-access">
            <div className="auth-quick-access-header">
              <div>
                <strong>Development Access</strong>
                <span>Demo shortcut support is restricted to explicitly configured local development builds.</span>
              </div>
              <em>Restricted</em>
            </div>
          </div>
        ) : (
          <div className="auth-policy-card">
            <div className="auth-policy-title">
              <CheckCheck size={14} />
              Protected Access
            </div>
            <div className="auth-policy-list">
              <div>Students, staff, and admin can sign in with email and password.</div>
              <div>Google sign-in is also available for all account types.</div>
              <div>Public demo shortcuts are disabled to protect privileged accounts.</div>
            </div>
          </div>
        )}

        <div className="auth-footer-note">
          <p>Copyright {new Date().getFullYear()} SLIIT Kandy Campus. Smart Campus Portal.</p>
          <p>Authorized users only. All access is monitored.</p>
        </div>
      </div>
    </PublicAuthLayout>
  )
}
