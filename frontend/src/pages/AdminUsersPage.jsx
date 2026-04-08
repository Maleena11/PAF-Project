import React, { useState, useEffect, useMemo } from 'react'
import {
  Users, RefreshCw, Shield, Search, UserCheck,
  GraduationCap, Briefcase, ChevronUp, ChevronDown,
  UserPlus, Pencil, Trash2, X, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const ROLES = ['STUDENT', 'STAFF', 'ADMIN']

const ROLE_CFG = {
  ADMIN:   { bg: '#fee2e2', color: '#dc2626', border: '#fecaca', icon: Shield,        label: 'Admin'   },
  STAFF:   { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe', icon: Briefcase,    label: 'Staff'   },
  STUDENT: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0', icon: GraduationCap, label: 'Student' },
}

const AVATAR_PALETTE = [
  ['#dbeafe', '#2563eb'], ['#ede9fe', '#7c3aed'], ['#dcfce7', '#16a34a'],
  ['#ffedd5', '#ea580c'], ['#fce7f3', '#db2777'], ['#fef9c3', '#ca8a04'],
]

function getAvatarColors(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]
}

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
}

/* ─── Shared form field ─────────────────────────────── */
function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: '0.03em' }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

const inputStyle = (err) => ({
  width: '100%', height: 38, padding: '0 12px',
  border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`,
  borderRadius: 8, fontSize: 13, color: '#1e293b',
  background: err ? '#fff5f5' : '#fff', outline: 'none',
  transition: 'border-color 0.15s',
})

/* ─── Add / Edit Modal ──────────────────────────────── */
function UserFormModal({ initial, onClose, onSave, saving }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name:  initial?.name  ?? '',
    email: initial?.email ?? '',
    role:  initial?.role  ?? 'STUDENT',
  })
  const [errs, setErrs] = useState({})

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: '' })) }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (validate()) onSave(form)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal" style={{ maxWidth: 460, width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: isEdit ? '#dbeafe' : '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isEdit ? <Pencil size={18} color="#2563eb" /> : <UserPlus size={18} color="#16a34a" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {isEdit ? 'Edit User' : 'Add New User'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                {isEdit ? `Editing ${initial.name}` : 'Create a new campus account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose} disabled={saving}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Full Name" required error={errs.name}>
            <input
              style={inputStyle(errs.name)}
              placeholder="e.g. Jane Smith"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onFocus={e => { e.target.style.borderColor = '#2563eb' }}
              onBlur={e => { e.target.style.borderColor = errs.name ? '#fca5a5' : '#e2e8f0' }}
              autoFocus
            />
          </Field>

          <Field label="Email Address" required error={errs.email}>
            <input
              type="email"
              style={inputStyle(errs.email)}
              placeholder="e.g. jane@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              onFocus={e => { e.target.style.borderColor = '#2563eb' }}
              onBlur={e => { e.target.style.borderColor = errs.email ? '#fca5a5' : '#e2e8f0' }}
            />
          </Field>

          <Field label="Role">
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLES.map(r => {
                const cfg = ROLE_CFG[r]
                const active = form.role === r
                return (
                  <button
                    key={r} type="button"
                    onClick={() => set('role', r)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${active ? cfg.color : '#e2e8f0'}`,
                      background: active ? cfg.bg : '#fff',
                      color: active ? cfg.color : '#64748b',
                      fontSize: 12, fontWeight: 700,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}
                  >
                    <cfg.icon size={16} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button" onClick={onClose} disabled={saving}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: isEdit ? '#2563eb' : '#16a34a',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
                : isEdit
                  ? <><Pencil size={14} /> Save Changes</>
                  : <><UserPlus size={14} /> Create User</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Delete Confirm Modal ──────────────────────────── */
function DeleteModal({ target, onClose, onConfirm, deleting }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !deleting && onClose()}>
      <div className="modal" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#fee2e2', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={24} color="#dc2626" />
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
          Delete User
        </h2>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          Are you sure you want to delete{' '}
          <strong style={{ color: '#1e293b' }}>{target.name}</strong>?
        </p>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: '#94a3b8' }}>
          This will permanently remove the account and cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onClose} disabled={deleting}
            className="btn btn-secondary"
            style={{ minWidth: 100 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm} disabled={deleting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 20px', borderRadius: 8, border: 'none', minWidth: 120,
              background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting
              ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Deleting…</>
              : <><Trash2 size={14} /> Delete</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────── */
export default function AdminUsersPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [addModal,   setAddModal]   = useState(false)
  const [editUser,   setEditUser]   = useState(null)  // user to edit
  const [deleteUser, setDeleteUser] = useState(null)  // user to delete
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [sort,       setSort]       = useState({ col: 'name', dir: 'asc' })

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/dashboard', { replace: true }); return }
    fetchUsers()
  }, [user])

  function fetchUsers() {
    setLoading(true)
    api.get('/auth/users')
      .then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  async function handleAddUser(data) {
    setSaving(true)
    try {
      const r = await api.post('/auth/users', data)
      setUsers(prev => [...prev, r.data])
      setAddModal(false)
      toast.success(`User "${r.data.name}" created`)
    } catch (err) {
      toast.error(err.message || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  async function handleEditUser(data) {
    setSaving(true)
    try {
      const r = await api.put(`/auth/users/${editUser.id}`, data)
      setUsers(prev => prev.map(u => u.id === editUser.id ? r.data : u))
      setEditUser(null)
      toast.success('User updated successfully')
    } catch (err) {
      toast.error(err.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser() {
    setDeleting(true)
    try {
      await api.delete(`/auth/users/${deleteUser.id}`)
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id))
      setDeleteUser(null)
      toast.success(`User "${deleteUser.name}" deleted`)
    } catch (err) {
      toast.error(err.message || 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  function toggleSort(col) {
    setSort(prev => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' })
  }

  const counts = useMemo(() => ({
    total:   users.length,
    student: users.filter(u => u.role === 'STUDENT').length,
    staff:   users.filter(u => u.role === 'STAFF').length,
    admin:   users.filter(u => u.role === 'ADMIN').length,
  }), [users])

  const displayed = useMemo(() => {
    let list = users
    if (roleFilter !== 'ALL') list = list.filter(u => u.role === roleFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      let av = a[sort.col] ?? '', bv = b[sort.col] ?? ''
      if (sort.col === 'createdAt') { av = new Date(av); bv = new Date(bv) }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase() }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ?  1 : -1
      return 0
    })
  }, [users, roleFilter, search, sort])

  const SortIcon = ({ col }) => sort.col !== col ? null : (
    sort.dir === 'asc'
      ? <ChevronUp size={12} style={{ marginLeft: 3 }} />
      : <ChevronDown size={12} style={{ marginLeft: 3 }} />
  )

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  return (
    <div>
      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 4px 28px rgba(15,23,42,0.45)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: -30, top: '50%', transform: 'translateY(-50%)', width: 120, height: 120, borderRadius: '50%', background: 'rgba(37,99,235,0.12)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Users size={28} color="#93c5fd" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                User Management
              </h1>
              <span style={{
                background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)',
                color: '#93c5fd', fontSize: 10, fontWeight: 700,
                padding: '2px 9px', borderRadius: 20, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Admin
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                Manage roles and permissions for all registered users
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.3)' }} />
                <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner actions */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={fetchUsers}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 10, padding: '9px 16px', color: '#e0f2fe',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => setAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: '#2563eb', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 10, padding: '9px 18px', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563eb' }}
          >
            <UserPlus size={15} /> Add User
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: UserCheck,     label: 'Total Users', value: counts.total,   color: '#2563eb', bg: '#dbeafe' },
          { icon: GraduationCap, label: 'Students',    value: counts.student, color: '#16a34a', bg: '#dcfce7' },
          { icon: Briefcase,     label: 'Staff',       value: counts.staff,   color: '#7c3aed', bg: '#ede9fe' },
          { icon: Shield,        label: 'Admins',      value: counts.admin,   color: '#dc2626', bg: '#fee2e2' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 12, padding: '18px 22px',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,.08)',
            border: '1px solid #f1f5f9', borderLeft: `4px solid ${color}`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          background: '#fafafa', flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12,
                height: 36, border: '1px solid #e2e8f0', borderRadius: 8,
                fontSize: 13, background: '#fff', outline: 'none', color: '#1e293b',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {['ALL', ...ROLES].map(r => {
              const active = roleFilter === r
              const cfg = ROLE_CFG[r]
              return (
                <button
                  key={r} onClick={() => setRoleFilter(r)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: active ? (cfg?.color ?? '#1e293b') : 'transparent',
                    color: active ? '#fff' : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  {r === 'ALL' ? 'All' : cfg.label}
                  <span style={{
                    marginLeft: 5, fontSize: 11,
                    background: active ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: active ? '#fff' : '#64748b',
                    padding: '0 5px', borderRadius: 10,
                  }}>
                    {r === 'ALL' ? counts.total : counts[r.toLowerCase()]}
                  </span>
                </button>
              )
            })}
          </div>

          {(search || roleFilter !== 'ALL') && (
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto', flexShrink: 0 }}>
              {displayed.length} result{displayed.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        {displayed.length === 0 ? (
          <div style={{ padding: '52px 24px', textAlign: 'center' }}>
            <Users size={44} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: '#374151', fontSize: 15 }}>No users found</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
              {search || roleFilter !== 'ALL' ? 'Try adjusting your search or filters.' : 'No users yet — add the first one.'}
            </div>
            {!search && roleFilter === 'ALL' && (
              <button
                onClick={() => setAddModal(true)}
                style={{
                  marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <UserPlus size={14} /> Add First User
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={th}>#</th>
                  <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>User <SortIcon col="name" /></span>
                  </th>
                  <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('role')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>Role <SortIcon col="role" /></span>
                  </th>
                  <th style={th}>Provider</th>
                  <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('createdAt')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>Joined <SortIcon col="createdAt" /></span>
                  </th>
                  <th style={{ ...th, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((u, idx) => {
                  const rc  = ROLE_CFG[u.role] || ROLE_CFG.STUDENT
                  const [avBg, avColor] = getAvatarColors(u.name)
                  const isSelf = u.id === user.id

                  return (
                    <tr
                      key={u.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '' }}
                    >
                      {/* # */}
                      <td style={{ ...td, color: '#cbd5e1', fontWeight: 600, width: 48 }}>{idx + 1}</td>

                      {/* User */}
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: avBg, color: avColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 13, flexShrink: 0,
                            border: `2px solid ${avColor}22`,
                          }}>
                            {initials(u.name)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.name}</span>
                              {isSelf && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '1px 6px',
                                  borderRadius: 20, background: '#dbeafe', color: '#2563eb', letterSpacing: '0.05em',
                                }}>YOU</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={td}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                        }}>
                          <rc.icon size={11} />
                          {rc.label}
                        </span>
                      </td>

                      {/* Provider */}
                      <td style={{ ...td, fontSize: 12 }}>
                        {u.provider ? (
                          <span style={{
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 500, color: '#64748b',
                            textTransform: 'capitalize',
                          }}>
                            {u.provider}
                          </span>
                        ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>

                      {/* Joined */}
                      <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ ...td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {/* Edit */}
                          <button
                            onClick={() => setEditUser(u)}
                            title="Edit user"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0',
                              background: '#fff', color: '#2563eb', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                          >
                            <Pencil size={13} /> Edit
                          </button>

                          {/* Delete — disabled for self */}
                          <button
                            onClick={() => !isSelf && setDeleteUser(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 7, border: '1.5px solid #e2e8f0',
                              background: '#fff', color: isSelf ? '#cbd5e1' : '#dc2626',
                              fontSize: 12, fontWeight: 600,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.5 : 1,
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { if (!isSelf) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5' } }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {displayed.length > 0 && (
          <div style={{
            padding: '10px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Showing {displayed.length} of {counts.total} user{counts.total !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 11, color: '#cbd5e1' }}>
              Changes take effect immediately
            </span>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {addModal && (
        <UserFormModal
          initial={null}
          saving={saving}
          onClose={() => setAddModal(false)}
          onSave={handleAddUser}
        />
      )}

      {editUser && (
        <UserFormModal
          initial={editUser}
          saving={saving}
          onClose={() => setEditUser(null)}
          onSave={handleEditUser}
        />
      )}

      {deleteUser && (
        <DeleteModal
          target={deleteUser}
          deleting={deleting}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  )
}

const th = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 11,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '12px 16px',
  verticalAlign: 'middle',
}
