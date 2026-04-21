import api from './api'

const bookingService = {
  getAll: (params = {}) => api.get('/bookings', { params }),

  getById: (id) => api.get(`/bookings/${id}`),

  getByUser: (userId) => api.get(`/bookings/user/${userId}`),

  getMine: () => api.get('/bookings'),

  // date: ISO datetime string for start of the day (optional — omit to get all)
  getByResource: (resourceId, date = null) => {
    const params = date ? { date } : {}
    return api.get(`/bookings/resource/${resourceId}/slots`, { params })
  },

  checkAvailability: (resourceId, startTime, endTime, excludeBookingId = null) => {
    const params = { resourceId, startTime, endTime }
    if (excludeBookingId) params.excludeBookingId = excludeBookingId
    return api.get('/bookings/availability', { params })
  },

  create: (data) => api.post('/bookings', data),

  // Edit/reschedule a PENDING booking (owner only)
  update: (id, data) => api.put(`/bookings/${id}`, data),

  // status: BookingStatus string, reason: required when REJECTED
  updateStatus: (id, status, reason = null) =>
    api.patch(`/bookings/${id}/status`, { status, reason }),

  // Student cancels their own PENDING or APPROVED booking
  cancelOwn: (id) => api.patch(`/bookings/${id}/cancel`),

  delete: (id) => api.delete(`/bookings/${id}`),

  cancelSeries: (id) => api.patch(`/bookings/${id}/cancel-series`),
}

export default bookingService
