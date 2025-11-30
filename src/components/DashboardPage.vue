<!-- Dashboard.vue -->
<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { getCurrentUser, getUserProjects, logOut, createProject, joinProject } from '@/lib/appwrite'
// import { useRouter } from 'vue-router';
import DashboardContainer from './DashboardContainer.vue'
// import axios from 'axios'

// const router = useRouter()
const create_project = ref(true)
const currentLayout = ref('project-none')
const project_input = ref('')
const username = ref('')
const user_avatar = ref('')
const user_id = ref('')
const selectedRole = ref('reviewer') // Default value
const roles = ref(['moderator', 'reviewer', 'instructor'])
const user_projects = ref([])
const recent_projects = ref([])
const pageHeight = ref(window.innerHeight)
const isLoading = ref(true)

const updatePageHeight = () => {
  nextTick(() => {
    pageHeight.value = document.documentElement.scrollHeight
  })
}

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

onMounted(async () => {
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
})

onUnmounted(async () => {
  window.removeEventListener('beforeunload', logOut)
})

const showProjectWindow = (project_type) => {
  currentLayout.value = 'project-flex'
  if (project_type == 2) {
    create_project.value = false
  } else {
    create_project.value = true
  }
}

const closeProjectWindonw = () => {
  currentLayout.value = 'project-none'
  project_input.value = ''
}

const create_project_api = async () => {
  try {
    const create_project_session = await createProject(project_input.value, username.value)
    console.log(create_project_session)
  } catch (error) {
    alert(error)
  }
  currentLayout.value = 'project-none'
  await loadProjects()
}

const join_project_api = async () => {
  try {
    const join_project_session = await joinProject(
      project_input.value,
      username.value,
      selectedRole.value,
    )
    console.log(join_project_session)
  } catch (error) {
    alert(error)
  }
  currentLayout.value = 'project-none'
  await loadProjects()
}
</script>

<template>
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

  <div v-else class="components">
    <div :class="currentLayout" class="project-modal">
      <div v-if="create_project" class="project-window">
        <div class="close-emoji" @click="closeProjectWindonw">❌</div>
        <div class="project-name-text">Project Name:</div>
        <input id="project-name" type="text" v-model="project_input" />
        <button @click="create_project_api()">Create the Project</button>
      </div>
      <div v-else class="project-window">
        <div class="close-emoji" @click="closeProjectWindonw">❌</div>
        <div class="project-code-text">Project Code:</div>
        <input id="project-code" type="text" v-model="project_input" />
        <div class="role-selection-group">
          <label for="role-select">Select Your Role:</label>

          <select id="role-select" v-model="selectedRole" class="role-dropdown">
            <option v-for="role in roles" :key="role" :value="role">
              {{ role.charAt(0).toUpperCase() + role.slice(1) }}
            </option>
          </select>
        </div>

        <p class="selected-role-info">
          You will join as: <strong>{{ selectedRole.toUpperCase() }}</strong>
        </p>
        <button @click="join_project_api()">Join the Project</button>
      </div>
    </div>

    <DashboardContainer :avatar="user_avatar" :username="username" :projects="user_projects" />
    <div class="body">
      <div class="create-join-project">
        <h2>Initiate a New Project</h2>
        <p>Start a new project or join an existing one to collaborate with your team.</p>
        <div class="project-buttons">
          <button @click="showProjectWindow(1)">Create New Project</button>
          <button @click="showProjectWindow(2)">Join Existing Project</button>
        </div>
      </div>

      <div class="recent-projects">
        <h2>Your Recent Projects</h2>
        <p>Click on a project to continue working on it.</p>
        <!-- Recent projects list will go here -->

        <div class="projects-container">
          <div
            v-for="project in recent_projects"
            :key="project.project_name"
            class="project-box"
            @click="view_project(project.project_name)"
          >
            <div v-if="project.project_name">
              <h4>Project Name: {{ project.project_name }}</h4>
              <h4>Members: {{ project.members }}</h4>
              <p>Created: {{ project.$createdAt }}</p>
              <p>Updated: {{ project.update_date }}</p>
            </div>
            <div v-else>
              <h4>Create/Join New Project</h4>
              <div class="circle_adding">+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

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

.body {
  position: relative;
  margin: 3% 13%;
}

p {
  font-size: large;
  font-weight: 500;
}

button {
  cursor: pointer;
  margin-top: 1rem;
  background-color: white;
  border: none;
  border-radius: 4px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  font-size: medium;
  padding: 0.5rem 2rem;
  /* z-index: -1; */
  transition: all 0.3s ease-in-out;
}

button:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

.recent-projects {
  margin-top: 4rem;
}

.projects-container {
  margin-top: 40px;
  display: flex; /* horizontal layout */
  gap: 60px; /* space between boxes */
  flex-wrap: wrap; /* wrap to next line if not enough space */
}

.project-box {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 12px;
  width: 300px; /* fixed width for each box */
  height: 250px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  justify-items: center;
  cursor: pointer;
}

.project-box:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-5px);
  transition: all 0.3s ease-in-out;
}

.circle_adding {
  width: 150px;
  height: 150px;
  border: 2px dashed #888;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
  color: #888;
  user-select: none;
}

.create-join-project {
  flex-direction: row;
}

.project-buttons {
  display: flex;
  gap: 20px;
}

.project-modal {
  width: 100%;
  height: 100%;
  /* display: none; */
  position: absolute;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);
}

.project-none {
  display: none;
}

.project-flex {
  display: flex;
}

.project-window {
  display: flex;
  border: solid 2px whitesmoke;
  background-color: whitesmoke;
  border-radius: 50px;
  width: 40%;
  height: 50%;
  align-items: center;
  gap: 15px;
  /* justify-content: space-between; */
  flex-direction: column;

  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
}

.close-emoji {
  margin: 1.5rem 1.5rem 0 1.5rem;
  align-self: last baseline;
  cursor: pointer;
}

.project-name-text {
  margin-top: 3rem;
}

.project-code-text {
  margin-bottom: 0;
  font-size: large;
  margin-top: 0;
}

input {
  height: 1.5rem;
  width: 40%;
  border: solid 2px;
  margin-bottom: 1rem;
}

.role-dropdown {
  width: 100%;
  /* padding: 10px; */
  font-size: 1em;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box; /* Ensures padding is inside the width */
  margin-top: 5px;
  font-size: medium;
}

.role-selection-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-size: large;
}

.selected-role-info {
  font-size: 0.9em;
  color: #555;
  margin: -5px 0 0;
}
</style>
