import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Shield, Briefcase, GraduationCap } from 'lucide-react'

const ROLES = [
  { key: 'STUDENT', label: 'Students', color: '#16a34a', bg: '#dcfce7', icon: GraduationCap },
  { key: 'STAFF',   label: 'Staff',    color: '#2563eb', bg: '#dbeafe', icon: Briefcase    },
  { key: 'ADMIN',   label: 'Admins',   color: '#dc2626', bg: '#fee2e2', icon: Shield        },
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div style={{
      background: '#1e293b', color: '#f8fafc',
      padding: '7px 13px', borderRadius: 8, fontSize: 12,
      boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
    }}>
      <strong>{name}</strong>: {value}
    </div>
  )
}

export default function RoleDistributionCard({ roles = { STUDENT: 0, STAFF: 0, ADMIN: 0 } }) {
  const total = Object.values(roles).reduce((s, v) => s + v, 0)

  const data = ROLES
    .map(r => ({ name: r.label, value: roles[r.key] || 0, color: r.color }))
    .filter(d => d.value > 0)

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '18px 20px',
      border: '1px solid #f1f5f9',
      borderLeft: '4px solid #7c3aed',
      boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>
          {total}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
          Role Distribution
        </div>
      </div>

      {/* Donut chart */}
      {total === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 12 }}>
          No users yet
        </div>
      ) : (
        <div style={{ position: 'relative', height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%" cy="50%"
                innerRadius={38}
                outerRadius={58}
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{total}</span>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>users</span>
          </div>
        </div>
      )}

      {/* Legend rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {ROLES.map(({ key, label, color, bg, icon: Icon }) => {
          const count = roles[key] || 0
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={11} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Progress bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>
                    {count} <span style={{ fontWeight: 400, color: '#94a3b8' }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, background: color,
                    borderRadius: 2, transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
