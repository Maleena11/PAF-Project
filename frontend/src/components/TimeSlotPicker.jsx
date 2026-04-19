import React, { useState, useEffect } from 'react'
import bookingService from '../services/bookingService'

const SLOT_START_HOUR = 7   // 07:00
const SLOT_END_HOUR   = 22  // 22:00
const SLOT_MINUTES    = 30

function buildSlots(dateStr) {
  const slots = []
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const start = new Date(`${dateStr}T${pad(h)}:${pad(m)}:00`)
      const end   = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000)
      slots.push({ start, end })
    }
  }
  return slots
}

function pad(n) { return String(n).padStart(2, '0') }

function fmtTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toInputDatetime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function slotOverlapsBooking(slot, booking) {
  if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') return false
  return new Date(booking.startTime) < slot.end && new Date(booking.endTime) > slot.start
}

/**
 * TimeSlotPicker
 *
 * Props:
 *   resourceId          – selected resource id
 *   date                – "YYYY-MM-DD"
 *   startTime / endTime – current confirmed booking selection (datetime-local string)
 *   onSelect(s, e)      – called when user finalises a BOOKING range (free cells)
 *   onWaitlistRequest(s, e) – called when user finalises a WAITLIST range (on booked cells)
 *
 * Modes:
 *   'idle'     – nothing selected yet
 *   'booking'  – user clicked a free slot and is dragging an end
 *   'waitlist' – user clicked a booked slot and is dragging an end
 */
