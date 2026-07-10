import api from './api'

export const productService = {
  async list(params = {}) {
    const response = await api.get('/products/', { params })
    return response.data
  },

  async all(params = {}) {
    const products = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const response = await api.get('/products/', {
        params: { ...params, page },
      })
      const data = response.data

      if (Array.isArray(data)) {
        return data
      }

      products.push(...(data.results || []))
      hasNextPage = Boolean(data.next)
      page += 1
    }

    return products
  },

  async lowStock() {
    const response = await api.get('/products/low-stock/')
    return response.data
  },

  async create(payload) {
    const response = await api.post('/products/', payload)
    return response.data
  },

  async update(productId, payload) {
    const response = await api.patch(`/products/${productId}/`, payload)
    return response.data
  },

  async deactivate(productId) {
    const response = await api.post(`/products/${productId}/deactivate/`)
    return response.data
  },
}
