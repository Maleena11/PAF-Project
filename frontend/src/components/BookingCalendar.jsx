import React, { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
  isToday, format,
} from 'date-fns'

const STATUS_COLOR = {
  PENDING:   { bg: '#fef9c3', border: '#facc15', text: '#854d0e' },
  APPROVED:  { bg: '#dcfce7', border: '#4ade80', text: '#166534' },
  CANCELLED: { bg: '#f1f5f9', border: '#94a3b8', text: '#475569' },
  REJECTED:  { bg: '#fee2e2', border: '#f87171', text: '#991b1b' },
  COMPLETED: { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
}

export default function BookingCalendar({ bookings, onSelectBooking }) {
  const [current, setCurrent] = useState(new Date())

  // Build the 6-week grid for the current month
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(current)
    const monthEnd   = endOfMonth(current)
    const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 }) // Mon
    const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })

    const weeks = []
    let day = gridStart
    while (day <= gridEnd) {
      const week = []
      for (let i = 0; i < 7; i++) {
        week.push(day)
        day = addDays(day, 1)
      }
      weeks.push(week)
    }
    return weeks
  }, [current])

  // Map bookings to the days they touch
  const bookingsByDay = useMemo(() => {
    const map = {}
    bookings.forEach(b => {
      const start = new Date(b.startTime)
      const end   = new Date(b.endTime)
      let d = new Date(start)
      d.setHours(0, 0, 0, 0)
      const endDay = new Date(end)
      endDay.setHours(0, 0, 0, 0)
      while (d <= endDay) {
        const key = format(d, 'yyyy-MM-dd')
        if (!map[key]) map[key] = []
        if (!map[key].find(x => x.id === b.id)) map[key].push(b)
        d = addDays(d, 1)
      }
    })
    return map
  }, [bookings])

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── Month navigation ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(subMonths(current, 1))}>← Prev</button>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
          {format(current, 'MMMM yyyy')}
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(addMonths(current, 1))}>Next →</button>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.entries(STATUS_COLOR).map(([status, c]) => (
          <span key={status} style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px',
            borderRadius: 4, background: c.bg, color: c.text, border: `1px solid ${c.border}`
          }}>
            {status}
          </span>
        ))}
      </div>

      {/* ── Grid ── */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{
              padding: '8px 0', textAlign: 'center', fontSize: 12,
              fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0'
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {week.map((day, di) => {
              const key       = format(day, 'yyyy-MM-dd')
              const dayBkgs   = bookingsByDay[key] || []
              const inMonth   = isSameMonth(day, current)
              const todayCell = isToday(day)

              return (
                <div key={di} style={{
                  minHeight: 90,
                  padding: '6px 4px',
                  borderRight:  di < 6 ? '1px solid #e2e8f0' : 'none',
                  borderBottom: wi < weeks.length - 1 ? '1px solid #e2e8f0' : 'none',
                  background: inMonth ? '#ffffff' : '#f8fafc',
                }}>
                  {/* Day number */}
                  <div style={{ marginBottom: 4, textAlign: 'right' }}>
                    <span style={{
                      fontSize: 12, fontWeight: todayCell ? 700 : 400,
                      color: todayCell ? '#fff' : inMonth ? '#334155' : '#cbd5e1',
                      background: todayCell ? '#3b82f6' : 'transparent',
                      borderRadius: '50%', padding: '2px 6px',
                    }}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Booking chips — show up to 3, then "+N more" */}
                  {dayBkgs.slice(0, 3).map(b => {
                    const c = STATUS_COLOR[b.status] || STATUS_COLOR.PENDING
                    return (
                      <div
                        key={b.id}
                        onClick={() => onSelectBooking(b)}
                        title={`${b.title} — ${b.resource?.name}`}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 5px',
                          borderRadius: 3, marginBottom: 2, cursor: 'pointer',
                          background: c.bg, color: c.text,
                          border: `1px solid ${c.border}`,
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        }}
                      >
                        {format(new Date(b.startTime), 'HH:mm')} {b.title}
                      </div>
                    )
                  })}
                  {dayBkgs.length > 3 && (
                    <div style={{ fontSize: 10, color: '#64748b', paddingLeft: 4 }}>
                      +{dayBkgs.length - 3} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
