import React, { useState, useRef } from 'react'
import { Upload, X, MapPin, Phone, Type, AlignLeft, Tag, AlertCircle, Image as ImageIcon, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['MAINTENANCE', 'IT', 'FACILITIES', 'SECURITY', 'CLEANING', 'OTHER']
const PRIORITIES  = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const CATEGORY_LABELS = {
  MAINTENANCE: '🔧 Maintenance',
  IT:          '💻 IT / Tech',
  FACILITIES:  '🏢 Facilities',
  SECURITY:    '🔒 Security',
  CLEANING:    '🧹 Cleaning',
  OTHER:       '📋 Other',
}

const PRIORITY_INFO = {
  LOW:      { label: 'Low',      color: '#16a34a', bg: '#dcfce7', desc: 'Minor issue, not urgent' },
  MEDIUM:   { label: 'Medium',   color: '#2563eb', bg: '#dbeafe', desc: 'Needs attention soon' },
  HIGH:     { label: 'High',     color: '#d97706', bg: '#fef3c7', desc: 'Affects daily operations' },
  CRITICAL: { label: 'Critical', color: '#dc2626', bg: '#fee2e2', desc: 'Urgent — immediate fix needed' },
}

export default function TicketForm({ onSubmit, onCancel, initialData }) {
  const { user } = useAuth()
  const [form, setForm] = useState(initialData ? {
    title: initialData.title || '',
    description: initialData.description || '',
    category: initialData.category || 'MAINTENANCE',
    priority: initialData.priority || 'MEDIUM',
    location: initialData.location || '',
    contactDetails: initialData.contactDetails || '',
  } : {
    title: '', description: '', category: 'MAINTENANCE', priority: 'MEDIUM',
    location: '', contactDetails: '',
  })
  const [files, setFiles]     = useState([])
  const [previews, setPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3 - files.length)
    const newFiles    = [...files,    ...selected].slice(0, 3)
    const newPreviews = [...previews, ...selected.map(f => URL.createObjectURL(f))].slice(0, 3)
    setFiles(newFiles)
    setPreviews(newPreviews)
    e.target.value = ''
  }

  const removeFile = (i) => {
    setFiles(f    => f.filter((_, idx) => idx !== i))
    setPreviews(p => p.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (form.contactDetails) {
      const regex = /^it\d{8}@my\.sliit\.lk$/i;
      if (!regex.test(form.contactDetails)) {
        toast.error('Contact email must be in the format: itXXXXXXXX@my.sliit.lk');
        return;
      }
    }

    setSubmitting(true)
    try {
      await onSubmit({ ...form, userId: user.id }, files[0] || null)
    } finally {
      setSubmitting(false)
    }
  }

  const pri = PRIORITY_INFO[form.priority]

  return (
    <>
      <style>{`
        .tf-group { margin-bottom: 20px; }
        .tf-label { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px; }
        .tf-label .req { color: #dc2626; }
        .tf-input-wrap { position: relative; display: flex; align-items: center; }
        .tf-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        .tf-input {
          width: 100%; padding: 12px 16px 12px 44px;
          border-radius: 12px; border: 1.5px solid transparent;
          background-color: #f1f5f9; font-size: 15px; color: #0f172a;
          transition: all 0.2s ease; outline: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
          font-family: inherit;
        }
        .tf-textarea { padding: 14px 16px 14px 44px; min-height: 110px; resize: vertical; line-height: 1.6; }
        .tf-input:hover { background-color: #e2e8f0; }
        .tf-input:focus { background-color: #ffffff; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15); }
        .tf-input::placeholder { color: #94a3b8; font-weight: 400; }
        
        .tf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        
        .tf-select-wrap::after {
          content: ''; position: absolute; right: 16px; top: 50%; width: 8px; height: 8px;
          border-right: 2px solid #94a3b8; border-bottom: 2px solid #94a3b8;
          transform: translateY(-70%) rotate(45deg); pointer-events: none;
        }
        .tf-select { appearance: none; cursor: pointer; }
        
        .tf-upload-area {
          border: 2px dashed #cbd5e1; border-radius: 16px; padding: 32px 24px;
          text-align: center; cursor: pointer; background-color: #f8fafc;
          transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center;
        }
        .tf-upload-area:hover { border-color: #3b82f6; background-color: #eff6ff; }
        .tf-upload-area .upload-icon { color: #94a3b8; transition: color 0.2s ease; }
        .tf-upload-area:hover .upload-icon { color: #3b82f6; }
        
        .tf-actions {
          display: flex; gap: 12px; justify-content: flex-end; 
          padding: 24px 40px; flex-shrink: 0; border-top: 1px solid #f1f5f9; background-color: #ffffff; z-index: 10;
        }
        .tf-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border: none; padding: 12px 28px; border-radius: 10px;
          font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); letter-spacing: 0.02em;
        }
        .tf-btn-primary:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3); transform: translateY(-1px); }
        .tf-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        
        .tf-btn-secondary {
          background: transparent; color: #64748b; border: 1.5px solid transparent;
          padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.2s ease;
        }
        .tf-btn-secondary:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
      `}</style>
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      {/* Scrollable Form Body */}
      <div style={{ overflowY: 'auto', padding: '24px 40px', flexGrow: 1 }}>
        {/* Title */}
      <div className="tf-group">
        <label className="tf-label">Title <span className="req">*</span></label>
        <div className="tf-input-wrap">
          <Type size={18} className="tf-icon" />
          <input
            className="tf-input"
            required
            maxLength={120}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Projector not working in Lab 3"
          />
        </div>
      </div>

      {/* Description */}
      <div className="tf-group">
        <label className="tf-label">Description <span className="req">*</span></label>
        <div className="tf-input-wrap" style={{ alignItems: 'flex-start' }}>
          <AlignLeft size={18} className="tf-icon" style={{ top: 16 }} />
          <textarea
            className="tf-input tf-textarea"
            required
            minLength={10}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe the issue in detail — what happened, when, and how it affects you…"
          />
        </div>
      </div>

      {/* Category + Priority */}
      <div className="tf-grid">
        <div className="tf-group">
          <label className="tf-label">Category <span className="req">*</span></label>
          <div className="tf-input-wrap tf-select-wrap">
            <Tag size={18} className="tf-icon" />
            <select className="tf-input tf-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
        </div>
        <div className="tf-group">
          <label className="tf-label">Priority</label>
          <div className="tf-input-wrap tf-select-wrap">
            <AlertCircle size={18} className="tf-icon" style={{ color: pri.color }} />
            <select className="tf-input tf-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_INFO[p].label}</option>)}
            </select>
          </div>
          {/* Priority hint */}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pri.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>{pri.desc}</span>
          </div>
        </div>
      </div>

      {/* Location + Contact */}
      <div className="tf-grid">
        <div className="tf-group">
          <label className="tf-label">Location / Resource</label>
          <div className="tf-input-wrap">
            <MapPin size={18} className="tf-icon" />
            <input
              className="tf-input"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Block A, Lab 302"
            />
          </div>
        </div>
        <div className="tf-group">
          <label className="tf-label">Preferred Contact (Email)</label>
          <div className="tf-input-wrap">
            <Mail size={18} className="tf-icon" />
            <input
              className="tf-input"
              type="email"
              pattern="^it\d{8}@my\.sliit\.lk$"
              title="Email must be in the format: itXXXXXXXX@my.sliit.lk"
              value={form.contactDetails}
              onChange={e => set('contactDetails', e.target.value)}
              placeholder="itXXXXXXXX@my.sliit.lk"
            />
          </div>
        </div>
      </div>

      {/* Image Upload (up to 3) */}
      <div className="tf-group">
        <label className="tf-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Attach Images <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional, up to 3)</span></span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{files.length}/3</span>
        </label>

        {/* Previews */}
        {previews.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt={`preview-${i}`}
                  style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length < 3 && (
          <div
            className="tf-upload-area"
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
            <Upload size={28} className="upload-icon" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Click to upload images</p>
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>PNG, JPG up to 10MB each</p>
          </div>
        )}
      </div>
      </div>

      <div className="tf-actions">
        <button type="button" className="tf-btn-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="tf-btn-primary" disabled={submitting}>
          {submitting ? 'Submitting…' : initialData ? 'Update Ticket' : 'Submit Ticket'}
        </button>
      </div>
    </form>
    </>
  )
}
