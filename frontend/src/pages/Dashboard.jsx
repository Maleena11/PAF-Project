import React, { useState, useEffect, useCallback } from 'react'
import { Building2, CalendarCheck, Ticket, CheckCircle, Clock, Users, AlertCircle, X, CalendarPlus, MessageSquarePlus, Search, Bell, MapPin, RotateCcw, Calendar, Shield, Zap, BarChart2, Lock, ChevronRight, Activity } from 'lucide-react'
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
import AdminAnalytics from '../components/AdminAnalytics'
import RoleDistributionCard from '../components/RoleDistributionCard'
import AuthProviderCard from '../components/AuthProviderCard'
import PermissionMatrixCard from '../components/PermissionMatrixCard'
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
  const [userRoles, setUserRoles] = useState({ STUDENT: 0, STAFF: 0, ADMIN: 0 })
  const [userProviders, setUserProviders] = useState({ google: 0, local: 0 })
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [reBooking, setReBooking] = useState(null) // booking to prefill for rebook
  const [now, setNow] = useState(() => new Date())

  const isAdmin = user?.role === 'ADMIN'
  const isStaff = user?.role === 'STAFF'

  // Tick every second for the countdown — only for students
  useEffect(() => {
    if (isAdmin || isStaff) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [isAdmin, isStaff])

  // Try to fetch campus-wide bookings for peak hours; fall back to own data on failure
  const [peakBookings, setPeakBookings] = useState(undefined) // undefined=loading | null=use own | array=campus
  useEffect(() => {
    if (isAdmin || isStaff || !user?.id) { setPeakBookings(null); return }
    bookingService.getAll()
      .then(r => setPeakBookings(Array.isArray(r.data) ? r.data : null))
      .catch(() => setPeakBookings(null))
  }, [isAdmin, isStaff, user?.id])

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

    const bookingCall = (isAdmin || isStaff)
      ? bookingService.getAll()
      : bookingService.getByUser(user.id)

    const loadBookings = bookingCall
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.bookings = true; setBookings([]) })

    const ticketCall = (isAdmin || isStaff)
      ? ticketService.getAll()
      : ticketService.getByUser(user.id)

    const loadTickets = ticketCall
      .then(r => setTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => { errs.tickets = true; setTickets([]) })

    const loadUsers = isAdmin
      ? api.get('/auth/users')
          .then(r => {
            const list = Array.isArray(r.data) ? r.data : []
            setUserCount(list.length)
            setUserRoles({
              STUDENT: list.filter(u => u.role === 'STUDENT').length,
              STAFF:   list.filter(u => u.role === 'STAFF').length,
              ADMIN:   list.filter(u => u.role === 'ADMIN').length,
            })
            setUserProviders({
              google: list.filter(u => u.provider === 'google').length,
              local:  list.filter(u => u.provider !== 'google').length,
            })
          })
          .catch(() => {
            setUserCount(0)
            setUserRoles({ STUDENT: 0, STAFF: 0, ADMIN: 0 })
            setUserProviders({ google: 0, local: 0 })
          })
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

  const staffStats = [
    { icon: Building2,    label: 'Total Resources',   value: resources.length,  color: 'purple' },
    { icon: Clock,        label: 'Pending Bookings',  value: pendingBookings,   color: 'yellow' },
    { icon: CheckCircle,  label: 'Active Bookings',   value: approvedBookings,  color: 'green'  },
    { icon: AlertCircle,  label: 'Open Tickets',      value: openTickets,       color: 'red'    },
  ]

  const userStats = [
    { icon: CheckCircle,  label: 'Active Bookings',   value: approvedBookings,  color: 'green'  },
    { icon: Clock,        label: 'Pending Bookings',  value: pendingBookings,   color: 'yellow' },
    { icon: Ticket,       label: 'Open Tickets',      value: openTickets,       color: 'red'    },
    { icon: Building2,    label: 'Available Resources', value: availableResources, color: 'blue' },
  ]

  const stats = isAdmin ? adminStats : isStaff ? staffStats : userStats

  // Countdown targets — student only (not admin, not staff)
  const happeningNow = !isAdmin && !isStaff
    ? bookings.find(b => b.status === 'APPROVED' && new Date(b.startTime) <= now && new Date(b.endTime) >= now) ?? null
    : null

  const nextBooking = !isAdmin && !isStaff && !happeningNow
    ? bookings
        .filter(b => (b.status === 'APPROVED' || b.status === 'PENDING') && new Date(b.startTime) > now)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0]
    : null
  const countdown = nextBooking ? formatCountdown(new Date(nextBooking.startTime) - now) : null

  return (
    <div>
      {isAdmin ? (
        /* ── Admin Hero Banner ── */
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 28px rgba(15,23,42,0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 80, bottom: -80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -30, top: '50%', transform: 'translateY(-50%)', width: 120, height: 120, borderRadius: '50%', background: 'rgba(37,99,235,0.12)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Shield size={28} color="#93c5fd" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                  Administrator Dashboard
                </h1>
                <span style={{
                  background: 'rgba(96,165,250,0.2)',
                  border: '1px solid rgba(96,165,250,0.4)',
                  color: '#93c5fd',
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 9px', borderRadius: 20,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  Admin
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  Welcome back, {user?.name?.split(' ')[0]} — full system control
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.3)' }} />
                  <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '8px 16px',
              color: '#e0f2fe', fontSize: 13, fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#94a3b8', fontWeight: 500,
              }}>
                {userCount ?? 0} users
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#94a3b8', fontWeight: 500,
              }}>
                {resources.length} resources
              </div>
            </div>
          </div>
        </div>
      ) : isStaff ? (
        /* ── Staff Hero Banner ── */
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 28px rgba(6,78,59,0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -30, top: '50%', transform: 'translateY(-50%)', width: 120, height: 120, borderRadius: '50%', background: 'rgba(5,150,105,0.15)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Users size={28} color="#6ee7b7" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                  Staff Portal
                </h1>
                <span style={{
                  background: 'rgba(110,231,183,0.2)',
                  border: '1px solid rgba(110,231,183,0.4)',
                  color: '#6ee7b7',
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 9px', borderRadius: 20,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  Staff
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#a7f3d0' }}>
                  Welcome back, {user?.name?.split(' ')[0]} — manage campus resources & bookings
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.3)' }} />
                  <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Active</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '8px 16px',
              color: '#d1fae5', fontSize: 13, fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#a7f3d0', fontWeight: 500,
              }}>
                {pendingBookings} pending
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#a7f3d0', fontWeight: 500,
              }}>
                {openTickets} tickets
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── User Hero Banner ── */
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(37,99,235,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 60, bottom: -60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#bfdbfe', fontWeight: 400 }}>
              Here's what's happening on campus today.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '8px 16px',
            color: '#e0f2fe', fontSize: 13, fontWeight: 600,
            flexShrink: 0, backdropFilter: 'blur(4px)',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      )}

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

      {isAdmin ? (
        /* Admin: 4 stat cards row, then 2 distribution cards row */
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 16,
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 24,
          }}>
            <RoleDistributionCard roles={userRoles} />
            <AuthProviderCard providers={userProviders} />
          </div>
        </>
      ) : (
        /* Staff / Student: plain 4-card row */
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
      )}

      {/* ── Admin Quick Actions ── */}
      {isAdmin && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '5px 12px' }}>
              <Zap size={13} color="#2563eb" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Actions</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #bfdbfe, #e2e8f0)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { icon: Users,         label: 'Manage Users',     sub: 'View & edit accounts',      to: '/admin/users', bg: '#2563eb', light: '#dbeafe', darkBg: '#1d4ed8' },
              { icon: Building2,     label: 'Manage Resources', sub: 'Add, edit & track status',  to: '/resources',   bg: '#7c3aed', light: '#ede9fe', darkBg: '#6d28d9' },
              { icon: CalendarCheck, label: 'All Bookings',     sub: 'Review reservations',       to: '/bookings',    bg: '#16a34a', light: '#dcfce7', darkBg: '#15803d' },
              { icon: Ticket,        label: 'All Tickets',      sub: 'Manage support cases',      to: '/tickets',     bg: '#dc2626', light: '#fee2e2', darkBg: '#b91c1c' },
            ].map(({ icon: Icon, label, sub, to, bg, light, darkBg }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '0', borderRadius: 14, overflow: 'hidden',
                  background: '#fff',
                  border: `1.5px solid ${light}`,
                  textDecoration: 'none', color: 'inherit',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s, transform 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 20px ${bg}30`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {/* Coloured top stripe */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${bg}, ${darkBg})` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: light,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: `0 2px 8px ${bg}22`,
                  }}>
                    <Icon size={20} color={bg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#111827', lineHeight: 1.3 }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 3 }}>{sub}</div>
                  </div>
                  <ChevronRight size={15} color="#d1d5db" style={{ flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Staff Quick Actions ── */}
      {isStaff && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Actions</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { icon: Building2,     label: 'Manage Resources', sub: 'Add, edit & track status',  to: '/resources',     bg: '#7c3aed', light: '#ede9fe' },
              { icon: CalendarCheck, label: 'All Bookings',     sub: 'Review & approve requests', to: '/bookings',      bg: '#16a34a', light: '#dcfce7' },
              { icon: Ticket,        label: 'All Tickets',      sub: 'Manage support cases',      to: '/tickets',       bg: '#dc2626', light: '#fee2e2' },
              { icon: Bell,          label: 'Notifications',    sub: 'Check your alerts',         to: '/notifications', bg: '#d97706', light: '#fef3c7' },
            ].map(({ icon: Icon, label, sub, to, bg, light }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 12,
                  background: '#fff', border: `1.5px solid ${light}`,
                  borderTop: `3px solid ${bg}`,
                  textDecoration: 'none', color: 'inherit',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: light,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={18} color={bg} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin Analytics ── */}
      {isAdmin && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '5px 12px' }}>
              <BarChart2 size={13} color="#7c3aed" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Analytics</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #ddd6fe, #e2e8f0)' }} />
          </div>
          <AdminAnalytics />
        </div>
      )}

      {/* ── Permission Matrix (admin only) ── */}
      {isAdmin && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '5px 12px' }}>
              <Lock size={13} color="#ea580c" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Access Control</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #fed7aa, #e2e8f0)' }} />
          </div>
          <PermissionMatrixCard />
        </div>
      )}

      {/* ── Pending Approvals Queue (admin + staff) ── */}
      {(isAdmin || isStaff) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '5px 12px' }}>
              <Clock size={13} color="#d97706" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending Actions</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #fde68a, #e2e8f0)' }} />
            {pendingBookings > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '2px 9px', borderRadius: 20 }}>
                {pendingBookings} awaiting
              </span>
            )}
          </div>
          <BookingApprovalQueue onUpdate={loadStats} />
        </div>
      )}

      {/* ── Resource Utilization Summary (admin + staff) ── */}
      {(isAdmin || isStaff) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '5px 12px' }}>
              <Building2 size={13} color="#7c3aed" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resource Management</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #ddd6fe, #e2e8f0)' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 9px', borderRadius: 20 }}>
              {resources.length} total
            </span>
          </div>
          <ResourceUtilizationSummary onUpdate={loadStats} />
        </div>
      )}

      {/* ── Admin/Staff: full-width recent tickets with inline status control ── */}
      {(isAdmin || isStaff) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '5px 12px' }}>
              <Ticket size={13} color="#dc2626" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Support Tickets</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #fecdd3, #e2e8f0)' }} />
            {openTickets > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecdd3', padding: '2px 9px', borderRadius: 20 }}>
                {openTickets} open
              </span>
            )}
          </div>
          <RecentTicketsAdmin onUpdate={loadStats} />
        </div>
      )}

      {/* ── Student: Quick Actions ── */}
      {!isAdmin && !isStaff && (
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
      {!isAdmin && !isStaff && (() => {
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
      {!isAdmin && !isStaff && (() => {
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

      {/* ── User: Booking Calendar Mini-View ── */}
      {!isAdmin && !isStaff && (() => {
        const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const STATUS_DOT = { APPROVED: '#16a34a', PENDING: '#d97706', COMPLETED: '#2563eb' }

        const todayMidnight = new Date()
        todayMidnight.setHours(0, 0, 0, 0)

        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(todayMidnight)
          d.setDate(todayMidnight.getDate() + i)
          return d
        })

        const activeBookings = bookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'REJECTED')

        const bookingsForDay = (day) =>
          activeBookings.filter(b => {
            const s = new Date(b.startTime)
            s.setHours(0, 0, 0, 0)
            return s.getTime() === day.getTime()
          })

        return (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="#2563eb" /> This Week
              </h2>
              <Link to="/bookings" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all →</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {days.map((day, i) => {
                const isToday    = day.getTime() === todayMidnight.getTime()
                const dayBookings = bookingsForDay(day)
                const hasBkgs    = dayBookings.length > 0

                return (
                  <Link
                    key={i}
                    to="/bookings"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '10px 4px', borderRadius: 10, textDecoration: 'none',
                      background: isToday ? '#2563eb' : hasBkgs ? '#eff6ff' : '#fafafa',
                      border: `1.5px solid ${isToday ? '#2563eb' : hasBkgs ? '#bfdbfe' : '#f1f5f9'}`,
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4,
                      color: isToday ? '#bfdbfe' : '#94a3b8' }}>
                      {DAY_NAMES[day.getDay()]}
                    </span>
                    <span style={{ fontSize: 17, fontWeight: 700, marginBottom: 6,
                      color: isToday ? '#fff' : hasBkgs ? '#1e40af' : '#374151' }}>
                      {day.getDate()}
                    </span>
                    {/* booking dots */}
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', minHeight: 8, flexWrap: 'wrap' }}>
                      {dayBookings.slice(0, 3).map((b, j) => (
                        <div key={j} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: isToday ? '#fff' : (STATUS_DOT[b.status] || '#94a3b8'),
                        }} />
                      ))}
                      {dayBookings.length > 3 && (
                        <span style={{ fontSize: 9, fontWeight: 700,
                          color: isToday ? '#bfdbfe' : '#6b7280' }}>
                          +{dayBookings.length - 3}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
              {Object.entries({ Approved: '#16a34a', Pending: '#d97706', Completed: '#2563eb' }).map(([lbl, col]) => (
                <span key={lbl} style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} /> {lbl}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── User: Peak Hours Hint ── */}
      {!isAdmin && !isStaff && peakBookings !== undefined && (() => {
        const SLOTS = [
          { start: 7,  end: 9,  label: '7am',  range: '7–9am'    },
          { start: 9,  end: 11, label: '9am',  range: '9–11am'   },
          { start: 11, end: 13, label: '11am', range: '11am–1pm' },
          { start: 13, end: 15, label: '1pm',  range: '1–3pm'    },
          { start: 15, end: 17, label: '3pm',  range: '3–5pm'    },
          { start: 17, end: 19, label: '5pm',  range: '5–7pm'    },
          { start: 19, end: 21, label: '7pm',  range: '7–9pm'    },
        ]

        const source     = peakBookings ?? bookings
        const isCampus   = Array.isArray(peakBookings)
        const activeBkgs = source.filter(b => b.status !== 'CANCELLED' && b.status !== 'REJECTED')

        const slotData = SLOTS.map(s => ({
          ...s,
          count: activeBkgs.filter(b => {
            const h = new Date(b.startTime).getHours()
            return h >= s.start && h < s.end
          }).length,
        }))

        const maxCount  = Math.max(...slotData.map(s => s.count), 1)
        const hasData   = slotData.some(s => s.count > 0)

        const getColor = (count) => {
          const r = count / maxCount
          if (r >= 0.65) return '#ef4444'
          if (r >= 0.30) return '#f59e0b'
          return '#22c55e'
        }

        const quietSlots = [...slotData]
          .filter(s => s.start >= 8 && s.start <= 17)
          .sort((a, b) => a.count - b.count)
          .slice(0, 2)

        return (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="#d97706" /> Peak Hours
              </h2>
              <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                {isCampus ? 'Campus-wide' : 'Your bookings'}
              </span>
            </div>

            {!hasData ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
                Not enough data yet — book a resource to see peak hour patterns.
              </div>
            ) : (
              <>
                {/* Bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, marginBottom: 2 }}>
                  {slotData.map(s => {
                    const barH = s.count > 0 ? Math.max((s.count / maxCount) * 68, 6) : 0
                    return (
                      <div key={s.start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                        {s.count > 0 && (
                          <span style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>{s.count}</span>
                        )}
                        <div style={{
                          width: '100%', height: barH, borderRadius: '4px 4px 0 0',
                          background: getColor(s.count), transition: 'height 0.4s ease',
                        }} />
                      </div>
                    )
                  })}
                </div>

                {/* Hour labels */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {slotData.map(s => (
                    <div key={s.start} style={{
                      flex: 1, textAlign: 'center', fontSize: 9, color: '#94a3b8',
                      fontWeight: 500, paddingTop: 3, borderTop: '1px solid #f1f5f9',
                    }}>
                      {s.label}
                    </div>
                  ))}
                </div>

                {/* Legend + best time in one row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[['#22c55e', 'Quiet'], ['#f59e0b', 'Moderate'], ['#ef4444', 'Busy']].map(([col, lbl]) => (
                      <span key={lbl} style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: col }} /> {lbl}
                      </span>
                    ))}
                  </div>
                  {quietSlots.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', background: '#f0fdf4',
                      borderRadius: 8, border: '1px solid #bbf7d0',
                    }}>
                      <CheckCircle size={13} color="#16a34a" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>Best: </span>
                      <span style={{ fontSize: 11, color: '#166534' }}>{quietSlots.map(s => s.range).join(' · ')}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* ── User: 2-column upcoming bookings + recent tickets ── */}
      {!isAdmin && !isStaff && (
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
      {!isAdmin && !isStaff && (() => {
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
      {!isAdmin && !isStaff && (() => {
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
            <div className="modal-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RotateCcw size={18} /> Rebook Resource
                </h2>
                <p>Details from your previous booking are prefilled. Pick new times and submit.</p>
              </div>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setReBooking(null)} title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <BookingForm
                initialData={reBooking}
                onSubmit={handleRebook}
                onCancel={() => setReBooking(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
