import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Plus, Search, X, Check, ChevronDown, Building2, MapPin, Users, FlaskConical, Dumbbell, BookOpen, Mic2, LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import { BACKEND_URL } from '../services/api'

const resolveImageUrl = (url) => {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('http')) return url
  return BACKEND_URL + url
}
import ResourceList from '../components/ResourceList'
import ResourceForm from '../components/ResourceForm'

const TYPE_META = {
  LECTURE_HALL: { label: 'Lecture Hall', Icon: Building2,   color: '#4f46e5', bg: '#e0e7ff' },
  LAB:          { label: 'Lab',          Icon: FlaskConical, color: '#7c3aed', bg: '#ede9fe' },
  MEETING_ROOM: { label: 'Meeting Room', Icon: Users,        color: '#0f766e', bg: '#ccfbf1' },
  SPORTS:       { label: 'Sports',       Icon: Dumbbell,     color: '#ea580c', bg: '#ffedd5' },
  STUDY_ROOM:   { label: 'Study Room',   Icon: BookOpen,     color: '#059669', bg: '#d1fae5' },
  AUDITORIUM:   { label: 'Auditorium',   Icon: Mic2,         color: '#e11d48', bg: '#ffe4e6' },
  OTHER:        { label: 'Other',        Icon: LayoutGrid,   color: '#475569', bg: '#e2e8f0' },
}

