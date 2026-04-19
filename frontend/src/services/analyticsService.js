import api from './api'

const analyticsService = {
  getPeakHours: () => api.get('/analytics/peak-hours'),
  getTopResources: (limit = 5) => api.get(`/analytics/top-resources?limit=${limit}`),
}

export default analyticsService
