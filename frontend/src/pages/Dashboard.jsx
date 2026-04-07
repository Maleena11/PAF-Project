import React, { useState, useEffect, useCallback } from 'react'
import { Building2, CalendarCheck, Ticket, CheckCircle, Clock, Users, AlertCircle, X, CalendarPlus, MessageSquarePlus, Search, Bell, MapPin, RotateCcw } from 'lucide-react'
import BookingForm from '../components/BookingForm'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import bookingService from '../services/bookingService'
import ticketService from '../services/ticketService'
import api from '../services/api'
import StatCard from '../components/StatCard'
import BookingApprovalQueue from '../components/BookingApprovalQueue'
import RecentTicketsAdmin from '../components/RecentTicketsAdmin'
import ResourceUtilizationSummary from '../components/ResourceUtilizationSummary'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function formatCountdown(ms) {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

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
  const [userCount, setUserCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [reBooking, setReBooking] = useState(null) // booking to prefill for rebook
  const [now, setNow] = useState(() => new Date())

  const isAdmin = user?.role === 'ADMIN'

  // Tick every second for the countdown — only for students
  useEffect(() => {
    if (isAdmin) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [isAdmin])

  const handleRebook = async (data) => {
    try {
      await bookingService.create(data)
      toast.success('Booking submitted!')
      setReBooking(null)
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit booking')
    }
  }

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Cancel this booking?')) return
    try {
      await bookingService.updateStatus(id, 'CANCELLED')
      toast.success('Booking cancelled')
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking')
    }
  }

  const loadStats = useCallback(() => {
    if (!user?.id) return

    const errs = {}

    const loadResources = resourceService.getAll()
      .then(r => setResources(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.resources = true; setResources([]) })

    const bookingCall = isAdmin
      ? bookingService.getAll()
      : bookingService.getByUser(user.id)

    const loadBookings = bookingCall
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.bookings = true; setBookings([]) })

    const ticketCall = isAdmin
      ? ticketService.getAll()
      : ticketService.getByUser(user.id)

    const loadTickets = ticketCall
      .then(r => setTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.tickets = true; setTickets([]) })

    const loadUsers = isAdmin
      ? api.get('/auth/users')
          .then(r => setUserCount(Array.isArray(r.data) ? r.data.length : 0))
          .catch(() => setUserCount(0))
      : Promise.resolve()

    Promise.all([loadResources, loadBookings, loadTickets, loadUsers])
      .finally(() => {
        setErrors(errs)
        setLoading(false)
      })
  }, [user])

  useEffect(() => { loadStats() }, [loadStats])

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  // Derived counts — admin sees system-wide, user sees personal
  const availableResources  = resources.filter(r => r.status === 'AVAILABLE').length
  const pendingBookings      = bookings.filter(b => b.status === 'PENDING').length
  const approvedBookings     = bookings.filter(b => b.status === 'APPROVED').length
  const openTickets          = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length

  const adminStats = [
    { icon: Users,        label: 'Total Users',       value: userCount,         color: 'blue'   },
    { icon: Building2,    label: 'Total Resources',   value: resources.length,  color: 'purple' },
    { icon: Clock,        label: 'Pending Bookings',  value: pendingBookings,   color: 'yellow' },
    { icon: AlertCircle,  label: 'Open Tickets',      value: openTickets,       color: 'red'    },
  ]

  const userStats = [
    { icon: CheckCircle,  label: 'Active Bookings',   value: approvedBookings,  color: 'green'  },
    { icon: Clock,        label: 'Pending Bookings',  value: pendingBookings,   color: 'yellow' },
    { icon: Ticket,       label: 'Open Tickets',      value: openTickets,       color: 'red'    },
    { icon: Building2,    label: 'Available Resources', value: availableResources, color: 'blue' },
  ]

  const stats = isAdmin ? adminStats : userStats

  // Countdown targets — student only
  const happeningNow = !isAdmin
    ? bookings.find(b => b.status === 'APPROVED' && new Date(b.startTime) <= now && new Date(b.endTime) > now)
    : null
  const nextBooking = !isAdmin && !happeningNow
    ? bookings
        .filter(b => (b.status === 'APPROVED' || b.status === 'PENDING') && new Date(b.startTime) > now)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0]
    : null
  const countdown = nextBooking ? formatCountdown(new Date(nextBooking.startTime) - now) : null

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]}{isAdmin ? '' : ' 👋'}</h1>
        <p>{isAdmin ? 'System overview — all users and resources.' : "Here's what's happening on campus today."}</p>
      </div>

      {/* ── Booking Countdown Banner (student only) ── */}
      {happeningNow && (
        <div style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 12,
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: '#bbf7d0', flexShrink: 0,
            boxShadow: '0 0 0 4px rgba(187,247,208,0.4)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
              Your booking is happening now
            </div>
            <div style={{ color: '#bbf7d0', fontSize: 12, marginTop: 2 }}>
              {happeningNow.resource?.name || happeningNow.title}
              {' · '}ends at {format(new Date(happeningNow.endTime), 'HH:mm')}
            </div>
          </div>
          <Link to="/bookings" style={{
            color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
            background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 8,
            flexShrink: 0,
          }}>
            View →
          </Link>
        </div>
      )}

      {nextBooking && countdown && (
        <div style={{
          marginBottom: 20, padding: '14px 20px', borderRadius: 12,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
        }}>
          <CalendarCheck size={22} color="#bfdbfe" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
              Your booking starts in{' '}
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 10px', borderRadius: 6, fontVariantNumeric: 'tabular-nums' }}>
                {countdown}
              </span>
            </div>
            <div style={{ color: '#bfdbfe', fontSize: 12, marginTop: 2 }}>
              {nextBooking.resource?.name || nextBooking.title}
              {' · '}
              {format(new Date(nextBooking.startTime), 'MMM d, HH:mm')}–{format(new Date(nextBooking.endTime), 'HH:mm')}
              {nextBooking.status === 'PENDING' && ' · awaiting approval'}
            </div>
          </div>
          <Link to="/bookings" style={{
            color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
            background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 8,
            flexShrink: 0,
          }}>
            View →
          </Link>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        {stats.map(s => (
          <StatCard
            key={s.label}
            icon={s.icon}
            label={s.label}
            value={s.value}
            color={s.color}
            loading={loading}
          />
        ))}
      </div>

      {/* ── Pending Approvals Queue (admin only) ── */}
      {isAdmin && (
        <div style={{ marginBottom: 24 }}>
          <BookingApprovalQueue onUpdate={loadStats} />
        </div>
      )}

      {/* ── Resource Utilization Summary (admin only) ── */}
      {isAdmin && (
        <div style={{ marginBottom: 24 }}>
          <ResourceUtilizationSummary onUpdate={loadStats} />
        </div>
      )}

      {/* ── Admin: full-width recent tickets with inline status control ── */}
      {isAdmin && (
        <RecentTicketsAdmin onUpdate={loadStats} />
      )}

      {/* ── User: Quick Actions ── */}
      {!isAdmin && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#374151' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { icon: CalendarPlus,      label: 'Book a Resource',  sub: 'Reserve rooms & equipment', to: '/bookings',      bg: '#2563eb', light: '#dbeafe' },
              { icon: Search,            label: 'Browse Resources', sub: "See what's available",       to: '/resources',     bg: '#7c3aed', light: '#ede9fe' },
              { icon: MessageSquarePlus, label: 'Submit a Ticket',  sub: 'Report an issue',            to: '/tickets',       bg: '#dc2626', light: '#fee2e2' },
              { icon: Bell,              label: 'Notifications',    sub: 'Check your alerts',          to: '/notifications', bg: '#d97706', light: '#fef3c7' },
            ].map(({ icon: Icon, label, sub, to, bg, light }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 20px', borderRadius: 12,
                  background: '#fff', border: `1.5px solid ${light}`,
                  textDecoration: 'none', color: 'inherit',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 14px rgba(0,0,0,0.12)`; e.currentTarget.style.borderColor = bg }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = light }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: light,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={20} color={bg} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#111827', lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── User: Resource Availability by Type ── */}
      {!isAdmin && (() => {
        const TYPE_CFG = [
          { key: 'LECTURE_HALL', label: 'Lecture Halls', color: '#2563eb', bg: '#dbeafe' },
          { key: 'LAB',          label: 'Labs',          color: '#7c3aed', bg: '#ede9fe' },
          { key: 'MEETING_ROOM', label: 'Meeting Rooms', color: '#16a34a', bg: '#dcfce7' },
          { key: 'SPORTS',       label: 'Sports',        color: '#ea580c', bg: '#ffedd5' },
          { key: 'STUDY_ROOM',   label: 'Study Rooms',   color: '#4338ca', bg: '#e0e7ff' },
          { key: 'AUDITORIUM',   label: 'Auditoriums',   color: '#db2777', bg: '#fce7f3' },
        ]
        const rows = TYPE_CFG
          .map(cfg => {
            const group = resources.filter(r => r.type === cfg.key)
            if (group.length === 0) return null
            const free  = group.filter(r => r.status === 'AVAILABLE').length
            const maint = group.filter(r => r.status === 'MAINTENANCE').length
            const busy  = group.length - free - maint
            return { ...cfg, total: group.length, free, busy, maint }
          })
          .filter(Boolean)

        if (rows.length === 0) return null

        return (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="#2563eb" /> Availability by Type
              </h2>
              <Link to="/resources" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {rows.map(({ key, label, color, total, free, busy, maint }) => {
                const freePct  = Math.round((free  / total) * 100)
                const busyPct  = Math.round((busy  / total) * 100)
                const maintPct = 100 - freePct - busyPct
                return (
                  <div key={key} style={{
                    padding: '12px 14px', borderRadius: 10,
                    border: '1.5px solid #f1f5f9', background: '#fafafa',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{total} total</span>
                    </div>

                    {/* Stacked bar */}
                    <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', background: '#e2e8f0', display: 'flex', marginBottom: 8 }}>
                      {freePct  > 0 && <div style={{ width: `${freePct}%`,  background: '#16a34a', transition: 'width 0.4s' }} />}
                      {busyPct  > 0 && <div style={{ width: `${busyPct}%`,  background: '#f59e0b', transition: 'width 0.4s' }} />}
                      {maintPct > 0 && <div style={{ width: `${maintPct}%`, background: '#ef4444', transition: 'width 0.4s' }} />}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {free  > 0 && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>● {free} free</span>}
                      {busy  > 0 && <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>● {busy} occupied</span>}
                      {maint > 0 && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>● {maint} maintenance</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── User: Available Resources Snapshot ── */}
      {!isAdmin && (() => {
        const TYPE_META = {
          LECTURE_HALL: { bg: '#dbeafe', color: '#2563eb', label: 'Lecture Hall' },
          LAB:          { bg: '#ede9fe', color: '#7c3aed', label: 'Lab'          },
          MEETING_ROOM: { bg: '#dcfce7', color: '#16a34a', label: 'Meeting Room' },
          SPORTS:       { bg: '#ffedd5', color: '#ea580c', label: 'Sports'       },
          STUDY_ROOM:   { bg: '#e0e7ff', color: '#4338ca', label: 'Study Room'   },
          AUDITORIUM:   { bg: '#fce7f3', color: '#db2777', label: 'Auditorium'   },
          OTHER:        { bg: '#f1f5f9', color: '#475569', label: 'Other'        },
        }
        const snapshot = resources
          .filter(r => r.status === 'AVAILABLE')
          .slice(0, 6)
        return (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#374151' }}>Available Resources</h2>
              <Link to="/resources" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                View all →
              </Link>
            </div>
            {snapshot.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '28px 0', color: '#94a3b8', fontSize: 13 }}>
                No resources available right now.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {snapshot.map(r => {
                  const meta = TYPE_META[r.type] || TYPE_META.OTHER
                  return (
                    <Link
                      key={r.id}
                      to="/resources"
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 10,
                        padding: 16, borderRadius: 12, background: '#fff',
                        border: '1.5px solid #f1f5f9', textDecoration: 'none', color: 'inherit',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        transition: 'box-shadow 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = meta.color }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f1f5f9' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 8, background: meta.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Building2 size={18} color={meta.color} />
                        </div>
                        <span className="badge badge-green" style={{ fontSize: 11 }}>AVAILABLE</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#111827', lineHeight: 1.3, marginBottom: 4 }}>
                          {r.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, background: meta.bg, color: meta.color, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                            {meta.label}
                          </span>
                          {r.location && (
                            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={11} /> {r.location}
                            </span>
                          )}
                          {r.capacity && (
                            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Users size={11} /> {r.capacity}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── User: 2-column upcoming bookings + recent tickets ── */}
      {!isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Upcoming Bookings */}
          {(() => {
            const now = new Date()
            const upcoming = bookings
              .filter(b => new Date(b.startTime) >= now && b.status !== 'CANCELLED' && b.status !== 'REJECTED')
              .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
              .slice(0, 5)
            return (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarCheck size={18} color="#2563eb" /> Upcoming Bookings
                  </h2>
                  <Link to="/bookings" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all</Link>
                </div>
                {errors.bookings ? (
                  <p style={{ color: '#dc2626', fontSize: 13 }}>Could not load bookings.</p>
                ) : upcoming.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>No upcoming bookings.</div>
                ) : (
                  <div className="recent-list">
                    {upcoming.map(b => (
                      <div className="recent-item" key={b.id}>
                        <div className="recent-icon" style={{ background: '#dbeafe' }}>
                          <CalendarCheck size={16} color="#2563eb" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.resource?.name || b.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {format(new Date(b.startTime), 'MMM d, HH:mm')} – {format(new Date(b.endTime), 'HH:mm')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={statusBadge(b.status)}>{b.status}</span>
                          {b.status === 'PENDING' && (
                            <button
                              className="btn btn-sm btn-danger"
                              title="Cancel booking"
                              onClick={() => handleCancelBooking(b.id)}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

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
      )}

      {/* ── User: Ticket Status Tracker ── */}
      {!isAdmin && (() => {
        const STEPS = [
          { key: 'OPEN',        label: 'Open',        color: '#d97706', bg: '#fef3c7' },
          { key: 'IN_PROGRESS', label: 'In Progress', color: '#2563eb', bg: '#dbeafe' },
          { key: 'RESOLVED',    label: 'Resolved',    color: '#16a34a', bg: '#dcfce7' },
        ]
        const STEP_INDEX = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 2 }
        const PRIORITY_COLOR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' }

        const active = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
        if (active.length === 0) return null

        return (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ticket size={18} color="#d97706" /> Active Ticket Status
              </h2>
              <Link to="/tickets" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {active.map(t => {
                const currentStep = STEP_INDEX[t.status] ?? 0
                return (
                  <div key={t.id} style={{
                    border: '1.5px solid #f1f5f9', borderRadius: 10,
                    padding: '14px 16px', background: '#fafafa',
                  }}>
                    {/* Ticket meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: '#111827', flex: 1, minWidth: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{t.id} · {t.title}
                      </span>
                      <span style={{ fontSize: 11, color: '#475569', background: '#f1f5f9',
                        padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
                        {t.category}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0,
                        color: PRIORITY_COLOR[t.priority] || '#475569' }}>
                        {t.priority}
                      </span>
                    </div>

                    {/* Step indicator */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {STEPS.map((step, idx) => {
                        const done    = idx < currentStep
                        const current = idx === currentStep
                        return (
                          <React.Fragment key={step.key}>
                            {/* Step node */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? '#16a34a' : current ? step.color : '#e2e8f0',
                                border: current ? `2px solid ${step.color}` : '2px solid transparent',
                                boxShadow: current ? `0 0 0 4px ${step.bg}` : 'none',
                                transition: 'all 0.2s',
                              }}>
                                {done ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: current ? '#fff' : '#94a3b8',
                                  }} />
                                )}
                              </div>
                              <span style={{
                                fontSize: 11, fontWeight: current ? 700 : 500,
                                color: done ? '#16a34a' : current ? step.color : '#94a3b8',
                                whiteSpace: 'nowrap',
                              }}>
                                {step.label}
                              </span>
                            </div>
                            {/* Connector line */}
                            {idx < STEPS.length - 1 && (
                              <div style={{
                                flex: 1, height: 3, marginBottom: 18, borderRadius: 2,
                                background: idx < currentStep ? '#16a34a' : '#e2e8f0',
                                transition: 'background 0.3s',
                              }} />
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── User: Booking History ── */}
      {!isAdmin && (() => {
        const now = new Date()
        const DOT_COLOR = {
          APPROVED: '#16a34a', COMPLETED: '#2563eb',
          CANCELLED: '#94a3b8', REJECTED: '#dc2626', PENDING: '#d97706',
        }
        const history = bookings
          .filter(b => new Date(b.endTime) < now || b.status === 'CANCELLED' || b.status === 'REJECTED')
          .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
          .slice(0, 5)
        if (history.length === 0) return null
        return (
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#7c3aed" /> Booking History
              </h2>
              <Link to="/bookings" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all</Link>
            </div>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* vertical line */}
              <div style={{
                position: 'absolute', left: 7, top: 8, bottom: 8,
                width: 2, background: '#e2e8f0', borderRadius: 2,
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {history.map(b => {
                  const dot = DOT_COLOR[b.status] || '#94a3b8'
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
                      {/* timeline dot */}
                      <div style={{
                        position: 'absolute', left: -21, top: 3,
                        width: 12, height: 12, borderRadius: '50%',
                        background: dot, border: '2px solid #fff',
                        boxShadow: `0 0 0 2px ${dot}40`, flexShrink: 0,
                      }} />
                      {/* content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: '#111827' }}>
                            {b.resource?.name || b.title}
                          </span>
                          <span className={statusBadge(b.status)} style={{ fontSize: 11 }}>{b.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {b.title} &middot; {format(new Date(b.startTime), 'MMM d')}–{format(new Date(b.endTime), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-secondary"
                        title="Rebook with same details"
                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                        onClick={() => setReBooking({
                          resourceId: b.resource?.id,
                          title: b.title,
                          purpose: b.purpose,
                          expectedAttendees: b.expectedAttendees,
                          notes: b.notes,
                        })}
                      >
                        <RotateCcw size={12} /> Rebook
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Rebook Modal ── */}
      {reBooking && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setReBooking(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} /> Rebook Resource
              </h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setReBooking(null)}>
                <X size={14} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Details from your previous booking are prefilled. Pick new times and submit.
            </p>
            <BookingForm
              initialData={reBooking}
              onSubmit={handleRebook}
              onCancel={() => setReBooking(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
