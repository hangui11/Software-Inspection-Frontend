<!-- Dashboard.vue -->
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { createProject, joinProject, formatAppwriteDate } from '@/lib/appwrite'
import { userInformationStore } from '@/store/searchStore'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
// import axios from 'axios'

const router = useRouter()
const create_project = ref(true)
const project_input = ref('')
const userInfoStore = userInformationStore()

const selectedRole = ref('reviewer') // Default value
const roles = ref(['moderator', 'reviewer', 'instructor'])

const { recent_projects, projects, avatar, username, userid } = storeToRefs(userInfoStore)
const user_recent_projects = ref(recent_projects)

const props = defineProps({
  loadProjects: {
    type: Function,
    required: true, // Ensures the parent always provides the function
  },
})

onMounted(() => {})

onUnmounted(() => {})

const isProjectModalOpen = ref(false)

const showProjectWindow = (project_type) => {
  isProjectModalOpen.value = true
  if (project_type == 2) {
    create_project.value = false
  } else {
    create_project.value = true
  }
}

const closeProjectWindonw = () => {
  isProjectModalOpen.value = false
}

const create_project_api = async () => {
  if (project_input.value == '') {
    alert('Put a valid name for the project')
    return
  }
  try {
    const create_project_session = await createProject(project_input.value, userid.value)
    console.log(create_project_session)
  } catch (error) {
    alert(error)
  }
  isProjectModalOpen.value = false
  await props.loadProjects()
}

const join_project_api = async () => {
  if (project_input.value == '') {
    alert('Put a valid code for the project')
    return
  }
  try {
    const join_project_session = await joinProject(
      project_input.value,
      userid.value,
      selectedRole.value,
    )
    console.log(join_project_session)
  } catch (error) {
    alert(error)
  }
  isProjectModalOpen.value = false
  await props.loadProjects()
}
</script>

<template>
  <div class="components">
    <div v-if="isProjectModalOpen" class="project-modal" @click.self="isProjectModalOpen = false">
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
      <div class="header-body">
        <div class="create-join-project">
          <h2>Initiate a New Project</h2>
          <p>Start a new project or join an existing one to collaborate with your team.</p>
          <div class="project-buttons">
            <button @click="showProjectWindow(1)">Create New Project</button>
            <button @click="showProjectWindow(2)">Join Existing Project</button>
          </div>
        </div>
        <VCalendar />
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
            @click="
              router.push({
                name: 'dashboard-project-ins-form',
                params: { project_id: project.$id },
              })
            "
          >
            <div v-if="project.project_name">
              <h4>{{ project.project_name }}</h4>
              <h4>Members: {{ project.members }}</h4>
              <p>Created: {{ formatAppwriteDate(project.$createdAt) }}</p>
              <p>Updated: {{ formatAppwriteDate(project.update_date) }}</p>
            </div>
            <div v-else>
              <h4>Not Project Yet</h4>
              <h4>Create or Join a project</h4>
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

.header-body {
  display: flex;
  justify-content: space-between;
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
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
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
