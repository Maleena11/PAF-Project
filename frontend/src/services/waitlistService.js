import api from './api'

let waitlistRouteMode = 'unknown' // 'unknown' | 'modern' | 'legacy'

function currentUserId() {
  try {
    const raw = localStorage.getItem('smartcampus_user')
    const user = raw ? JSON.parse(raw) : null
    return user?.id ?? null
  } catch {
    return null
  }
}

const waitlistService = {
  // Join the waitlist for a specific resource + time slot
  join: (data) => api.post('/waitlist', data),

  // Get all waitlist entries for a user (regular user view)
  getMine: async () => {
    const userId = currentUserId()

    if (waitlistRouteMode === 'legacy') {
      if (!userId) throw new Error('User session not found')
      return api.get(`/waitlist/user/${userId}`)
    }

    try {
      const response = await api.get('/waitlist/my')
      waitlistRouteMode = 'modern'
      return response
    } catch (error) {
      if (!userId) throw error
      waitlistRouteMode = 'legacy'
      return api.get(`/waitlist/user/${userId}`)
    }
  },

  // Leave (cancel) a waitlist entry (user removes themselves)
  leave: async (id) => {
    const userId = currentUserId()

    if (waitlistRouteMode === 'legacy') {
      if (!userId) throw new Error('User session not found')
      return api.delete(`/waitlist/${id}`, { params: { userId } })
    }

    try {
      const response = await api.delete(`/waitlist/${id}`)
      waitlistRouteMode = 'modern'
      return response
    } catch (error) {
      if (!userId) throw error
      waitlistRouteMode = 'legacy'
      return api.delete(`/waitlist/${id}`, { params: { userId } })
    }
  },

  // How many people are waiting for a given slot
  getCount: (resourceId, startTime, endTime) =>
    api.get('/waitlist/count', { params: { resourceId, startTime, endTime } }),

  // Admin: all entries, optionally filtered
  getAll: (params = {}) => api.get('/waitlist', { params }),

  // Admin: forcibly remove an entry
  adminRemove: (id) => api.delete(`/waitlist/${id}/admin`),
}

export default waitlistService
