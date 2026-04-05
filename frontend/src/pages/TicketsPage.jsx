import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Ticket, Image } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import ticketService from '../services/ticketService'
import TicketForm from '../components/TicketForm'

const PRIORITY_CLASS = { LOW: 'badge-green', MEDIUM: 'badge-blue', HIGH: 'badge-yellow', CRITICAL: 'badge-red' }
const STATUS_CLASS = { OPEN: 'badge-yellow', IN_PROGRESS: 'badge-blue', RESOLVED: 'badge-green', CLOSED: 'badge-gray' }

export default function TicketsPage() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState(null)  // ticket detail
  const [comment, setComment] = useState('')

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF'

  const load = () => {
    if (!user?.id) return
    setLoading(true)
    const call = isAdmin ? ticketService.getAll() : ticketService.getByUser(user.id)
    call.then(r => setTickets(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [user])

  const handleCreate = async (data, file) => {
    try {
      const { data: ticket } = await ticketService.create(data)
      if (file) await ticketService.uploadImage(ticket.id, file)
      toast.success('Ticket submitted!')
      setShowModal(false)
      load()
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

  const handleAddComment = async () => {
    if (!comment.trim()) return
    try {
      await ticketService.addComment(selected.id, user.id, comment)
      toast.success('Comment added')
      setComment('')
      // Refresh selected ticket
      const { data } = await ticketService.getById(selected.id)
      setSelected(data)
    } catch (err) { toast.error(err.message) }
  }

  const displayed = filterStatus ? tickets.filter(t => t.status === filterStatus) : tickets

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Incident Tickets</h1>
          <p>{isAdmin ? 'Manage all incident and maintenance tickets' : 'Your submitted tickets'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {loading
        ? <div className="loading-container"><div className="spinner" /></div>
        : (
          <div className="card">
            {displayed.length === 0
              ? (
                <div className="empty-state">
                  <Ticket size={48} />
                  <h3>No tickets found</h3>
                  <p>Report an incident or maintenance issue.</p>
                </div>
              )
              : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Submitted By</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(t => (
                        <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(t)}>
                          <td style={{ color: '#94a3b8' }}>#{t.id}</td>
                          <td style={{ fontWeight: 500 }}>
                            {t.imageUrl && <Image size={13} style={{ marginRight: 4, color: '#94a3b8', verticalAlign: 'middle' }} />}
                            {t.title}
                          </td>
                          <td>{t.category}</td>
                          <td><span className={`badge ${PRIORITY_CLASS[t.priority] || 'badge-gray'}`}>{t.priority}</span></td>
                          <td>{t.user?.name}</td>
                          <td>{format(new Date(t.createdAt), 'MMM d, yyyy')}</td>
                          <td><span className={`badge ${STATUS_CLASS[t.status] || 'badge-gray'}`}>{t.status.replace('_', ' ')}</span></td>
                          <td onClick={e => e.stopPropagation()}>
                            {isAdmin && t.status !== 'CLOSED' && (
                              <select className="filter-select" style={{ fontSize: 12 }}
                                value={t.status}
                                onChange={e => handleStatus(t.id, e.target.value)}>
                                <option value="OPEN">OPEN</option>
                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                <option value="RESOLVED">RESOLVED</option>
                                <option value="CLOSED">CLOSED</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

      {/* Ticket Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>#{selected.id} {selected.title}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <span className={`badge ${STATUS_CLASS[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
              <span className={`badge ${PRIORITY_CLASS[selected.priority]}`}>{selected.priority}</span>
              <span className="badge badge-gray">{selected.category}</span>
            </div>
            <p style={{ color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>{selected.description}</p>
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt="ticket" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 16 }} />
            )}

            {/* Comments */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Comments ({selected.comments?.length || 0})
              </h3>
              {selected.comments?.map(c => (
                <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#2563eb' }}>
                      {c.user?.name?.[0]}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user?.name}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#475569', paddingLeft: 36 }}>{c.content}</p>
                </div>
              ))}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <textarea className="form-control" rows={2} placeholder="Add a comment…"
                  value={comment} onChange={e => setComment(e.target.value)}
                  style={{ flex: 1 }} />
                <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={handleAddComment}>
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>Submit Ticket</h2>
            <TicketForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}