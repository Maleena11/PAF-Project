import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, X, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import bookingService from '../services/bookingService'

export default function BookingApprovalQueue({ onUpdate }) {
  const [bookings, setBookings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [actionId, setActionId]       = useState(null)   // id currently being approved
  const [rejectTarget, setRejectTarget] = useState(null) // id to reject
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    bookingService.getAll({ status: 'PENDING' })
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id) => {
    setActionId(id)
    try {
      await bookingService.updateStatus(id, 'APPROVED')
      toast.success('Booking approved')
      load()
      onUpdate?.()
    } catch (e) {
      toast.error(e.message || 'Failed to approve booking')
    } finally {
      setActionId(null)
    }
  }

  const openReject = (id) => {
    setRejectTarget(id)
    setRejectReason('')
  }

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    setActionId(rejectTarget)
    try {
      await bookingService.updateStatus(rejectTarget, 'REJECTED', rejectReason.trim())
      toast.success('Booking rejected')
      setRejectTarget(null)
      setRejectReason('')
      load()
      onUpdate?.()
    } catch (e) {
      toast.error(e.message || 'Failed to reject booking')
    } finally {
      setActionId(null)
    }
  }

  return (
    <>
      <div className="booking-table-card">

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: '#fef3c7', borderRadius: 8,
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={18} color="#d97706" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                Pending Approvals
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
                {loading ? '…' : `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} awaiting review`}
              </p>
            </div>
          </div>

          {/* badge */}
          {!loading && bookings.length > 0 && (
            <span style={{
              background: '#f59e0b', color: '#fff',
              borderRadius: 20, fontSize: 12, fontWeight: 700,
              padding: '3px 10px',
            }}>
              {bookings.length} pending
            </span>
          )}
        </div>

        {/* ── Body ── */}
        {loading ? (
          <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <CheckCircle size={38} color="#86efac" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 600, color: '#374151', fontSize: 15 }}>All caught up!</div>
            <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>No bookings waiting for approval.</div>
          </div>
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table className="booking-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>User</th>
                  <th>Resource</th>
                  <th>Purpose</th>
                  <th>Date &amp; Time</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Attendees</th>
                  <th style={{ width: 180, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const busy = actionId === b.id
                  return (
                    <tr key={b.id} className="booking-row booking-row-pending" style={{ opacity: busy ? 0.6 : 1 }}>

                      <td>
                        <span className="row-number">#{b.id}</span>
                      </td>

                      {/* User */}
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-sm">
                            {(b.user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="booking-title">{b.user?.name ?? '—'}</div>
                            <div className="booking-subtitle">{b.user?.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Resource */}
                      <td>
                        <span className="resource-chip">{b.resource?.name ?? '—'}</span>
                        {b.resource?.type && (
                          <div className="booking-subtitle" style={{ marginTop: 3 }}>{b.resource.type}</div>
                        )}
                      </td>

                      {/* Purpose */}
                      <td style={{ maxWidth: 180 }}>
                        <div className="booking-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.purpose}>
                          {b.title || b.purpose || '—'}
                        </div>
                        {b.purpose && b.title !== b.purpose && (
                          <div className="booking-subtitle">{b.purpose}</div>
                        )}
                      </td>

                      {/* Date/Time */}
                      <td>
                        <div className="datetime-cell">
                          <span className="date-primary">{format(new Date(b.startTime), 'MMM d, yyyy')}</span>
                          <span className="date-time">
                            {format(new Date(b.startTime), 'HH:mm')}
                            <span style={{ margin: '0 3px', color: '#94a3b8' }}>–</span>
                            {format(new Date(b.endTime), 'HH:mm')}
                          </span>
                        </div>
                      </td>

                      {/* Attendees */}
                      <td style={{ textAlign: 'center', fontSize: 14, color: '#475569', fontWeight: 500 }}>
                        {b.expectedAttendees ?? '—'}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="action-cell" style={{ justifyContent: 'center' }}>
                          <button
                            className="action-btn action-btn-approve"
                            onClick={() => handleApprove(b.id)}
                            disabled={busy}
                            title="Approve"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            className="action-btn action-btn-reject"
                            onClick={() => openReject(b.id)}
                            disabled={busy}
                            title="Reject"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer link to full bookings page ── */}
        {!loading && bookings.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'right',
            background: '#f8fafc',
          }}>
            <a href="/bookings" style={{
              fontSize: 12, color: '#2563eb', fontWeight: 600,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              View all bookings <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setRejectTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Reject Booking #{rejectTarget}</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setRejectTarget(null)}
              >
                <X size={14} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 14 }}>
              Provide a reason — the requester will be notified.
            </p>

            <div className="form-group">
              <label>Reason <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                className="form-control"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Resource unavailable due to maintenance"
                autoFocus
              />
            </div>

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRejectSubmit}
                disabled={actionId === rejectTarget}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
