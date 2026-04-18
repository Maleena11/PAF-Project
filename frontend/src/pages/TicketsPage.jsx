import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Ticket, MessageSquare, Clock, CheckCircle2,
  XCircle, AlertCircle, ChevronRight, Filter, Image as ImageIcon,
  MapPin, Phone, User, Wrench, Monitor, Building2, Lock, Sparkles, FileText, Users, Search, X
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import ticketService from '../services/ticketService'
import TicketForm from '../components/TicketForm'
import { BACKEND_URL } from '../services/api'

const PRIORITY_CLASS  = { LOW: 'badge-green', MEDIUM: 'badge-blue', HIGH: 'badge-yellow', CRITICAL: 'badge-red' }
const STATUS_CLASS    = { OPEN: 'badge-yellow', IN_PROGRESS: 'badge-blue', RESOLVED: 'badge-green', CLOSED: 'badge-gray', REJECTED: 'badge-red' }
const PRIORITY_COLOR  = { LOW: '#16a34a', MEDIUM: '#2563eb', HIGH: '#d97706', CRITICAL: '#dc2626' }
const STATUS_ICON     = {
  OPEN:        <AlertCircle size={14} />,
  IN_PROGRESS: <Clock size={14} />,
  RESOLVED:    <CheckCircle2 size={14} />,
  CLOSED:      <XCircle size={14} />,
  REJECTED:    <XCircle size={14} />,
}

