import React, { useState, useEffect, useCallback } from 'react'
import { Ticket, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import ticketService from '../services/ticketService'

const PRIORITY_STYLE = {
  LOW:      { cls: 'badge-green',  label: 'Low'      },
  MEDIUM:   { cls: 'badge-blue',   label: 'Medium'   },
  HIGH:     { cls: 'badge-yellow', label: 'High'     },
  CRITICAL: { cls: 'badge-red',    label: 'Critical' },
}

const STATUS_STYLE = {
  OPEN:        { cls: 'badge-yellow', label: 'Open'        },
  IN_PROGRESS: { cls: 'badge-blue',   label: 'In Progress' },
  RESOLVED:    { cls: 'badge-green',  label: 'Resolved'    },
  CLOSED:      { cls: 'badge-gray',   label: 'Closed'      },
}

// Valid forward transitions — CLOSED is terminal
const NEXT_STATUSES = {
  OPEN:        ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED:    ['RESOLVED', 'CLOSED'],
  CLOSED:      [],
}

export default function RecentTicketsAdmin({ onUpdate }) {
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  // Track which row is currently being updated { id → newStatus }
  const [updating, setUpdating] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    ticketService.getAll()
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : []
        // Show 8 most recent (sort by createdAt desc)
        const sorted = [...all].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
        setTickets(sorted.slice(0, 8))
      })
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (ticketId, newStatus) => {
    setUpdating(prev => ({ ...prev, [ticketId]: newStatus }))
    try {
      await ticketService.updateStatus(ticketId, newStatus)
      toast.success(`Ticket #${ticketId} → ${STATUS_STYLE[newStatus]?.label}`)
      // Optimistic update in local state
      setTickets(prev =>
        prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t)
      )
      onUpdate?.()
    } catch {
      toast.error('Failed to update ticket status')
    } finally {
      setUpdating(prev => {
        const next = { ...prev }
        delete next[ticketId]
        return next
      })
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: '#fee2e2', borderRadius: 8,
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ticket size={18} color="#dc2626" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
              Recent Tickets
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              {loading ? '…' : `${tickets.length} most recent · all users`}
            </p>
          </div>
        </div>

        <a href="/tickets" style={{
          fontSize: 12, color: '#2563eb', fontWeight: 600,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          View all <ExternalLink size={11} />
        </a>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ padding: '36px 24px', textAlign: 'center' }}>
          <Ticket size={38} color="#cbd5e1" style={{ marginBottom: 10 }} />
          <div style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>No tickets yet</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
            Tickets submitted by users will appear here.
          </div>
        </div>
      ) : (
        <div className="table-wrapper" style={{ margin: 0 }}>
          <table style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Submitted By</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Submitted</th>
                <th>Status</th>
                <th style={{ minWidth: 150 }}>Update Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => {
                const priorityStyle = PRIORITY_STYLE[t.priority] || { cls: 'badge-gray', label: t.priority }
                const statusStyle   = STATUS_STYLE[t.status]     || { cls: 'badge-gray', label: t.status }
                const nextOptions   = NEXT_STATUSES[t.status]    || []
                const isBusy        = t.id in updating

                return (
                  <tr key={t.id} style={{ opacity: isBusy ? 0.6 : 1, transition: 'opacity .2s' }}>

                    <td style={{ color: '#94a3b8', fontWeight: 600 }}>#{t.id}</td>

                    {/* Title */}
                    <td style={{ maxWidth: 200 }}>
                      <div style={{
                        fontWeight: 600, color: '#1e293b',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }} title={t.title}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div style={{
                          fontSize: 11, color: '#94a3b8', marginTop: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }} title={t.description}>
                          {t.description}
                        </div>
                      )}
                    </td>

                    {/* Submitted by */}
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.user?.name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.user?.role}</div>
                    </td>

                    {/* Category */}
                    <td style={{ color: '#475569', textTransform: 'capitalize' }}>
                      {t.category?.toLowerCase().replace('_', ' ')}
                    </td>

                    {/* Priority badge */}
                    <td>
                      <span className={`badge ${priorityStyle.cls}`}>
                        {priorityStyle.label}
                      </span>
                    </td>

                    {/* Submitted date */}
                    <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                      {format(new Date(t.createdAt), 'MMM d, yyyy')}
                    </td>

                    {/* Status badge */}
                    <td>
                      <span className={`badge ${statusStyle.cls}`}>
                        {statusStyle.label}
                      </span>
                    </td>

                    {/* Inline status dropdown */}
                    <td onClick={e => e.stopPropagation()}>
                      {nextOptions.length > 0 ? (
                        <select
                          className="filter-select"
                          style={{ fontSize: 12, minWidth: 130 }}
                          value={t.status}
                          disabled={isBusy}
                          onChange={e => handleStatusChange(t.id, e.target.value)}
                        >
                          {nextOptions.map(s => (
                            <option key={s} value={s}>
                              {STATUS_STYLE[s]?.label ?? s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
