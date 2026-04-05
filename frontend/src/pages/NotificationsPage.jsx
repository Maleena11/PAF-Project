import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const TYPE_ICON = {
  BOOKING: { bg: '#dbeafe', color: '#2563eb', label: 'Booking' },
  TICKET:  { bg: '#fee2e2', color: '#dc2626', label: 'Ticket' },
  SYSTEM:  { bg: '#f0fdf4', color: '#16a34a', label: 'System' },
  GENERAL: { bg: '#f8fafc', color: '#475569', label: 'General' },
}

export function NotificationPanel({ userId }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get(`/notifications/user/${userId}`)
      .then(r => setNotifications(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [userId])

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAll = async () => {
    await api.patch(`/notifications/user/${userId}/read-all`)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    toast.success('All marked as read')
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  const unread = notifications.filter(n => !n.read).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Notifications</h2>
          {unread > 0 && <span className="badge badge-blue">{unread} unread</span>}
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAll}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <BellOff size={40} />
          <h3>No notifications</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map(n => {
            const style = TYPE_ICON[n.type] || TYPE_ICON.GENERAL
            return (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => !n.read && markRead(n.id)} style={{ cursor: n.read ? 'default' : 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bell size={16} color={style.color} />
                </div>
                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-msg">{n.message}</div>
                  <div className="notif-time">{format(new Date(n.createdAt), 'MMM d, HH:mm')}</div>
                </div>
                {!n.read && <div className="notif-dot" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Full page wrapper
export default function NotificationsPage() {
  const { user } = useAuth()
  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Stay up to date with your bookings and tickets</p>
      </div>
      <div className="card">
        <NotificationPanel userId={user?.id} />
      </div>
    </div>
  )
}
