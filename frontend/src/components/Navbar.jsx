import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, CalendarCheck, Ticket, Bell, LogOut, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const isAdmin = user?.role === 'ADMIN'
  const isStaff = user?.role === 'STAFF'

  const links = [
    { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/resources',      icon: Building2,       label: 'Resources' },
    { to: '/bookings',       icon: CalendarCheck,   label: 'Bookings' },
    { to: '/tickets',        icon: Ticket,          label: 'Tickets' },
    { to: '/notifications',  icon: Bell,            label: 'Notifications', badge: unreadCount },
  ]

  const adminLinks = [
    { to: '/admin/users',    icon: Users,           label: 'User Management' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Building2 size={22} />
        Smart Campus
      </div>

      <nav>
        {links.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={18} />
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -8,
                  background: '#ef4444', color: '#fff',
                  borderRadius: '50%', fontSize: 10, fontWeight: 700,
                  minWidth: 16, height: 16, lineHeight: '16px',
                  textAlign: 'center', padding: '0 3px',
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '12px 16px 4px',
            }}>
              Admin
            </div>
            {adminLinks.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </>
        )}

        {isStaff && (
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '12px 16px 4px',
          }}>
            Staff
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} />
              : initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Guest'}</div>
            <div className="sidebar-user-role" style={{
              color: isAdmin ? '#93c5fd' : isStaff ? '#6ee7b7' : '#94a3b8',
            }}>
              {user?.role || ''}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-icon btn-secondary"
            title="Logout"
            style={{ marginLeft: 'auto', color: '#94a3b8' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
