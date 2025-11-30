import './assets/main.css'
import 'notivue/notification.css' // Only needed if using built-in <Notification />
import 'notivue/animations.css' // Only needed if using default animations

import { createApp } from 'vue'
import App from './App.vue'
import store from './store/store'
import VueScrollTo from 'vue-scrollto'
import { createNotivue } from 'notivue'
import { createPinia } from 'pinia'

import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from './components/LoginPage.vue'
import DashboardPage from './components/DashboardPage.vue'
import SignUpPage from './components/SignUpPage.vue'
import ForgotPasswordPage from './components/ForgotPwdPage.vue'
import NotFoundPage from './components/NotFoundPage.vue'
import DashboardProjectsPage from './components/DashboardProjects.vue'
import DashboardLayout from './components/DashboardLayout.vue'
import { existCurrentUser } from './lib/appwrite'

// Vuetify
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
// import { meta } from 'eslint-plugin-vue'

const routes = [
  // -------- PUBLIC PAGES (NO DASHBOARD) --------
  {
    path: '/',
    name: 'login',
    component: LoginPage,
  },
  {
    path: '/sign_up',
    name: 'signup',
    component: SignUpPage,
  },
  {
    path: '/forgotPassword',
    name: 'forgotPassword',
    component: ForgotPasswordPage,
    props: true,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundPage,
  },

  // -------- DASHBOARD (WITH LAYOUT) --------
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'project_query',
        name: 'dashboard-projects',
        component: DashboardProjectsPage,
        props: true,
      },
    ],
  },
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

const piniaStore = createPinia()

const vuetify = createVuetify({
  components,
  directives,
})

createApp(App)
  .use(router)
  .use(store)
  .use(VueScrollTo)
  .use(notivue)
  .use(vuetify)
  .use(piniaStore)
  .mount('#app')
