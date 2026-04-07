import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Bell, BellOff, CheckCheck, CalendarCheck,
  Ticket, AlertCircle, Trash2, RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  BOOKING: { Icon: CalendarCheck, bg: '#dbeafe', color: '#2563eb', label: 'Booking',  badgeClass: 'badge-blue'   },
  TICKET:  { Icon: Ticket,        bg: '#fee2e2', color: '#dc2626', label: 'Ticket',   badgeClass: 'badge-red'    },
  SYSTEM:  { Icon: AlertCircle,   bg: '#dcfce7', color: '#16a34a', label: 'System',   badgeClass: 'badge-green'  },
  GENERAL: { Icon: Bell,          bg: '#f1f5f9', color: '#475569', label: 'General',  badgeClass: 'badge-gray'   },
}

const FILTERS = ['ALL', 'BOOKING', 'TICKET', 'SYSTEM', 'GENERAL']

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({ n, onMarkRead, onDelete }) {
  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.GENERAL
  const { Icon } = cfg

  return (
    <div
      className={`notif-item ${n.read ? '' : 'unread'}`}
      onClick={() => !n.read && onMarkRead(n.id)}
      style={{ cursor: n.read ? 'default' : 'pointer' }}
    >
      {/* Icon */}
      <div className="notif-icon-wrap" style={{ background: cfg.bg }}>
        <Icon size={16} color={cfg.color} />
      </div>

      {/* Body */}
      <div className="notif-content">
        <div className="notif-header-row">
          <span className="notif-title">{n.title}</span>
          <span className={`badge ${cfg.badgeClass} notif-type-badge`}>{cfg.label}</span>
        </div>
        <div className="notif-msg">{n.message}</div>
        <div className="notif-time">{relativeTime(n.createdAt)}</div>
      </div>

      {/* Actions */}
      <div className="notif-actions">
        {!n.read && <div className="notif-dot" title="Unread" />}
        <button
          className="btn btn-icon btn-secondary notif-delete-btn"
          title="Delete"
          onClick={e => { e.stopPropagation(); onDelete(n.id) }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── NotificationPanel (exported for re-use) ───────────────────────────────────

export function NotificationPanel({ userId, role }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [filter, setFilter]               = useState('ALL')

  const isAdmin = role === 'ADMIN'

  const load = useCallback((showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    api.get(`/notifications/user/${userId}`)
      .then(r => setNotifications(r.data))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [userId])

  useEffect(() => { load() }, [load])

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAll = async () => {
    await api.patch(`/notifications/user/${userId}/read-all`)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`)
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success('Notification deleted')
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  const unread   = notifications.filter(n => !n.read).length
  const filtered = filter === 'ALL'
    ? notifications
    : notifications.filter(n => n.type === filter)

  const countFor = (f) => f === 'ALL'
    ? notifications.length
    : notifications.filter(n => n.type === f).length

  const unreadFor = (f) => f === 'ALL'
    ? unread
    : notifications.filter(n => n.type === f && !n.read).length

  return (
    <div>
      {/* ── Header ── */}
      <div className="notif-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="notif-panel-title">
            {isAdmin ? 'Notification Center' : 'My Notifications'}
          </h2>
          {unread > 0 && (
            <span className="badge badge-blue">{unread} unread</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
            Refresh
          </button>
          {unread > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAll}>
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Summary stats (admin only) ── */}
      {isAdmin && (
        <div className="notif-stats-row">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const total  = notifications.filter(n => n.type === key).length
            const unreadN = notifications.filter(n => n.type === key && !n.read).length
            return (
              <div key={key} className="notif-stat-chip" style={{ borderColor: cfg.color + '40' }}>
                <cfg.Icon size={14} color={cfg.color} />
                <span style={{ fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                <span className="notif-stat-counts">
                  <span>{total} total</span>
                  {unreadN > 0 && <span className="notif-stat-unread">{unreadN} new</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div className="notif-filter-row">
        {FILTERS.map(f => {
          const total  = countFor(f)
          const unreadN = unreadFor(f)
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`notif-filter-tab ${active ? 'active' : ''}`}
            >
              {f === 'ALL' ? 'All' : TYPE_CONFIG[f]?.label ?? f}
              <span className={`notif-filter-count ${active ? 'active' : ''}`}>{total}</span>
              {unreadN > 0 && (
                <span className="notif-filter-unread-dot" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <BellOff size={40} />
          <h3>No notifications</h3>
          <p>
            {filter === 'ALL'
              ? "You're all caught up!"
              : `No ${TYPE_CONFIG[filter]?.label ?? filter} notifications yet.`}
          </p>
        </div>
      ) : (
        <div className="notif-list">
          {filtered.map(n => (
            <NotificationItem
              key={n.id}
              n={n}
              onMarkRead={markRead}
              onDelete={deleteNotif}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'ADMIN'

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>
          {isAdmin
            ? 'Monitor and manage all system alerts, ticket submissions, and booking activity.'
            : 'Stay up to date with your bookings and support tickets.'}
        </p>
      </div>
      <div className="card">
        <NotificationPanel userId={user?.id} role={user?.role} />
      </div>
    </div>
  )
}
