import api from './api'

export const requisitionService = {
  async list(params = {}) {
    const response = await api.get('/stock-requests/', { params })
    return response.data
  },

  async create(payload) {
    const response = await api.post('/stock-requests/', payload)
    return response.data
  },

  async fulfill(requestId) {
    const response = await api.post(`/stock-requests/${requestId}/fulfill/`)
    return response.data
  },

  async cancel(requestId) {
    const response = await api.post(`/stock-requests/${requestId}/cancel/`)
    return response.data
  },
}
