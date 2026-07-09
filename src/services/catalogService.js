import api from './api'

export const catalogService = {
  async categories(params = {}) {
    const response = await api.get('/categories/', { params })
    return response.data
  },

  async createCategory(payload) {
    const response = await api.post('/categories/', payload)
    return response.data
  },

  async suppliers(params = {}) {
    const response = await api.get('/suppliers/', { params })
    return response.data
  },

  async createSupplier(payload) {
    const response = await api.post('/suppliers/', payload)
    return response.data
  },

  async updateSupplier(supplierId, payload) {
    const response = await api.patch(`/suppliers/${supplierId}/`, payload)
    return response.data
  },

  async deactivateSupplier(supplierId) {
    const response = await api.patch(`/suppliers/${supplierId}/`, { is_active: false })
    return response.data
  },
}
