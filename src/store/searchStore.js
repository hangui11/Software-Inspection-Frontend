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
    },
  },
})

export const userInformationStore = defineStore('user_information', {
  state: () => ({
    recent_projects: [],
    projects: [],
    avatar: '',
    username: '',
  }),
  actions: {
    setSearchResults(recent_projects, projects, avatarUrl, userName) {
      ;((this.recent_projects = recent_projects),
        (this.projects = projects),
        (this.avatar = avatarUrl),
        (this.username = userName))
    },
  },
})