const STATUS_META = {
  AVAILABLE:   { label: 'Available',   dot: '#16a34a', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  OCCUPIED:    { label: 'Occupied',    dot: '#d97706', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  MAINTENANCE: { label: 'Maintenance', dot: '#6366f1', color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  RETIRED:     { label: 'Retired',     dot: '#ef4444', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
}

const TYPE_OPTIONS = [
  { value: '', label: 'All Types', Icon: LayoutGrid, color: '#64748b', bg: '#f1f5f9' },
  ...['LECTURE_HALL','LAB','MEETING_ROOM','SPORTS','STUDY_ROOM','AUDITORIUM','OTHER'].map(k => ({ value: k, ...TYPE_META[k] })),
]

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses', dot: '#94a3b8', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  ...['AVAILABLE','OCCUPIED','MAINTENANCE','RETIRED'].map(k => ({ value: k, ...STATUS_META[k] })),
]

function FilterDropdown({ label, value, onChange, options, renderOption, renderTrigger }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value) || options[0]

  return (
    <div className="filter-group" ref={ref}>
      <label className="filter-label">{label}</label>
      <div className="custom-dropdown">
        <button
          type="button"
          className={`custom-dropdown-trigger${open ? ' open' : ''}${value ? ' is-active' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          <span className="custom-dropdown-trigger-content">{renderTrigger(selected)}</span>
          <ChevronDown size={13} className={`dropdown-chevron${open ? ' rotated' : ''}`} />
        </button>

        {open && (
          <div className="custom-dropdown-menu">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`custom-dropdown-option${opt.value === value ? ' selected' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false) }}
              >
                <span className="custom-dropdown-option-content">{renderOption(opt)}</span>
                {opt.value === value && <Check size={13} className="option-check" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources]  = useState([])
  const [filtered,  setFiltered]   = useState([])
  const [loading,   setLoading]    = useState(true)
  const [search,    setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal]  = useState(false)
  const [editing,   setEditing]    = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)

  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF'

  const load = () => {
    setLoading(true)
    resourceService.getAll()
      .then(r => { setResources(r.data); setFiltered(r.data) })
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    let list = resources
    if (search)       list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    if (typeFilter)   list = list.filter(r => r.type === typeFilter)
    if (statusFilter) list = list.filter(r => r.status === statusFilter)
    setFiltered(list)
  }, [search, typeFilter, statusFilter, resources])

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
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return
    try {
      await resourceService.delete(id)
      toast.success('Resource deleted')
      load()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Campus Resources</h1>
          <p>Manage all campus facilities and assets</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={16} /> Add Resource
          </button>
        )}
      </div>

      {/* ── Stats summary ── */}
      {!loading && (
        <div className="resource-stats-row">
          {[
            { label: 'Total',       count: resources.length,                                    dot: '#94a3b8', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
            { label: 'Available',   count: resources.filter(r => r.status === 'AVAILABLE').length,   dot: '#16a34a', bg: '#dcfce7', color: '#166534', border: '#86efac' },
            { label: 'Occupied',    count: resources.filter(r => r.status === 'OCCUPIED').length,    dot: '#d97706', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
            { label: 'Maintenance', count: resources.filter(r => r.status === 'MAINTENANCE').length, dot: '#6366f1', bg: '#e0e7ff', color: '#3730a3', border: '#a5b4fc' },
          ].map(({ label, count, dot, bg, color, border }) => (
            <div key={label} className="resource-stat-chip" style={{ background: bg, color, borderColor: border }}>
              <span className="resource-stat-dot" style={{ background: dot }} />
              <span className="resource-stat-count">{count}</span>
              <span className="resource-stat-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="toolbar">
        {/* Search */}
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear-btn" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="toolbar-divider" />

        {/* Filters label */}
        <span className="toolbar-filters-label">
          <SlidersHorizontal size={13} />
          Filters
        </span>

        {/* Type filter */}
        <FilterDropdown
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          renderTrigger={opt => (
            <>
              <span className="dd-type-icon" style={{ background: opt.bg, color: opt.color }}>
                <opt.Icon size={12} />
              </span>
              <span>{opt.label}</span>
            </>
          )}
          renderOption={opt => (
            <>
              <span className="dd-type-icon" style={{ background: opt.bg, color: opt.color }}>
                <opt.Icon size={12} />
              </span>
              <span>{opt.label}</span>
            </>
          )}
        />

        {/* Status filter */}
        <FilterDropdown
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          renderTrigger={opt => (
            <>
              <span className="dd-status-dot" style={{ background: opt.dot }} />
              <span style={{ color: opt.color }}>{opt.label}</span>
            </>
          )}
          renderOption={opt => (
            <>
              <span className="dd-status-dot" style={{ background: opt.dot }} />
              <span>{opt.label}</span>
            </>
          )}
        />

        {/* Clear */}
        {(search || typeFilter || statusFilter) && (
          <button
            className="btn btn-sm btn-secondary toolbar-clear-btn"
            onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter('') }}
          >
            <X size={12} /> Clear
          </button>
        )}

        {/* Results count */}
        {!loading && (
          <span className="resource-results-count">
            {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
          </span>
        )}
      </div>

      {loading
        ? <div className="loading-container"><div className="spinner" /></div>
        : <ResourceList
            resources={filtered}
            onEdit={r => { setEditing(r); setShowModal(true) }}
            onDelete={handleDelete}
            onView={r => { setSelectedResource(r); setShowDetail(true) }}
            canManage={canManage}
          />
      }

      {/* ── Resource Detail Modal ── */}
      {showDetail && selectedResource && (() => {
        const r = selectedResource
        const type   = TYPE_META[r.type]   || TYPE_META.OTHER
        const status = STATUS_META[r.status] || STATUS_META.RETIRED
        const TypeIcon = type.Icon
        return (
          <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowDetail(false)}>
            <div className="modal" style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 38, height: 38, borderRadius: 10, background: type.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <TypeIcon size={20} color={type.color} />
                  </span>
                  <div>
                    <h2 style={{ margin: 0 }}>{r.name}</h2>
                    <span style={{ fontSize: 12, color: type.color, fontWeight: 500 }}>{type.label}</span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-icon btn-sm"
                  onClick={() => setShowDetail(false)}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Image */}
                {r.imageUrl && (
                  <img
                    src={resolveImageUrl(r.imageUrl)}
                    alt={r.name}
                    style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                  />
                )}
                {/* Status */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                  padding: '6px 14px', borderRadius: 20,
                  background: status.bg, color: status.color, border: `1px solid ${status.border}`,
                  fontSize: 13, fontWeight: 600
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
                  {status.label}
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="rd-detail-box">
                    <div className="rd-detail-label">
                      <MapPin size={13} /> Location
                    </div>
                    <div className="rd-detail-value">{r.location}</div>
                  </div>
                  <div className="rd-detail-box">
                    <div className="rd-detail-label">
                      <Users size={13} /> Capacity
                    </div>
                    <div className="rd-detail-value">{r.capacity} people</div>
                  </div>
                </div>

                {/* Description */}
                {r.description ? (
                  <div className="rd-detail-box" style={{ gridColumn: '1 / -1' }}>
                    <div className="rd-detail-label">Description</div>
                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{r.description}</div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No description provided.</p>
                )}

                {/* Admin actions */}
                {canManage && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setShowDetail(false); setEditing(r); setShowModal(true) }}
                    >
                      Edit Resource
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => { setShowDetail(false); handleDelete(r.id) }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Building2 size={18} color="var(--primary)" />
                  <h2>{editing ? 'Edit Resource' : 'Add New Resource'}</h2>
                </div>
                <p>{editing ? 'Update the details for this resource.' : 'Fill in the details to register a new campus resource.'}</p>
              </div>
              <button
                className="btn btn-secondary btn-icon btn-sm"
                onClick={() => { setShowModal(false); setEditing(null) }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <ResourceForm
                initial={editing}
                onSubmit={handleSubmit}
                onCancel={() => { setShowModal(false); setEditing(null) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
