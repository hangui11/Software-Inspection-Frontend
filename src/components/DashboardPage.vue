<!-- Dashboard.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { createProject, joinProject, formatAppwriteDate, getUserProjects } from '@/lib/appwrite'
import { userInformationStore } from '@/store/searchStore'
import { storeToRefs } from 'pinia'
// import { useRouter } from 'vue-router';
// import axios from 'axios'

// const router = useRouter()
const create_project = ref(true)
const currentLayout = ref('project-none')
const project_input = ref('')
const userInfoStore = userInformationStore()

const selectedRole = ref('reviewer') // Default value
const roles = ref(['moderator', 'reviewer', 'instructor'])

const { recent_projects, projects, avatar, username } = storeToRefs(userInfoStore)
const user_projects = ref(projects)
const user_recent_projects = ref(recent_projects)

onMounted(() => {})

onUnmounted(() => {})

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

const loadProjects = async () => {
  try {
    user_projects.value = await getUserProjects(username.value)
    console.log('User projects fetched in DashboardContainer:', user_projects)
    user_recent_projects.value = user_projects.value.slice(0, 3) // Get the 3 most recent projects
    if (user_recent_projects.value.length < 3) {
      // If less than 3 projects, fill with placeholders
      const placeholdersNeeded = 3 - user_recent_projects.value.length
      for (let i = 0; i < placeholdersNeeded; i++) {
        user_recent_projects.value.push({
          project_name: null,
          name: 'No Project',
          update_date: 'N/A',
        })
      }
    }
    console.log(user_projects)
    console.log(user_recent_projects)
  } catch (error) {
    alert(error)
    user_projects.value = []
    for (let i = 0; i < 3; i++) {
      user_recent_projects.value.push({
        project_name: null,
        name: 'No Project',
        update_date: 'N/A',
      })
    }
  }
}
</script>

<template>
  <div class="components">
    <div :class="currentLayout" class="project-modal">
      <div v-if="create_project" class="project-window">
        <div class="close-emoji" @click="closeProjectWindonw">❌</div>
        <div class="project-name-text">Project Name:</div>
        <input
          id="project-name"
          type="text"
          v-model="project_input"
          @keydown.enter="create_project_api()"
        />
        <button @click="create_project_api()">Create the Project</button>
      </div>
      <div v-else class="project-window">
        <div class="close-emoji" @click="closeProjectWindonw">❌</div>
        <div class="project-code-text">Project Code:</div>
        <input
          id="project-code"
          type="text"
          v-model="project_input"
          @keydown.enter="join_project_api()"
        />
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
            v-for="project in user_recent_projects"
            :key="project.project_name"
            class="project-box"
            @click="view_project(project.project_name)"
          >
            <div v-if="project.project_name">
              <h4>{{ project.project_name }}</h4>
              <h4>Members: {{ project.members }}</h4>
              <p>Created: {{ formatAppwriteDate(project.$createdAt) }}</p>
              <p>Updated: {{ formatAppwriteDate(project.update_date) }}</p>
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
  display: grid;
  /* Responsive grid: max 3 columns when wide, min size 300px */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px; /* Spacing between cards */
  padding: 20px 0;
}

.project-box {
  border: none;
  border-radius: 12px;
  padding: 25px;
  /* width: 30%; */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  /* Flex to push status to the bottom */
  display: flex;
  flex-direction: column;
}

.project-box:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #007bff; /* Primary color highlight */
  cursor: pointer;
}

.project-box h4 {
  font-size: 1.1em;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
}

.project-box h4:first-child {
  font-size: 1.4em;
  font-weight: 600;
  color: #007bff;
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid #f0f0f0;
}

.project-box p {
  font-size: 0.95em;
  color: #777;
  margin: 6px 0;
}

/* Styling the custom plus icon */
.circle_adding {
  /* Circle container */
  width: 100%;
  height: 100%;
  /* Restore essential styling */
  border-radius: 10px; /* 🔑 RESTORE: Makes it a circle */

  font-size: 40px;
  font-weight: 300;
  transition: transform 0.2s ease;

  /* 🔑 FIX: Use Flexbox properties for centering */
  display: flex;
  justify-content: center; /* 🔑 CORRECTED: Centers content horizontally (main axis) */
  align-items: center; /* Centers content vertically (cross axis) */
}

.project-box:hover .circle_adding {
  /* Small animation on hover */
  transform: scale(1.1);
  /* Use a proper box shadow color for the circle */
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); /* Adjusted shadow to match green theme */
}

/* Apply a distinct background to the action card on hover/focus */
.project-box:has(> div:last-child):hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #007bff;
}

.create-join-project {
  flex-direction: row;
}

.project-buttons {
  display: flex;
  gap: 20px;
}

.project-modal {
  width: 100vw; /* 100% of Viewport Width */
  height: 100vh;
  /* display: none; */
  position: fixed;
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
