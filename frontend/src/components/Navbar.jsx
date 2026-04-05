import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, CalendarCheck, Ticket, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/resources',  icon: Building2,       label: 'Resources' },
    { to: '/bookings',   icon: CalendarCheck,   label: 'Bookings' },
    { to: '/tickets',    icon: Ticket,           label: 'Tickets' },
    { to: '/notifications', icon: Bell,          label: 'Notifications' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Building2 size={22} />
        Smart Campus
      </div>

      <nav>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
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
            <div className="sidebar-user-role">{user?.role || ''}</div>
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
