import api from './api'

const bookingService = {
  getAll: () => api.get('/bookings'),
  getById: (id) => api.get(`/bookings/${id}`),
  getByUser: (userId) => api.get(`/bookings/user/${userId}`),
  getByResource: (resourceId) => api.get(`/bookings/resource/${resourceId}`),
  create: (data) => api.post('/bookings', data),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, null, { params: { status } }),
  delete: (id) => api.delete(`/bookings/${id}`),
}

export default bookingService
