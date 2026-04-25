import React, { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { BarChart2, PieChart as PieIcon, TrendingUp, RefreshCw, Clock, Award } from 'lucide-react'
import bookingService from '../services/bookingService'
import ticketService from '../services/ticketService'
import resourceService from '../services/resourceService'
import analyticsService from '../services/analyticsService'

/* ── colour palettes ── */
const BOOKING_STATUS_COLORS  = { APPROVED: '#16a34a', PENDING: '#d97706', CANCELLED: '#94a3b8', REJECTED: '#dc2626', COMPLETED: '#2563eb' }
const RESOURCE_TYPE_COLORS   = ['#2563eb','#7c3aed','#16a34a','#ea580c','#4338ca','#db2777','#475569']
const RESOURCE_STATUS_COLORS = { AVAILABLE: '#16a34a', OCCUPIED: '#f59e0b', MAINTENANCE: '#ef4444', RETIRED: '#94a3b8' }
const TICKET_STATUS_COLORS   = { OPEN: '#d97706', IN_PROGRESS: '#2563eb', RESOLVED: '#16a34a', CLOSED: '#94a3b8' }
const TICKET_PRIORITY_COLORS = { HIGH: '#dc2626', MEDIUM: '#f59e0b', LOW: '#16a34a' }

const RESOURCE_TYPE_LABELS = {
  LECTURE_HALL: 'Lecture Hall', LAB: 'Lab', MEETING_ROOM: 'Meeting Room',
  SPORTS: 'Sports', STUDY_ROOM: 'Study Room', AUDITORIUM: 'Auditorium', OTHER: 'Other',
}

/* ── tiny helpers ── */
function toPieData(countMap, colorMap) {
  return Object.entries(countMap)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, fill: colorMap[name] || '#94a3b8' }))
}

function SectionTitle({ icon: Icon, title, color = '#2563eb' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={17} color={color} />
      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</span>
    </div>
  )
}

function ChartCard({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      border: '1.5px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

/* custom tooltip shared across charts */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e293b', color: '#f8fafc', padding: '8px 14px',
      borderRadius: 8, fontSize: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill || p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  )
}

