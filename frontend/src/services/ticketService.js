import api from './api'

const ticketService = {
  getAll: (status) => api.get('/tickets', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/tickets/${id}`),
  getByUser: (userId) => api.get(`/tickets/user/${userId}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tickets/${id}/status`, null, { params: { status } }),
  assign: (id, assigneeId) => api.patch(`/tickets/${id}/assign`, null, { params: { assigneeId } }),
  uploadImage: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/tickets/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  addComment: (id, userId, content) => api.post(`/tickets/${id}/comments`, { userId, content }),
  delete: (id) => api.delete(`/tickets/${id}`),
}

export default ticketService
