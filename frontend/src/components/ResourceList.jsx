import {
  Building2, FlaskConical, Users, Dumbbell,
  BookOpen, Mic2, LayoutGrid, MapPin, Pencil, Trash2
} from 'lucide-react'

const TYPE_META = {
  LECTURE_HALL: { label: 'Lecture Hall', Icon: Building2,   color: '#4f46e5', bg: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' },
  LAB:          { label: 'Lab',          Icon: FlaskConical, color: '#7c3aed', bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' },
  MEETING_ROOM: { label: 'Meeting Room', Icon: Users,        color: '#0f766e', bg: 'linear-gradient(135deg,#ccfbf1,#99f6e4)' },
  SPORTS:       { label: 'Sports',       Icon: Dumbbell,     color: '#ea580c', bg: 'linear-gradient(135deg,#ffedd5,#fed7aa)' },
  STUDY_ROOM:   { label: 'Study Room',   Icon: BookOpen,     color: '#059669', bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' },
  AUDITORIUM:   { label: 'Auditorium',   Icon: Mic2,         color: '#e11d48', bg: 'linear-gradient(135deg,#ffe4e6,#fecdd3)' },
  OTHER:        { label: 'Other',        Icon: LayoutGrid,   color: '#475569', bg: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)' },
}

const STATUS_META = {
  AVAILABLE:   { label: 'Available',   dot: '#16a34a', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  OCCUPIED:    { label: 'Occupied',    dot: '#d97706', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  MAINTENANCE: { label: 'Maintenance', dot: '#6366f1', color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  RETIRED:     { label: 'Retired',     dot: '#ef4444', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
}

export default function ResourceList({ resources, onEdit, onDelete, onView, canManage }) {
  if (!resources.length) {
    return (
      <div className="empty-state">
        <Building2 size={52} />
        <h3>No resources found</h3>
        <p>Try adjusting your filters, or add a new campus resource to get started.</p>
      </div>
    )
  }

  return (
    <div className="resource-grid">
      {resources.map(r => {
        const type   = TYPE_META[r.type]   || TYPE_META.OTHER
        const status = STATUS_META[r.status] || STATUS_META.RETIRED
        const TypeIcon = type.Icon

        return (
          <div
            className="resource-card"
            key={r.id}
            onClick={() => onView && onView(r)}
          >
            {/* ── Image / Coloured Header ── */}
            <div className="resource-card-img" style={{ background: r.imageUrl ? undefined : type.bg }}>
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.name} />
              ) : (
                <div className="resource-card-placeholder">
                  <div className="resource-card-icon-wrap" style={{ background: type.color }}>
                    <TypeIcon size={28} color="#fff" />
                  </div>
                </div>
              )}
              {/* Type pill overlay */}
              <span className="resource-type-pill" style={{ background: type.color }}>
                <TypeIcon size={10} color="#fff" />
                {type.label}
              </span>
            </div>

            {/* ── Card Body ── */}
            <div className="resource-card-body">
              {/* Title + status row */}
              <div className="resource-card-header-row">
                <h3 className="resource-card-title">{r.name}</h3>
                <span
                  className="resource-status-badge"
                  style={{ background: status.bg, color: status.color, borderColor: status.border }}
                >
                  <span className="resource-status-dot" style={{ background: status.dot }} />
                  {status.label}
                </span>
              </div>

              {/* Meta info */}
              <div className="resource-card-meta">
                <div className="resource-meta-row">
                  <MapPin size={12} />
                  <span>{r.location}</span>
                </div>
                <div className="resource-meta-row">
                  <Users size={12} />
                  <span>{r.capacity} people</span>
                </div>
              </div>

              {/* Description */}
              {r.description && (
                <p className="resource-card-desc">
                  {r.description.length > 90 ? r.description.slice(0, 90) + '…' : r.description}
                </p>
              )}

              {/* Admin action buttons */}
              {canManage && (
                <div className="resource-card-actions">
                  <button
                    className="btn btn-sm btn-secondary btn-icon"
                    onClick={e => { e.stopPropagation(); onEdit(r) }}
                    title="Edit resource"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn-sm btn-danger btn-icon"
                    onClick={e => { e.stopPropagation(); onDelete(r.id) }}
                    title="Delete resource"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
