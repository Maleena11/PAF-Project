import React, { createContext, useState, useEffect, useCallback, useContext } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshCount = useCallback(() => {
    if (!user?.id) return
    api.get(`/notifications/user/${user.id}/count`)
      .then(r => setUnreadCount(r.data.count))
      .catch(() => {})
  }, [user?.id])

  const decrement = useCallback((by = 1) => {
    setUnreadCount(prev => Math.max(0, prev - by))
  }, [])

  const reset = useCallback(() => setUnreadCount(0), [])

  useEffect(() => {
    if (!user?.id) { setUnreadCount(0); return }
    refreshCount()
    const interval = setInterval(refreshCount, 30000)
    return () => clearInterval(interval)
  }, [user?.id, refreshCount])

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount, decrement, reset }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
