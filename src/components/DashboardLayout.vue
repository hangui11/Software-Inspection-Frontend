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
      v-else
    />

    <!-- PAGES WILL RENDER HERE -->
    <router-view :loadProjects="loadProjects" />
  </div>
</template>

<script setup>
import DashboardContainer from '@/components/DashboardContainer.vue'
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { getCurrentUser, getUserProjects, logOut } from '@/lib/appwrite'
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
} = storeToRefs(userInfoStore)

const updatePageHeight = () => {
  nextTick(() => {
    pageHeight.value = document.documentElement.scrollHeight
  })
}
onMounted(async () => {
  const isProjectsMissing = !projects_stored.value || projects_stored.value.length === 0
  const isRecentProjectsMissing =
    !recent_projects_stored.value || recent_projects_stored.value.length === 0
  const isUsernameMissing = !username_stored.value
  const isAvatarMissing = !avatar_stored.value
  if (isProjectsMissing || isRecentProjectsMissing || isUsernameMissing || isAvatarMissing) {
    try {
      const current_user = await getCurrentUser()
      console.log(current_user)
      username.value = current_user.username
      user_avatar.value = current_user.avatar
      user_id.value = current_user.user_id
    } catch (error) {
      alert('Do not have user logged ' + error)
    }
    await loadProjects()
    updatePageHeight()
    isLoading.value = false
  } else {
    user_projects.value = projects_stored.value
    recent_projects.value = recent_projects_stored.value
    user_avatar.value = avatar_stored.value
    username.value = username_stored.value
    isLoading.value = false
  }
})

onUnmounted(async () => {
  window.removeEventListener('beforeunload', logOut)
})

const loadProjects = async () => {
  try {
    user_projects.value = await getUserProjects(username.value)
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
