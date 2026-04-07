import React, { useState, useEffect } from 'react'
import resourceService from '../services/resourceService'
import bookingService from '../services/bookingService'
import { useAuth } from '../context/AuthContext'

export default function BookingForm({ onSubmit, onCancel, initialData = null }) {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [availability, setAvailability] = useState(null) // null | true | false
  const [checking, setChecking] = useState(false)
  const [form, setForm] = useState({
    resourceId:        initialData?.resourceId        ? String(initialData.resourceId) : '',
    title:             initialData?.title             || '',
    purpose:           initialData?.purpose           || '',
    expectedAttendees: initialData?.expectedAttendees ? String(initialData.expectedAttendees) : '',
    startTime: '',
    endTime:   '',
    notes:             initialData?.notes             || '',
  })

  useEffect(() => {
    resourceService.getAll({ status: 'AVAILABLE' })
      .then(r => setResources(r.data))
  }, [])

  // Re-check availability whenever resource or times change
  useEffect(() => {
    const { resourceId, startTime, endTime } = form
    if (!resourceId || !startTime || !endTime) {
      setAvailability(null)
      return
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setAvailability(null)
      return
    }

    setChecking(true)
    bookingService
      .checkAvailability(resourceId, new Date(startTime).toISOString(), new Date(endTime).toISOString())
      .then(r => setAvailability(r.data.available))
      .catch(() => setAvailability(null))
      .finally(() => setChecking(false))
  }, [form.resourceId, form.startTime, form.endTime])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (availability === false) return
    onSubmit({
      ...form,
      resourceId: Number(form.resourceId),
      expectedAttendees: Number(form.expectedAttendees),
      userId: user.id,
    })
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* Resource */}
      <div className="form-group">
        <label>Resource *</label>
        <select
          className="form-control"
          required
          value={form.resourceId}
          onChange={e => set('resourceId', e.target.value)}
        >
          <option value="">— Select a resource —</option>
          {resources.map(r => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.type.replace(/_/g, ' ')}) — Cap. {r.capacity}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="form-group">
        <label>Booking Title *</label>
        <input
          className="form-control"
          required
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. Group Project Meeting"
        />
      </div>

      {/* Purpose */}
      <div className="form-group">
        <label>Purpose *</label>
        <textarea
          className="form-control"
          rows={2}
          required
          value={form.purpose}
          onChange={e => set('purpose', e.target.value)}
          placeholder="Describe the purpose of this booking…"
        />
      </div>

      {/* Expected Attendees */}
      <div className="form-group">
        <label>Expected Attendees *</label>
        <input
          className="form-control"
          type="number"
          min={1}
          required
          value={form.expectedAttendees}
          onChange={e => set('expectedAttendees', e.target.value)}
          placeholder="e.g. 20"
        />
      </div>

      {/* Start / End Times */}
      <div className="form-grid">
        <div className="form-group">
          <label>Start Time *</label>
          <input
            className="form-control"
            type="datetime-local"
            required
            value={form.startTime}
            onChange={e => set('startTime', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>End Time *</label>
          <input
            className="form-control"
            type="datetime-local"
            required
            value={form.endTime}
            onChange={e => set('endTime', e.target.value)}
          />
        </div>
      </div>

      {/* Availability indicator */}
      {form.resourceId && form.startTime && form.endTime && (
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
          {checking && <span style={{ color: '#64748b' }}>⏳ Checking availability…</span>}
          {!checking && availability === true  && <span style={{ color: '#16a34a' }}>✓ Resource is available for this time slot</span>}
          {!checking && availability === false && <span style={{ color: '#dc2626' }}>✗ Resource is already booked for this time slot</span>}
        </div>
      )}

      {/* Optional Notes */}
      <div className="form-group">
        <label>Additional Notes</label>
        <textarea
          className="form-control"
          rows={2}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Optional additional notes…"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={availability === false || checking}
        >
          Submit Booking
        </button>
      </div>
    </form>
  )
}
