import api from './api'

export const userService = {
  async list(params = {}) {
    const response = await api.get('/auth/users/', { params })
    return response.data
  },

  async create(payload) {
    const response = await api.post('/auth/users/', payload)
    return response.data
  },

  async update(userId, payload) {
    const response = await api.patch(`/auth/users/${userId}/`, payload)
    return response.data
  },

  async deactivate(userId) {
    const response = await api.patch(`/auth/users/${userId}/`, { is_active: false })
    return response.data
  },

  async activate(userId) {
    const response = await api.patch(`/auth/users/${userId}/`, { is_active: true })
    return response.data
  },
}
