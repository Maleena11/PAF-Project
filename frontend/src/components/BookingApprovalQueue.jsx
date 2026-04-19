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
    } catch {
      toast.error('Failed to approve booking')
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
    } catch {
      toast.error('Failed to reject booking')
    } finally {
      setActionId(null)
    }
  }

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: '#fffbeb',
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
            <table style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Resource</th>
                  <th>Purpose</th>
                  <th>Date / Time</th>
                  <th>Attendees</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const busy = actionId === b.id
                  return (
                    <tr key={b.id} style={{ background: busy ? '#fafafa' : undefined }}>

                      <td style={{ color: '#94a3b8', fontWeight: 600 }}>#{b.id}</td>

                      {/* User */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{b.user?.name ?? '—'}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{b.user?.email}</div>
                      </td>

                      {/* Resource */}
                      <td>
                        <div style={{ fontWeight: 500 }}>{b.resource?.name ?? '—'}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{b.resource?.type}</div>
                      </td>

                      {/* Purpose (truncated) */}
                      <td style={{ maxWidth: 180 }}>
                        <div style={{
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis', color: '#475569',
                        }} title={b.purpose}>
                          {b.purpose}
                        </div>
                        {b.title && b.title !== b.purpose && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.title}</div>
                        )}
                      </td>

                      {/* Date/Time */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500 }}>
                          {format(new Date(b.startTime), 'MMM d, yyyy')}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {format(new Date(b.startTime), 'HH:mm')} – {format(new Date(b.endTime), 'HH:mm')}
                        </div>
                      </td>

                      {/* Attendees */}
                      <td style={{ textAlign: 'center' }}>
                        {b.expectedAttendees ?? '—'}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprove(b.id)}
                            disabled={busy}
                            title="Approve"
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <CheckCircle size={13} />
                            Approve
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => openReject(b.id)}
                            disabled={busy}
                            title="Reject"
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <XCircle size={13} />
                            Reject
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
            padding: '12px 24px',
            borderTop: '1px solid #f1f5f9',
            textAlign: 'right',
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
