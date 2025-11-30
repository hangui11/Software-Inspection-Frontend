<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
// Assuming you have imported your store correctly
import { useSearchStore } from '@/store/searchStore'
import { formatAppwriteDate } from '@/lib/appwrite'
// 1. Get the router instance
const router = useRouter()
const searchStore = useSearchStore()

// Destructure the reactive references from the store
// We'll declare these variables outside of onMounted
// so they are available to the component template.
const { filteredProjects, projects, avatar, username } = storeToRefs(searchStore)

const activeStatusFilter = ref('All')
const availableStatuses = ['All', 'Not Started', 'In Progress', 'Completed']

const sortCriteria = ref('dateDesc')

onMounted(() => {
  // Check if the core data array is empty or null

  if (!projects.value || projects.value.length == 0) {
    console.log('No projects found in store. Redirecting to dashboard.')

    // 2. Navigate back to the dashboard route
    router.push('/dashboard')
  }
})

const projectsFilteredByStatus = computed(() => {
  const filter = activeStatusFilter.value
  const source = filteredProjects.value || [] // Ensure source is an array

  if (filter === 'All') {
    return source
  }

  return source.filter((project) => project.project_status === filter)
})

const finalDisplayProjects = computed(() => {
  // Use the results from the status filter
  const projectsToSort = [...projectsFilteredByStatus.value]
  const criteria = sortCriteria.value

  switch (criteria) {
    case 'nameAsc':
      return projectsToSort.sort((a, b) => a.project_name.localeCompare(b.project_name))

    case 'dateAsc':
      return projectsToSort.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt))

    case 'membersDesc':
      return projectsToSort.sort((a, b) => b.members - a.members)

    case 'dateDesc':
    default:
      // Default: Newest first (highest creation date first)
      return projectsToSort.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))
  }
})
</script>

<template>
  <div class="body">
    <div v-if="filteredProjects.length > 0">
      <h1>Search Results:</h1>
      <div class="controls-bar">
        <div class="control-text">Sort By:</div>
        <select v-model="sortCriteria" class="sort-dropdown">
          <option value="dateDesc">Newest First</option>
          <option value="dateAsc">Oldest First</option>
          <option value="nameAsc">Name (A-Z)</option>
          <option value="membersDesc">Members (Most First)</option>
        </select>

        <div class="status-filter-buttons">
          <button
            v-for="status in availableStatuses"
            :key="status"
            @click="activeStatusFilter = status"
            :class="['status-btn', { 'active-filter': activeStatusFilter === status }]"
          >
            {{ status }}
          </button>
        </div>
      </div>
      <div class="projects-container">
        <div
          v-for="project in finalDisplayProjects"
          :key="project.$id"
          class="project-box"
          @click="
            router.push({
              name: 'dashboard-project-ins-form',
              params: { project_id: project.$id },
            })
          "
        >
          <h4>{{ project.project_name }}</h4>
          <h4>Members: {{ project.members }}</h4>

          <p>Created: {{ formatAppwriteDate(project.$createdAt) }}</p>
          <p>Updated: {{ formatAppwriteDate(project.update_date) }}</p>

          <p :class="['status-indicator', project.project_status.toLowerCase().replace(' ', '-')]">
            Status: {{ project.project_status }}
          </p>
        </div>
      </div>
    </div>
    <div v-else>No projects found matching your search criteria.</div>
  </div>
</template>

<style scoped>
/* ================================================= */
/* 1. Global Page Layout and Typography              */
/* ================================================= */
.body {
  width: 100%;
  max-width: 1200px; /* Center content and limit width for readability */
  margin: 3% auto;
  padding: 0 30px;
}

h1 {
  font-size: 2.5em;
  color: #1a1a1a;
  margin-bottom: 30px;
  font-weight: 700;
  border-bottom: 3px solid #007bff; /* Primary color underline */
  padding-bottom: 10px;
}

/* ================================================= */
/* 2. Controls Bar (Filters and Sorting)             */
/* ================================================= */
.controls-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}

/* Sorting Dropdown */
.sort-dropdown {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: white;
  font-size: 1em;
  cursor: pointer;
}

/* Status Filter Buttons Container */
.status-filter-buttons {
  margin-left: 50px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* Individual Status Button */
.status-btn {
  padding: 8px 15px;
  border: 1px solid #ccc;
  border-radius: 20px; /* Pill shape */
  background-color: #f8f8f8;
  color: #555;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  border-color: #007bff;
}

/* Active Status Filter State */
.status-btn.active-filter {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
  font-weight: 600;
}

/* ================================================= */
/* 3. Project Grid Layout                            */
/* ================================================= */
.projects-container {
  display: grid;
  /* Responsive grid: 2-4 columns depending on screen size */
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

/* ================================================= */
/* 4. Individual Project Card (The Box)              */
/* ================================================= */
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
  border: 1px solid #007bff;
  cursor: pointer;
}

/* Project Name (Most prominent) */
.project-box h4:first-child {
  font-size: 1.4em;
  font-weight: 600;
  color: #007bff;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid #f0f0f0;
}

/* Members Count */
.project-box h4 {
  font-size: 1.1em;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
}

/* Date/Detail Text */
.project-box p {
  font-size: 0.95em;
  color: #777;
  margin: 6px 0;
}

/* Status Indicator (Pushed to bottom) */
.status-indicator {
  padding-top: 15px;
  margin-top: auto; /* Pushes element to the bottom edge */
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.5px;
  border-top: 1px dashed #e0e0e0;
}

/* Status Colors (based on project.project_status) */
.status-indicator.not-started {
  color: #dc3545; /* Red */
}
.status-indicator.in-progress {
  color: #ffc107; /* Yellow */
}
.status-indicator.completed {
  color: #28a745; /* Green */
}

.control-text {
  font-size: 1.2em;
}
</style>
