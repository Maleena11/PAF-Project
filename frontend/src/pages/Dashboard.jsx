import React, { useState, useEffect } from 'react'
import { Building2, CalendarCheck, Ticket, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import bookingService from '../services/bookingService'
import ticketService from '../services/ticketService'
import { format } from 'date-fns'

function statusBadge(status) {
  const map = {
    AVAILABLE: 'badge-green', APPROVED: 'badge-green', RESOLVED: 'badge-green', CLOSED: 'badge-green',
    PENDING: 'badge-yellow', OPEN: 'badge-yellow', IN_PROGRESS: 'badge-blue',
    CANCELLED: 'badge-gray', REJECTED: 'badge-red', MAINTENANCE: 'badge-orange',
  }
  return `badge ${map[status] || 'badge-gray'}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [bookings, setBookings] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'

  useEffect(() => {
    if (!user?.id) return

    const errs = {}

    // Load each independently so one failure doesn't block the rest
    const loadResources = resourceService.getAll()
      .then(r => setResources(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.resources = true; setResources([]) })

    // Admins get all bookings, students get their own
    const bookingCall = isAdmin
      ? bookingService.getAll()
      : bookingService.getByUser(user.id)

    const loadBookings = bookingCall
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.bookings = true; setBookings([]) })

    // Admins get all tickets, students get their own
    const ticketCall = isAdmin
      ? ticketService.getAll()
      : ticketService.getByUser(user.id)

    const loadTickets = ticketCall
      .then(r => setTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.tickets = true; setTickets([]) })

    Promise.all([loadResources, loadBookings, loadTickets])
      .finally(() => {
        setErrors(errs)
        setLoading(false)
      })
  }, [user])

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  const availableCount = (resources || []).filter(r => r.status === 'AVAILABLE').length
  const pendingCount = (bookings || []).filter(b => b.status === 'PENDING').length
  const openTickets = (tickets || []).filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's what's happening on campus today.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Building2 size={22} /></div>
          <div><div className="stat-value">{resources.length}</div><div className="stat-label">Total Resources</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={22} /></div>
          <div><div className="stat-value">{availableCount}</div><div className="stat-label">Available Now</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Clock size={22} /></div>
          <div><div className="stat-value">{pendingCount}</div><div className="stat-label">Pending Bookings</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Ticket size={22} /></div>
          <div><div className="stat-value">{openTickets}</div><div className="stat-label">Open Tickets</div></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Bookings */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={18} color="#2563eb" /> Recent Bookings
          </h2>
          {errors.bookings ? (
            <p style={{ color: '#dc2626', fontSize: 13 }}>Could not load bookings.</p>
          ) : (
            <div className="recent-list">
              {bookings.slice(0, 5).map(b => (
                <div className="recent-item" key={b.id}>
                  <div className="recent-icon" style={{ background: '#dbeafe' }}>
                    <CalendarCheck size={16} color="#2563eb" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {b.resource?.name} · {format(new Date(b.startTime), 'MMM d, HH:mm')}
                    </div>
                  </div>
                  <span className={statusBadge(b.status)}>{b.status}</span>
                </div>
              ))}
              {bookings.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>No bookings yet.</div>
              )}
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={18} color="#dc2626" /> Recent Tickets
          </h2>
          {errors.tickets ? (
            <p style={{ color: '#dc2626', fontSize: 13 }}>Could not load tickets.</p>
          ) : (
            <div className="recent-list">
              {tickets.slice(0, 5).map(t => (
                <div className="recent-item" key={t.id}>
                  <div className="recent-icon" style={{ background: '#fee2e2' }}>
                    <Ticket size={16} color="#dc2626" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{t.category} · {t.priority}</div>
                  </div>
                  <span className={statusBadge(t.status)}>{t.status.replace('_', ' ')}</span>
                </div>
              ))}
              {tickets.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>No tickets yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}