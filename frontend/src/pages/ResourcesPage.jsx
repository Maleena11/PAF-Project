import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  X,
  Building2,
  FlaskConical,
  Dumbbell,
  BookOpen,
  Mic2,
  LayoutGrid,
  LayoutList,
  RefreshCw,
  Shield,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Archive,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import { BACKEND_URL } from '../services/api'
import ResourceList from '../components/ResourceList'
import ResourceForm from '../components/ResourceForm'
import AdminHeroBanner from '../components/AdminHeroBanner'

const resolveImageUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http')) return url
  return BACKEND_URL + url
}

const TYPE_META = {
  LECTURE_HALL: { label: 'Lecture Hall', Icon: Building2, color: '#4f46e5', bg: '#e0e7ff' },
  LAB: { label: 'Lab', Icon: FlaskConical, color: '#7c3aed', bg: '#ede9fe' },
  MEETING_ROOM: { label: 'Meeting Room', Icon: Users, color: '#0f766e', bg: '#ccfbf1' },
  SPORTS: { label: 'Sports', Icon: Dumbbell, color: '#ea580c', bg: '#ffedd5' },
  STUDY_ROOM: { label: 'Study Room', Icon: BookOpen, color: '#059669', bg: '#d1fae5' },
  AUDITORIUM: { label: 'Auditorium', Icon: Mic2, color: '#e11d48', bg: '#ffe4e6' },
  OTHER: { label: 'Other', Icon: LayoutGrid, color: '#475569', bg: '#e2e8f0' },
}

