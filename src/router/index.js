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
        meta: { requiresInventoryManager: true },
      },
      {
        path: 'products',
        name: 'products',
        component: ProductsView,
        meta: { requiresInventoryManager: true },
      },
      {
        path: 'suppliers',
        name: 'suppliers',
        component: SuppliersView,
        meta: { requiresInventoryManager: true },
      },
      {
        path: 'receiving',
        name: 'receiving',
        component: ReceivingView,
        meta: { requiresInventoryManager: true },
      },
      {
        path: 'receiving/:id',
        name: 'receiving-detail',
        component: ReceivingDetailView,
        meta: { title: 'Mal kabul detayı', requiresInventoryManager: true },
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
        meta: { requiresInventoryManager: true },
      },
      {
        path: 'low-stock',
        name: 'low-stock',
        component: LowStockView,
        meta: { requiresInventoryManager: true },
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
  const defaultRoute = authStore.canManageInventory ? 'dashboard' : 'requisitions'

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: defaultRoute }
  }

  if (to.meta.requiresInventoryManager && !authStore.canManageInventory) {
    return { name: 'requisitions' }
  }

  return true
})

export default router
