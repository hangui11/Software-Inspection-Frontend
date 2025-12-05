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
    user_calendar: [],
    calendar_messages: [],
  }),
  actions: {
    setSearchResults(recent_projects, projects, avatarUrl, userName, userId) {
      ;((this.recent_projects = recent_projects),
        (this.projects = projects),
        (this.avatar = avatarUrl),
        (this.username = userName),
        (this.userid = userId))
    },
    setUserCalendar(userCalendar) {
      this.user_calendar = userCalendar
    },
    setCalendarMessages(message) {
      this.calendar_messages = message
    },
    clearUserInfo() {
      this.recent_projects = []
      this.projects = []
      this.avatar = ''
      this.username = ''
      this.userid = ''
      this.user_calendar = []
      this.calendar_messages = []
    },
  },
  persist: {
    enabled: true,
    storage: sessionStorage,
    paths: [
      'avatar',
      'username',
      'userid',
      'projects',
      'recent_projects',
      'user_calendar',
      'calendar_messages',
    ], // Persist all user-related data

    beforeRestore: (context) => {
      // Check if the payload contains the user_calendar array
      const storedCalendar = context.payload.user_calendar

      if (storedCalendar && Array.isArray(storedCalendar)) {
        // Iterate over each event in the stored calendar
        context.payload.user_calendar = storedCalendar.map((event) => {
          // Check if the dates structure exists and convert the date strings back to Date objects
          if (event.dates && typeof event.dates.start === 'string') {
            return {
              ...event,
              dates: {
                // Convert the string to a Date object
                start: new Date(event.dates.start),
                end: new Date(event.dates.end),
              },
            }
          }
          // Return unconverted if it doesn't match the expected structure
          return event
        })
      }
    },
  },
})