const STATUS_META = {
  AVAILABLE: { label: 'Available', dot: '#16a34a', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  OCCUPIED: { label: 'Occupied', dot: '#d97706', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  MAINTENANCE: { label: 'Maintenance', dot: '#6366f1', color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  RETIRED: { label: 'Retired', dot: '#ef4444', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
}

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  ...['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'SPORTS', 'STUDY_ROOM', 'AUDITORIUM', 'OTHER'].map((key) => ({
    value: key,
    label: TYPE_META[key].label,
  })),
]

const ALL_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RETIRED']

const getSuitabilityMeta = (resource) => {
  const capacity = Number(resource?.capacity) || 0
  const status = resource?.status
  const type = resource?.type

  if (status === 'MAINTENANCE' || status === 'RETIRED') {
    return {
      label: 'Currently unavailable',
      tone: { color: '#9f1239', bg: '#fff1f2', border: '#fecdd3' },
    }
  }

  if (status === 'OCCUPIED') {
    return {
      label: 'Popular right now',
      tone: { color: '#9a3412', bg: '#fff7ed', border: '#fdba74' },
    }
  }

  if (type === 'STUDY_ROOM' && capacity <= 8) {
    return {
      label: 'Best for group study',
      tone: { color: '#166534', bg: '#f0fdf4', border: '#86efac' },
    }
  }

  if (type === 'MEETING_ROOM' && capacity <= 12) {
    return {
      label: 'Best for small meetings',
      tone: { color: '#115e59', bg: '#f0fdfa', border: '#99f6e4' },
    }
  }

  if (type === 'LECTURE_HALL' || type === 'AUDITORIUM' || capacity >= 40) {
    return {
      label: 'Best for large events',
      tone: { color: '#9f1239', bg: '#fff1f2', border: '#fda4af' },
    }
  }

  if (capacity <= 4) {
    return {
      label: 'Best for focused work',
      tone: { color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
    }
  }

  if (type === 'LAB') {
    return {
      label: 'Best for practical sessions',
      tone: { color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd' },
    }
  }

  if (type === 'SPORTS') {
    return {
      label: 'Best for active sessions',
      tone: { color: '#c2410c', bg: '#fff7ed', border: '#fdba74' },
    }
  }

  return {
    label: 'Best for flexible use',
    tone: { color: '#334155', bg: '#f8fafc', border: '#cbd5e1' },
  }
}

export default function ResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)

  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF'
  const badge = user?.role === 'ADMIN' ? 'Admin' : user?.role === 'STAFF' ? 'Staff' : 'Student'

  const load = () => {
    setLoading(true)
    resourceService
      .getAll()
      .then((r) => setResources(Array.isArray(r.data) ? r.data : []))
      .catch(() => {
        toast.error('Failed to load resources')
        setResources([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!canManage) {
      setViewMode('grid')
    }
  }, [canManage])

  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      const matchesSearch =
        !search ||
        [resource.name, resource.location, resource.description].some((value) =>
          value?.toLowerCase().includes(search.toLowerCase())
        )

      const matchesType = !typeFilter || resource.type === typeFilter
      const matchesStatus = !statusFilter || resource.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [resources, search, typeFilter, statusFilter])

  const counts = useMemo(
    () => ({
      AVAILABLE: resources.filter((r) => r.status === 'AVAILABLE').length,
      OCCUPIED: resources.filter((r) => r.status === 'OCCUPIED').length,
      MAINTENANCE: resources.filter((r) => r.status === 'MAINTENANCE').length,
      RETIRED: resources.filter((r) => r.status === 'RETIRED').length,
    }),
    [resources]
  )

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await resourceService.update(editing.id, data)
        toast.success('Resource updated')
      } else {
        await resourceService.create(data)
        toast.success('Resource created')
      }

      setShowModal(false)
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to save resource')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return

    try {
      await resourceService.delete(id)
      toast.success('Resource deleted')
      setShowDetail(false)
      setSelectedResource(null)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to delete resource')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
  }

  return (
    <div>
      {canManage ? (
        <AdminHeroBanner
          icon={Shield}
          title="Resource Management"
          description="Manage campus facilities, keep availability current, and maintain clean resource records"
          badge={badge}
        >
          <div className="resource-hero-controls">
            <div className="resource-hero-toggle">
              <button
                type="button"
                className={`resource-hero-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <LayoutList size={14} />
              </button>
              <button
                type="button"
                className={`resource-hero-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <button type="button" className="admin-hero-action-btn" onClick={load}>
              <RefreshCw size={14} />
              Refresh
            </button>

            <button
              type="button"
              className="admin-hero-action-btn"
              onClick={() => {
                setEditing(null)
                setShowModal(true)
              }}
            >
              <Plus size={14} />
              Add Resource
            </button>
          </div>
        </AdminHeroBanner>
      ) : (
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 28px rgba(15,23,42,0.45)',
            position: 'relative',
            overflow: 'hidden',
            gap: 16,
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -60,
              top: -60,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 80,
              bottom: -80,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: -30,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.12)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, zIndex: 1 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={26} color="#a5b4fc" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.3px',
                  }}
                >
                  Campus Resources
                </h1>

                <span
                  style={{
                    background: 'rgba(147,197,253,0.2)',
                    border: '1px solid rgba(147,197,253,0.4)',
                    color: '#93c5fd',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: 20,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Student
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  Browse available campus facilities and view resource details before booking
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#4ade80',
                      boxShadow: '0 0 0 2px rgba(74,222,128,0.3)',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Live</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 10,
              flexShrink: 0,
              zIndex: 1,
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                padding: '6px 14px',
                color: '#e0f2fe',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="booking-stats-strip">
          <StatChip
            label="Total"
            value={resources.length}
            color="#2563eb"
            bg="#eff6ff"
            borderColor="#bfdbfe"
            icon={<Building2 size={15} />}
          />
          <StatChip
            label="Available"
            value={counts.AVAILABLE}
            color="#15803d"
            bg="#f0fdf4"
            borderColor="#bbf7d0"
            icon={<CheckCircle2 size={15} />}
          />
          <StatChip
            label="Occupied"
            value={counts.OCCUPIED}
            color="#a16207"
            bg="#fefce8"
            borderColor="#fde68a"
            icon={<AlertCircle size={15} />}
          />
          <StatChip
            label="Maintenance"
            value={counts.MAINTENANCE}
            color="#4338ca"
            bg="#eef2ff"
            borderColor="#c7d2fe"
            icon={<Wrench size={15} />}
          />
          <StatChip
            label="Retired"
            value={counts.RETIRED}
            color="#b91c1c"
            bg="#fef2f2"
            borderColor="#fecaca"
            icon={<Archive size={15} />}
          />
        </div>
      )}

      <div className="booking-filter-bar resource-filter-bar">
        <div className="resource-search-box">
          <Search size={15} />
          <input
            placeholder="Search by name, location, or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="status-pill-group">
          <button
            className={`status-pill ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => setStatusFilter('')}
          >
            All
          </button>

          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              className={`status-pill resource-status-pill-${status.toLowerCase()} ${
                statusFilter === status ? 'active' : ''
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_META[status].label}
              {!loading && <span className="status-pill-count">{counts[status]}</span>}
            </button>
          ))}
        </div>

        <div className="resource-filter-actions">
          <select
            className="filter-select-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {(search || typeFilter || statusFilter) && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="resource-results-bar">
        <span>
          Showing {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
        </span>

        {canManage && (
          <span className="resource-results-note">
            {viewMode === 'table' ? 'Management table view' : 'Visual catalog view'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : (
        <ResourceList
          resources={filtered}
          viewMode={viewMode}
          onEdit={(resource) => {
            setEditing(resource)
            setShowModal(true)
          }}
          onDelete={handleDelete}
          onView={(resource) => {
            setSelectedResource(resource)
            setShowDetail(true)
          }}
          canManage={canManage}
          getSuitabilityMeta={getSuitabilityMeta}
        />
      )}

      {showDetail &&
        selectedResource &&
        (() => {
          const resource = selectedResource
          const type = TYPE_META[resource.type] || TYPE_META.OTHER
          const status = STATUS_META[resource.status] || STATUS_META.RETIRED
          const suitability = getSuitabilityMeta(resource)
          const TypeIcon = type.Icon

          return (
            <div
              className="modal-backdrop"
              onClick={(e) => e.target === e.currentTarget && setShowDetail(false)}
            >
              <div className="dialog-card" style={{ maxWidth: 560 }}>
                <div className="dialog-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="dialog-icon" style={{ background: type.bg, color: type.color }}>
                      <TypeIcon size={18} />
                    </div>

                    <div>
                      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{resource.name}</h2>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span className="resource-chip">{type.label}</span>

                        {!canManage && (
                          <span
                            className="resource-suitability-badge"
                            style={{
                              background: suitability.tone.bg,
                              color: suitability.tone.color,
                              borderColor: suitability.tone.border,
                            }}
                          >
                            {suitability.label}
                          </span>
                        )}

                        <span
                          className="badge"
                          style={{
                            background: status.bg,
                            color: status.color,
                            border: `1px solid ${status.border}`,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: status.dot,
                              display: 'inline-block',
                              marginRight: 6,
                            }}
                          />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-sm btn-secondary btn-icon"
                    onClick={() => setShowDetail(false)}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ padding: '20px 24px' }}>
                  {resource.imageUrl && (
                    <img
                      src={resolveImageUrl(resource.imageUrl)}
                      alt={resource.name}
                      className="resource-detail-image"
                    />
                  )}

                  <div className="detail-section">
                    <div className="detail-section-title">Details</div>
                    {!canManage && (
                      <div
                        className="resource-suitability-panel"
                        style={{
                          background: suitability.tone.bg,
                          borderColor: suitability.tone.border,
                        }}
                      >
                        <div className="resource-suitability-eyebrow">Quick Suitability Score</div>
                        <div className="resource-suitability-title" style={{ color: suitability.tone.color }}>
                          {suitability.label}
                        </div>
                        <div className="resource-suitability-copy">
                          Generated from resource type, capacity, and current availability.
                        </div>
                      </div>
                    )}
                    <div className="detail-grid">
                      <DetailRow label="Type" value={type.label} />
                      <DetailRow label="Location" value={resource.location} />
                      <DetailRow label="Capacity" value={`${resource.capacity} people`} />
                      <DetailRow label="Status" value={status.label} />
                    </div>
                  </div>

                  <div className="detail-section">
                    <div className="detail-section-title">Description</div>
                    <div className="resource-detail-copy">
                      {resource.description || 'No description provided.'}
                    </div>
                  </div>
                </div>

                <div className="dialog-footer">
                  {canManage && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setShowDetail(false)
                          setEditing(resource)
                          setShowModal(true)
                        }}
                      >
                        Edit Resource
                      </button>

                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(resource.id)}>
                        Delete
                      </button>
                    </>
                  )}

                  <button
                    className="btn btn-secondary"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setShowDetail(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Building2 size={18} color="var(--primary)" />
                  <h2>{editing ? 'Edit Resource' : 'Add New Resource'}</h2>
                </div>

                <p>
                  {editing
                    ? 'Update the details for this resource.'
                    : 'Fill in the details to register a new campus resource.'}
                </p>
              </div>

              <button
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => {
                  setShowModal(false)
                  setEditing(null)
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <ResourceForm
                initial={editing}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowModal(false)
                  setEditing(null)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, color, bg, borderColor, icon }) {
  return (
    <div className="stat-chip" style={{ background: bg, borderColor }}>
      <div className="stat-chip-top">
        <span className="stat-chip-value" style={{ color }}>
          {value}
        </span>
        <span className="stat-chip-icon" style={{ color, background: `${color}18` }}>
          {icon}
        </span>
      </div>
      <span className="stat-chip-label">{label}</span>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? '-'}</span>
    </div>
  )
}
