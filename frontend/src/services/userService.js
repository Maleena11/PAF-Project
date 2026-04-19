import api from './api'

const userService = {
  getAll: (role) => api.get('/auth/users', { params: role ? { role } : {} }),
  getStaff: () => api.get('/auth/users', { params: { role: 'STAFF' } }),
}

export default userService
