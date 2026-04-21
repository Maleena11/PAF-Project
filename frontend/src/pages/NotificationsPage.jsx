import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Bell, BellOff, CheckCheck, CalendarCheck,
  Ticket, AlertCircle, Trash2, RefreshCw, Settings,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import api from '../services/api'
import AdminHeroBanner from '../components/AdminHeroBanner'

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  BOOKING: { Icon: CalendarCheck, bg: '#dbeafe', color: '#2563eb', label: 'Booking',  badgeClass: 'badge-blue'   },
  TICKET:  { Icon: Ticket,        bg: '#fee2e2', color: '#dc2626', label: 'Ticket',   badgeClass: 'badge-red'    },
  SYSTEM:  { Icon: AlertCircle,   bg: '#dcfce7', color: '#16a34a', label: 'System',   badgeClass: 'badge-green'  },
  GENERAL: { Icon: Bell,          bg: '#f1f5f9', color: '#475569', label: 'General',  badgeClass: 'badge-gray'   },
}

const FILTERS = ['ALL', 'BOOKING', 'TICKET', 'SYSTEM', 'GENERAL']

const NOTIF_ROUTE = { BOOKING: '/bookings', TICKET: '/tickets' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({ n, onMarkRead, onDelete, onNavigate }) {
  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.GENERAL
  const { Icon } = cfg
  const isNavigable = !!NOTIF_ROUTE[n.type] && !!n.referenceId

  const handleClick = () => {
    if (!n.read) onMarkRead(n.id)
    if (isNavigable) onNavigate(n.type)
  }

  return (
    <div
      className={`notif-item ${n.read ? '' : 'unread'}`}
      onClick={handleClick}
      style={{ cursor: isNavigable || !n.read ? 'pointer' : 'default' }}
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

// ── PreferencesPanel ──────────────────────────────────────────────────────────

function PreferencesPanel({ userId, onClose }) {
  const [prefs, setPrefs]       = useState({})
  const [saving, setSaving]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get(`/notifications/preferences/${userId}`)
      .then(r => {
        const map = {}
        r.data.forEach(p => { map[p.type] = p.enabled })
        setPrefs(map)
      })
      .catch(() => toast.error('Failed to load preferences'))
      .finally(() => setLoading(false))
  }, [userId])

  const toggle = async (type) => {
    const newVal = !prefs[type]
    setSaving(type)
    try {
      await api.put(`/notifications/preferences/${userId}/${type}`, { enabled: newVal })
      setPrefs(prev => ({ ...prev, [type]: newVal }))
      toast.success(`${TYPE_CONFIG[type]?.label} notifications ${newVal ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update preference')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="notif-prefs-panel">
      <div className="notif-prefs-header">
        <span style={{ fontWeight: 600 }}>Notification Preferences</span>
        <button className="btn btn-icon btn-secondary" onClick={onClose} title="Close">✕</button>
      </div>
      <p className="notif-prefs-desc">Choose which notification categories you want to receive.</p>
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : (
        <div className="notif-prefs-list">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const enabled = prefs[type] !== false
            const isSaving = saving === type
            return (
              <div key={type} className="notif-pref-row">
                <div className="notif-pref-info">
                  <div className="notif-icon-wrap" style={{ background: cfg.bg }}>
                    <cfg.Icon size={15} color={cfg.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {type === 'BOOKING'  && 'Room bookings and reservations'}
                      {type === 'TICKET'   && 'Support tickets and updates'}
                      {type === 'SYSTEM'   && 'System alerts and announcements'}
                      {type === 'GENERAL'  && 'General campus notifications'}
                    </div>
                  </div>
                </div>
                <button
                  className={`notif-toggle-btn ${enabled ? 'on' : 'off'}`}
                  onClick={() => toggle(type)}
                  disabled={isSaving}
                  title={enabled ? 'Disable' : 'Enable'}
                >
                  <span className="notif-toggle-knob" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── NotificationPanel (exported for re-use) ───────────────────────────────────

export function NotificationPanel({ userId, role }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [filter, setFilter]               = useState('ALL')
  const [showPrefs, setShowPrefs]         = useState(false)

  const isAdmin = role === 'ADMIN'
  const { decrement, reset } = useNotifications()
  const navigate = useNavigate()

  const load = useCallback((showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    api.get(`/notifications/user/${userId}`)
      .then(r => setNotifications(r.data))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [userId])

  useEffect(() => { load() }, [load])

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`, null, { params: { userId } })
    setNotifications(prev => {
      const wasUnread = prev.find(n => n.id === id && !n.read)
      if (wasUnread) decrement(1)
      return prev.map(n => n.id === id ? { ...n, read: true } : n)
    })
  }

  const markAll = async () => {
    await api.patch(`/notifications/user/${userId}/read-all`)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    reset()
    toast.success('All notifications marked as read')
  }

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`, { params: { userId } })
    setNotifications(prev => {
      const wasUnread = prev.find(n => n.id === id && !n.read)
      if (wasUnread) decrement(1)
      return prev.filter(n => n.id !== id)
    })
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
          <button
            className={`btn btn-secondary btn-sm ${showPrefs ? 'active' : ''}`}
            onClick={() => setShowPrefs(p => !p)}
            title="Preferences"
          >
            <Settings size={13} /> Preferences
          </button>
        </div>
      </div>

      {/* ── Preferences panel ── */}
      {showPrefs && (
        <PreferencesPanel userId={userId} onClose={() => setShowPrefs(false)} />
      )}

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
              onNavigate={(type) => navigate(NOTIF_ROUTE[type])}
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
      {isAdmin ? (
        <AdminHeroBanner
          icon={Bell}
          title="Notification Center"
          description="Monitor and manage booking updates, ticket alerts, and system activity"
        />
      ) : (
        <div className="page-header">
          <h1>Notifications</h1>
          <p>Stay up to date with your bookings and support tickets.</p>
        </div>
      )}
      <div className="card">
        <NotificationPanel userId={user?.id} role={user?.role} />
      </div>
    </div>
  )
}
