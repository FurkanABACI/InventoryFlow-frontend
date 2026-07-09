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
import RequisitionDetailView from '../views/RequisitionDetailView.vue'
import RequisitionsView from '../views/RequisitionsView.vue'
import StockMovementsView from '../views/StockMovementsView.vue'
import UsersView from '../views/UsersView.vue'

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
        path: 'requisitions/:id',
        name: 'requisition-detail',
        component: RequisitionDetailView,
        meta: { title: 'Talep detayı' },
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
      {
        path: 'users',
        name: 'users',
        component: UsersView,
        meta: { requiresAdmin: true, title: 'Kullanıcılar' },
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

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: defaultRoute }
  }

  return true
})

export default router
