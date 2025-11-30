import './assets/main.css'
import 'notivue/notification.css' // Only needed if using built-in <Notification />
import 'notivue/animations.css' // Only needed if using default animations

import { createApp } from 'vue'
import App from './App.vue'
import store from './store'
import VueScrollTo from 'vue-scrollto'
import { createNotivue } from 'notivue'

import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './components/LoginPage.vue'
import DashboardPage from './components/DashboardPage.vue'
import SignUpPage from './components/SignUpPage.vue'
import ForgotPasswordPage from './components/ForgotPwdPage.vue'
import NotFoundPage from './components/NotFoundPage.vue'
import { existCurrentUser } from './lib/appwrite'

// Vuetify
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const routes = [
  { path: '/', component: LoginPage },
  { path: '/sign_up', component: SignUpPage },
  { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true } },
  { path: '/forgotPassword', component: ForgotPasswordPage, props: true },
  { path: '/:pathMatch(.*)*', component: NotFoundPage }, // Ruta comodín para manejar 404
]

const router = createRouter({
  // history: createWebHistory(process.env.BASE_URL), // remote
  history: createWebHistory(), // local
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  },
})

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth) {
    const isAuthenticated = await existCurrentUser()
    if (!isAuthenticated) return next('/')
    else return next()
  }
  return next()
})

const notivue = createNotivue()

const vuetify = createVuetify({
  components,
  directives,
})

createApp(App).use(router).use(store).use(VueScrollTo).use(notivue).use(vuetify).mount('#app')