export default function TimeSlotPicker({
  resourceId, date,
  startTime, endTime,
  onSelect,
  onWaitlistRequest,
  onBookingsLoaded,
}) {
  const [bookings,      setBookings]      = useState([])
  const [loading,       setLoading]       = useState(false)
  const [mode,          setMode]          = useState('idle')   // 'idle'|'booking'|'waitlist'
  const [anchorIdx,     setAnchorIdx]     = useState(null)
  const [hoverIdx,      setHoverIdx]      = useState(null)

  useEffect(() => {
    resetSelection()
    if (!resourceId || !date) { setBookings([]); onBookingsLoaded?.([]) ; return }
    setLoading(true)
    const dateISO = new Date(`${date}T00:00:00`).toISOString()
    bookingService.getByResource(resourceId, dateISO)
      .then(r => { setBookings(r.data || []); onBookingsLoaded?.(r.data || []) })
      .catch(() => { setBookings([]); onBookingsLoaded?.([]) })
      .finally(() => setLoading(false))
  }, [resourceId, date])

  if (!date) return null

  const slots = buildSlots(date)
  const SLOTS_PER_HOUR = 60 / SLOT_MINUTES

  function resetSelection() {
    setMode('idle')
    setAnchorIdx(null)
    setHoverIdx(null)
  }

  const isSlotBooked = (idx) => bookings.some(b => slotOverlapsBooking(slots[idx], b))

  /** Walk from anchor toward target; in booking mode stop before booked slots. */
  function computeRange(anchor, target) {
    const dir = target >= anchor ? 1 : -1
    let end = anchor
    for (let i = anchor; dir > 0 ? i <= target : i >= target; i += dir) {
      // In booking mode, stop when hitting a booked cell (other than the anchor)
      if (mode === 'booking' && i !== anchor && isSlotBooked(i)) break
      end = i
    }
    return { lo: Math.min(anchor, end), hi: Math.max(anchor, end) }
  }

  // Current live hover range
  const liveRange = (anchorIdx !== null && hoverIdx !== null)
    ? computeRange(anchorIdx, hoverIdx)
    : null

  // Confirmed booking range (from parent props)
  let confirmedRange = null
  if (startTime && endTime) {
    const ss = new Date(startTime), se = new Date(endTime)
    let lo = -1, hi = -1
    slots.forEach((s, i) => {
      if (s.start.getTime() === ss.getTime()) lo = i
      if (s.end.getTime()   === se.getTime()) hi = i
    })
    if (lo >= 0 && hi >= 0) confirmedRange = { lo, hi }
  }

  function getSlotClass(idx) {
    const booked = isSlotBooked(idx)

    // Live selection overrides everything
    if (liveRange && idx >= liveRange.lo && idx <= liveRange.hi) {
      return mode === 'waitlist' ? 'slot-waitlist-hovering' : 'slot-hovering'
    }
    if (booked)        return 'slot-booked'
    if (confirmedRange && idx >= confirmedRange.lo && idx <= confirmedRange.hi)
      return 'slot-selected'
    return 'slot-free'
  }

  function handleCellClick(idx) {
    const booked = isSlotBooked(idx)

    if (mode === 'idle') {
      if (booked) {
        // Start waitlist selection
        setMode('waitlist')
        setAnchorIdx(idx)
        setHoverIdx(idx)
      } else {
        // Start booking selection
        setMode('booking')
        setAnchorIdx(idx)
        setHoverIdx(idx)
      }
      return
    }

    // Finalise selection
    const { lo, hi } = computeRange(anchorIdx, idx)

    if (mode === 'booking') {
      onSelect(toInputDatetime(slots[lo].start), toInputDatetime(slots[hi].end))
    } else {
      // waitlist — pass full requested range regardless of booked cells
      if (onWaitlistRequest) {
        onWaitlistRequest(toInputDatetime(slots[lo].start), toInputDatetime(slots[hi].end))
      }
    }
    resetSelection()
  }

  function handleCellHover(idx) {
    if (mode !== 'idle') setHoverIdx(idx)
  }

  function handleGridMouseLeave() {
    if (mode !== 'idle') setHoverIdx(anchorIdx)
  }

  // Group slots into hour rows
  const rows = []
  for (let i = 0; i < slots.length; i += SLOTS_PER_HOUR) {
    rows.push({
      hour: slots[i].start.getHours(),
      cells: slots.slice(i, i + SLOTS_PER_HOUR).map((s, j) => ({ slot: s, idx: i + j })),
    })
  }

  const halfLabels = Array.from({ length: SLOTS_PER_HOUR }, (_, i) => `:${pad(i * SLOT_MINUTES)}`)

  const modeHint = mode === 'idle'
    ? null
    : mode === 'booking'
      ? 'Click an end slot to set your booking range'
      : 'Click an end slot to set your waitlist range'

  return (
    <div className="slot-picker">
      {loading ? (
        <div style={{ padding: '16px 12px', color: '#64748b', fontSize: 13 }}>
          Loading slot availability…
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="slot-legend">
            <span className="slot-legend-item">
              <span className="slot-swatch slot-free" /> Free
            </span>
            <span className="slot-legend-item">
              <span className="slot-swatch slot-booked" /> Booked
            </span>
            <span className="slot-legend-item">
              <span className="slot-swatch slot-selected" /> Your selection
            </span>
            <span className="slot-legend-item">
              <span className="slot-swatch slot-waitlist-swatch" /> Waitlist
            </span>
            {modeHint && (
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500,
                color: mode === 'waitlist' ? '#b45309' : '#2563eb' }}>
                {modeHint}
              </span>
            )}
            {mode !== 'idle' && (
              <button
                type="button"
                onClick={resetSelection}
                style={{ marginLeft: mode === 'idle' ? 'auto' : 4, fontSize: 11,
                  color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
              >
                ✕ Cancel
              </button>
            )}
          </div>

          {/* Column headers */}
          <div className="slot-grid-header">
            <div className="slot-time-col" />
            {halfLabels.map(lbl => (
              <div key={lbl} className="slot-half-label">{lbl}</div>
            ))}
          </div>

          {/* Slot rows */}
          <div className="slot-grid-body" onMouseLeave={handleGridMouseLeave}>
            {rows.map(({ hour, cells }) => (
              <div className="slot-row" key={hour}>
                <div className="slot-time-col">{pad(hour)}:00</div>
                {cells.map(({ slot, idx }) => (
                  <div
                    key={idx}
                    className={`slot-cell ${getSlotClass(idx)}`}
                    title={
                      isSlotBooked(idx)
                        ? `${fmtTime(slot.start)}–${fmtTime(slot.end)} — Booked (click to waitlist)`
                        : `${fmtTime(slot.start)}–${fmtTime(slot.end)}`
                    }
                    onClick={() => handleCellClick(idx)}
                    onMouseEnter={() => handleCellHover(idx)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Confirmed booking selection footer */}
          {confirmedRange && mode === 'idle' && (
            <div className="slot-selection-display">
              <span>
                {fmtTime(slots[confirmedRange.lo].start)}
                {' – '}
                {fmtTime(slots[confirmedRange.hi].end)}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                style={{ marginLeft: 10 }}
                onClick={() => { onSelect('', ''); resetSelection() }}
              >
                Clear
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
