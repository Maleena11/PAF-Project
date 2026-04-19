import api from './api'

const ticketService = {
  getAll: (status) => api.get('/tickets', { params: status ? { status } : {} }),
  getById: (id) => api.get(`/tickets/${id}`),
  getByUser: (userId) => api.get(`/tickets/user/${userId}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tickets/${id}/status`, null, { params: { status } }),
  assign: (id, assigneeId) => api.patch(`/tickets/${id}/assign`, null, { params: { assigneeId } }),
  uploadImage: (id, file, slot = 1) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('slot', slot)
    return api.post(`/tickets/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removeImage: (id, slot) => api.delete(`/tickets/${id}/image`, { params: { slot } }),
  addComment: (id, userId, content) => api.post(`/tickets/${id}/comments`, { userId, content }),
  delete: (id) => api.delete(`/tickets/${id}`),
  getAssigned: (userId) => api.get(`/tickets/assigned/${userId}`),
  startWork: (id, staffId) => api.patch(`/tickets/${id}/start`, null, { params: { staffId } }),
  resolve: (id, resolutionNotes) => api.patch(`/tickets/${id}/resolve`, { resolutionNotes }),
  close: (id) => api.patch(`/tickets/${id}/close`),
  reject: (id, reason) => api.patch(`/tickets/${id}/reject`, { reason }),
}

export default ticketService
