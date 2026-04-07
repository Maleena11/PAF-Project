import React, { useState, useEffect } from 'react'
import { Users, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const ROLES = ['STUDENT', 'STAFF', 'ADMIN']

const roleColors = {
  ADMIN:   { bg: '#fee2e2', color: '#dc2626' },
  STAFF:   { bg: '#dbeafe', color: '#2563eb' },
  STUDENT: { bg: '#f0fdf4', color: '#16a34a' },
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null) // id of user being updated

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard', { replace: true })
      return
    }
    fetchUsers()
  }, [user])

  function fetchUsers() {
    setLoading(true)
    api.get('/auth/users')
      .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  function handleRoleChange(userId, newRole) {
    setUpdating(userId)
    api.patch(`/auth/users/${userId}/role`, { role: newRole })
      .then(r => {
        setUsers(prev => prev.map(u => u.id === userId ? r.data : u))
        toast.success('Role updated')
      })
      .catch(() => toast.error('Failed to update role'))
      .finally(() => setUpdating(null))
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={24} /> User Management
          </h1>
          <p>{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchUsers} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={th}>#</th>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Provider</th>
              <th style={th}>Joined</th>
              <th style={{ ...th, textAlign: 'center' }}>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => {
              const rc = roleColors[u.role] || roleColors.STUDENT
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{idx + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: rc.bg, color: rc.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12, flexShrink: 0,
                      }}>
                        {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ ...td, color: '#64748b' }}>{u.email}</td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                      fontSize: 12, fontWeight: 600,
                      background: rc.bg, color: rc.color,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#94a3b8', textTransform: 'capitalize' }}>{u.provider || '—'}</td>
                  <td style={{ ...td, color: '#94a3b8' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <select
                      value={u.role}
                      disabled={updating === u.id || u.id === user.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{
                        border: '1px solid #e2e8f0', borderRadius: 6,
                        padding: '4px 8px', fontSize: 13, cursor: 'pointer',
                        opacity: (updating === u.id || u.id === user.id) ? 0.5 : 1,
                      }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {u.id === user.id && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>You</div>
                    )}
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 12,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const td = {
  padding: '12px 16px',
  verticalAlign: 'middle',
}
