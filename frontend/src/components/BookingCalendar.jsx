import React, { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  isSameMonth, isToday, format,
} from 'date-fns'
import { ChevronLeft, ChevronRight, LayoutGrid, Columns } from 'lucide-react'

const STATUS_CONFIG = {
  PENDING:   { bg: 'linear-gradient(135deg,#fef08a,#fde047)', border: '#f59e0b', text: '#713f12', dot: '#f59e0b', label: 'Pending'   },
  APPROVED:  { bg: 'linear-gradient(135deg,#bbf7d0,#86efac)', border: '#22c55e', text: '#14532d', dot: '#22c55e', label: 'Approved'  },
  CANCELLED: { bg: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)', border: '#94a3b8', text: '#475569', dot: '#94a3b8', label: 'Cancelled' },
  REJECTED:  { bg: 'linear-gradient(135deg,#fecaca,#f87171)', border: '#ef4444', text: '#7f1d1d', dot: '#ef4444', label: 'Rejected'  },
  COMPLETED: { bg: 'linear-gradient(135deg,#bfdbfe,#93c5fd)', border: '#3b82f6', text: '#1e3a8a', dot: '#3b82f6', label: 'Completed' },
}

const WEEKEND    = new Set([0, 6])
const HOUR_START = 7           // 07:00
const HOUR_END   = 22          // 22:00
const TOTAL_HRS  = HOUR_END - HOUR_START   // 15 hrs
const CELL_H     = 56          // px per hour
const GRID_H     = TOTAL_HRS * CELL_H      // 840 px

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ── helpers ── */
function clamp(val, lo, hi) { return Math.max(lo, Math.min(hi, val)) }

function topPx(b, day) {
  const base = new Date(day); base.setHours(HOUR_START, 0, 0, 0)
  const end  = new Date(day); end.setHours(HOUR_END,   0, 0, 0)
  const s    = clamp(new Date(b.startTime), base, end)
  const mins = (s.getHours() - HOUR_START) * 60 + s.getMinutes()
  return (mins / (TOTAL_HRS * 60)) * GRID_H
}

function heightPx(b, day) {
  const base = new Date(day); base.setHours(HOUR_START, 0, 0, 0)
  const ceil = new Date(day); ceil.setHours(HOUR_END,   0, 0, 0)
  const s    = clamp(new Date(b.startTime), base, ceil)
  const e    = clamp(new Date(b.endTime),   base, ceil)
  const mins = Math.max((e - s) / 60000, 15)
  return Math.max((mins / (TOTAL_HRS * 60)) * GRID_H, 20)
}

