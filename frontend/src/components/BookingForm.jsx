import React, { useState, useEffect } from 'react'
import resourceService from '../services/resourceService'
import { useAuth } from '../context/AuthContext'

export default function BookingForm({ onSubmit, onCancel }) {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [form, setForm] = useState({
    resourceId: '', title: '', startTime: '', endTime: '', notes: '',
  })

  useEffect(() => {
    resourceService.getAll({ status: 'AVAILABLE' })
      .then(r => setResources(r.data))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      resourceId: Number(form.resourceId),
      userId: user.id,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Resource *</label>
        <select className="form-control" required value={form.resourceId} onChange={e => set('resourceId', e.target.value)}>
          <option value="">— Select a resource —</option>
          {resources.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.type.replace('_',' ')}) — Cap. {r.capacity}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Booking Title *</label>
        <input className="form-control" required value={form.title}
          onChange={e => set('title', e.target.value)} placeholder="e.g. Group Project Meeting" />
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label>Start Time *</label>
          <input className="form-control" type="datetime-local" required value={form.startTime}
            onChange={e => set('startTime', e.target.value)} />
        </div>
        <div className="form-group">
          <label>End Time *</label>
          <input className="form-control" type="datetime-local" required value={form.endTime}
            onChange={e => set('endTime', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea className="form-control" rows={2} value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">Submit Booking</button>
      </div>
    </form>
  )
}
