import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, CalendarCheck, X, Eye, LayoutList, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import bookingService from '../services/bookingService'
import waitlistService from '../services/waitlistService'
import resourceService from '../services/resourceService'
import BookingForm from '../components/BookingForm'
import BookingCalendar from '../components/BookingCalendar'

const STATUS_BADGE = {
  PENDING:   'badge-yellow',
  APPROVED:  'badge-green',
  CANCELLED: 'badge-gray',
  REJECTED:  'badge-red',
  COMPLETED: 'badge-blue',
}

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings]       = useState([])
  const [resources, setResources]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [detailBooking, setDetailBooking] = useState(null)
  const [viewMode, setViewMode]       = useState('table') // 'table' | 'calendar'
  const [waitlist, setWaitlist]           = useState([])
  const [wlLoading, setWlLoading]         = useState(false)
  // Admin waitlist filters
  const [wlFilterResource, setWlFilterResource] = useState('')
  const [wlFilterStatus,   setWlFilterStatus]   = useState('WAITING')

  // Filters
  const [filterStatus,     setFilterStatus]     = useState('')
  const [filterResourceId, setFilterResourceId] = useState('')
  const [filterStartDate,  setFilterStartDate]  = useState('')
  const [filterEndDate,    setFilterEndDate]     = useState('')

  // Reject-with-reason modal
  const [rejectTarget, setRejectTarget] = useState(null) // booking id
  const [rejectReason, setRejectReason] = useState('')

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'

  // Load resources for the filter dropdown (admin only)
  useEffect(() => {
    if (isAdmin) {
      resourceService.getAll()
        .then(r => setResources(Array.isArray(r.data) ? r.data : []))
        .catch(() => {})
    }
  }, [isAdmin])

  const load = () => {
    if (!user?.id) return
    setLoading(true)

    let call
    if (isAdmin) {
      const params = {}
      if (filterStatus)     params.status     = filterStatus
      if (filterResourceId) params.resourceId = filterResourceId
      if (filterStartDate)  params.startDate  = new Date(filterStartDate).toISOString()
      if (filterEndDate)    params.endDate    = new Date(filterEndDate).toISOString()
      call = bookingService.getAll(params)
    } else {
      call = bookingService.getByUser(user.id)
    }

    call
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => { toast.error('Failed to load bookings'); setBookings([]) })
      .finally(() => setLoading(false))
  }

  const loadWaitlist = () => {
    if (!user?.id) return
    setWlLoading(true)
    const call = isAdmin
      ? waitlistService.getAll({
          ...(wlFilterResource ? { resourceId: wlFilterResource } : {}),
          ...(wlFilterStatus   ? { status: wlFilterStatus }       : {}),
        })
      : waitlistService.getByUser(user.id)
    call
      .then(r => setWaitlist(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setWlLoading(false))
  }

  useEffect(load, [user])
  useEffect(loadWaitlist, [user, wlFilterResource, wlFilterStatus])

  const handleCreate = async (data) => {
    try {
      if (data._waitlist) {
        // Waitlist was already submitted by BookingForm; just refresh + notify
        toast.success("You've been added to the waitlist! We'll notify you if the slot opens up.")
        setShowForm(false)
        loadWaitlist()
        return
      }
      const res = await bookingService.create(data)
      const { totalCreated, skippedConflicts } = res.data
      if (totalCreated > 1) {
        const skippedNote = skippedConflicts > 0 ? ` (${skippedConflicts} slot${skippedConflicts > 1 ? 's' : ''} skipped due to conflicts)` : ''
        toast.success(`${totalCreated} recurring bookings submitted!${skippedNote}`)
      } else {
        toast.success('Booking submitted!')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create booking')
    }
  }

  const handleLeaveWaitlist = async (id) => {
    if (!window.confirm('Remove yourself from this waitlist?')) return
    try {
      await waitlistService.leave(id, user.id)
      toast.success('Removed from waitlist')
      loadWaitlist()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to leave waitlist')
    }
  }

  const handleAdminRemoveWaitlist = async (id, userName) => {
    if (!window.confirm(`Remove ${userName} from this waitlist?`)) return
    try {
      await waitlistService.adminRemove(id)
      toast.success('Waitlist entry removed')
      loadWaitlist()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove waitlist entry')
    }
  }

  const handleCancelSeries = async (id) => {
    if (!window.confirm('Cancel all upcoming bookings in this series?')) return
    try {
      const res = await bookingService.cancelSeries(id)
      toast.success(`${res.data.cancelled} booking${res.data.cancelled !== 1 ? 's' : ''} in the series cancelled`)
      setDetailBooking(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel series')
    }
  }

  const handleApprove = async (id) => {
    try {
      await bookingService.updateStatus(id, 'APPROVED')
      toast.success('Booking approved')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve booking')
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    try {
      await bookingService.updateStatus(rejectTarget, 'REJECTED', rejectReason.trim())
      toast.success('Booking rejected')
      setRejectTarget(null)
      setRejectReason('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject booking')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await bookingService.updateStatus(id, 'CANCELLED')
      toast.success('Booking cancelled')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking')
    }
  }

  const handleComplete = async (id) => {
    try {
      await bookingService.updateStatus(id, 'COMPLETED')
      toast.success('Booking marked as completed')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete booking')
    }
  }

  const clearFilters = () => {
    setFilterStatus('')
    setFilterResourceId('')
    setFilterStartDate('')
    setFilterEndDate('')
  }

  // Apply filters client-side for non-admin (already filtered server-side for admin)
  const displayed = isAdmin
    ? bookings
    : bookings.filter(b => !filterStatus || b.status === filterStatus)

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header page-header-row">
        <div>
          <h1>Bookings</h1>
          <p>{isAdmin ? 'Manage all campus resource bookings' : 'Your resource booking requests'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Table / Calendar toggle */}
          <button
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <LayoutList size={15} />
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('calendar')}
            title="Calendar view"
          >
            <Calendar size={15} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Booking
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['PENDING', 'APPROVED', 'CANCELLED', 'REJECTED', 'COMPLETED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {isAdmin && (
          <>
            <select className="filter-select" value={filterResourceId} onChange={e => setFilterResourceId(e.target.value)}>
              <option value="">All Resources</option>
              {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <input
              className="filter-select"
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              title="From date"
            />
            <input
              className="filter-select"
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              title="To date"
            />

            <button className="btn btn-secondary btn-sm" onClick={load}>Apply</button>
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear</button>
          </>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}>
          {displayed.length} booking{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      {/* ── Calendar view ── */}
      {!loading && viewMode === 'calendar' && (
        <div className="card">
          <BookingCalendar bookings={displayed} onSelectBooking={setDetailBooking} />
        </div>
      )}

      {/* ── Table view ── */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : viewMode === 'table' && (
        <div className="card">
          {displayed.length === 0 ? (
            <div className="empty-state">
              <CalendarCheck size={48} />
              <h3>No bookings found</h3>
              <p>Click "New Booking" to reserve a resource.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Resource</th>
                    {isAdmin && <th>Requested By</th>}
                    <th>Start</th>
                    <th>End</th>
                    <th>Attendees</th>
                    <th>Status</th>
                    <th>Recurrence</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(b => (
                    <tr key={b.id}>
                      <td style={{ color: '#94a3b8' }}>#{b.id}</td>
                      <td style={{ fontWeight: 500 }}>{b.title}</td>
                      <td>{b.resource?.name}</td>
                      {isAdmin && <td>{b.user?.name}</td>}
                      <td>{format(new Date(b.startTime), 'MMM d, HH:mm')}</td>
                      <td>{format(new Date(b.endTime), 'MMM d, HH:mm')}</td>
                      <td>{b.expectedAttendees ?? '—'}</td>
                      <td>
                        <div>
                          <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>
                            {b.status}
                          </span>
                          {b.status === 'REJECTED' && b.rejectionReason && (
                            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                              {b.rejectionReason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {b.recurrenceRule && b.recurrenceRule !== 'NONE' ? (
                          <span className="badge badge-blue" title={`Repeats ${b.recurrenceRule.toLowerCase()}`}>
                            {b.recurrenceRule.charAt(0) + b.recurrenceRule.slice(1).toLowerCase()}
                            {b.parentBookingId ? ' (child)' : ' (series)'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {/* View detail */}
                          <button
                            className="btn btn-sm btn-secondary"
                            title="View details"
                            onClick={() => setDetailBooking(b)}
                          >
                            <Eye size={13} />
                          </button>

                          {/* Admin actions */}
                          {isAdmin && b.status === 'PENDING' && (
                            <>
                              <button className="btn btn-sm btn-success" onClick={() => handleApprove(b.id)}>Approve</button>
                              <button className="btn btn-sm btn-danger"  onClick={() => { setRejectTarget(b.id); setRejectReason('') }}>Reject</button>
                            </>
                          )}
                          {isAdmin && b.status === 'APPROVED' && (
                            <>
                              <button className="btn btn-sm btn-secondary" onClick={() => handleCancel(b.id)}>Cancel</button>
                              <button className="btn btn-sm btn-primary"   onClick={() => handleComplete(b.id)}>Complete</button>
                            </>
                          )}

                          {/* User: cancel own pending booking */}
                          {!isAdmin && b.status === 'PENDING' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleCancel(b.id)}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Waitlist Panel ── */}
      <div style={{ marginTop: 32 }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: '#b45309' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {isAdmin ? 'Waitlist Management' : 'My Waitlist'}
            </h2>
            {waitlist.filter(w => w.status === 'WAITING').length > 0 && (
              <span className="badge badge-orange">
                {waitlist.filter(w => w.status === 'WAITING').length} waiting
              </span>
            )}
          </div>

          {/* Admin filters */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                className="filter-select"
                value={wlFilterResource}
                onChange={e => setWlFilterResource(e.target.value)}
              >
                <option value="">All Resources</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select
                className="filter-select"
                value={wlFilterStatus}
                onChange={e => setWlFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="WAITING">Waiting</option>
                <option value="PROMOTED">Promoted</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {wlLoading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : waitlist.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <Clock size={36} />
              <h3>{isAdmin ? 'No waitlist entries' : 'You have no waitlist entries'}</h3>
              <p>{isAdmin ? 'No one is currently waiting for any resource.' : 'Click a booked slot in the slot picker to join a waitlist.'}</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {isAdmin && <th>Student</th>}
                    <th>Resource</th>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Title</th>
                    <th>Attendees</th>
                    {isAdmin && <th>Queue</th>}
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map(w => {
                    // Compute queue position client-side for WAITING entries
                    const queuePos = w.status === 'WAITING'
                      ? 1 + waitlist.filter(x =>
                          x.status === 'WAITING' &&
                          x.resource?.id === w.resource?.id &&
                          x.slotStart === w.slotStart &&
                          x.slotEnd   === w.slotEnd &&
                          new Date(x.createdAt) < new Date(w.createdAt)
                        ).length
                      : null

                    return (
                      <tr key={w.id}>
                        <td style={{ color: '#94a3b8' }}>#{w.id}</td>
                        {isAdmin && (
                          <td>
                            <div style={{ fontWeight: 500 }}>{w.user?.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{w.user?.email}</div>
                          </td>
                        )}
                        <td>{w.resource?.name}</td>
                        <td>{format(new Date(w.slotStart), 'MMM d, yyyy')}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {format(new Date(w.slotStart), 'HH:mm')} – {format(new Date(w.slotEnd), 'HH:mm')}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{w.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{w.purpose}</div>
                        </td>
                        <td>{w.expectedAttendees ?? '—'}</td>
                        {isAdmin && (
                          <td>
                            {queuePos !== null ? (
                              <span
                                className={`badge ${queuePos === 1 ? 'badge-green' : 'badge-yellow'}`}
                                title="Position in queue for this slot"
                              >
                                #{queuePos}
                              </span>
                            ) : '—'}
                          </td>
                        )}
                        <td>
                          <span className={`badge ${
                            w.status === 'WAITING'  ? 'badge-yellow' :
                            w.status === 'PROMOTED' ? 'badge-green'  : 'badge-gray'
                          }`}>
                            {w.status === 'WAITING'  ? '⏳ Waiting'   :
                             w.status === 'PROMOTED' ? '✓ Promoted'  : 'Cancelled'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {w.createdAt ? format(new Date(w.createdAt), 'MMM d, HH:mm') : '—'}
                        </td>
                        <td>
                          {w.status === 'WAITING' && (
                            isAdmin
                              ? <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleAdminRemoveWaitlist(w.id, w.user?.name)}
                                >
                                  Remove
                                </button>
                              : <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleLeaveWaitlist(w.id)}
                                >
                                  Leave
                                </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── New Booking Modal ── */}
      {showForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>New Booking</h2>
                <p>Reserve a campus resource for your activity</p>
              </div>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowForm(false)} title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <BookingForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Reject with Reason Modal ── */}
      {rejectTarget && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setRejectTarget(null)}>
          <div className="modal-plain" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Reject Booking</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setRejectTarget(null)}><X size={14} /></button>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
              Please provide a reason. The requester will be notified.
            </p>
            <div className="form-group">
              <label>Reason *</label>
              <textarea
                className="form-control"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Resource unavailable due to maintenance"
                autoFocus
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRejectSubmit}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}


      {/* ── Booking Detail Modal ── */}
      {detailBooking && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDetailBooking(null)}>
          <div className="modal-plain" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Booking #{detailBooking.id}</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setDetailBooking(null)}><X size={14} /></button>
            </div>

            <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <Row label="Title"      value={detailBooking.title} />
              <Row label="Resource"   value={detailBooking.resource?.name} />
              <Row label="Requested By" value={detailBooking.user?.name} />
              <Row label="Purpose"    value={detailBooking.purpose} />
              <Row label="Attendees"  value={detailBooking.expectedAttendees} />
              <Row label="Start"      value={format(new Date(detailBooking.startTime), 'PPpp')} />
              <Row label="End"        value={format(new Date(detailBooking.endTime),   'PPpp')} />
              <Row label="Status"
                value={
                  <span className={`badge ${STATUS_BADGE[detailBooking.status] || 'badge-gray'}`}>
                    {detailBooking.status}
                  </span>
                }
              />
              {detailBooking.rejectionReason && (
                <Row label="Rejection Reason" value={<span style={{ color: '#dc2626' }}>{detailBooking.rejectionReason}</span>} />
              )}
              {detailBooking.recurrenceRule && detailBooking.recurrenceRule !== 'NONE' && (
                <>
                  <Row label="Recurrence" value={detailBooking.recurrenceRule.charAt(0) + detailBooking.recurrenceRule.slice(1).toLowerCase()} />
                  {detailBooking.recurrenceEndDate && (
                    <Row label="Repeats Until" value={format(new Date(detailBooking.recurrenceEndDate), 'PP')} />
                  )}
                  {detailBooking.parentBookingId && (
                    <Row label="Series Parent" value={`Booking #${detailBooking.parentBookingId}`} />
                  )}
                </>
              )}
              {detailBooking.notes && <Row label="Notes" value={detailBooking.notes} />}
              <Row label="Created"    value={format(new Date(detailBooking.createdAt), 'PPpp')} />
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {detailBooking.recurrenceRule && detailBooking.recurrenceRule !== 'NONE' &&
               (detailBooking.status === 'PENDING' || detailBooking.status === 'APPROVED') && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCancelSeries(detailBooking.id)}
                >
                  Cancel Entire Series
                </button>
              )}
              <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setDetailBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ fontWeight: 600, minWidth: 140, color: '#475569' }}>{label}:</span>
      <span style={{ color: '#1e293b' }}>{value ?? '—'}</span>
    </div>
  )
}
