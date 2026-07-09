import api from './api'

export const stockService = {
  async movements(params = {}) {
    const response = await api.get('/stock-movements/', { params })
    return response.data
  },
}
