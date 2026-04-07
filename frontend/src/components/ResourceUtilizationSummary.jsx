import React, { useState, useEffect, useCallback } from 'react'
import { Building2, MapPin, Users, Pencil, ExternalLink, X } from 'lucide-react'
import toast from 'react-hot-toast'
import resourceService from '../services/resourceService'
import ResourceForm from './ResourceForm'

const STATUS_CONFIG = {
  AVAILABLE:   { cls: 'badge-green',  label: 'Available',   bar: '#22c55e' },
  OCCUPIED:    { cls: 'badge-blue',   label: 'Occupied',    bar: '#3b82f6' },
  MAINTENANCE: { cls: 'badge-orange', label: 'Maintenance', bar: '#f97316' },
  RETIRED:     { cls: 'badge-gray',   label: 'Retired',     bar: '#94a3b8' },
}

const TYPE_LABEL = {
  LECTURE_HALL: 'Lecture Hall',
  LAB:          'Lab',
  MEETING_ROOM: 'Meeting Room',
  SPORTS:       'Sports',
  STUDY_ROOM:   'Study Room',
  AUDITORIUM:   'Auditorium',
  OTHER:        'Other',
}

const FILTER_TABS = ['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RETIRED']

export default function ResourceUtilizationSummary({ onUpdate }) {
  const [resources, setResources] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [editing,   setEditing]   = useState(null)   // resource being edited
  const [saving,    setSaving]    = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    resourceService.getAll()
      .then(r => setResources(Array.isArray(r.data) ? r.data : []))
      .catch(() => setResources([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleEditSubmit = async (data) => {
    setSaving(true)
    try {
      await resourceService.update(editing.id, data)
      toast.success(`"${data.name}" updated`)
      setEditing(null)
      load()
      onUpdate?.()
    } catch {
      toast.error('Failed to update resource')
    } finally {
      setSaving(false)
    }
  }

  // ── Derived counts for utilization bar ──
  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map(s => [s, resources.filter(r => r.status === s).length])
  )
  const total = resources.length || 1   // avoid /0

  // ── Filtered list ──
  const displayed = activeTab === 'ALL'
    ? resources
    : resources.filter(r => r.status === activeTab)

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: '#ede9fe', borderRadius: 8,
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={18} color="#7c3aed" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                Resource Utilization
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                {loading ? '…' : `${total} total · ${counts.AVAILABLE} available · ${counts.MAINTENANCE} under maintenance`}
              </p>
            </div>
          </div>

          <a href="/resources" style={{
            fontSize: 12, color: '#2563eb', fontWeight: 600,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            Manage all <ExternalLink size={11} />
          </a>
        </div>

        {/* ── Utilization bar ── */}
        {!loading && total > 0 && (
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9' }}>
            {/* Stacked bar */}
            <div style={{
              display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden',
              background: '#f1f5f9',
            }}>
              {Object.entries(STATUS_CONFIG).map(([status, { bar }]) => {
                const pct = (counts[status] / total) * 100
                return pct > 0 ? (
                  <div key={status} style={{
                    width: `${pct}%`, background: bar,
                    transition: 'width .4s ease',
                  }} title={`${STATUS_CONFIG[status].label}: ${counts[status]}`} />
                ) : null
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_CONFIG).map(([status, { bar, label }]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: bar, flexShrink: 0 }} />
                  <span>{label}</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {counts[status]} ({Math.round((counts[status] / total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div style={{
          display: 'flex', gap: 4, padding: '10px 24px',
          borderBottom: '1px solid #f1f5f9', background: '#fafafa',
        }}>
          {FILTER_TABS.map(tab => {
            const isActive = activeTab === tab
            const count = tab === 'ALL' ? resources.length : counts[tab] ?? 0
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: isActive ? '#1e293b' : 'transparent',
                  color: isActive ? '#fff' : '#64748b',
                  transition: 'all .15s',
                }}
              >
                {tab === 'ALL' ? 'All' : STATUS_CONFIG[tab].label} ({count})
              </button>
            )
          })}
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <Building2 size={38} color="#cbd5e1" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>No resources found</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
              {activeTab !== 'ALL' ? `No resources with status "${STATUS_CONFIG[activeTab]?.label}".` : 'Add your first resource.'}
            </div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} /> Location
                    </span>
                  </th>
                  <th>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} /> Capacity
                    </span>
                  </th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => {
                  const sc = STATUS_CONFIG[r.status] || { cls: 'badge-gray', label: r.status }
                  return (
                    <tr key={r.id}>
                      <td style={{ color: '#94a3b8', fontWeight: 600 }}>#{r.id}</td>

                      {/* Name */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.name}</div>
                        {r.description && (
                          <div style={{
                            fontSize: 11, color: '#94a3b8', marginTop: 1,
                            maxWidth: 200, whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }} title={r.description}>
                            {r.description}
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td style={{ color: '#475569' }}>
                        {TYPE_LABEL[r.type] ?? r.type}
                      </td>

                      {/* Location */}
                      <td style={{ color: '#475569' }}>{r.location}</td>

                      {/* Capacity */}
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{r.capacity}</td>

                      {/* Status badge */}
                      <td>
                        <span className={`badge ${sc.cls}`}>{sc.label}</span>
                      </td>

                      {/* Edit button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditing(r)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title={`Edit ${r.name}`}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Resource Modal ── */}
      {editing && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !saving && setEditing(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17 }}>Edit Resource</h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  #{editing.id} · {editing.name}
                </p>
              </div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                <X size={14} />
              </button>
            </div>

            <ResourceForm
              initial={editing}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}
