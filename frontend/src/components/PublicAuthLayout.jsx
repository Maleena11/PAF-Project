import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PublicAuthLayout({
  mode = 'login',
  badge,
  title,
  accent,
  description,
  stats = [],
  highlights = [],
  children,
}) {
  return (
    <div className="public-auth-page">
      <div className="public-auth-overlay" />
      <div className="public-auth-grid" />
      <div className="public-auth-glow public-auth-glow-left" />
      <div className="public-auth-glow public-auth-glow-right" />

      <header className="public-auth-nav">
        <Link to="/login" className="public-auth-brand">
          <span className="public-auth-brand-icon">
            <Building2 size={18} />
          </span>
          <span>Smart Campus</span>
        </Link>

        <div className="public-auth-nav-actions">
          <Link
            to="/login"
            className={`public-auth-nav-link ${mode === 'login' ? 'is-active' : ''}`}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className={`public-auth-nav-button ${mode === 'signup' ? 'is-active' : ''}`}
          >
            Sign Up
          </Link>
        </div>
      </header>

      <main className="public-auth-hero">
        <section className="public-auth-copy">
          <div className="public-auth-badge">{badge}</div>

          <h1 className="public-auth-title">
            {title}
            <span>{accent}</span>
          </h1>

          <p className="public-auth-description">{description}</p>

          <div className="public-auth-stats">
            {stats.map(({ value, label }) => (
              <div key={label} className="public-auth-stat">
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="public-auth-highlights" aria-hidden="true">
            {highlights.map(({ icon, title: itemTitle, status, subtitle, meta, tone }) => (
              <div key={itemTitle} className={`public-auth-highlight public-auth-highlight-${tone || 'light'}`}>
                <div className="public-auth-highlight-icon">{icon}</div>
                <div className="public-auth-highlight-copy">
                  <strong>{itemTitle}</strong>
                  {status ? <em>{status}</em> : null}
                  <span>{meta || subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="public-auth-panel-zone">
          <div className="public-auth-panel">
            {children}
          </div>
        </section>
      </main>
    </div>
  )
}