export default function TicketsPage() {
  const { user } = useAuth()
  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [isEditing, setIsEditing]   = useState(false)
  const [filterStatus, setFilter]   = useState('')
  const [selected, setSelected]     = useState(null)
  const [comment, setComment]       = useState('')
  const [posting, setPosting]       = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'

  const load = () => {
    if (!user?.id) return Promise.resolve()
    setLoading(true)
    const call = isAdmin ? ticketService.getAll() : ticketService.getByUser(user.id)
    return call
      .then(r => setTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user])

  const handleCreate = async (data, file) => {
    try {
      const { data: ticket } = await ticketService.create(data)
      let finalTicket = ticket
      if (file) {
        for (let i = 0; i < file.length; i++) {
          const { data: updated } = await ticketService.uploadImage(ticket.id, file[i], i + 1)
          finalTicket = updated
        }
      }
      // Add directly to state so it appears immediately
      setTickets(prev => [finalTicket, ...prev])
      toast.success('Ticket submitted successfully!')
      setShowModal(false)
    } catch (err) { toast.error(err.message) }
  }

  const handleUpdate = async (data, file) => {
    try {
      const { data: updated } = await ticketService.update(selected.id, data)
      if (file && file.length > 0) {
        for (let i = 0; i < file.length; i++) {
          await ticketService.uploadImage(selected.id, file[i], i + 1)
        }
      }
      toast.success('Ticket updated and resent successfully!')
      setIsEditing(false)
      setSelected(updated)
      load()
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to unsend this ticket? This action cannot be undone.')) return
    try {
      await ticketService.delete(id)
      setTickets(prev => prev.filter(t => t.id !== id))
      toast.success('Ticket unsent successfully')
      setSelected(null)
    } catch (err) { toast.error(err.message) }
  }

  const handleStatus = async (id, status) => {
    try {
      await ticketService.updateStatus(id, status)
      toast.success('Status updated')
      load()
      if (selected?.id === id) setSelected(prev => ({ ...prev, status }))
    } catch (err) { toast.error(err.message) }
  }

  const openDetail = async (t) => {
    setSelected(t)
    setDetailLoading(true)
    try {
      const { data } = await ticketService.getById(t.id)
      setSelected(data)
    } catch { /* keep cached version */ }
    finally { setDetailLoading(false) }
  }

  const handleAddComment = async () => {
    if (!comment.trim()) return
    setPosting(true)
    try {
      await ticketService.addComment(selected.id, user.id, comment)
      toast.success('Comment added')
      setComment('')
      const { data } = await ticketService.getById(selected.id)
      setSelected(data)
    } catch (err) { toast.error(err.message) }
    finally { setPosting(false) }
  }

  const displayed = tickets
    .filter(t => filterStatus ? t.status === filterStatus : true)
    .filter(t => priorityFilter ? t.priority === priorityFilter : true)
    .filter(t => search ? (
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.toLowerCase().includes(search.toLowerCase())
    ) : true)

  const STATUS_FILTERS = [
    { key: '',            label: 'All',         color: '#2563eb', bg: '#dbeafe', border: '#93c5fd', icon: '📋' },
    { key: 'OPEN',        label: 'Open',        color: '#ea580c', bg: '#fff7ed', border: '#fb923c', icon: '⚠️' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', icon: '⚙️' },
    { key: 'RESOLVED',    label: 'Resolved',    color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '✅' },
    { key: 'CLOSED',      label: 'Closed',      color: '#475569', bg: '#f1f5f9', border: '#94a3b8', icon: '🔒' },
    { key: 'REJECTED',    label: 'Rejected',    color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '❌' },
  ]

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header page-header-row">
        <div>
          <h1>INCIDENT TICKETS</h1>
          <p style={{ color: '#64748b', marginTop: 2 }}>
            {isAdmin ? 'Manage all incident and maintenance tickets' : 'Report and track your campus incidents'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* ── Unified Filter + Stats Bar ── */}
      {!isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
          {STATUS_FILTERS.map(s => {
            const count = s.key === '' ? tickets.length : tickets.filter(t => t.status === s.key).length
            const active = filterStatus === s.key
            return (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 6, padding: '14px 8px', borderRadius: 14, cursor: 'pointer',
                  border: `2px solid ${active ? s.color : s.border}`,
                  background: active ? s.color + 'cc' : '#fff',
                  color: active ? '#fff' : s.color,
                  boxShadow: active ? `0 6px 18px ${s.color}40` : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'all .18s ease',
                  transform: active ? 'translateY(-2px)' : 'none',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = s.bg; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${s.color}30` }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{s.icon}</span>
                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{count}</span>
                <span style={{ fontSize: 11, fontWeight: 600, opacity: active ? 0.9 : 0.75, textAlign: 'center', lineHeight: 1.2 }}>{s.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Search + Filter Bar ── */}
      {!isAdmin && (
        <div className="toolbar" style={{ marginBottom: 20 }}>
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder="Search tickets by title, category or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="toolbar-divider" />

          <span style={{ marginLeft: 40 }} className="toolbar-filters-label">
            <Filter size={13} />
            Filters
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', paddingLeft: 2 }}>Priority</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{
                border: '1.5px solid #e2e8f0', outline: 'none', background: '#f1f5f9',
                borderRadius: 8, padding: '6px 12px', fontSize: 13,
                fontWeight: 600, color: priorityFilter ? '#0f172a' : '#64748b',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <option value=''>All Priorities</option>
              <option value='LOW'>🟡 Low</option>
              <option value='MEDIUM'>🟢 Medium</option>
              <option value='HIGH'>🔴 High</option>
            </select>
          </div>

          {(search || priorityFilter) && (
            <button
              onClick={() => { setSearch(''); setPriorityFilter('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#dbeafe', border: '1px solid #93c5fd',
                borderRadius: 8, padding: '6px 12px', fontSize: 12,
                fontWeight: 600, color: '#2563eb', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <X size={12} /> Clear Filters
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {displayed.length} ticket{displayed.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : isAdmin ? (
        /* ── Admin: Filter + Table ── */
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Filter size={15} style={{ color: '#94a3b8' }} />
            {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: filterStatus === s ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                background: filterStatus === s ? '#dbeafe' : '#fff',
                color: filterStatus === s ? '#2563eb' : '#64748b', transition: 'all .15s',
              }}>
                {s === '' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
              {displayed.length} ticket{displayed.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Title</th><th>Category</th><th>Priority</th>
                    <th>Submitted By</th><th>Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(t => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(t)}>
                      <td style={{ color: '#94a3b8' }}>#{t.id}</td>
                      <td style={{ fontWeight: 500 }}>
                        {t.imageUrl && <ImageIcon size={13} style={{ marginRight: 4, color: '#94a3b8', verticalAlign: 'middle' }} />}
                        {t.title}
                      </td>
                      <td>{t.category}</td>
                      <td><span className={`badge ${PRIORITY_CLASS[t.priority] || 'badge-gray'}`}>{t.priority}</span></td>
                      <td>{t.user?.name}</td>
                      <td>{format(new Date(t.createdAt), 'MMM d, yyyy')}</td>
                      <td><span className={`badge ${STATUS_CLASS[t.status] || 'badge-gray'}`}>{t.status.replace('_', ' ')}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        {t.status !== 'CLOSED' && t.status !== 'REJECTED' && (
                          <select className="filter-select" style={{ fontSize: 12 }}
                            value={t.status} onChange={e => handleStatus(t.id, e.target.value)}>
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ── Student: Card Grid ── */
        <>

          {/* Card grid */}
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <Ticket size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>No tickets found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {filterStatus ? `No ${filterStatus.replace('_',' ').toLowerCase()} tickets yet.` : 'Click "+ New Ticket" to report your first issue.'}
              </p>
            </div>

          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 28 }}>
              {displayed.map(t => <ResourceStyleCard key={t.id} ticket={t} onClick={() => openDetail(t)} />)}
            </div>
          )}
        </>
      )}

      {/* ── Ticket Detail Modal ── */}
      {selected && !isEditing && (
        <div
          onClick={e => e.target === e.currentTarget && setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 880,
            maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 64px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06)',
          }}>

            {/* ── Modal Header ── */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Ticket #{selected.id}
                    </span>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1' }} />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{format(new Date(selected.createdAt), 'MMM d, yyyy · HH:mm')}</span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, letterSpacing: '-0.02em', margin: 0 }}>
                    {selected.title}
                  </h2>
                  {/* Pill badges */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <StatusPill status={selected.status} />
                    <PriorityPill priority={selected.priority} />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                      {selected.category}
                    </span>
                    {selected.location && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                        <MapPin size={11} /> {selected.location}
                      </span>
                    )}
                  </div>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {!isAdmin && (selected.status === 'OPEN' || selected.status === 'REJECTED') && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0' }}
                      >
                        Edit / Resend
                      </button>
                      <button
                        onClick={() => handleDelete(selected.id)}
                        style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#f87171' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5' }}
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.color = '#dc2626' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' }}
                  >✕</button>
                </div>
              </div>
            </div>

            {/* ── Two-column body ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', flex: 1, minHeight: 0 }}>

              {/* LEFT COLUMN — Details */}
              <div style={{ overflowY: 'auto', padding: '24px 28px', borderRight: '1px solid #f1f5f9' }}>

                {/* Meta cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                  {[
                    { icon: <User size={14} />,  label: 'Submitted By', value: selected.user?.name,         color: '#6366f1', bg: '#eef2ff' },
                    { icon: <Clock size={14} />, label: 'Date Submitted', value: format(new Date(selected.createdAt), 'MMM d, yyyy'), color: '#0891b2', bg: '#ecfeff' },
                    selected.contactDetails && { icon: <Phone size={14} />, label: 'Contact', value: selected.contactDetails, color: '#059669', bg: '#ecfdf5' },
                    selected.assignedTo    && { icon: <User size={14} />,  label: 'Assigned To', value: selected.assignedTo?.name, color: '#7c3aed', bg: '#f5f3ff' },
                  ].filter(Boolean).map((m, i) => (
                    <div key={i} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: m.bg, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {m.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{m.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{m.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Description</p>
                  <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.8, background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #f1f5f9', margin: 0 }}>
                    {selected.description}
                  </p>
                </div>

                {/* Resolution Notes */}
                {selected.resolutionNotes && (
                  <div style={{ marginBottom: 22, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Resolution Notes</p>
                    </div>
                    <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.7, margin: 0 }}>{selected.resolutionNotes}</p>
                  </div>
                )}

                {/* Rejection Reason */}
                {selected.status === 'REJECTED' && selected.rejectionReason && (
                  <div style={{ marginBottom: 22, background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <XCircle size={14} style={{ color: '#dc2626' }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Rejection Reason</p>
                    </div>
                    <p style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.7, margin: 0 }}>{selected.rejectionReason}</p>
                  </div>
                )}

                {/* Attachment */}
                {(selected.imageUrl || selected.imageUrl2 || selected.imageUrl3) && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Attachments</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[selected.imageUrl, selected.imageUrl2, selected.imageUrl3].map((url, i) => url && (
                        <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                          <img
                            src={BACKEND_URL + url}
                            alt={`attachment-${i+1}`}
                            onClick={() => window.open(BACKEND_URL + url, '_blank')}
                            style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover', cursor: 'zoom-in' }}
                          />
                          {/* Delete X button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                await ticketService.removeImage(selected.id, i + 1)
                                const { data } = await ticketService.getById(selected.id)
                                setSelected(data)
                                toast.success('Image removed')
                              } catch (err) {
                                toast.error('Failed to remove image: ' + err.message)
                              }
                            }}
                            style={{
                              position: 'absolute', top: 8, right: 8,
                              background: '#dc2626', color: '#fff', border: 'none',
                              borderRadius: '50%', width: 26, height: 26,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              zIndex: 10,
                            }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN — Progress + Comments */}
              <div style={{ overflowY: 'auto', padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 20, background: '#fafbfc' }}>

                {/* Ticket Progress */}
                {selected.status !== 'REJECTED' && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>Ticket Progress</p>
                    <StunningProgress status={selected.status} />
                  </div>
                )}

                {/* Comments */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                      Activity
                    </p>
                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
                      {detailLoading ? '…' : selected.comments?.length || 0} comment{selected.comments?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {detailLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
                  ) : selected.comments?.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 8 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={22} style={{ color: '#cbd5e1' }} />
                      </div>
                      <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, margin: 0 }}>No activity yet</p>
                      <p style={{ fontSize: 11, color: '#cbd5e1', margin: 0 }}>Be the first to comment</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, flex: 1, overflowY: 'auto' }}>
                      {selected.comments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}>
                            {c.user?.name?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{c.user?.name}</span>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                            </div>
                            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#f8fafc', borderRadius: 10, padding: '8px 12px', margin: 0, border: '1px solid #f1f5f9' }}>
                              {c.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment */}
                  {selected.status !== 'CLOSED' && selected.status !== 'REJECTED' && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 'auto' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}>
                          {user?.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <textarea
                            rows={2}
                            placeholder="Write a comment… (Enter to post)"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#334155', background: '#f8fafc', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s' }}
                            onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; e.target.style.background = '#fff' }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc' }}
                          />
                        </div>
                        <button
                          onClick={handleAddComment}
                          disabled={posting || !comment.trim()}
                          style={{ padding: '10px 16px', borderRadius: 10, background: posting || !comment.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #2563eb, #4f46e5)', color: posting || !comment.trim() ? '#94a3b8' : '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: posting || !comment.trim() ? 'not-allowed' : 'pointer', flexShrink: 0, boxShadow: posting || !comment.trim() ? 'none' : '0 4px 12px rgba(37,99,235,0.25)', transition: 'all .15s' }}
                        >
                          {posting ? '…' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Ticket Modal ── */}
      {(showModal || isEditing) && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && (setShowModal(false), setIsEditing(false))}>
          <div className="modal" style={{ 
            maxWidth: 640, 
            width: '100%',
            maxHeight: '90vh',
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 24, 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ padding: '32px 40px 24px', flexShrink: 0, borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff', zIndex: 10 }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {isEditing ? 'Edit Ticket' : 'Submit New Ticket'}
              </h2>
              <p style={{ fontSize: 15, color: '#64748b', marginTop: 6 }}>
                {isEditing ? 'Update your ticket details below.' : 'Describe the issue and we\'ll get it resolved.'}
              </p>
            </div>
            <TicketForm 
              initialData={isEditing ? selected : null}
              onSubmit={isEditing ? handleUpdate : handleCreate} 
              onCancel={() => { setShowModal(false); setIsEditing(false); }} 
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Category theme (matches resource card style) ── */
const CAT_THEME = {
  MAINTENANCE: { bg: '#e0e7ff', iconBg: '#4f46e5', icon: <Wrench  size={28} color="#fff" />, label: 'Maintenance' },
  IT:          { bg: '#ede9fe', iconBg: '#7c3aed', icon: <Monitor size={28} color="#fff" />, label: 'IT / Tech'    },
  FACILITIES:  { bg: '#ccfbf1', iconBg: '#0d9488', icon: <Building2 size={28} color="#fff" />, label: 'Facilities' },
  SECURITY:    { bg: '#ffedd5', iconBg: '#ea580c', icon: <Lock     size={28} color="#fff" />, label: 'Security'    },
  CLEANING:    { bg: '#dcfce7', iconBg: '#16a34a', icon: <Sparkles size={28} color="#fff" />, label: 'Cleaning'    },
  OTHER:       { bg: '#dbeafe', iconBg: '#2563eb', icon: <FileText size={28} color="#fff" />, label: 'Other'       },
}

const PRIORITY_BORDER = {
  LOW:      '#fde68a',
  MEDIUM:   '#86efac',
  HIGH:     '#fca5a5',
  CRITICAL: '#fca5a5',
}

/* ── Resource-style Ticket Card ── */
function ResourceStyleCard({ ticket: t, onClick }) {
  const theme      = CAT_THEME[t.category] || CAT_THEME.OTHER
  const pri        = CARD_PRIORITY[t.priority] || CARD_PRIORITY.MEDIUM
  const prioBorder = PRIORITY_BORDER[t.priority] || '#e2e8f0'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        border: '1px solid #e8edf2',
        cursor: 'pointer',
        boxShadow: `0 2px 12px ${prioBorder}22`,
        transition: 'all .22s ease',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 16px 36px ${prioBorder}44` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = `0 2px 12px ${prioBorder}22` }}
    >
      {/* ── Colored banner ── */}
      <div style={{ background: `linear-gradient(135deg, ${theme.bg}, ${theme.bg}cc)`, height: 140, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Background image */}
        {t.imageUrl && (
          <img src={BACKEND_URL + t.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
        )}
        {/* Decorative circle */}
        <div style={{ position: 'absolute', bottom: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: `${theme.iconBg}22` }} />
        <div style={{ position: 'absolute', top: -15, left: -15, width: 70, height: 70, borderRadius: '50%', background: `${theme.iconBg}15` }} />
        {/* Center icon */}
        <div style={{ width: 68, height: 68, borderRadius: 20, background: theme.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 24px ${theme.iconBg}88`, position: 'relative', zIndex: 1 }}>
          {theme.icon}
        </div>
        {/* Category badge bottom-left */}
        <div style={{ position: 'absolute', bottom: 12, left: 14, display: 'flex', alignItems: 'center', gap: 5, background: theme.iconBg, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, zIndex: 1, boxShadow: `0 2px 8px ${theme.iconBg}66` }}>
          {theme.label}
        </div>
        {/* Priority badge top-right */}
        <div style={{ position: 'absolute', top: 12, right: 14, background: pri.circleBg, color: pri.circleColor, border: `2px solid ${prioBorder}`, borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 800, zIndex: 1 }}>
          {pri.label}
        </div>
      </div>


      {/* ── White body ── */}
      <div style={{ padding: '16px 18px 18px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Title + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.35, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {t.title}
          </h3>
          <StatusPill status={t.status} />
        </div>

        {/* Location */}
        {t.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginBottom: 6, background: '#f8fafc', borderRadius: 8, padding: '4px 10px', width: 'fit-content' }}>
            <MapPin size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
            {t.location}
          </div>
        )}

        {/* Description */}
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '6px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flexGrow: 1 }}>
          {t.description}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${prioBorder}33` }}>
          <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> {format(new Date(t.createdAt), 'MMM d, yyyy')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {t.comments?.length > 0 && (
              <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, background: '#f5f3ff', padding: '2px 8px', borderRadius: 20 }}>
                <MessageSquare size={12} /> {t.comments.length}
              </span>
            )}
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, background: '#f8fafc', padding: '2px 8px', borderRadius: 20 }}>#{t.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Kanban Board ── */
const COLUMNS = [
  { key: 'OPEN',        label: 'Open',        icon: <AlertCircle size={15} />, headerBg: '#fff7ed', headerColor: '#c2410c', headerBorder: '#fed7aa', dot: '#f97316' },
  { key: 'IN_PROGRESS', label: 'In Progress',  icon: <Clock size={15} />,       headerBg: '#eff6ff', headerColor: '#1d4ed8', headerBorder: '#bfdbfe', dot: '#3b82f6' },
  { key: 'RESOLVED',    label: 'Resolved',     icon: <CheckCircle2 size={15} />, headerBg: '#f0fdf4', headerColor: '#15803d', headerBorder: '#bbf7d0', dot: '#22c55e' },
  { key: 'CLOSED',      label: 'Closed',       icon: <XCircle size={15} />,      headerBg: '#f8fafc', headerColor: '#475569', headerBorder: '#e2e8f0', dot: '#94a3b8' },
]

function KanbanBoard({ tickets, onOpen }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
      {COLUMNS.map(col => {
        const colTickets = tickets.filter(t => t.status === col.key)
        return (
          <div key={col.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Column Header */}
            <div style={{
              background: col.headerBg, border: `1px solid ${col.headerBorder}`,
              borderRadius: 12, padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: col.headerColor }}>{col.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: col.headerColor }}>{col.label}</span>
              </div>
              <span style={{
                background: col.dot, color: '#fff',
                borderRadius: '50%', width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {colTickets.length}
              </span>
            </div>

            {/* Column Cards */}
            {colTickets.length === 0 ? (
              <div style={{
                border: '2px dashed #e2e8f0', borderRadius: 12, padding: '28px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 22, opacity: 0.35 }}>
                  {col.key === 'OPEN' ? '📋' : col.key === 'IN_PROGRESS' ? '⚙️' : col.key === 'RESOLVED' ? '✅' : '🔒'}
                </span>
                <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>No {col.label.toLowerCase()} tickets</p>
              </div>
            ) : (
              colTickets.map(t => <KanbanCard key={t.id} ticket={t} col={col} onClick={() => onOpen(t)} />)
            )}
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ ticket: t, col, onClick }) {
  const pri = CARD_PRIORITY[t.priority] || CARD_PRIORITY.MEDIUM
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        borderTop: `3px solid ${pri.border}`,
        padding: '14px', cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all .18s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Image thumbnail */}
      {t.imageUrl && (
        <div style={{ width: '100%', height: 110, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <img src={BACKEND_URL + t.imageUrl} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Priority + Category row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {CATEGORY_ICON[t.category]} {t.category}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color: pri.circleColor, background: pri.circleBg, border: `1px solid ${pri.circleBorder}`, borderRadius: 20, padding: '2px 8px' }}>
          {pri.label}
        </span>
      </div>

      {/* Title */}
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.4, margin: '0 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {t.title}
      </h4>

      {/* Description */}
      <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {t.description}
      </p>

      {/* Location */}
      {t.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
          <MapPin size={11} /> {t.location}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{format(new Date(t.createdAt), 'MMM d')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {t.comments?.length > 0 && (
            <span style={{ fontSize: 11, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
              <MessageSquare size={11} /> {t.comments.length}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#94a3b8' }}>#{t.id}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Ticket Card (Student View) ── */
const CARD_PRIORITY = {
  LOW:      { border: '#eab308', circleBg: '#fefce8', circleColor: '#ca8a04', circleBorder: '#fde047', label: 'LOW' },
  MEDIUM:   { border: '#22c55e', circleBg: '#f0fdf4', circleColor: '#16a34a', circleBorder: '#86efac', label: 'MEDIUM' },
  HIGH:     { border: '#ef4444', circleBg: '#fff1f2', circleColor: '#dc2626', circleBorder: '#fca5a5', label: 'HIGH' },
  CRITICAL: { border: '#ef4444', circleBg: '#fff1f2', circleColor: '#dc2626', circleBorder: '#fca5a5', label: 'HIGH' },
}
const CATEGORY_ICON = { MAINTENANCE: '🔧', IT: '💻', FACILITIES: '🏢', SECURITY: '🔒', CLEANING: '🧹', OTHER: '📋' }

function TicketCard({ ticket: t, onClick }) {
  const pri = CARD_PRIORITY[t.priority] || CARD_PRIORITY.MEDIUM

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        borderTop: `4px solid ${pri.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all .22s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';  e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* ── Top Header Bar ── */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left: category + status badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', width: 'fit-content' }}>
            🏛 CAMPUS TICKET
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', width: 'fit-content' }}>
            {CATEGORY_ICON[t.category]} {t.category}
          </span>
        </div>

        {/* Right: Circular priority badge */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: pri.circleBg,
          border: `2px solid ${pri.circleBorder}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 8px ${pri.border}33`,
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: pri.circleColor, letterSpacing: '0.06em', lineHeight: 1 }}>
            {pri.label}
          </span>
        </div>
      </div>

      {/* Thin divider */}
      <div style={{ height: 1, background: '#f1f5f9', margin: '0 16px' }} />

      {/* ── Image ── */}
      {t.imageUrl ? (
        <div style={{ width: '100%', height: 180, overflow: 'hidden', position: 'relative' }}>
          <img src={BACKEND_URL + t.imageUrl} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.45))', padding: '20px 12px 8px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.1em' }}>📷 PHOTO</span>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', height: 90, background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 32 }}>{CATEGORY_ICON[t.category] || '📋'}</span>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: '14px 16px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Status pill */}
        <div style={{ marginBottom: 10 }}>
          <StatusPill status={t.status} />
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.35, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          {t.title}
        </h3>

        {/* Description */}
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {t.description}
        </p>

        {/* Location */}
        {t.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            <MapPin size={12} style={{ color: '#94a3b8' }} /> {t.location}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
          <Clock size={12} /> {format(new Date(t.createdAt), 'MMM d, yyyy')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {t.comments?.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>
              <MessageSquare size={12} /> {t.comments.length}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>#{t.id}</span>
          <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Stunning Progress Stepper ── */
function StunningProgress({ status }) {
  const steps = [
    { key: 'OPEN',        label: 'Open',        icon: <AlertCircle size={15} /> },
    { key: 'IN_PROGRESS', label: 'In Progress',  icon: <Clock size={15} /> },
    { key: 'RESOLVED',    label: 'Resolved',     icon: <CheckCircle2 size={15} /> },
    { key: 'CLOSED',      label: 'Closed',       icon: <XCircle size={15} /> },
  ]
  const idx = steps.findIndex(s => s.key === status)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((s, i) => {
        const done    = i < idx
        const active  = i === idx
        const pending = i > idx
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', left: 15, top: 32, width: 2, height: 28, background: done ? '#2563eb' : '#e2e8f0', zIndex: 0, transition: 'background .3s' }} />
            )}
            {/* Step circle */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0, zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#2563eb' : active ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : '#f1f5f9',
              color: done || active ? '#fff' : '#cbd5e1',
              boxShadow: active ? '0 0 0 4px rgba(37,99,235,0.15), 0 4px 10px rgba(37,99,235,0.3)' : 'none',
              transition: 'all .3s',
            }}>
              {done ? <CheckCircle2 size={15} /> : s.icon}
            </div>
            {/* Label */}
            <div style={{ paddingBottom: i < steps.length - 1 ? 24 : 0, paddingTop: 5 }}>
              <p style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#1e293b' : done ? '#475569' : '#94a3b8', margin: '0 0 2px', transition: 'color .3s' }}>
                {s.label}
              </p>
              {active && (
                <p style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, margin: 0 }}>Current status</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Status Pill ── */
const STATUS_PILL = {
  OPEN:        { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: <AlertCircle size={12} /> },
  IN_PROGRESS: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: <Clock size={12} /> },
  RESOLVED:    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: <CheckCircle2 size={12} /> },
  CLOSED:      { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: <XCircle size={12} /> },
  REJECTED:    { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: <XCircle size={12} /> },
}
const STATUS_LABELS = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REJECTED: 'Rejected' }
function StatusPill({ status }) {
  const p = STATUS_PILL[status] || STATUS_PILL.CLOSED
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.bg, color: p.color, border: `1px solid ${p.border}`, whiteSpace: 'nowrap' }}>
      {p.icon} {STATUS_LABELS[status] || status}
    </span>
  )
}

/* ── Priority Pill ── */
const PRIORITY_PILL = {
  LOW:      { bg: '#fefce8', color: '#ca8a04', border: '#fde047' },
  MEDIUM:   { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  HIGH:     { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  CRITICAL: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
}
function PriorityPill({ priority }) {
  const p = PRIORITY_PILL[priority] || PRIORITY_PILL.MEDIUM
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
      {priority}
    </span>
  )
}
