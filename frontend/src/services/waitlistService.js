import api from './api'

const waitlistService = {
  // Join the waitlist for a specific resource + time slot
  join: (data) => api.post('/waitlist', data),

  // Get all waitlist entries for a user (regular user view)
  getByUser: (userId) => api.get(`/waitlist/user/${userId}`),

  // Leave (cancel) a waitlist entry (user removes themselves)
  leave: (id, userId) => api.delete(`/waitlist/${id}`, { params: { userId } }),

  // How many people are waiting for a given slot
  getCount: (resourceId, startTime, endTime) =>
    api.get('/waitlist/count', { params: { resourceId, startTime, endTime } }),

  // Admin: all entries, optionally filtered
  getAll: (params = {}) => api.get('/waitlist', { params }),

  // Admin: forcibly remove an entry
  adminRemove: (id) => api.delete(`/waitlist/${id}/admin`),
}

export default waitlistService
