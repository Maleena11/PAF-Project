import { format } from 'date-fns'

export default function AdminHeroBanner({
  icon: Icon,
  title,
  description,
  badge = 'Admin',
  accent = '#93c5fd',
  children,
}) {
  return (
    <div className="admin-hero">
      <div className="admin-hero-orb admin-hero-orb-left" />
      <div className="admin-hero-orb admin-hero-orb-top" />
      <div className="admin-hero-orb admin-hero-orb-bottom" />

      <div className="admin-hero-main">
        <div className="admin-hero-icon">
          <Icon size={26} color={accent} />
        </div>

        <div className="admin-hero-copy">
          <div className="admin-hero-title-row">
            <h1>{title}</h1>
            <span className="admin-hero-badge">{badge}</span>
          </div>

          <div className="admin-hero-subtitle-row">
            <p>{description}</p>
            <div className="admin-hero-live">
              <div className="admin-hero-live-dot" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-hero-side">
        <div className="admin-hero-date">
          {format(new Date(), 'EEE, MMM d')}
        </div>
        {children ? <div className="admin-hero-actions">{children}</div> : null}
      </div>
    </div>
  )
}
