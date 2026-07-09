import { defineStore } from 'pinia'
import { productService } from '../services/productService'

export const useProductsStore = defineStore('products', {
  state: () => ({
    products: [],
    count: 0,
    loading: false,
    creating: false,
    error: null,
  }),

  getters: {
    totalStock: (state) => state.products.reduce((total, product) => total + Number(product.stock || 0), 0),
    activeProducts: (state) => state.products.filter((product) => product.is_active !== false),
  },

  actions: {
    async fetchProducts(params = {}) {
      this.loading = true
      this.error = null

      try {
        const data = await productService.list(params)
        this.products = data.results || data
        this.count = data.count || this.products.length
      } catch (error) {
        this.error = 'Urunler yuklenemedi.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchLowStock() {
      this.loading = true
      this.error = null

      try {
        const data = await productService.lowStock()
        this.products = data.results || data
        this.count = data.count || this.products.length
      } catch (error) {
        this.error = 'Dusuk stok urunleri yuklenemedi.'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createProduct(payload) {
      this.creating = true
      this.error = null

      try {
        const product = await productService.create(payload)
        await this.fetchProducts()
        return product
      } catch (error) {
        this.error = 'Ürün kaydedilemedi. Lütfen formdaki bilgileri kontrol et.'
        throw error
      } finally {
        this.creating = false
      }
    },

    async updateProduct(productId, payload) {
      this.creating = true
      this.error = null

      try {
        const product = await productService.update(productId, payload)
        await this.fetchProducts()
        return product
      } catch (error) {
        this.error = 'Ürün güncellenemedi. Lütfen formdaki bilgileri kontrol et.'
        throw error
      } finally {
        this.creating = false
      }
    },

    async deactivateProduct(productId) {
      this.creating = true
      this.error = null

      try {
        const product = await productService.deactivate(productId)
        await this.fetchProducts()
        return product
      } catch (error) {
        this.error = 'Ürün silinemedi. Lütfen tekrar dene.'
        throw error
      } finally {
        this.creating = false
      }
    },
  },
})
