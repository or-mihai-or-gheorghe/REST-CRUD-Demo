import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { API_BASE_URL } from '@/utils/constants'

/**
 * Authentication Store (Pinia)
 *
 * This store demonstrates:
 * - State management with ref()
 * - Computed properties (getters)
 * - Actions for async operations
 * - localStorage integration
 */
export const useAuthStore = defineStore('auth', () => {
  // STATE - reactive data using ref()
  const user = ref(null)
  const token = ref(null)

  // GETTERS - computed properties derived from state
  const isAuthenticated = computed(() => {
    return !!token.value && !!user.value
  })

  const userEmail = computed(() => {
    return user.value?.email || ''
  })

  // ACTIONS - functions that can modify state and perform async operations

  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Response data or error
   */
  async function register(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error response
        throw new Error(data.error || 'Registration failed')
      }

      // Update state with user data and token
      user.value = data.user
      token.value = data.token

      // Persist to localStorage for session persistence
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('authUser', JSON.stringify(data.user))

      return data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  /**
   * Logout user - clear state and localStorage
   */
  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
  }

  /**
   * Check if user is already authenticated (on app load)
   */
  function checkAuth() {
    const savedToken = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('authUser')

    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
    }
  }

  // Return everything that should be accessible from outside the store
  return {
    // State
    user,
    token,
    // Getters
    isAuthenticated,
    userEmail,
    // Actions
    register,
    logout,
    checkAuth
  }
})
