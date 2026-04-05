import React from 'react'
import { Building2, MapPin, Users, Pencil, Trash2 } from 'lucide-react'

const statusBadge = {
  AVAILABLE:   'badge-green',
  OCCUPIED:    'badge-yellow',
  MAINTENANCE: 'badge-orange',
  RETIRED:     'badge-gray',
}

export default function ResourceList({ resources, onEdit, onDelete, canManage }) {
  if (!resources.length) {
    return (
      <div className="empty-state">
        <Building2 size={48} />
        <h3>No resources found</h3>
        <p>Add your first campus resource to get started.</p>
      </div>
    )
  }

  return (
    <div className="resource-grid">
      {resources.map(r => (
        <div className="resource-card" key={r.id}>
          <div className="resource-card-img">
            <Building2 size={48} />
          </div>
          <div className="resource-card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="resource-card-title">{r.name}</div>
              <span className={`badge ${statusBadge[r.status] || 'badge-gray'}`}>{r.status}</span>
            </div>
            <div className="resource-card-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <MapPin size={12} /> {r.location}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} /> Capacity: {r.capacity}
              </div>
            </div>
            {r.description && (
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                {r.description.length > 80 ? r.description.slice(0, 80) + '…' : r.description}
              </p>
            )}
            {canManage && (
              <div className="resource-card-footer">
                <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, color: '#475569' }}>
                  {r.type.replace('_', ' ')}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary btn-icon" onClick={() => onEdit(r)} title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-sm btn-danger btn-icon" onClick={() => onDelete(r.id)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
