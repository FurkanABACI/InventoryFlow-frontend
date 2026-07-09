import api from './api'

export const receivingService = {
  async list(params = {}) {
    const response = await api.get('/goods-receipts/', { params })
    return response.data
  },

  async detail(receiptId) {
    const response = await api.get(`/goods-receipts/${receiptId}/`)
    return response.data
  },

  async create(payload) {
    const response = await api.post('/goods-receipts/', payload)
    return response.data
  },
}
