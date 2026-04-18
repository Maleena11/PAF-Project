import React from 'react'
import { Shield, GraduationCap, Briefcase, Check, X } from 'lucide-react'

const PERMISSIONS = [
  { label: 'View resources',          student: true,  staff: true,  admin: true  },
  { label: 'Book resources',          student: true,  staff: true,  admin: true  },
  { label: 'Cancel own bookings',     student: true,  staff: true,  admin: true  },
  { label: 'Submit support tickets',  student: true,  staff: true,  admin: true  },
  { label: 'View own tickets',        student: true,  staff: true,  admin: true  },
  { label: 'Approve / reject bookings', student: false, staff: true,  admin: true  },
  { label: 'Manage resource listings', student: false, staff: true,  admin: true  },
  { label: 'Update resource status',  student: false, staff: true,  admin: true  },
  { label: 'Resolve support tickets', student: false, staff: true,  admin: true  },
  { label: 'View all bookings',       student: false, staff: true,  admin: true  },
  { label: 'View all tickets',        student: false, staff: true,  admin: true  },
  { label: 'Manage users',            student: false, staff: false, admin: true  },
  { label: 'Assign roles',            student: false, staff: false, admin: true  },
  { label: 'Delete users',            student: false, staff: false, admin: true  },
  { label: 'View system analytics',   student: false, staff: false, admin: true  },
]

const ROLES = [
  { key: 'student', label: 'Student',  icon: GraduationCap, color: '#16a34a', bg: '#dcfce7', borderColor: '#bbf7d0' },
  { key: 'staff',   label: 'Staff',    icon: Briefcase,     color: '#2563eb', bg: '#dbeafe', borderColor: '#bfdbfe' },
  { key: 'admin',   label: 'Admin',    icon: Shield,        color: '#dc2626', bg: '#fee2e2', borderColor: '#fecaca' },
]

export default function PermissionMatrixCard() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: '1.5px solid #f1f5f9',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Shield size={17} color="#7c3aed" />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Permission Matrix</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, color: '#94a3b8',
          background: '#f8fafc', border: '1px solid #e2e8f0',
          padding: '2px 8px', borderRadius: 6,
        }}>
          Reference
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{
                padding: '10px 16px', textAlign: 'left',
                fontSize: 11, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid #f1f5f9', width: '55%',
              }}>
                Permission
              </th>
              {ROLES.map(role => (
                <th key={role.key} style={{
                  padding: '10px 8px', textAlign: 'center',
                  borderBottom: '1px solid #f1f5f9', width: '15%',
                }}>
                  <div style={{
                    display: 'inline-flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: role.bg, border: `1.5px solid ${role.borderColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <role.icon size={14} color={role.color} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: role.color }}>
                      {role.label}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm, idx) => {
              const isGroupStart =
                idx === 0 ||
                (idx === 5 && !PERMISSIONS[idx - 1].staff) ||
                (!perm.student && !PERMISSIONS[idx - 1].staff && perm.staff && idx > 0 && PERMISSIONS[idx - 1].student) ||
                (!perm.staff && idx > 0 && PERMISSIONS[idx - 1].staff)

              const showDivider =
                (idx === 5) ||
                (idx === 11)

              return (
                <React.Fragment key={perm.label}>
                  {showDivider && (
                    <tr>
                      <td colSpan={4} style={{ padding: 0, height: 1, background: '#e2e8f0' }} />
                    </tr>
                  )}
                  <tr style={{
                    background: idx % 2 === 0 ? '#fff' : '#fafafa',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa' }}
                  >
                    <td style={{
                      padding: '9px 16px',
                      fontSize: 12.5, color: '#374151', fontWeight: 500,
                      borderBottom: '1px solid #f8fafc',
                    }}>
                      {perm.label}
                    </td>
                    {ROLES.map(role => (
                      <td key={role.key} style={{
                        padding: '9px 8px', textAlign: 'center',
                        borderBottom: '1px solid #f8fafc',
                      }}>
                        {perm[role.key] ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#dcfce7',
                          }}>
                            <Check size={12} color="#16a34a" strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#f1f5f9',
                          }}>
                            <X size={12} color="#cbd5e1" strokeWidth={2.5} />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 16,
        background: '#f8fafc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={10} color="#16a34a" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Allowed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={10} color="#cbd5e1" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Not allowed</span>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
          Dividers separate Student · Staff · Admin tiers
        </span>
      </div>
    </div>
  )
}
