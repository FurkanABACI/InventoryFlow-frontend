import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import ProductsView from '../views/ProductsView.vue'
import LowStockView from '../views/LowStockView.vue'
import SuppliersView from '../views/SuppliersView.vue'
import ReceivingView from '../views/ReceivingView.vue'
import ReceivingDetailView from '../views/ReceivingDetailView.vue'
import RequisitionsView from '../views/RequisitionsView.vue'
import StockMovementsView from '../views/StockMovementsView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView,
      },
      {
        path: 'products',
        name: 'products',
        component: ProductsView,
      },
      {
        path: 'suppliers',
        name: 'suppliers',
        component: SuppliersView,
      },
      {
        path: 'receiving',
        name: 'receiving',
        component: ReceivingView,
      },
      {
        path: 'receiving/:id',
        name: 'receiving-detail',
        component: ReceivingDetailView,
        meta: { title: 'Mal kabul detayı' },
      },
      {
        path: 'requisitions',
        name: 'requisitions',
        component: RequisitionsView,
      },
      {
        path: 'stock-movements',
        name: 'stock-movements',
        component: StockMovementsView,
      },
      {
        path: 'low-stock',
        name: 'low-stock',
        component: LowStockView,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
