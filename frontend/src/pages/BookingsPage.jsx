import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, CalendarCheck, X, Eye, LayoutList, Calendar,
  Clock, Users, CheckCircle2, XCircle, AlertCircle,
  Ban, RefreshCw
} from 'lucide-react'
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

const STATUS_LABEL = {
  PENDING:   'Pending',
  APPROVED:  'Approved',
  CANCELLED: 'Cancelled',
  REJECTED:  'Rejected',
  COMPLETED: 'Completed',
}

const STATUS_ICON = {
  PENDING:   <AlertCircle size={11} />,
  APPROVED:  <CheckCircle2 size={11} />,
  CANCELLED: <Ban size={11} />,
  REJECTED:  <XCircle size={11} />,
  COMPLETED: <CheckCircle2 size={11} />,
}

const ALL_STATUSES = ['PENDING', 'APPROVED', 'CANCELLED', 'REJECTED', 'COMPLETED']

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings]       = useState([])
  const [resources, setResources]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [detailBooking, setDetailBooking] = useState(null)
  const [viewMode, setViewMode]       = useState('table')
  const [waitlist, setWaitlist]       = useState([])
  const [wlLoading, setWlLoading]     = useState(false)

  const [wlFilterResource, setWlFilterResource] = useState('')
  const [wlFilterStatus,   setWlFilterStatus]   = useState('WAITING')

  const [filterStatus,     setFilterStatus]     = useState('')
  const [filterResourceId, setFilterResourceId] = useState('')
  const [filterStartDate,  setFilterStartDate]  = useState('')
  const [filterEndDate,    setFilterEndDate]     = useState('')

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'

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
        toast.success("You've been added to the waitlist! We'll notify you if the slot opens up.")
        setShowForm(false)
        loadWaitlist()
        return
      }
      const res = await bookingService.create(data)
      const { totalCreated, skippedConflicts } = res.data
      if (totalCreated > 1) {
        const skippedNote = skippedConflicts > 0
          ? ` (${skippedConflicts} slot${skippedConflicts > 1 ? 's' : ''} skipped due to conflicts)`
          : ''
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
    if (!rejectReason.trim()) { toast.error('Please provide a reason for rejection'); return }
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

  const displayed = isAdmin
    ? bookings
    : bookings.filter(b => !filterStatus || b.status === filterStatus)

  // Status count helpers
  const countOf = (s) => bookings.filter(b => b.status === s).length

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header page-header-row" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Bookings</h1>
          <p style={{ color: '#64748b', marginTop: 2 }}>
            {isAdmin ? 'Manage all campus resource bookings' : 'Your resource booking requests'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="view-toggle-group">
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <LayoutList size={15} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar view"
            >
              <Calendar size={15} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ gap: 6 }}>
            <Plus size={15} /> New Booking
          </button>
        </div>
      </div>

      {/* ── Admin Stats Strip ── */}
      {isAdmin && !loading && (
        <div className="booking-stats-strip">
          <StatChip label="Total" value={bookings.length} color="#2563eb" bg="#eff6ff" />
          <StatChip label="Pending"   value={countOf('PENDING')}   color="#a16207" bg="#fefce8" />
          <StatChip label="Approved"  value={countOf('APPROVED')}  color="#15803d" bg="#f0fdf4" />
          <StatChip label="Completed" value={countOf('COMPLETED')} color="#1d4ed8" bg="#eff6ff" />
          <StatChip label="Cancelled" value={countOf('CANCELLED')} color="#475569" bg="#f8fafc" />
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="booking-filter-bar">
        {/* Status pill tabs */}
        <div className="status-pill-group">
          <button
            className={`status-pill ${filterStatus === '' ? 'active' : ''}`}
            onClick={() => setFilterStatus('')}
          >
            All
          </button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              className={`status-pill status-pill-${s.toLowerCase()} ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {STATUS_LABEL[s]}
              {isAdmin && bookings.length > 0 && (
                <span className="status-pill-count">{countOf(s)}</span>
              )}
            </button>
          ))}
        </div>

        {/* Admin extra filters */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <select className="filter-select-sm" value={filterResourceId} onChange={e => setFilterResourceId(e.target.value)}>
              <option value="">All Resources</option>
              {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input
              className="filter-select-sm"
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              title="From date"
            />
            <span style={{ color: '#94a3b8', fontSize: 12 }}>–</span>
            <input
              className="filter-select-sm"
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              title="To date"
            />
            <button className="btn btn-sm btn-primary" onClick={load} style={{ gap: 4 }}>
              <RefreshCw size={12} /> Apply
            </button>
            {(filterResourceId || filterStartDate || filterEndDate) && (
              <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear</button>
            )}
          </div>
        )}
      </div>

      {/* ── Result count ── */}
      <div style={{ marginBottom: 12, fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
        Showing {displayed.length} booking{displayed.length !== 1 ? 's' : ''}
      </div>

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
        <div className="booking-table-card">
          {displayed.length === 0 ? (
            <div className="empty-state" style={{ padding: '56px 24px' }}>
              <CalendarCheck size={44} style={{ opacity: 0.3, marginBottom: 14 }} />
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>No bookings found</h3>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {filterStatus
                  ? `No ${STATUS_LABEL[filterStatus]?.toLowerCase()} bookings.`
                  : 'Click "New Booking" to reserve a resource.'}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="booking-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Title</th>
                    <th>Resource</th>
                    {isAdmin && <th>Requested By</th>}
                    <th>Date & Time</th>
                    <th style={{ width: 80, textAlign: 'center' }}>
                      <Users size={12} style={{ verticalAlign: 'middle' }} />
                    </th>
                    <th>Status</th>
                    <th>Recurrence</th>
                    <th style={{ width: 200, whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((b) => (
                    <tr key={b.id} className="booking-row">
                      <td>
                        <span className="row-number">#{b.id}</span>
                      </td>
                      <td>
                        <span className="booking-title">{b.title}</span>
                        {b.purpose && (
                          <div className="booking-subtitle">{b.purpose}</div>
                        )}
                      </td>
                      <td>
                        <span className="resource-chip">{b.resource?.name}</span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar-sm">
                              {(b.user?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span>{b.user?.name}</span>
                          </div>
                        </td>
                      )}
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
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
                          {b.expectedAttendees ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`} style={{ gap: 4 }}>
                            {STATUS_ICON[b.status]}
                            {STATUS_LABEL[b.status] || b.status}
                          </span>
                          {b.status === 'REJECTED' && b.rejectionReason && (
                            <div className="rejection-reason">{b.rejectionReason}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        {b.recurrenceRule && b.recurrenceRule !== 'NONE' ? (
                          <span className="recurrence-tag" title={`Repeats ${b.recurrenceRule.toLowerCase()}`}>
                            <RefreshCw size={10} />
                            {b.recurrenceRule.charAt(0) + b.recurrenceRule.slice(1).toLowerCase()}
                            <span style={{ color: '#94a3b8' }}>
                              {b.parentBookingId ? ' · child' : ' · series'}
                            </span>
                          </span>
                        ) : (
                          <span className="once-tag">Once</span>
                        )}
                      </td>
                      <td>
                        <div className="action-cell">
                          {/* Always-visible view button */}
                          <button
                            className="action-btn action-btn-view"
                            title="View details"
                            onClick={() => setDetailBooking(b)}
                          >
                            <Eye size={13} />
                          </button>

                          {/* Divider + contextual actions */}
                          {(
                            (isAdmin && (b.status === 'PENDING' || b.status === 'APPROVED')) ||
                            (!isAdmin && b.status === 'PENDING')
                          ) && (
                            <>
                              <span className="action-divider" />
                              <div className="action-btn-group">
                                {isAdmin && b.status === 'PENDING' && (
                                  <>
                                    <button className="action-btn action-btn-approve" onClick={() => handleApprove(b.id)}>
                                      <CheckCircle2 size={12} /> Approve
                                    </button>
                                    <button className="action-btn action-btn-reject" onClick={() => { setRejectTarget(b.id); setRejectReason('') }}>
                                      <XCircle size={12} /> Reject
                                    </button>
                                  </>
                                )}
                                {isAdmin && b.status === 'APPROVED' && (
                                  <>
                                    <button className="action-btn action-btn-cancel" onClick={() => handleCancel(b.id)}>
                                      Cancel
                                    </button>
                                    <button className="action-btn action-btn-complete" onClick={() => handleComplete(b.id)}>
                                      Complete
                                    </button>
                                  </>
                                )}
                                {!isAdmin && b.status === 'PENDING' && (
                                  <button className="action-btn action-btn-reject" onClick={() => handleCancel(b.id)}>
                                    <XCircle size={12} /> Cancel
                                  </button>
                                )}
                              </div>
                            </>
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

      <div style={{ marginTop: 36 }}>
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-icon-wrap">
              <Clock size={16} />
            </div>
            <div>
              <h2 className="section-title">
                {isAdmin ? 'Waitlist Management' : 'My Waitlist'}
              </h2>
              {waitlist.filter(w => w.status === 'WAITING').length > 0 && (
                <span style={{ fontSize: 12, color: '#b45309' }}>
                  {waitlist.filter(w => w.status === 'WAITING').length} currently waiting
                </span>
              )}
            </div>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="filter-select-sm"
                value={wlFilterResource}
                onChange={e => setWlFilterResource(e.target.value)}
              >
                <option value="">All Resources</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select
                className="filter-select-sm"
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
          <div className="booking-table-card">
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <Clock size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>
                {isAdmin ? 'No waitlist entries' : 'You have no waitlist entries'}
              </h3>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {isAdmin
                  ? 'No one is currently waiting for any resource.'
                  : 'Click a booked slot in the slot picker to join a waitlist.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="booking-table-card">
            <div className="table-wrapper">
              <table className="booking-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {isAdmin && <th>Student</th>}
                    <th>Resource</th>
                    <th>Date & Slot</th>
                    <th>Title</th>
                    <th style={{ textAlign: 'center' }}>
                      <Users size={12} style={{ verticalAlign: 'middle' }} />
                    </th>
                    {isAdmin && <th style={{ textAlign: 'center' }}>Queue</th>}
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map(w => {
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
                      <tr key={w.id} className="booking-row">
                        <td><span className="row-number">#{w.id}</span></td>
                        {isAdmin && (
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar-sm">
                                {(w.user?.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>{w.user?.name}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{w.user?.email}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        <td>
                          <span className="resource-chip">{w.resource?.name}</span>
                        </td>
                        <td>
                          <div className="datetime-cell">
                            <span className="date-primary">{format(new Date(w.slotStart), 'MMM d, yyyy')}</span>
                            <span className="date-time">
                              {format(new Date(w.slotStart), 'HH:mm')}
                              <span style={{ margin: '0 3px', color: '#94a3b8' }}>–</span>
                              {format(new Date(w.slotEnd), 'HH:mm')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="booking-title" style={{ fontSize: 13 }}>{w.title}</div>
                          {w.purpose && <div className="booking-subtitle">{w.purpose}</div>}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                          {w.expectedAttendees ?? '—'}
                        </td>
                        {isAdmin && (
                          <td style={{ textAlign: 'center' }}>
                            {queuePos !== null ? (
                              <span className={`badge ${queuePos === 1 ? 'badge-green' : 'badge-yellow'}`}>
                                #{queuePos}
                              </span>
                            ) : '—'}
                          </td>
                        )}
                        <td>
                          <span className={`badge ${
                            w.status === 'WAITING'  ? 'badge-yellow' :
                            w.status === 'PROMOTED' ? 'badge-green'  : 'badge-gray'
                          }`} style={{ gap: 4 }}>
                            {w.status === 'WAITING'  ? <><AlertCircle size={10} /> Waiting</>  :
                             w.status === 'PROMOTED' ? <><CheckCircle2 size={10} /> Promoted</> :
                             <><Ban size={10} /> Cancelled</>}
                          </span>
                        </td>
                        <td>
                          <span className="date-time" style={{ whiteSpace: 'nowrap' }}>
                            {w.createdAt ? format(new Date(w.createdAt), 'MMM d, HH:mm') : '—'}
                          </span>
                        </td>
                        <td>
                          {w.status === 'WAITING' && (
                            isAdmin
                              ? <button className="action-btn action-btn-reject" onClick={() => handleAdminRemoveWaitlist(w.id, w.user?.name)}>
                                  <XCircle size={13} /> Remove
                                </button>
                              : <button className="action-btn action-btn-reject" onClick={() => handleLeaveWaitlist(w.id)}>
                                  <XCircle size={13} /> Leave
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
          <div className="dialog-card" style={{ maxWidth: 440 }}>
            <div className="dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="dialog-icon dialog-icon-danger">
                  <XCircle size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Reject Booking</h2>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    The requester will be notified with your reason.
                  </p>
                </div>
              </div>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setRejectTarget(null)}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <div className="form-group">
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Reason *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Resource unavailable due to maintenance"
                  autoFocus
                  style={{ marginTop: 6, resize: 'vertical' }}
                />
              </div>
              <div className="form-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleRejectSubmit}>
                  <XCircle size={14} /> Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Detail Modal ── */}
      {detailBooking && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDetailBooking(null)}>
          <div className="dialog-card" style={{ maxWidth: 520 }}>
            <div className="dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="dialog-icon dialog-icon-primary">
                  <CalendarCheck size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Booking #{detailBooking.id}</h2>
                  <span className={`badge ${STATUS_BADGE[detailBooking.status] || 'badge-gray'}`} style={{ gap: 4, marginTop: 4, display: 'inline-flex' }}>
                    {STATUS_ICON[detailBooking.status]}
                    {STATUS_LABEL[detailBooking.status] || detailBooking.status}
                  </span>
                </div>
              </div>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setDetailBooking(null)}>
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div className="detail-section">
                <div className="detail-section-title">Details</div>
                <div className="detail-grid">
                  <DetailRow label="Title"     value={detailBooking.title} />
                  <DetailRow label="Resource"  value={detailBooking.resource?.name} />
                  <DetailRow label="Requested By" value={detailBooking.user?.name} />
                  <DetailRow label="Purpose"   value={detailBooking.purpose} />
                  <DetailRow label="Attendees" value={detailBooking.expectedAttendees} />
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-title">Schedule</div>
                <div className="detail-grid">
                  <DetailRow label="Start" value={format(new Date(detailBooking.startTime), 'PPpp')} />
                  <DetailRow label="End"   value={format(new Date(detailBooking.endTime),   'PPpp')} />
                  {detailBooking.recurrenceRule && detailBooking.recurrenceRule !== 'NONE' && (
                    <>
                      <DetailRow label="Recurrence" value={
                        detailBooking.recurrenceRule.charAt(0) + detailBooking.recurrenceRule.slice(1).toLowerCase()
                      } />
                      {detailBooking.recurrenceEndDate && (
                        <DetailRow label="Repeats Until" value={format(new Date(detailBooking.recurrenceEndDate), 'PP')} />
                      )}
                      {detailBooking.parentBookingId && (
                        <DetailRow label="Series Parent" value={`Booking #${detailBooking.parentBookingId}`} />
                      )}
                    </>
                  )}
                  <DetailRow label="Created" value={format(new Date(detailBooking.createdAt), 'PPpp')} />
                </div>
              </div>

              {(detailBooking.rejectionReason || detailBooking.notes) && (
                <div className="detail-section">
                  <div className="detail-section-title">Notes</div>
                  <div className="detail-grid">
                    {detailBooking.rejectionReason && (
                      <DetailRow
                        label="Rejection Reason"
                        value={<span style={{ color: '#dc2626' }}>{detailBooking.rejectionReason}</span>}
                      />
                    )}
                    {detailBooking.notes && <DetailRow label="Notes" value={detailBooking.notes} />}
                  </div>
                </div>
              )}
            </div>

            <div className="dialog-footer">
              {detailBooking.recurrenceRule && detailBooking.recurrenceRule !== 'NONE' &&
               (detailBooking.status === 'PENDING' || detailBooking.status === 'APPROVED') && (
                <button className="btn btn-danger btn-sm" onClick={() => handleCancelSeries(detailBooking.id)}>
                  <Ban size={13} /> Cancel Entire Series
                </button>
              )}
              <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setDetailBooking(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, color, bg }) {
  return (
    <div className="stat-chip" style={{ background: bg, borderColor: color + '33' }}>
      <span className="stat-chip-value" style={{ color }}>{value}</span>
      <span className="stat-chip-label">{label}</span>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? '—'}</span>
    </div>
  )
}
