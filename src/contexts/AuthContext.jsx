import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    setLoading(false)
  }, [])

  const login = (email, password) => {
    // Simulate login - in production, this would be an API call
    const userData = {
      id: Date.now(),
      email,
      name: email.split('@')[0],
      stores: []
    }
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    return { success: true, user: userData }
  }

  const signup = (name, email, password) => {
    // Simulate signup - in production, this would be an API call
    const userData = {
      id: Date.now(),
      name,
      email,
      stores: []
    }
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    return { success: true, user: userData }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const addStore = (storeData) => {
    if (user) {
      const updatedUser = {
        ...user,
        stores: [...(user.stores || []), storeData]
      }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, addStore, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}