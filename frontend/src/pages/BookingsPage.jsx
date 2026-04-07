import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, CalendarCheck, X, Eye, LayoutList, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import bookingService from '../services/bookingService'
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

  useEffect(load, [user])

  const handleCreate = async (data) => {
    try {
      await bookingService.create(data)
      toast.success('Booking submitted!')
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create booking')
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

      {/* ── New Booking Modal ── */}
      {showForm && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <h2>New Booking</h2>
            <BookingForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* ── Reject with Reason Modal ── */}
      {rejectTarget && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setRejectTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
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
          <div className="modal" style={{ maxWidth: 500 }}>
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
              {detailBooking.notes && <Row label="Notes" value={detailBooking.notes} />}
              <Row label="Created"    value={format(new Date(detailBooking.createdAt), 'PPpp')} />
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setDetailBooking(null)}>Close</button>
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
