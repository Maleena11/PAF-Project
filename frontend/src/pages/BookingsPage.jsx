import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import bookingService from '../services/bookingService'
import BookingForm from '../components/BookingForm'

const STATUS_BADGE = {
  PENDING: 'badge-yellow',
  APPROVED: 'badge-green',
  CANCELLED: 'badge-gray',
  REJECTED: 'badge-red',
  COMPLETED: 'badge-blue',
}

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'

  const load = () => {
    if (!user?.id) return
    setLoading(true)
    // Admins see all bookings; students only see their own
    const call = isAdmin
      ? bookingService.getAll()
      : bookingService.getByUser(user.id)

    call
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(err => {
        console.error(err)
        toast.error('Failed to load bookings')
        setBookings([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [user])

  const handleCreate = async (data) => {
    try {
      await bookingService.create(data)
      toast.success('Booking submitted!')
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to create booking')
    }
  }

  const handleStatus = async (id, status) => {
    try {
      await bookingService.updateStatus(id, status)
      toast.success(`Booking ${status.toLowerCase()}`)
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await bookingService.updateStatus(id, 'CANCELLED')
      toast.success('Booking cancelled')
      load()
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking')
    }
  }

  const displayed = filterStatus
    ? bookings.filter(b => b.status === filterStatus)
    : bookings

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Bookings</h1>
          <p>{isAdmin ? 'Manage all campus resource bookings' : 'Your resource booking requests'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Booking
        </button>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['PENDING', 'APPROVED', 'CANCELLED', 'REJECTED', 'COMPLETED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}>
          {displayed.length} booking{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
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
                      <td>
                        <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {/* Admin actions */}
                        {isAdmin && b.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-success" onClick={() => handleStatus(b.id, 'APPROVED')}>Approve</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleStatus(b.id, 'REJECTED')}>Reject</button>
                          </div>
                        )}
                        {isAdmin && b.status === 'APPROVED' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleStatus(b.id, 'CANCELLED')}>Cancel</button>
                        )}
                        {/* Student can cancel their own pending booking */}
                        {!isAdmin && b.status === 'PENDING' && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleCancel(b.id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>New Booking</h2>
            <BookingForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}