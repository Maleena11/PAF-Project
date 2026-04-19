import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
export const BACKEND_URL = API_BASE.replace(/\/api$/, '')

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('smartcampus_user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user?.token) {
        config.headers['Authorization'] = `Bearer ${user.token}`
      }
    }
  } catch {}
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message
    return Promise.reject(new Error(message))
  }
)

export default api
