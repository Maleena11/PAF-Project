import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CheckCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  User,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PublicAuthLayout from '../components/PublicAuthLayout'
import api, { BACKEND_URL } from '../services/api'

const CAMPUS_EMAIL_EXAMPLE = 'it23636226@my.sliit.lk'
const CAMPUS_EMAIL_PATTERN = /^[a-z]{2,}[0-9]+@(?:my\.)?sliit\.lk$/i

function validateName(value) {
  const normalized = value.trim()
  if (!normalized) return 'Full name is required'
  if (normalized.length < 3) return 'Full name must be at least 3 characters'
  return ''
}

function validateEmail(value) {
  const normalized = value.trim()
  if (!normalized) return 'Email is required'
  if (!CAMPUS_EMAIL_PATTERN.test(normalized)) {
    return `Use your campus email in the format ${CAMPUS_EMAIL_EXAMPLE}`
  }
  return ''
}

function validatePassword(value) {
  if (!value) return 'Password is required'
  if (value.length < 8) return 'Password must be at least 8 characters'
  return ''
}

function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Please confirm your password'
  if (password !== confirm) return 'Passwords do not match'
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

export default function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [focused, setFocused] = useState({ name: false, email: false, password: false, confirmPassword: false })
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validateField(field, value, allForm) {
    const f = allForm || form
    if (field === 'name') return validateName(value)
    if (field === 'email') return validateEmail(value)
    if (field === 'password') return validatePassword(value)
    if (field === 'confirmPassword') return validateConfirmPassword(f.password, value)
    return ''
  }

  function updateField(field, value) {
    const nextForm = { ...form, [field]: value }
    setForm(nextForm)
    setError('')
    if (touched[field]) {
      setErrors((current) => ({ ...current, [field]: validateField(field, value, nextForm) }))
    }
    if (field === 'password' && touched.confirmPassword) {
      setErrors((current) => ({ ...current, confirmPassword: validateConfirmPassword(value, nextForm.confirmPassword) }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
    }

    setTouched({ name: true, email: true, password: true, confirmPassword: true })
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) return

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      login(response.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicAuthLayout
      mode="signup"
      badge="Student Access Registration"
      title="Create a "
      accent="Smart Campus Account"
      description="Register separately for student access and start using campus resources, bookings, notifications, and support workflows."
      stats={[
        { value: '1 Min', label: 'Signup Time' },
        { value: 'Student', label: 'Default Role' },
        { value: 'Secure', label: 'Identity Flow' },
      ]}
      highlights={[
        { icon: <BadgeCheck size={18} />, title: 'Access Role Ready', subtitle: 'Student permissions by default', tone: 'light' },
        { icon: <CheckCheck size={18} />, title: 'Registration Approved', subtitle: 'Enter the workspace instantly', tone: 'accent' },
        { icon: <CalendarDays size={18} />, title: 'Bookings Await', subtitle: 'Labs and halls in one place', tone: 'light' },
      ]}
    >
      <div className="auth-form-shell">
        <div className="auth-form-header">
          <div>
            <span className="auth-form-eyebrow">New Account</span>
            <h2>Create your account</h2>
            <p>Register with your campus email and start with student access inside the Smart Campus portal.</p>
          </div>
          <div className="auth-form-mini-stat">
            <span>Role</span>
            <strong>Student</strong>
          </div>
        </div>

        <div className="auth-form-note">
          <Shield size={16} />
          Self-registered accounts are created with student permissions only.
        </div>

        <form id="signup-form" onSubmit={handleSubmit} className="auth-form-body">
          <div className="auth-field-group">
            <label htmlFor="signup-name">
              Full Name <span>*</span>
            </label>

            <div className={`auth-input-wrap${errors.name ? ' has-error' : ''}${focused.name ? ' is-focused' : ''}`}>
              <div className="auth-input-icon">
                <User size={18} />
              </div>
              <input
                id="signup-name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                onFocus={() => setFocused((current) => ({ ...current, name: true }))}
                onBlur={() => {
                  setFocused((current) => ({ ...current, name: false }))
                  setTouched((current) => ({ ...current, name: true }))
                  setErrors((current) => ({ ...current, name: validateName(form.name) }))
                }}
              />
            </div>

            {errors.name ? (
              <div className="auth-field-feedback is-error">
                <AlertTriangle size={12} />
                {errors.name}
              </div>
            ) : (
              <div className="auth-field-feedback">Use the display name that should appear across the portal.</div>
            )}
          </div>

          <div className="auth-field-group">
            <label htmlFor="signup-email">
              Campus Email Address <span>*</span>
            </label>

            <div className={`auth-input-wrap${errors.email ? ' has-error' : ''}${focused.email ? ' is-focused' : ''}`}>
              <div className="auth-input-icon">
                <Mail size={18} />
              </div>
              <input
                id="signup-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder={`e.g. ${CAMPUS_EMAIL_EXAMPLE}`}
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                onFocus={() => setFocused((current) => ({ ...current, email: true }))}
                onBlur={() => {
                  setFocused((current) => ({ ...current, email: false }))
                  setTouched((current) => ({ ...current, email: true }))
                  setErrors((current) => ({ ...current, email: validateEmail(form.email) }))
                }}
              />
            </div>

            {errors.email ? (
              <div className="auth-field-feedback is-error">
                <AlertTriangle size={12} />
                {errors.email}
              </div>
            ) : (
              <div className="auth-field-feedback">Use your campus email, for example {CAMPUS_EMAIL_EXAMPLE}.</div>
            )}
          </div>

          <div className="auth-field-group">
            <label htmlFor="signup-password">
              Password <span>*</span>
            </label>

            <div className={`auth-input-wrap${errors.password ? ' has-error' : ''}${focused.password ? ' is-focused' : ''}`}>
              <div className="auth-input-icon">
                <Lock size={18} />
              </div>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                onFocus={() => setFocused((current) => ({ ...current, password: true }))}
                onBlur={() => {
                  setFocused((current) => ({ ...current, password: false }))
                  setTouched((current) => ({ ...current, password: true }))
                  setErrors((current) => ({ ...current, password: validatePassword(form.password) }))
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

            {errors.password ? (
              <div className="auth-field-feedback is-error">
                <AlertTriangle size={12} />
                {errors.password}
              </div>
            ) : (
              <div className="auth-field-feedback">Minimum 8 characters.</div>
            )}
          </div>

          <div className="auth-field-group">
            <label htmlFor="signup-confirm-password">
              Confirm Password <span>*</span>
            </label>

            <div className={`auth-input-wrap${errors.confirmPassword ? ' has-error' : ''}${focused.confirmPassword ? ' is-focused' : ''}`}>
              <div className="auth-input-icon">
                <Lock size={18} />
              </div>
              <input
                id="signup-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                onFocus={() => setFocused((current) => ({ ...current, confirmPassword: true }))}
                onBlur={() => {
                  setFocused((current) => ({ ...current, confirmPassword: false }))
                  setTouched((current) => ({ ...current, confirmPassword: true }))
                  setErrors((current) => ({ ...current, confirmPassword: validateConfirmPassword(form.password, form.confirmPassword) }))
                }}
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {errors.confirmPassword ? (
              <div className="auth-field-feedback is-error">
                <AlertTriangle size={12} />
                {errors.confirmPassword}
              </div>
            ) : (
              <div className="auth-field-feedback">Re-enter the password above.</div>
            )}
          </div>

          <div className="auth-policy-card">
            <div className="auth-policy-title">
              <Shield size={15} />
              Access Policy
            </div>
            <div className="auth-policy-list">
              <div>
                <CheckCircle2 size={14} />
                New self-service registrations receive student access.
              </div>
              <div>
                <CheckCircle2 size={14} />
                Additional roles remain controlled by administrators.
              </div>
            </div>
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
                Creating account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-inline-cta">
          <div>
            <strong>Already have an account?</strong>
            <span>Return to the secure sign-in experience.</span>
          </div>
          <Link to="/login" className="auth-inline-link">Sign in</Link>
        </div>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <GoogleButton disabled={loading} />

        <div className="auth-footer-note">
          <p>Copyright {new Date().getFullYear()} SLIIT Kandy Campus. Smart Campus Portal.</p>
          <p>Authorized users only. All access is monitored.</p>
        </div>
      </div>
    </PublicAuthLayout>
  )
}
