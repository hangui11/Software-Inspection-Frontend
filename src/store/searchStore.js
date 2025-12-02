// stores/searchStore.js

import { defineStore } from 'pinia'

export const useSearchStore = defineStore('search', {
  state: () => ({
    filteredProjects: [],
    projects: [],
    avatar: '',
    username: '',
  }),
  actions: {
    setSearchResults(filteredProjects, projects, avatarUrl, userName) {
      ;((this.filteredProjects = filteredProjects),
        (this.projects = projects),
        (this.avatar = avatarUrl),
        (this.username = userName))
    },
    // Optional: action to clear state after component is done
    clearSearch() {
      this.filteredProjects = []
      this.projects = []
      this.avatar = ''
      this.username = ''
    },
  },
  persist: {
    enabled: true,
    storage: sessionStorage,
    paths: ['filteredProjects', 'projects', 'avatar', 'username'], // Only save the project lists
  },
})

export const userInformationStore = defineStore('user_information', {
  state: () => ({
    recent_projects: [],
    projects: [],
    avatar: '',
    username: '',
    userid: '',
    products: [],
  }),
  actions: {
    setSearchResults(recent_projects, projects, avatarUrl, userName, userId) {
      ;((this.recent_projects = recent_projects),
        (this.projects = projects),
        (this.avatar = avatarUrl),
        (this.username = userName),
        (this.userid = userId))
    },
    clearUserInfo() {
      this.recent_projects = []
      this.projects = []
      this.avatar = ''
      this.username = ''
      this.userid = ''
    },
  },
  persist: {
    enabled: true,
    storage: sessionStorage,
    paths: ['avatar', 'username', 'userid', 'projects', 'recent_projects'], // Persist all user-related data
  },
})
