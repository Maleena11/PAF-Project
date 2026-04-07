import api from './api'

const bookingService = {
  // Get all bookings — optionally filter (admin)
  getAll: (params = {}) => api.get('/bookings', { params }),

  getById: (id) => api.get(`/bookings/${id}`),

  getByUser: (userId) => api.get(`/bookings/user/${userId}`),

  getByResource: (resourceId) => api.get(`/bookings/resource/${resourceId}`),

  // Check if a resource is free for a given time window
  checkAvailability: (resourceId, startTime, endTime, excludeBookingId = null) => {
    const params = { resourceId, startTime, endTime }
    if (excludeBookingId) params.excludeBookingId = excludeBookingId
    return api.get('/bookings/availability', { params })
  },

  create: (data) => api.post('/bookings', data),

  // status: BookingStatus string, reason: required when REJECTED
  updateStatus: (id, status, reason = null) =>
    api.patch(`/bookings/${id}/status`, { status, reason }),

  delete: (id) => api.delete(`/bookings/${id}`),

  // Cancels all PENDING/APPROVED bookings in the same recurring series
  cancelSeries: (id) => api.patch(`/bookings/${id}/cancel-series`),
}

export default bookingService