/* custom pie label */
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  return (
    <text
      x={cx + r * Math.cos(-midAngle * RADIAN)}
      y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="#fff" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function AdminAnalytics() {
  const [bookings,     setBookings]     = useState([])
  const [resources,    setResources]    = useState([])
  const [tickets,      setTickets]      = useState([])
  const [peakHours,    setPeakHours]    = useState([])
  const [topResources, setTopResources] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    Promise.all([
      bookingService.getAll(),
      resourceService.getAll(),
      ticketService.getAll(),
    ])
      .then(([b, r, t]) => {
        setBookings(Array.isArray(b.data)  ? b.data  : [])
        setResources(Array.isArray(r.data) ? r.data  : [])
        setTickets(Array.isArray(t.data)   ? t.data  : [])
        // Analytics endpoints load independently so a backend restart doesn't break the whole dashboard
        Promise.allSettled([
          analyticsService.getPeakHours(),
          analyticsService.getTopResources(5),
        ]).then(([ph, tr]) => {
          if (ph.status === 'fulfilled') setPeakHours(Array.isArray(ph.value.data) ? ph.value.data : [])
          if (tr.status === 'fulfilled') setTopResources(Array.isArray(tr.value.data) ? tr.value.data : [])
        })
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  /* ── derived data ── */

  // 1. Bookings by status (pie)
  const bookingsByStatus = toPieData(
    bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc }, {}),
    BOOKING_STATUS_COLORS,
  )

  // 3. Resources by type (bar)
  const resourcesByType = Object.entries(
    resources.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc }, {})
  ).map(([type, count]) => ({ type: RESOURCE_TYPE_LABELS[type] || type, Count: count }))

  // 4. Resources by status (pie)
  const resourcesByStatus = toPieData(
    resources.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {}),
    RESOURCE_STATUS_COLORS,
  )

  // 5. Tickets by status (pie)
  const ticketsByStatus = toPieData(
    tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {}),
    TICKET_STATUS_COLORS,
  )

  // 6. Tickets by priority (bar)
  const ticketsByPriority = ['HIGH', 'MEDIUM', 'LOW'].map(p => ({
    priority: p,
    Count: tickets.filter(t => t.priority === p).length,
    fill: TICKET_PRIORITY_COLORS[p],
  }))

  // 7. Bookings by resource type (bar)
  const bookingsByType = (() => {
    const resourceMap = resources.reduce((m, r) => { m[r.id] = r.type; return m }, {})
    const counts = bookings.reduce((acc, b) => {
      const type = resourceMap[b.resource?.id || b.resourceId] || 'OTHER'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts).map(([type, count]) => ({
      type: RESOURCE_TYPE_LABELS[type] || type, Bookings: count,
    }))
  })()

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
      <div className="spinner" style={{ margin: '0 auto 12px' }} />
      Loading analytics…
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: '#dc2626', fontSize: 13 }}>
      Could not load analytics data.{' '}
      <button onClick={load} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
        Retry
      </button>
    </div>
  )

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={17} color="#2563eb" />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Analytics Overview</span>
        </div>
        <button
          onClick={load}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#f8fafc', border: '1.5px solid #e2e8f0',
            borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
            fontSize: 12, color: '#475569', fontWeight: 600,
          }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── Row 1: Bookings by status (pie) + Bookings by resource type (bar) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard>
          <SectionTitle icon={PieIcon} title="Bookings by Status" color="#2563eb" />
          {bookingsByStatus.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No bookings yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={bookingsByStatus} dataKey="value" cx="50%" cy="45%"
                  outerRadius={80} labelLine={false} label={renderPieLabel}>
                  {bookingsByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: '#475569' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle icon={BarChart2} title="Bookings by Resource Type" color="#ea580c" />
          {bookingsByType.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No bookings yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bookingsByType} margin={{ top: 4, right: 8, left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(234,88,12,0.06)' }} />
                <Bar dataKey="Bookings" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {bookingsByType.map((_, i) => (
                    <Cell key={i} fill={RESOURCE_TYPE_COLORS[i % RESOURCE_TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 2: Resources by type (bar) + Resource availability (pie) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard>
          <SectionTitle icon={BarChart2} title="Resources by Type" color="#7c3aed" />
          {resourcesByType.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No resources yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resourcesByType} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} width={88} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                <Bar dataKey="Count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {resourcesByType.map((_, i) => (
                    <Cell key={i} fill={RESOURCE_TYPE_COLORS[i % RESOURCE_TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle icon={PieIcon} title="Resource Availability" color="#16a34a" />
          {resourcesByStatus.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No resources yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={resourcesByStatus} dataKey="value" cx="50%" cy="45%"
                  innerRadius={48} outerRadius={80} labelLine={false} label={renderPieLabel}>
                  {resourcesByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: '#475569' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Peak booking hours (bar) + Top 5 resources (bar) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard>
          <SectionTitle icon={Clock} title="Peak Booking Hours" color="#0891b2" />
          {peakHours.every(h => h.count === 0) ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No booking data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={peakHours.filter(h => h.hour >= 6 && h.hour <= 22)}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(8,145,178,0.08)' }} />
                <Bar dataKey="count" name="Bookings" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {peakHours.filter(h => h.hour >= 6 && h.hour <= 22).map((entry, i) => {
                    const max = Math.max(...peakHours.map(h => h.count))
                    const intensity = max > 0 ? entry.count / max : 0
                    const r = Math.round(8 + (234 - 8) * (1 - intensity))
                    const g = Math.round(145 + (88 - 145) * intensity)
                    const b = Math.round(178 + (12 - 178) * intensity)
                    return <Cell key={i} fill={`rgb(${r},${g},${b})`} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle icon={Award} title="Top 5 Most Booked Resources" color="#d97706" />
          {topResources.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No booking data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topResources.map(r => ({
                  name: r.name.length > 18 ? r.name.slice(0, 16) + '…' : r.name,
                  fullName: r.name,
                  type: RESOURCE_TYPE_LABELS[r.type] || r.type,
                  Bookings: r.bookingCount,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 28, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{ background: '#1e293b', color: '#f8fafc', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.fullName}</div>
                        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{d.type}</div>
                        <div>Bookings: <strong>{d.Bookings}</strong></div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="Bookings" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {topResources.map((_, i) => {
                    const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7']
                    return <Cell key={i} fill={colors[i] || '#fef3c7'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 4: Tickets by status (pie) + Tickets by priority (bar) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
        <ChartCard>
          <SectionTitle icon={PieIcon} title="Tickets by Status" color="#d97706" />
          {ticketsByStatus.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No tickets yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ticketsByStatus} dataKey="value" cx="50%" cy="45%"
                  outerRadius={78} labelLine={false} label={renderPieLabel}>
                  {ticketsByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: '#475569' }}>{v.replace('_', ' ')}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionTitle icon={BarChart2} title="Tickets by Priority" color="#dc2626" />
          {ticketsByPriority.every(p => p.Count === 0) ? (
            <div style={{ textAlign: 'center', paddingTop: 60, color: '#94a3b8', fontSize: 12 }}>No tickets yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ticketsByPriority} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(220,38,38,0.06)' }} />
                <Bar dataKey="Count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {ticketsByPriority.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
