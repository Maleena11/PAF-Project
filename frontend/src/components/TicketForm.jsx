import React, { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['MAINTENANCE','IT','FACILITIES','SECURITY','CLEANING','OTHER']
const PRIORITIES  = ['LOW','MEDIUM','HIGH','CRITICAL']

export default function TicketForm({ onSubmit, onCancel }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: '', description: '', category: 'MAINTENANCE', priority: 'MEDIUM',
  })
  const [file, setFile]   = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ ...form, userId: user.id }, file)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Title *</label>
        <input className="form-control" required value={form.title}
          onChange={e => set('title', e.target.value)} placeholder="Briefly describe the issue" />
      </div>
      <div className="form-group">
        <label>Description *</label>
        <textarea className="form-control" rows={4} required value={form.description}
          onChange={e => set('description', e.target.value)} placeholder="Provide detailed information…" />
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Category *</label>
          <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Priority</label>
          <select className="form-control" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Image Upload */}
      <div className="form-group">
        <label>Attach Image (optional)</label>
        <div className="file-upload-area" onClick={() => fileRef.current.click()}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
          {preview
            ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={preview} alt="preview" style={{ maxHeight: 120, borderRadius: 6 }} />
                <button type="button" style={{ position: 'absolute', top: -8, right: -8, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={e => { e.stopPropagation(); setFile(null); setPreview(null) }}>
                  <X size={12} />
                </button>
              </div>
            )
            : (
              <div style={{ color: '#64748b' }}>
                <Upload size={24} style={{ margin: '0 auto 8px', display: 'block', color: '#94a3b8' }} />
                <p style={{ fontSize: 13 }}>Click to upload an image of the issue</p>
                <p style={{ fontSize: 11, color: '#94a3b8' }}>PNG, JPG up to 10MB</p>
              </div>
            )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Submit Ticket</button>
      </div>
    </form>
  )
}