/* ── Week View ── */
function WeekView({ weekStart, bookings, onSelectBooking }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: TOTAL_HRS }, (_, i) => HOUR_START + i)

  const dayBookings = (day) => {
    const ds = new Date(day); ds.setHours(0, 0, 0, 0)
    const de = new Date(day); de.setHours(23, 59, 59, 999)
    return bookings.filter(b => new Date(b.startTime) <= de && new Date(b.endTime) >= ds)
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* ── Day headers ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '52px repeat(7, 1fr)',
        borderBottom: '2px solid #94a3b8',
        background: 'linear-gradient(to bottom,#f1f5f9,#e8edf2)',
        position: 'sticky', top: 0, zIndex: 3,
      }}>
        <div style={{ borderRight: '1.5px solid #94a3b8' }} />
        {days.map((day, i) => {
          const isWknd   = WEEKEND.has(day.getDay())
          const todayCel = isToday(day)
          return (
            <div key={i} style={{
              padding: '10px 6px 8px',
              textAlign: 'center',
              borderRight: i < 6 ? '1.5px solid #94a3b8' : 'none',
              background: isWknd ? 'linear-gradient(to bottom,#eef2ff,#e0e7ff)' : 'transparent',
            }}>
              <div style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '.07em', color: isWknd ? '#6366f1' : '#64748b', marginBottom: 4,
              }}>
                {DAY_LABELS[i]}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 8,
                fontSize: 14, fontWeight: todayCel ? 800 : 600,
                color: todayCel ? '#fff' : isWknd ? '#6366f1' : '#1e293b',
                background: todayCel
                  ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                  : isWknd ? 'rgba(238,242,255,0.9)' : 'rgba(241,245,249,0.9)',
                border: todayCel
                  ? '2px solid #6366f1'
                  : isWknd ? '1.5px solid #a5b4fc' : '1.5px solid #94a3b8',
                boxShadow: todayCel ? '0 2px 8px rgba(99,102,241,0.55)' : 'none',
              }}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Time grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', height: GRID_H, position: 'relative' }}>

        {/* Hour labels column */}
        <div style={{ borderRight: '1.5px solid #94a3b8', position: 'relative' }}>
          {hours.map(h => (
            <div key={h} style={{
              height: CELL_H,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
              paddingRight: 8, paddingTop: 3,
              fontSize: 10, color: '#94a3b8', fontWeight: 700,
              borderBottom: '1px solid #e2e8f0',
            }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const bkgs   = dayBookings(day)
          const isWknd = WEEKEND.has(day.getDay())
          return (
            <div key={di} style={{
              borderRight: di < 6 ? '1.5px solid #94a3b8' : 'none',
              position: 'relative',
              background: isWknd ? '#fafbff' : '#fff',
            }}>
              {/* Hour row lines */}
              {hours.map(h => (
                <div key={h} style={{
                  height: CELL_H,
                  borderBottom: h % 2 === 0 ? '1px solid #d1d5db' : '1px dashed #e5e7eb',
                }} />
              ))}

              {/* Booking blocks */}
              {bkgs.map(b => {
                const c   = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDING
                const top = topPx(b, day)
                const ht  = heightPx(b, day)
                return (
                  <div
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    title={`${b.title} · ${b.resource?.name}`}
                    style={{
                      position: 'absolute',
                      top: top + 1,
                      height: ht - 2,
                      left: 3, right: 3,
                      background: c.bg,
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 6,
                      padding: '3px 6px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      zIndex: 2,
                      boxShadow: `0 2px 6px ${c.border}45`,
                      transition: 'filter .12s, transform .1s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.filter='brightness(0.93)'; e.currentTarget.style.transform='scale(1.01)' }}
                    onMouseOut={e => { e.currentTarget.style.filter='none'; e.currentTarget.style.transform='none' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 700, color: c.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
                      {format(new Date(b.startTime),'HH:mm')}–{format(new Date(b.endTime),'HH:mm')}
                    </div>
                    {ht > 34 && (
                      <div style={{
                        fontSize: 10, fontWeight: 800, color: c.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginTop: 1,
                      }}>
                        {b.title}
                      </div>
                    )}
                    {ht > 52 && b.resource?.name && (
                      <div style={{ fontSize: 9, color: c.text, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.resource.name}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Component ── */
export default function BookingCalendar({ bookings, onSelectBooking }) {
  const [current,    setCurrent]    = useState(new Date())
  const [view,       setView]       = useState('month') // 'month' | 'week'
  const [hoveredDay, setHoveredDay] = useState(null)

  /* navigation */
  const weekStart = startOfWeek(current, { weekStartsOn: 1 })
  const weekEnd   = addDays(weekStart, 6)

  const goBack = () => view === 'week' ? setCurrent(subWeeks(current, 1)) : setCurrent(subMonths(current, 1))
  const goFwd  = () => view === 'week' ? setCurrent(addWeeks(current, 1)) : setCurrent(addMonths(current, 1))

  const periodLabel = view === 'week'
    ? `${format(weekStart,'MMM d')} – ${format(weekEnd,'MMM d, yyyy')}`
    : format(current, 'MMMM yyyy')

  /* month grid */
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(current)
    const monthEnd   = endOfMonth(current)
    const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })
    const rows = []
    let day = gridStart
    while (day <= gridEnd) {
      const row = []
      for (let i = 0; i < 7; i++) { row.push(day); day = addDays(day, 1) }
      rows.push(row)
    }
    return rows
  }, [current])

  const bookingsByDay = useMemo(() => {
    const map = {}
    bookings.forEach(b => {
      let d = new Date(b.startTime); d.setHours(0,0,0,0)
      const end = new Date(b.endTime); end.setHours(0,0,0,0)
      while (d <= end) {
        const key = format(d,'yyyy-MM-dd')
        if (!map[key]) map[key] = []
        if (!map[key].find(x => x.id === b.id)) map[key].push(b)
        d = addDays(d,1)
      }
    })
    return map
  }, [bookings])

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── Gradient Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(67,56,202,0.35)',
        position: 'relative',
        overflow: 'hidden',
        gap: 12,
      }}>
        <div style={{ position:'absolute', right:-40, top:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:'38%', bottom:-60, width:130, height:130, borderRadius:'50%', background:'rgba(99,102,241,0.15)', pointerEvents:'none' }} />

        <button onClick={goBack} style={navBtnStyle}
          onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.25)'}
          onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
        ><ChevronLeft size={16} /></button>

        <div style={{ textAlign:'center', zIndex:1, flex:1 }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'-0.4px' }}>
            {view === 'week'
              ? <><span>{format(weekStart,'MMM d')}</span><span style={{color:'#a5b4fc', margin:'0 6px'}}>–</span><span>{format(weekEnd,'MMM d, yyyy')}</span></>
              : <><span>{format(current,'MMMM')}</span><span style={{color:'#a5b4fc', marginLeft:8}}>{format(current,'yyyy')}</span></>
            }
          </div>
          <div style={{ fontSize:11, color:'rgba(165,180,252,0.85)', marginTop:3, fontWeight:500 }}>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} this view
          </div>
          {/* View toggle pills */}
          <div style={{ display:'flex', gap:4, justifyContent:'center', marginTop:8 }}>
            {[['month', <LayoutGrid size={11} />, 'Month'], ['week', <Columns size={11} />, 'Week']].map(([v, icon, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{
                display:'inline-flex', alignItems:'center', gap:4,
                padding:'3px 12px', borderRadius:9999,
                fontSize:11, fontWeight:700, cursor:'pointer',
                border: view === v ? '1.5px solid rgba(255,255,255,0.6)' : '1.5px solid rgba(255,255,255,0.2)',
                background: view === v ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)',
                color: view === v ? '#fff' : 'rgba(255,255,255,0.6)',
                transition: 'all .15s',
              }}>
                {icon}{lbl}
              </button>
            ))}
          </div>
        </div>

        <button onClick={goFwd} style={navBtnStyle}
          onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.25)'}
          onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
        ><ChevronRight size={16} /></button>
      </div>

      {/* ── Legend ── */}
      <div style={{
        display:'flex', gap:8, flexWrap:'wrap', marginBottom:14,
        padding:'9px 14px',
        background:'#f8fafc',
        border:'1px solid #cbd5e1',
        borderRadius:10,
      }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.07em', marginRight:2, alignSelf:'center' }}>Legend</span>
        {Object.entries(STATUS_CONFIG).map(([status, c]) => (
          <span key={status} style={{
            display:'inline-flex', alignItems:'center', gap:5,
            fontSize:11, fontWeight:600,
            padding:'3px 10px', borderRadius:9999,
            background: c.bg.split(',')[1]?.trim() || '#f1f5f9',
            color: c.text,
            border: `1.5px solid ${c.border}`,
            boxShadow: `0 1px 4px ${c.border}40`,
          }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
            {c.label}
          </span>
        ))}
      </div>

      {/* ── Week View ── */}
      {view === 'week' && (
        <div style={{ border:'2px solid #94a3b8', borderRadius:12, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>
          <WeekView weekStart={weekStart} bookings={bookings} onSelectBooking={onSelectBooking} />
        </div>
      )}

      {/* ── Month View ── */}
      {view === 'month' && (
        <div style={{ border:'2px solid #94a3b8', borderRadius:12, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>

          {/* Day-of-week headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
            {DAY_LABELS.map((d, i) => {
              const isWknd = i >= 5
              return (
                <div key={d} style={{
                  padding:'10px 0', textAlign:'center',
                  fontSize:11, fontWeight:800,
                  color: isWknd ? '#6366f1' : '#475569',
                  background: isWknd
                    ? 'linear-gradient(to bottom, #eef2ff, #e0e7ff)'
                    : 'linear-gradient(to bottom, #f1f5f9, #e8edf2)',
                  borderBottom:'2px solid #94a3b8',
                  borderRight: i < 6 ? '1.5px solid #94a3b8' : 'none',
                  letterSpacing:'.07em', textTransform:'uppercase',
                }}>
                  {d}
                </div>
              )
            })}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>
              {week.map((day, di) => {
                const key      = format(day,'yyyy-MM-dd')
                const dayBkgs  = bookingsByDay[key] || []
                const inMonth  = isSameMonth(day, current)
                const todayCel = isToday(day)
                const isWknd   = WEEKEND.has(day.getDay())
                const hovered  = hoveredDay === key
                const isLast   = wi === weeks.length - 1

                let cellBg = '#ffffff'
                if (!inMonth && isWknd) cellBg = '#f0f0ff'
                else if (!inMonth)     cellBg = '#f8fafc'
                else if (isWknd)       cellBg = '#fafbff'
                if (hovered && inMonth) cellBg = '#f0f4ff'

                return (
                  <div
                    key={di}
                    onMouseEnter={() => setHoveredDay(key)}
                    onMouseLeave={() => setHoveredDay(null)}
                    style={{
                      minHeight: 96, padding:'7px 6px 5px',
                      borderRight:  di < 6 ? '1.5px solid #94a3b8' : 'none',
                      borderBottom: !isLast ? '1.5px solid #94a3b8' : 'none',
                      background: cellBg, transition:'background .12s', position:'relative',
                    }}
                  >
                    {/* Today accent bar */}
                    {todayCel && (
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
                    )}

                    {/* Day number box */}
                    <div style={{ marginBottom:5, textAlign:'right', paddingRight:2 }}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        width:26, height:26, borderRadius:6, fontSize:12,
                        fontWeight: todayCel ? 800 : inMonth ? 600 : 400,
                        color: todayCel ? '#fff' : !inMonth ? '#c8d0dc' : isWknd ? '#6366f1' : '#1e293b',
                        background: todayCel
                          ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                          : inMonth ? (isWknd ? 'rgba(238,242,255,0.9)' : 'rgba(241,245,249,0.9)') : 'transparent',
                        border: todayCel
                          ? '2px solid #6366f1'
                          : inMonth ? (isWknd ? '1.5px solid #a5b4fc' : '1.5px solid #94a3b8') : '1px solid #e2e8f0',
                        boxShadow: todayCel ? '0 2px 8px rgba(99,102,241,0.55)' : 'none',
                      }}>
                        {format(day,'d')}
                      </span>
                    </div>

                    {/* Booking chips */}
                    {dayBkgs.slice(0,3).map(b => {
                      const c = STATUS_CONFIG[b.status] || STATUS_CONFIG.PENDING
                      return (
                        <div key={b.id} onClick={() => onSelectBooking(b)}
                          title={`${b.title} · ${b.resource?.name}`}
                          style={{
                            fontSize:10, fontWeight:700, padding:'2px 6px',
                            borderRadius:5, marginBottom:3, cursor:'pointer',
                            background:c.bg, color:c.text, border:`1.5px solid ${c.border}`,
                            boxShadow:`0 1px 3px ${c.border}50`,
                            overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                            display:'flex', alignItems:'center', gap:4,
                            transition:'filter .12s, transform .1s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.filter='brightness(0.93)'; e.currentTarget.style.transform='translateY(-1px)' }}
                          onMouseOut={e => { e.currentTarget.style.filter='none'; e.currentTarget.style.transform='none' }}
                        >
                          <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot, flexShrink:0 }} />
                          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {format(new Date(b.startTime),'HH:mm')} {b.title}
                          </span>
                        </div>
                      )
                    })}

                    {dayBkgs.length > 3 && (
                      <div style={{ fontSize:10, fontWeight:700, color:'#6366f1', paddingLeft:5, marginTop:1 }}>
                        +{dayBkgs.length - 3} more
                      </div>
                    )}

                    {/* Status dots */}
                    {dayBkgs.length > 0 && dayBkgs.length <= 3 && inMonth && (
                      <div style={{ position:'absolute', bottom:4, right:5, display:'flex', gap:2 }}>
                        {dayBkgs.slice(0,3).map(b => (
                          <span key={b.id} style={{ width:4, height:4, borderRadius:'50%', background:STATUS_CONFIG[b.status]?.dot || '#94a3b8', opacity:0.6 }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ marginTop:10, textAlign:'center', fontSize:11, color:'#94a3b8' }}>
        Click any booking chip to view details
      </div>
    </div>
  )
}

const navBtnStyle = {
  display:'inline-flex', alignItems:'center', justifyContent:'center',
  width:34, height:34, borderRadius:9,
  border:'1px solid rgba(255,255,255,0.25)',
  background:'rgba(255,255,255,0.12)', color:'#e0e7ff',
  cursor:'pointer', transition:'background .15s', zIndex:1, flexShrink:0,
}
