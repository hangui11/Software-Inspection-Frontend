<template>
  <div class="dashboard-layout">
    <div class="initial-loading-status" :style="{ height: `${pageHeight}px` }" v-if="isLoading">
      <v-progress-circular
        color="rgba(0, 0, 0, 0.5)"
        model-value="20"
        :size="128"
        :width="12"
        indeterminate="true"
        class="loading-circular"
      ></v-progress-circular>
      <h1>LOADING THE COMPONENTS . . .</h1>
    </div>
    <DashboardContainer
      :avatar="user_avatar"
      :username="username"
      :projects="user_projects"
      :user_id="user_id"
      :loadProjects="loadProjects"
      :invitationMessages="invitationMessages"
      :requestMessages="requestMessages"
      v-else
    />

    <!-- PAGES WILL RENDER HERE -->
    <router-view
      :loadProjects="loadProjects"
      :loadUserCalendar="loadUserCalendar"
      :loadMessages="loadMessages"
    />
  </div>
</template>

<script setup>
import DashboardContainer from '@/components/DashboardContainer.vue'
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import {
  getCurrentUser,
  getUserProjects,
  logOut,
  showUserCalendar,
  showUserInvitation,
  showUserRequest,
  getProjectById,
  getUserCalendar,
} from '@/lib/appwrite'
import { userInformationStore } from '@/store/searchStore'
import { storeToRefs } from 'pinia'
const username = ref('')
const user_avatar = ref('')
const user_id = ref('')
const isLoading = ref(true)
const pageHeight = ref(window.innerHeight)
const user_projects = ref([])
const recent_projects = ref([])
const userInfoStore = userInformationStore()

const {
  recent_projects: recent_projects_stored,
  projects: projects_stored,
  avatar: avatar_stored,
  username: username_stored,
  userid: userid_stored,
  user_calendar: user_calendar_stored,
} = storeToRefs(userInfoStore)

const invitationMessages = ref([]) // invite the user in projects
const requestMessages = ref([]) // show invited user status to the inviter
const userCalendaMessages = ref([])

const updatePageHeight = () => {
  nextTick(() => {
    pageHeight.value = document.documentElement.scrollHeight
  })
}

const reminders = ref([])

const loadMessages = async (userid) => {
  invitationMessages.value = await showUserInvitation(userid)
  requestMessages.value = await showUserRequest(userid)
  userCalendaMessages.value = await showUserCalendar(userid)
  userInfoStore.setCalendarMessages(userCalendaMessages.value)
}

onMounted(async () => {
  try {
    const current_user = await getCurrentUser()
    console.log(current_user)
    username.value = current_user.username
    user_avatar.value = current_user.avatar
    user_id.value = current_user.$id

    await loadMessages(user_id.value)
    await loadProjects()
    await loadUserCalendar()
  } catch (error) {
    alert('Do not have user logged ' + error)
  }

  updatePageHeight()
  isLoading.value = false
})

onUnmounted(async () => {
  window.removeEventListener('beforeunload', logOut)
})

const colors = [
  'orange', // #ff9800
  'green', // #52c41a (Closer to a standard green or lime-green)
  'red', // #f5222d
  'purple', // #722ed1
  'teal', // #13c2c2
  'yellow', // #faad14 (Closer to gold or dark-yellow)
  'pink', // #eb2f96 (Closer to magenta or deep-pink)
  'indigo', // #2f54eb
  'lime', // #a0d911
  'gray',
]

const loadUserCalendar = async () => {
  reminders.value = []
  const userCalendar = await getUserCalendar(userid_stored.value)

  if (userCalendar) {
    let i = 0
    for (const event of userCalendar) {
      let project_name = 'Unknown Project'
      try {
        const projectInfo = await getProjectById(event.project_id)
        project_name = projectInfo.project_name
      } catch (error) {
        console.error(`Could not fetch project info for ID: ${event.project_id}`, error)
      }

      // The date comparison (endTimeDate - startTimeDate) returns the difference in milliseconds.
      const startTimeDate = event.start_date // Already a Date object
      const endTimeDate = event.end_date // Already a Date object
      const isSameDay =
        startTimeDate.getUTCFullYear() === endTimeDate.getUTCFullYear() &&
        startTimeDate.getUTCMonth() === endTimeDate.getUTCMonth() &&
        startTimeDate.getUTCDate() === endTimeDate.getUTCDate()

      // The event is now classified as 'instant' (dot) only if it begins and ends on the same calendar day.
      const isInstant = isSameDay

      // 3. Format UTC Times
      const startUTCHour = startTimeDate.getUTCHours()
      const startUTCMinute = startTimeDate.getUTCMinutes()
      const startformattedUTCTime = `${String(startUTCHour).padStart(2, '0')}:${String(startUTCMinute).padStart(2, '0')}`

      const endUTCHour = endTimeDate.getUTCHours()
      const endUTCMinute = endTimeDate.getUTCMinutes()
      const endformattedUTCTime = `${String(endUTCHour).padStart(2, '0')}:${String(endUTCMinute).padStart(2, '0')}`

      // 4. Build the Reminder Object
      reminders.value.push({
        id: event.$id,
        title: `${event.type.charAt(0).toUpperCase() + event.type.slice(1)}: ${event.content} (${project_name} project)`,
        start_time: startformattedUTCTime,
        end_time: endformattedUTCTime,
        icon: event.type === 'meeting' ? '📞' : '⭐',
        color: colors[i],
        enabled: true,
        highlight: !isInstant, // Use highlight for longer duration events
        dot: isInstant, // Use dot for instant/zero duration events
        dates: {
          start: startTimeDate,
          end: endTimeDate,
        },
        reminded: event.reminded,
      })
      i = i + 1
    }
    userInfoStore.setUserCalendar(reminders.value)
  }
}

const loadProjects = async () => {
  try {
    user_projects.value = await getUserProjects(user_id.value)
    console.log('User projects fetched in DashboardContainer:', user_projects)
    recent_projects.value = user_projects.value.slice(0, 3) // Get the 3 most recent projects
    if (recent_projects.value.length < 3) {
      // If less than 3 projects, fill with placeholders
      const placeholdersNeeded = 3 - recent_projects.value.length
      for (let i = 0; i < placeholdersNeeded; i++) {
        recent_projects.value.push({
          project_name: null,
          name: 'No Project',
          update_date: 'N/A',
        })
      }
    }
    console.log(user_projects)
    console.log(recent_projects)
    userInfoStore.setSearchResults(
      recent_projects.value,
      user_projects.value,
      user_avatar.value,
      username.value,
      user_id.value,
    )
  } catch (error) {
    alert(error)
    user_projects.value = []
    for (let i = 0; i < 3; i++) {
      recent_projects.value.push({
        project_name: null,
        name: 'No Project',
        update_date: 'N/A',
      })
    }
  }
}
</script>

<style scoped>
.initial-loading-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  /* height: 100%; */
  background-color: rgba(226, 226, 226, 0.1);
  z-index: 20000;
}
</style>
