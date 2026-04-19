import React, { useState, useEffect, useMemo } from 'react'
import resourceService from '../services/resourceService'
import bookingService from '../services/bookingService'
import waitlistService from '../services/waitlistService'
import { useAuth } from '../context/AuthContext'
import TimeSlotPicker from './TimeSlotPicker'

export default function BookingForm({ onSubmit, onCancel, initialData = null }) {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [availability, setAvailability] = useState(null) // null | true | false
  const [checking, setChecking] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [resourceBookings, setResourceBookings] = useState([])

  // When set, the form is in waitlist mode for this { startTime, endTime }
  const [waitlistSlot, setWaitlistSlot] = useState(null)

  const [form, setForm] = useState({
    resourceId:        initialData?.resourceId        ? String(initialData.resourceId) : '',
    date: '',            // "YYYY-MM-DD" — drives the slot picker
    title:             initialData?.title             || '',
    purpose:           initialData?.purpose           || '',
    expectedAttendees: initialData?.expectedAttendees ? String(initialData.expectedAttendees) : '',
    startTime: '',
    endTime: '',
    notes:             initialData?.notes             || '',
    recurrenceRule: 'NONE',
    recurrenceEndDate: '',
  })

  useEffect(() => {
    resourceService.getAll({ status: 'AVAILABLE' })
      .then(r => setResources(r.data))
  }, [])

  // Server-side availability check (only in booking mode)
  useEffect(() => {
    if (waitlistSlot) { setAvailability(null); return }
    const { resourceId, startTime, endTime } = form
    if (!resourceId || !startTime || !endTime) { setAvailability(null); return }
    if (new Date(endTime) <= new Date(startTime)) { setAvailability(null); return }

    setChecking(true)
    bookingService
      .checkAvailability(resourceId, new Date(startTime).toISOString(), new Date(endTime).toISOString())
      .then(r => setAvailability(r.data.available))
      .catch(() => setAvailability(null))
      .finally(() => setChecking(false))
  }, [form.resourceId, form.startTime, form.endTime, waitlistSlot])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleResourceChange = (id) => {
    setForm(f => ({ ...f, resourceId: id, startTime: '', endTime: '' }))
    setSelectedResource(resources.find(r => r.id === Number(id)) || null)
    setWaitlistSlot(null)
  }

  const handleDateChange = (dateStr) => {
    setForm(f => ({ ...f, date: dateStr, startTime: '', endTime: '' }))
    setWaitlistSlot(null)
  }

  const handleSlotSelect = (startStr, endStr) => {
    setForm(f => ({ ...f, startTime: startStr, endTime: endStr }))
    setWaitlistSlot(null)
  }

  const handleWaitlistRequest = (startStr, endStr) => {
    setWaitlistSlot({ startTime: startStr, endTime: endStr })
    setForm(f => ({ ...f, startTime: '', endTime: '' })) // clear any booking selection
  }

  const overCapacity = selectedResource && form.expectedAttendees &&
    Number(form.expectedAttendees) > selectedResource.capacity

  const occurrenceCount = useMemo(() => {
    if (!form.recurrenceRule || form.recurrenceRule === 'NONE') return 1
    if (!form.startTime || !form.recurrenceEndDate) return null
    let count = 1
    let cursor = new Date(form.startTime)
    const endDate = new Date(form.recurrenceEndDate)
    endDate.setHours(23, 59, 59)
    for (let i = 0; i < 365; i++) {
      if (form.recurrenceRule === 'DAILY')        cursor.setDate(cursor.getDate() + 1)
      else if (form.recurrenceRule === 'WEEKLY')  cursor.setDate(cursor.getDate() + 7)
      else if (form.recurrenceRule === 'MONTHLY') cursor.setMonth(cursor.getMonth() + 1)
      if (cursor > endDate) break
      count++
    }
    return count
  }, [form.startTime, form.recurrenceRule, form.recurrenceEndDate])

  // Next free slot suggestion when availability === false
  const nextFreeSlot = useMemo(() => {
    if (availability !== false || !form.startTime || !form.endTime || !form.date) return null

    const dateStr = form.date
    const slots = []
    for (let h = 7; h < 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        const start = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
        const end   = new Date(start.getTime() + 30 * 60 * 1000)
        slots.push({ start, end })
      }
    }

    const duration       = new Date(form.endTime) - new Date(form.startTime)
    const numSlots       = Math.max(1, Math.round(duration / (30 * 60 * 1000)))
    const selectedEnd    = new Date(form.endTime)
    const activeBookings = resourceBookings.filter(
      b => b.status !== 'CANCELLED' && b.status !== 'REJECTED'
    )

    const isFree = (slot) =>
      !activeBookings.some(b => new Date(b.startTime) < slot.end && new Date(b.endTime) > slot.start)

    for (let i = 0; i <= slots.length - numSlots; i++) {
      if (slots[i].start < selectedEnd) continue
      if (Array.from({ length: numSlots }, (_, j) => slots[i + j]).every(isFree)) {
        return { start: slots[i].start, end: slots[i + numSlots - 1].end }
      }
    }
    return null
  }, [availability, form.startTime, form.endTime, form.date, resourceBookings])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (waitlistSlot) {
      // ── Waitlist submission ──────────────────────────────────────────────
      try {
        await waitlistService.join({
          resourceId:        Number(form.resourceId),
          userId:            user.id,
          slotStart:         new Date(waitlistSlot.startTime).toISOString(),
          slotEnd:           new Date(waitlistSlot.endTime).toISOString(),
          title:             form.title,
          purpose:           form.purpose,
          expectedAttendees: Number(form.expectedAttendees),
          notes:             form.notes || undefined,
        })
        onSubmit({ _waitlist: true }) // signal success to parent
      } catch (err) {
        // re-throw so the parent's catch (in BookingsPage) can toast the error
        throw err
      }
    } else {
      // ── Normal booking submission ────────────────────────────────────────
      if (availability === false) return
      onSubmit({
        ...form,
        resourceId:        Number(form.resourceId),
        expectedAttendees: Number(form.expectedAttendees),
        userId:            user.id,
        recurrenceEndDate: form.recurrenceRule !== 'NONE' && form.recurrenceEndDate
          ? form.recurrenceEndDate
          : undefined,
      })
    }
  }

  const pad = (n) => String(n).padStart(2, '0')

  const fmtSlot = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const toInputDatetime = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

  return (
    <form onSubmit={handleSubmit}>

      {/* Resource */}
      <div className="form-group">
        <label>Resource *</label>
        <select
          className="form-control"
          required
          value={form.resourceId}
          onChange={e => handleResourceChange(e.target.value)}
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

      {/* Date + Attendees side by side */}
      <div className="form-grid">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Date *</label>
          <input
            className="form-control"
            type="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            value={form.date}
            onChange={e => handleDateChange(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>
            Attendees *
            {selectedResource && (
              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}>
                (max {selectedResource.capacity})
              </span>
            )}
          </label>
          <input
            className="form-control"
            type="number"
            min={1}
            max={selectedResource ? selectedResource.capacity : undefined}
            required
            value={form.expectedAttendees}
            onChange={e => set('expectedAttendees', e.target.value)}
            placeholder="e.g. 20"
            style={overCapacity ? { borderColor: '#dc2626' } : {}}
          />
        </div>
      </div>
      {overCapacity && (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
          Exceeds room capacity of {selectedResource.capacity}. Please reduce attendees or choose a larger room.
        </p>
      )}

      {/* Time Slot Picker */}
      {form.resourceId && form.date && (
        <div className="form-group" style={{ marginTop: 16 }}>
          <label>
            Time Slot *
            {!form.startTime && !waitlistSlot && (
              <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                Click a free slot to book — click a booked slot to waitlist
              </span>
            )}
          </label>
          <TimeSlotPicker
            resourceId={form.resourceId}
            date={form.date}
            startTime={form.startTime}
            endTime={form.endTime}
            onSelect={handleSlotSelect}
            onWaitlistRequest={handleWaitlistRequest}
            onBookingsLoaded={setResourceBookings}
          />
        </div>
      )}

      {/* Waitlist mode banner */}
      {waitlistSlot && (
        <div className="waitlist-banner">
          <div className="waitlist-banner-icon">⏳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Joining waitlist</div>
            <div style={{ fontSize: 13 }}>
              {selectedResource?.name} · {form.date} · {fmtSlot(waitlistSlot.startTime)} – {fmtSlot(waitlistSlot.endTime)}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, color: '#92400e' }}>
              You'll be automatically approved and notified if this slot becomes available.
            </div>
          </div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 16, padding: '0 4px' }}
            onClick={() => setWaitlistSlot(null)}
            title="Cancel waitlist"
          >✕</button>
        </div>
      )}

      {/* Availability double-check (booking mode only) */}
      {!waitlistSlot && form.resourceId && form.startTime && form.endTime && (
        <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
          {checking && <span style={{ color: '#64748b' }}>⏳ Confirming availability…</span>}
          {!checking && availability === true && (
            <span style={{ color: '#16a34a' }}>✓ Slot confirmed available</span>
          )}
          {!checking && availability === false && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ color: '#dc2626' }}>✗ Slot no longer available — please choose another</span>
              {nextFreeSlot && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <span style={{ color: '#15803d' }}>
                    Next available: <strong>{fmtSlot(nextFreeSlot.start)} – {fmtSlot(nextFreeSlot.end)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSlotSelect(
                      toInputDatetime(nextFreeSlot.start),
                      toInputDatetime(nextFreeSlot.end),
                    )}
                    style={{
                      marginLeft: 'auto', fontSize: 12, fontWeight: 600,
                      padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                      background: '#16a34a', color: '#fff', border: 'none',
                    }}
                  >
                    Use this slot →
                  </button>
                </div>
              )}
              {!nextFreeSlot && (
                <span style={{ color: '#64748b', fontWeight: 400 }}>
                  No free slots remaining today for this resource.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recurrence (booking mode only) */}
      {!waitlistSlot && (
        <div className={`form-group${form.recurrenceRule !== 'NONE' ? ' form-grid' : ''}`}
             style={form.recurrenceRule !== 'NONE' ? { marginBottom: 0 } : {}}>
          <div className={form.recurrenceRule !== 'NONE' ? 'form-group' : ''} style={{ marginBottom: 0 }}>
            <label>Repeat</label>
            <select
              className="form-control"
              value={form.recurrenceRule}
              onChange={e => set('recurrenceRule', e.target.value)}
            >
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          {form.recurrenceRule !== 'NONE' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Repeat Until *</label>
              <input
                className="form-control"
                type="date"
                required
                min={form.startTime ? form.startTime.slice(0, 10) : undefined}
                value={form.recurrenceEndDate}
                onChange={e => set('recurrenceEndDate', e.target.value)}
              />
            </div>
          )}
        </div>
      )}
      {!waitlistSlot && form.recurrenceRule !== 'NONE' && occurrenceCount != null && (
        <p style={{ fontSize: 13, color: '#2563eb', margin: '8px 0 0', fontWeight: 500 }}>
          Will create {occurrenceCount} booking{occurrenceCount !== 1 ? 's' : ''} total
          {occurrenceCount >= 365 ? ' (capped at 365)' : ''}.
        </p>
      )}

      {/* Optional Notes */}
      <div className="form-group" style={{ marginTop: 16 }}>
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
          className={`btn ${waitlistSlot ? 'btn-waitlist' : 'btn-primary'}`}
          disabled={
            (!waitlistSlot && (!form.startTime || !form.endTime)) ||
            (!waitlistSlot && (availability === false || checking)) ||
            !!overCapacity
          }
        >
          {waitlistSlot ? '⏳ Join Waitlist' : 'Submit Booking'}
        </button>
      </div>
    </form>
  )
}
