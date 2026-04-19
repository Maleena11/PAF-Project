import { useState, useEffect, useMemo } from 'react'
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
  ADMIN:   { bg: '#fee2e2', color: '#dc2626', border: '#fecaca', icon: Shield,         label: 'Admin'   },
  STAFF:   { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe', icon: Briefcase,     label: 'Staff'   },
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
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 700,
        color: '#374151', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#dc2626', marginTop: 5 }}>
          <AlertTriangle size={10} />
          {error}
        </div>
      )}
    </div>
  )
}

const inputStyle = (err) => ({
  width: '100%', height: 42, padding: '0 13px',
  border: `1.5px solid ${err ? '#fca5a5' : '#e2e8f0'}`,
  borderRadius: 9, fontSize: 14, color: '#1e293b',
  background: err ? '#fff8f8' : '#fafbfc',
  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
})

/* ─── Add / Edit Modal ──────────────────────────────── */
function UserFormModal({ initial, onClose, onSave, saving, isSelf }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name:  initial?.name  ?? '',
    email: initial?.email ?? '',
    role:  initial?.role  ?? 'STUDENT',
  })
  const [errs, setErrs] = useState({})
  const [touched, setTouched] = useState({})

  function validateField(k, v) {
    const val = (v ?? '').trim()
    if (k === 'name') {
      if (!val)                             return 'Name is required'
      if (val.length < 2)                   return 'Name must be at least 2 characters'
      if (val.length > 50)                  return 'Name must be 50 characters or fewer'
      if (!/^[A-Z]/.test(val))             return 'Name must start with a capital letter (e.g. Jane Smith)'
      if (!/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(val))
                                            return 'Each word must start with a capital letter followed by lowercase letters (e.g. Jane Smith)'
    }
    if (k === 'email') {
      if (!val)                             return 'Email is required'
      if (val.length > 100)                 return 'Email must be 100 characters or fewer'
      if (!/^[a-z]{2,}[0-9]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(val))
                                            return 'Email must start with letters followed by numbers (e.g. it23636226@gmail.com)'
    }
    return ''
  }

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    if (touched[k]) setErrs(e => ({ ...e, [k]: validateField(k, v) }))
  }

  function blur(k) {
    setTouched(t => ({ ...t, [k]: true }))
    setErrs(e => ({ ...e, [k]: validateField(k, form[k]) }))
  }

  function validate() {
    const e = {}
    const nameErr  = validateField('name',  form.name)
    const emailErr = validateField('email', form.email)
    if (nameErr)  e.name  = nameErr
    if (emailErr) e.email = emailErr
    setErrs(e)
    setTouched({ name: true, email: true })
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (validate()) onSave(form)
  }

  const accentColor = isEdit ? '#2563eb' : '#16a34a'
  const accentBg    = isEdit ? '#dbeafe' : '#dcfce7'

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal" style={{ maxWidth: 480, width: '100%' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '24px 28px 20px', borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: accentBg, border: `1.5px solid ${accentColor}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isEdit ? <Pencil size={19} color={accentColor} /> : <UserPlus size={19} color={accentColor} />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                {isEdit ? 'Edit User' : 'Add New User'}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                {isEdit ? `Editing ${initial.name}` : 'Create a new campus account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose} disabled={saving}
            style={{
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              color: '#64748b', padding: 6, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }}>
          <Field label="Full Name" required error={errs.name}>
            <input
              style={inputStyle(errs.name)}
              placeholder="e.g. Jane Smith"
              value={form.name}
              maxLength={50}
              onChange={e => set('name', e.target.value)}
              onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.boxShadow = `0 0 0 3px ${accentColor}18` }}
              onBlur={e => { blur('name'); e.target.style.borderColor = errs.name ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none' }}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              {!errs.name && (
                <span style={{ fontSize: 11, color: '#94a3b8' }}>First letter of each word must be capital (e.g. Jane Smith)</span>
              )}
              <span style={{ fontSize: 11, color: form.name.length > 40 ? '#f59e0b' : '#94a3b8', marginLeft: 'auto' }}>
                {form.name.length}/50
              </span>
            </div>
          </Field>

          <Field label="Email Address" required={!isEdit} error={errs.email}>
            {isEdit ? (
              <div style={{
                height: 42, padding: '0 13px', display: 'flex', alignItems: 'center',
                border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#f1f5f9',
                fontSize: 14, color: '#94a3b8', userSelect: 'none', boxSizing: 'border-box',
              }}>
                {form.email}
              </div>
            ) : (
              <input
                style={inputStyle(errs.email)}
                placeholder="e.g. it23636226@gmail.com"
                value={form.email}
                maxLength={100}
                onChange={e => set('email', e.target.value)}
                onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.boxShadow = `0 0 0 3px ${accentColor}18` }}
                onBlur={e => { blur('email'); e.target.style.borderColor = errs.email ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none' }}
              />
            )}
            {!isEdit && !errs.email && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Format: letters followed by numbers (e.g. it23636226@gmail.com)
              </div>
            )}
            {isEdit && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Email address cannot be changed after account creation
              </div>
            )}
          </Field>

          <Field label="Role">
            {isSelf ? (
              <div style={{
                padding: '10px 14px', borderRadius: 9, background: '#f8fafc',
                border: '1.5px solid #e2e8f0', fontSize: 13, color: '#94a3b8', fontStyle: 'italic',
              }}>
                You cannot change your own role
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10 }}>
                  {ROLES.map(r => {
                    const cfg = ROLE_CFG[r]
                    const active = form.role === r
                    const blocked = isEdit && initial?.role === 'STUDENT' && r === 'ADMIN'
                    return (
                      <button
                        key={r} type="button"
                        disabled={blocked}
                        onClick={() => !blocked && set('role', r)}
                        title={blocked ? 'Cannot promote directly from Student to Admin. Assign Staff role first.' : undefined}
                        style={{
                          flex: 1, padding: '11px 0', borderRadius: 10,
                          cursor: blocked ? 'not-allowed' : 'pointer',
                          border: `2px solid ${active ? cfg.color : '#e2e8f0'}`,
                          background: active ? cfg.bg : blocked ? '#f8fafc' : '#fff',
                          color: active ? cfg.color : blocked ? '#cbd5e1' : '#94a3b8',
                          fontSize: 12, fontWeight: 700,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                          transition: 'all 0.15s',
                          boxShadow: active ? `0 2px 8px ${cfg.color}22` : 'none',
                          opacity: blocked ? 0.5 : 1,
                        }}
                      >
                        <cfg.icon size={17} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
                {isEdit && initial?.role === 'STUDENT' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginTop: 8, fontSize: 11, color: '#f59e0b',
                  }}>
                    <AlertTriangle size={11} />
                    Student cannot be promoted directly to Admin. Change to Staff first.
                  </div>
                )}
              </>
            )}
          </Field>

          {/* Actions */}
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            marginTop: 26, paddingTop: 22, borderTop: '1px solid #f1f5f9',
          }}>
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
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: accentColor, color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                boxShadow: `0 2px 8px ${accentColor}44`, transition: 'opacity 0.15s',
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
      <div className="modal" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#fee2e2', margin: '0 auto 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 8px #fee2e244',
        }}>
          <AlertTriangle size={26} color="#dc2626" />
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
          Delete User
        </h2>
        <p style={{ margin: '0 0 6px', fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
          Are you sure you want to delete{' '}
          <strong style={{ color: '#1e293b' }}>{target.name}</strong>?
        </p>
        <p style={{ margin: '0 0 28px', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          This will permanently remove the account and all associated data. This action cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onClose} disabled={deleting}
            className="btn btn-secondary"
            style={{ minWidth: 100, padding: '9px 20px' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm} disabled={deleting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 22px', borderRadius: 9, border: 'none', minWidth: 120,
              background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1,
              boxShadow: '0 2px 8px rgba(220,38,38,0.35)', transition: 'opacity 0.15s',
            }}
          >
            {deleting
              ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Deleting…</>
              : <><Trash2 size={14} /> Delete User</>
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

  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [addModal,     setAddModal]     = useState(false)
  const [editUser,     setEditUser]     = useState(null)
  const [deleteUser,   setDeleteUser]   = useState(null)
  const [search,       setSearch]       = useState('')
  const [roleFilter,   setRoleFilter]   = useState('ALL')
  const [sort,         setSort]         = useState({ col: 'name', dir: 'asc' })
  const [roleDropdown, setRoleDropdown] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/dashboard', { replace: true }); return }
    fetchUsers()
  }, [user])

  function fetchUsers() {
    setLoading(true)
    api.get('/auth/users')
      .then(r => { setUsers(Array.isArray(r.data) ? r.data : []); setLastRefreshed(new Date()) })
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

  async function handleQuickRoleChange(userId, newRole) {
    const target = users.find(u => u.id === userId)
    if (target?.role === 'STUDENT' && newRole === 'ADMIN') {
      setRoleDropdown(null)
      toast.error('Cannot promote Student directly to Admin. Change to Staff first.')
      return
    }
    setRoleDropdown(null)
    try {
      const r = await api.patch(`/auth/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? r.data : u))
      toast.success('Role updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update role')
    }
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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          {lastRefreshed && (
            <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.8)', letterSpacing: '0.02em' }}>
              Updated {lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
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
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: UserCheck,     label: 'Total Users', value: counts.total,   pct: null,                                          color: '#2563eb', bg: '#dbeafe' },
          { icon: GraduationCap, label: 'Students',    value: counts.student, pct: counts.total ? Math.round(counts.student / counts.total * 100) : 0, color: '#16a34a', bg: '#dcfce7' },
          { icon: Briefcase,     label: 'Staff',       value: counts.staff,   pct: counts.total ? Math.round(counts.staff   / counts.total * 100) : 0, color: '#7c3aed', bg: '#ede9fe' },
          { icon: Shield,        label: 'Admins',      value: counts.admin,   pct: counts.total ? Math.round(counts.admin   / counts.total * 100) : 0, color: '#dc2626', bg: '#fee2e2' },
        ].map(({ icon: Icon, label, value, pct, color, bg }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 14, padding: '20px 22px',
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.04)',
            border: '1px solid #f1f5f9', borderLeft: `4px solid ${color}`,
            transition: 'box-shadow 0.15s',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={22} color={color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                {pct !== null && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: color + 'aa',
                    background: bg, padding: '1px 6px', borderRadius: 20,
                  }}>{pct}%</span>
                )}
              </div>
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
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', paddingLeft: 34, paddingRight: search ? 32 : 12,
                height: 36, border: '1px solid #e2e8f0', borderRadius: 9,
                fontSize: 13, background: '#fff', outline: 'none', color: '#1e293b',
                boxSizing: 'border-box',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: '#e2e8f0', border: 'none', cursor: 'pointer',
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>

          {/* Role filter pills */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {['ALL', ...ROLES].map(r => {
              const active = roleFilter === r
              const cfg = ROLE_CFG[r]
              return (
                <button
                  key={r} onClick={() => setRoleFilter(r)}
                  style={{
                    padding: '5px 14px', borderRadius: 20,
                    border: active ? 'none' : '1px solid #e2e8f0',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: active ? (cfg?.color ?? '#1e293b') : '#fff',
                    color: active ? '#fff' : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  {r === 'ALL' ? 'All' : cfg.label}
                  <span style={{
                    marginLeft: 5, fontSize: 11,
                    background: active ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: active ? '#fff' : '#64748b',
                    padding: '0 5px', borderRadius: 10,
                  }}>
                    {r === 'ALL' ? counts.total : counts[r.toLowerCase()]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Result count */}
          <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto', flexShrink: 0 }}>
            {(search || roleFilter !== 'ALL')
              ? `${displayed.length} of ${counts.total} user${counts.total !== 1 ? 's' : ''}`
              : `${counts.total} user${counts.total !== 1 ? 's' : ''} total`
            }
          </span>
        </div>

        {/* Table */}
        {displayed.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#f1f5f9', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={28} color="#cbd5e1" />
            </div>
            <div style={{ fontWeight: 700, color: '#374151', fontSize: 15 }}>No users found</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 5 }}>
              {search || roleFilter !== 'ALL' ? 'Try adjusting your search or filters.' : 'No users yet — add the first one.'}
            </div>
            {!search && roleFilter === 'ALL' && (
              <button
                onClick={() => setAddModal(true)}
                style={{
                  marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 22px', borderRadius: 9, border: 'none',
                  background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
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
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
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
                      <td style={{ ...td, color: '#d1d5db', fontWeight: 600, width: 44, fontSize: 12 }}>{idx + 1}</td>

                      {/* User */}
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {u.avatarUrl ? (
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                style={{
                                  width: 38, height: 38, borderRadius: '50%',
                                  objectFit: 'cover', border: `2px solid ${avColor}33`,
                                  display: 'block',
                                }}
                              />
                              <span style={{
                                position: 'absolute', bottom: -1, right: -1,
                                width: 14, height: 14, borderRadius: '50%',
                                background: '#fff', border: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <svg width="9" height="9" viewBox="0 0 18 18" fill="none">
                                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.082 17.64 11.775 17.64 9.2z" fill="#4285F4"/>
                                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                                  <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                                </svg>
                              </span>
                            </div>
                          ) : (
                            <div style={{
                              width: 38, height: 38, borderRadius: '50%',
                              background: avBg, color: avColor,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 13, flexShrink: 0,
                              border: `2px solid ${avColor}22`,
                            }}>
                              {initials(u.name)}
                            </div>
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.name}</span>
                              {isSelf && (
                                <span style={{
                                  fontSize: 9, fontWeight: 800, padding: '2px 6px',
                                  borderRadius: 20, background: '#dbeafe', color: '#2563eb',
                                  letterSpacing: '0.07em', textTransform: 'uppercase',
                                }}>YOU</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role — inline dropdown for non-self rows */}
                      <td style={td}>
                        {isSelf ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                          }}>
                            <rc.icon size={11} />
                            {rc.label}
                          </span>
                        ) : (
                          <div
                            style={{ position: 'relative', display: 'inline-block' }}
                            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setRoleDropdown(null) }}
                            tabIndex={-1}
                          >
                            <button
                              onClick={() => setRoleDropdown(prev => prev === u.id ? null : u.id)}
                              title="Change role"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                                cursor: 'pointer', transition: 'opacity 0.12s',
                              }}
                            >
                              <rc.icon size={11} />
                              {rc.label}
                              <ChevronDown size={10} style={{ marginLeft: 2, opacity: 0.6 }} />
                            </button>
                            {roleDropdown === u.id && (
                              <div style={{
                                position: 'absolute', top: '110%', left: 0, zIndex: 50,
                                background: '#fff', border: '1.5px solid #e2e8f0',
                                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                minWidth: 130, overflow: 'hidden',
                              }}>
                                {ROLES.filter(r => r !== u.role && !(u.role === 'STUDENT' && r === 'ADMIN')).map(r => {
                                  const cfg = ROLE_CFG[r]
                                  return (
                                    <button
                                      key={r}
                                      onClick={() => handleQuickRoleChange(u.id, r)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        width: '100%', padding: '9px 13px', border: 'none',
                                        background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        color: cfg.color, textAlign: 'left',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = cfg.bg }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                                    >
                                      <cfg.icon size={13} />
                                      {cfg.label}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Provider */}
                      <td style={{ ...td, fontSize: 12 }}>
                        {u.provider === 'google' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              background: '#fff', border: '1px solid #e2e8f0',
                              borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600,
                              color: '#374151', width: 'fit-content',
                            }}>
                              <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                              </svg>
                              Google
                            </span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 600, color: '#16a34a',
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                              Linked
                            </span>
                          </div>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 500, color: '#64748b',
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            Local
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>

                      {/* Actions */}
                      <td style={{ ...td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => setEditUser(u)}
                            title="Edit user"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 13px', borderRadius: 7, border: '1.5px solid #dbeafe',
                              background: '#f0f7ff', color: '#2563eb', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#dbeafe' }}
                          >
                            <Pencil size={12} /> Edit
                          </button>

                          <button
                            onClick={() => !isSelf && setDeleteUser(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 13px', borderRadius: 7,
                              border: `1.5px solid ${isSelf ? '#f1f5f9' : '#fee2e2'}`,
                              background: isSelf ? '#fafafa' : '#fff8f8',
                              color: isSelf ? '#cbd5e1' : '#dc2626',
                              fontSize: 12, fontWeight: 600,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.5 : 1,
                              transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { if (!isSelf) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5' } }}
                            onMouseLeave={e => { if (!isSelf) { e.currentTarget.style.background = '#fff8f8'; e.currentTarget.style.borderColor = '#fee2e2' } }}
                          >
                            <Trash2 size={12} /> Delete
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
            padding: '11px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Showing <strong style={{ color: '#374151' }}>{displayed.length}</strong> of <strong style={{ color: '#374151' }}>{counts.total}</strong> user{counts.total !== 1 ? 's' : ''}
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
          isSelf={false}
          onClose={() => setAddModal(false)}
          onSave={handleAddUser}
        />
      )}

      {editUser && (
        <UserFormModal
          initial={editUser}
          saving={saving}
          isSelf={editUser.id === user.id}
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
  padding: '13px 16px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 11,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '13px 16px',
  verticalAlign: 'middle',
}
