import React from 'react'

const COLOR_MAP = {
  blue:   { bg: '#dbeafe', icon: '#2563eb', value: '#1e40af' },
  green:  { bg: '#dcfce7', icon: '#16a34a', value: '#15803d' },
  yellow: { bg: '#fef9c3', icon: '#ca8a04', value: '#a16207' },
  red:    { bg: '#fee2e2', icon: '#dc2626', value: '#b91c1c' },
  purple: { bg: '#ede9fe', icon: '#7c3aed', value: '#6d28d9' },
  orange: { bg: '#ffedd5', icon: '#ea580c', value: '#c2410c' },
}

export default function StatCard({ icon: Icon, label, value, color = 'blue', loading = false }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      border: '1px solid #f1f5f9',
    }}>
      <div style={{
        background: c.bg,
        borderRadius: 10,
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={22} color={c.icon} />
      </div>

      <div>
        {loading ? (
          <div style={{
            width: 48, height: 28,
            background: '#f1f5f9',
            borderRadius: 6,
            marginBottom: 6,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        ) : (
          <div style={{ fontSize: 28, fontWeight: 800, color: c.value, lineHeight: 1 }}>
            {value ?? '—'}
          </div>
        )}
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  )
}
