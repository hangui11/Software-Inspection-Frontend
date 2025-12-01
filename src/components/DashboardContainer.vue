<script setup>
import { useRouter } from 'vue-router'
import { ref, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useSearchStore } from '@/store/searchStore'
import search from '@/assets/icons/search.png'
import signout from '@/assets/icons/signout.svg'
import lucky_coin from '@/assets/icons/lucky-coin.svg'
import calendar from '@/assets/icons/calendar.svg'
import { logOut } from '@/lib/appwrite'

const router = useRouter()
const searchStore = useSearchStore()

const props = defineProps({
  avatar: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  projects: {
    type: Array,
    required: true,
  },
})

const input = ref('')
const inputRef = ref(null)

const dashboard = () => {
  window.location.href = '/dashboard'
}

const log_out = async () => {
  try {
    const session = await logOut()
    console.log(session)
    setTimeout(() => {
      router.replace('/')
    }, 500)
  } catch (error) {
    alert(error.message)
  }
}

const filteredProjects = ref([])
const showDropdown = ref(false)
const searchContainer = ref(null)

const handleInput = () => {
  // 1. Trigger the filtering logic
  filterProjects()
}

const hideDropdown = () => {
  // We use a small delay to prevent the dropdown from instantly closing
  // if the user clicks a scrollbar or slightly outside the search item.
  setTimeout(() => {
    showDropdown.value = false
  }, 50)
}

// Filter projects based on input text
const filterProjects = () => {
  const query = input.value.toLowerCase()
  // console.log('aaaa', props.projects.length)
  if (!query) {
    filteredProjects.value = []
    showDropdown.value = false
    return
  }
  filteredProjects.value = props.projects.filter((p) =>
    p.project_name.toLowerCase().includes(query),
  )
  showDropdown.value = filteredProjects.value.length > 0
}

const findAllRelatedProjects = () => {
  if (!input.value) {
    searchStore.setSearchResults(props.projects, props.projects, props.avatar, props.username)
    router.push('/dashboard/project_query')
    return
  }
  searchStore.setSearchResults(filteredProjects.value, props.projects, props.avatar, props.username)
  router.push('/dashboard/project_query')
}

// When selecting a project
const selectProject = (project) => {
  input.value = project.project_name
  showDropdown.value = false
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      // Ensure the cursor is at the end of the text
      inputRef.value.selectionStart = inputRef.value.selectionEnd = inputRef.value.value.length
    }
  })
}

const handleClickOutside = (event) => {
  if (searchContainer.value && !searchContainer.value.contains(event.target)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="nav-container">
    <div class="nav-logo">
      <img :src="lucky_coin" width="40px" height="40px" class="icon" />
      <div class="name" @click="dashboard">Dashboard</div>
    </div>

    <div ref="searchContainer" class="search-container">
      <input
        id="search"
        type="text"
        v-model="input"
        placeholder="Search a project"
        autocomplete="off"
        @input="handleInput"
        @keydown.enter="findAllRelatedProjects"
        @blur="hideDropdown"
        :ref="inputRef"
      />

      <div v-if="showDropdown" class="search-bar">
        <div
          v-for="project in filteredProjects"
          :key="project.project_name"
          class="search-item"
          @mousedown.prevent
          @click="selectProject(project)"
        >
          {{ project.project_name }}
        </div>
      </div>
      <img :src="search" class="search-logo" @click="findAllRelatedProjects" />
    </div>

    <div class="nav-user">
      <div class="user">
        <img :src="props.avatar" width="45px" class="avatar" />
        <p class="username">{{ props.username }}</p>
      </div>

      <img class="signout-icon" :src="calendar" @click="showCalendar" />
      <img class="signout-icon" :src="signout" @click="log_out" />
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

.nav-container {
  position: sticky;
  display: flex;
  justify-content: space-between;
  align-items: center;
  top: 0;
  z-index: 990;
  padding: 1rem 3rem;
  background-color: #ffffff;
  border-bottom: solid 2px rgba(241, 241, 241, 1);
}

.icon {
  height: 2.5rem;
  width: 2.5rem;
  /* margin-right: 0.625rem; */
  transition: all 0.3s ease-in-out;
}

.nav-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  font-size: 2rem;
  transition: all 0.3s ease-in-out;
  gap: 10px;
}

.nav-logo:hover .icon {
  transform: rotate(360deg) scale(1.15);
}

.nav-logo:hover .name {
  color: rgba(233, 182, 100, 0.7);
}

.nav-user {
  position: relative;
  display: flex;
  z-index: 900;
}

.user {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 1rem;
  font-weight: 550;
}

.nav-home-bar {
  display: flex;
  align-items: center;
  font-size: clamp(1rem, 3vw, 1.25rem);
  justify-content: space-between;
  padding: 0.3125rem;
  width: 35%;
}

.search-container {
  position: relative;
  width: 400px;
  height: 50px;
  display: flex;
  align-items: center;
  border-radius: 10px;
  border: solid 1px #ccc;
  padding: 0 0.5rem;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);

  /* justify-content: space-between; */
}

.search-logo {
  width: 24px;
  height: 24px;
  vertical-align: middle;
  margin-left: 8px;
  padding: 10px;
  cursor: pointer;
}

input#search {
  width: 100%;
  outline: none;
  border: none;
  margin: 0.5rem 0.5rem;
  font-size: 1rem;
}

.search-bar {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 10px;
  background-color: white;
  /* max-height: 200px; */
  overflow-y: auto;
  z-index: 10;
}

.search-item {
  padding: 8px;
  cursor: pointer;
}

.search-item:hover {
  background-color: #f0f0f0;
}

.search-logo {
  width: 1rem;
  height: 1rem;
}

.avatar {
  /* border: solid 0.5px rgba(0, 0, 0, 0.1); */
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50px;
  margin-right: 0.8rem;
}

.username {
  font-size: large;
  font-weight: bold;
}

.signout-icon {
  width: 2.7rem;
  cursor: pointer;
  margin-left: 1.5rem;
}

@media screen and (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    align-items: flex-start;
    position: relative;
  }

  .search-container {
    width: 100%;
    margin-top: 1rem;
  }
}
</style>
