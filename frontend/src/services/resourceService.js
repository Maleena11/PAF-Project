import api from './api'

const resourceService = {
  getAll: (params) => api.get('/resources', { params }),
  getById: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  updateStatus: (id, status) => api.patch(`/resources/${id}/status`, null, { params: { status } }),
  uploadImage: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/resources/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (id) => api.delete(`/resources/${id}`),
}

export default resourceService
