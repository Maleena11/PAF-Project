import React, { createContext, useState, useEffect, useContext } from 'react'

const AuthContext = createContext(null)

const SESSION_KEY = 'smartcampus_user'

function readStoredSession() {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    if (!parsed?.token) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return parsed
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredSession())

  const login = (userData) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === SESSION_KEY) {
        setUser(readStoredSession())
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext
