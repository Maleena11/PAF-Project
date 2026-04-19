import { useState, useRef, useEffect } from 'react'
import {
  Building2, FlaskConical, Users, Dumbbell,
  BookOpen, Mic2, LayoutGrid, CheckCircle2,
  MapPin, Hash, FileText, ChevronDown, ImagePlus, X
} from 'lucide-react'

const TYPE_OPTIONS = [
  { value: 'LECTURE_HALL', label: 'Lecture Hall', icon: Building2,   color: '#4f46e5', bg: '#e0e7ff', border: '#a5b4fc' },
  { value: 'LAB',          label: 'Lab',          icon: FlaskConical, color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  { value: 'MEETING_ROOM', label: 'Meeting Room', icon: Users,        color: '#0f766e', bg: '#ccfbf1', border: '#5eead4' },
  { value: 'SPORTS',       label: 'Sports',       icon: Dumbbell,     color: '#ea580c', bg: '#ffedd5', border: '#fb923c' },
  { value: 'STUDY_ROOM',   label: 'Study Room',   icon: BookOpen,     color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
  { value: 'AUDITORIUM',   label: 'Auditorium',   icon: Mic2,         color: '#e11d48', bg: '#ffe4e6', border: '#fda4af' },
  { value: 'OTHER',        label: 'Other',        icon: LayoutGrid,   color: '#475569', bg: '#e2e8f0', border: '#94a3b8' },
]

const STATUS_OPTIONS = [
  { value: 'AVAILABLE',   label: 'Available',   dot: '#16a34a', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  { value: 'OCCUPIED',    label: 'Occupied',    dot: '#d97706', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { value: 'MAINTENANCE', label: 'Maintenance', dot: '#6366f1', color: '#3730a3', bg: '#e0e7ff', border: '#a5b4fc' },
  { value: 'RETIRED',     label: 'Retired',     dot: '#ef4444', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
]

export default function ResourceForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', type: '', location: '',
    capacity: 10, status: 'AVAILABLE', description: '',
    ...initial,
  })
  const [typeOpen, setTypeOpen] = useState(false)
  const typeRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl || null)
  const fileInputRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageError(false)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    const handler = (e) => {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [imageError, setImageError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.type) { setTypeOpen(true); return }
    if (!initial && !imageFile) { setImageError(true); return }
    setImageError(false)
    onSubmit({ ...form, capacity: Number(form.capacity), _imageFile: imageFile })
  }

  return (
    <form onSubmit={handleSubmit} className="rf-form">

      {/* ── Row 1: Name + Type ── */}
      <div className="rf-row">
        <div className="rf-field rf-field--grow">
          <label className="rf-label" htmlFor="rf-name">
            Resource Name <span className="rf-required">*</span>
          </label>
          <input
            id="rf-name"
            className="rf-input"
            required
            value={form.name}
            onChange={e => set('name', e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
            placeholder="e.g. Lecture Hall A"
            disabled={!!initial}
          />
        </div>

        <div className="rf-field rf-field--type" ref={typeRef}>
          <label className="rf-label">
            Type <span className="rf-required">*</span>
          </label>
          <div className="rf-type-dropdown">
            {(() => {
              const sel = TYPE_OPTIONS.find(o => o.value === form.type)
              const Icon = sel?.icon
              return (
                <button
                  type="button"
                  className="rf-type-trigger"
                  style={sel ? { background: sel.bg, color: sel.color, borderColor: sel.border } : {}}
                  onClick={() => !initial && setTypeOpen(o => !o)}
                  disabled={!!initial}
                >
                  {sel ? (
                    <>
                      <span className="rf-type-icon-wrap" style={{ background: sel.color }}>
                        <Icon size={13} color="#fff" />
                      </span>
                      <span className="rf-type-label" style={{ fontSize: 14, fontWeight: 500 }}>{sel.label}</span>
                    </>
                  ) : (
                    <span className="rf-type-label" style={{ fontSize: 14, color: '#9ca3af' }}>Select Type</span>
                  )}
                  <ChevronDown
                    size={14}
                    className="rf-type-chevron"
                    style={{ transform: typeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
              )
            })()}
            {typeOpen && (
              <div className="rf-type-panel">
                <div className="rf-type-grid">
                  {TYPE_OPTIONS.map(({ value, label, icon: Icon, color, bg, border }) => {
                    const active = form.type === value
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`rf-type-chip${active ? ' rf-type-chip--active' : ''}`}
                        style={active
                          ? { background: bg, color, borderColor: border }
                          : { '--rf-chip-color': color, '--rf-chip-bg': bg, '--rf-chip-border': border }}
                        onClick={() => { set('type', value); setTypeOpen(false) }}
                      >
                        <span className="rf-type-icon-wrap" style={{ background: active ? color : undefined }}>
                          <Icon size={13} color={active ? '#fff' : undefined} />
                        </span>
                        <span className="rf-type-label">{label}</span>
                        {active && <CheckCircle2 size={11} className="rf-type-check" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Location + Capacity ── */}
      <div className="rf-row">
        <div className="rf-field rf-field--grow">
          <label className="rf-label" htmlFor="rf-location">
            <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Location <span className="rf-required">*</span>
          </label>
          <select
            id="rf-location"
            className="rf-input"
            required
            value={form.location}
            onChange={e => set('location', e.target.value)}
            disabled={!!initial}
          >
            <option value="">— Select a location —</option>
            <option value="Block A, Ground Floor">Block A, Ground Floor</option>
            <option value="Block B, First Floor">Block B, First Floor</option>
            <option value="Block C, Second Floor">Block C, Second Floor</option>
            <option value="Main Building, Third Floor">Main Building, Third Floor</option>
            <option value="Library, Second Floor">Library, Second Floor</option>
            <option value="Sports Complex">Sports Complex</option>
          </select>
        </div>
        <div className="rf-field rf-field--capacity">
          <label className="rf-label" htmlFor="rf-capacity">
            <Hash size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Capacity <span className="rf-required">*</span>
          </label>
          <input
            id="rf-capacity"
            className="rf-input"
            type="number"
            required
            min={1}
            value={form.capacity}
            onChange={e => set('capacity', e.target.value)}
          />
        </div>
      </div>

      {/* ── Row 3: Status ── */}
      <div className="rf-field">
        <label className="rf-label">Availability Status</label>
        <div className="rf-status-grid">
          {STATUS_OPTIONS.map(({ value, label, dot, color, bg, border }) => {
            const active = form.status === value
            const locked = !initial && value !== 'AVAILABLE'
            return (
              <button
                key={value}
                type="button"
                className={`rf-status-card${active ? ' rf-status-card--active' : ''}${locked ? ' rf-status-card--locked' : ''}`}
                style={active ? { background: bg, color, borderColor: border } : undefined}
                onClick={() => !locked && set('status', value)}
                disabled={locked}
                title={locked ? 'Status can only be changed when editing' : undefined}
              >
                <span className="rf-status-dot" style={{ background: dot }} />
                <span className="rf-status-label">{label}</span>
                {active && <CheckCircle2 size={13} className="rf-status-check" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Description ── */}
      <div className="rf-field">
        <label className="rf-label" htmlFor="rf-desc">
          <FileText size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Description <span className="rf-optional">(optional)</span>
        </label>
        <textarea
          id="rf-desc"
          className="rf-input rf-textarea"
          rows={2}
          value={form.description}
          maxLength={500}
          onChange={e => set('description', e.target.value)}
          placeholder="Notes, equipment list, or special access details…"
        />
      </div>

      {/* ── Image Upload ── */}
      <div className="rf-field">
        <label className="rf-label">
          <ImagePlus size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Image {initial ? <span className="rf-optional">(optional)</span> : <span className="rf-required">*</span>}
        </label>
        {imageError && <span style={{ fontSize: 12, color: '#ef4444', marginBottom: 4, display: 'block' }}>Image is required</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />
        {imagePreview ? (
          <div className="rf-image-preview-wrap">
            <img src={imagePreview} alt="Resource preview" className="rf-image-preview" />
            <button type="button" className="rf-image-remove" onClick={removeImage} title="Remove image">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="rf-image-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={20} style={{ color: '#94a3b8', marginBottom: 4 }} />
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Click to upload an image</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>PNG, JPG, GIF up to 10MB</span>
          </button>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="rf-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {initial ? 'Update Resource' : 'Create Resource'}
        </button>
      </div>
    </form>
  )
}
