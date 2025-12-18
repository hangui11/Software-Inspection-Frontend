<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getUserEmail } from '@/lib/appwrite'
import { getProjectAllUsers, updateUserRoles, leaveProject, deleteProject } from '@/lib/appwrite'
import { useRouter } from 'vue-router'

const router = useRouter()
const emit = defineEmits(['close'])
// Props (assumed):
const props = defineProps({
  projectId: {
    type: String, // The ID of the project being shared
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  project: {
    type: Object,
    required: true,
  },
  loadProjects: {
    type: Function,
    required: true,
  },
  user_role: {
    type: String,
    required: true,
  },
})

const projectUsers = ref([])
const user_email = ref('')
const owner_accepted_leave = ref(false)
const selectedNewOwner = ref('')

onMounted(async () => {
  user_email.value = await getUserEmail(props.userId)
  projectUsers.value = await getProjectAllUsers(props.projectId)
  projectUsers.value = projectUsers.value.filter((user) => user.email != user_email.value)
})

onUnmounted(async () => {})

// --- Methods ---

const accept_request = async () => {
  console.log(props.project.members, props.user_role, owner_accepted_leave.value)
  if (props.project.members == 1 && props.user_role === 'owner') {
    await deleteProject(props.projectId, props.userId)
    await props.loadProjects()
    emit('close')
    router.push('/dashboard')
  } else if (
    props.project.members != 1 &&
    props.user_role === 'owner' &&
    !owner_accepted_leave.value
  ) {
    owner_accepted_leave.value = true
  } else if (props.user_role != 'owner') {
    await leaveProject(props.projectId, props.userId)
    emit('close')
    await props.loadProjects()
    router.push('/dashboard')
  } else if (owner_accepted_leave.value) {
    await updateUserRoles(props.projectId, [
      { id: selectedNewOwner.value.id, email: selectedNewOwner.value.email, role: 'owner' },
    ])
    await leaveProject(props.projectId, props.userId)
    emit('close')
    await props.loadProjects()
    router.push('/dashboard')
  }
}

const reject_request = () => {
  console.log('Closed')
  emit('close')
}
</script>

<template>
  <div class="exit-container">
    <div class="header-container">
      <h3>Exit Project</h3>
      <div class="close-emoji" @click="reject_request">❌</div>
    </div>

    <div v-if="props.project.members == 1">
      <p class="text-project">Are you sure to delete the project?</p>
    </div>
    <div v-else-if="props.project.members != 1 && !owner_accepted_leave">
      <p class="text-project">Are you sure to leave the project?</p>
    </div>

    <div v-if="owner_accepted_leave" class="owner-transfer-section">
      <p class="transfer-warning">
        You must transfer ownership before leaving. Please select a new owner from the list below.
      </p>

      <div class="selection-group">
        <label for="new-owner-select">New Owner:</label>

        <select id="new-owner-select" v-model="selectedNewOwner" class="owner-dropdown" required>
          <option value="" disabled>-- Select a Project Member --</option>

          <option v-for="member in projectUsers" :key="member.id" :value="member">
            {{ member.email }}
          </option>
        </select>
      </div>
    </div>

    <div class="btn-container">
      <button class="action-btn accept-btn" @click="accept_request">✔️ Yes</button>
      <button class="action-btn reject-btn" @click="reject_request">❌ No</button>
    </div>
  </div>
</template>

<style scoped>
.exit-container {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);

  font-family: Arial, sans-serif;
}

.header-container {
  border-bottom: 1px solid #eee;
  margin-top: 0;
  color: #333;
  display: flex;
  justify-content: space-between;
}

.close-emoji {
  margin-block-start: 1em;
  margin-block-end: 1em;
  cursor: pointer;
}

.btn-container {
  display: flex;
  justify-content: space-between;
  padding-top: 15px;
  margin-top: 10px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition:
    background-color 0.2s,
    opacity 0.2s;
  font-size: 0.85rem;
}

.accept-btn {
  color: white;
  background-color: #28a745;
  border: 1px solid #28a745;
}

.accept-btn:hover {
  background-color: #218838;
}

.reject-btn {
  color: #dc3545;
  background-color: transparent;
  border: 1px solid #dc3545;
}

.reject-btn:hover {
  background-color: #f8d7da;
}

/* --- OWNER TRANSFER SECTION STYLES --- */

/* 1. Main Container */
.owner-transfer-section {
  /* Use flex for internal layout and alignment */
  display: flex;
  flex-direction: column;
  gap: 15px; /* Space between elements */
  padding: 20px;
  border: 1px solid #ffcc00; /* Yellow/Amber border for caution */
  border-radius: 8px;
  background-color: #fffacd; /* Lightest yellow background */
  max-width: 450px; /* Constrain the width for readability */
  margin: 20px auto; /* Center the element */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

/* 2. Warning Paragraph */
.transfer-warning {
  color: #a0522d; /* Brownish-orange text */
  font-weight: 500;
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.4;
}

/* 3. Selection Group (Label + Dropdown) */
.selection-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 5px;
}

.selection-group label {
  font-weight: bold;
  color: #333;
  font-size: 0.9rem;
}

/* 4. Dropdown Styling */
.owner-dropdown {
  padding: 10px 15px;
  border: 2px solid #ffc107; /* Brighter yellow border */
  border-radius: 6px;
  background-color: #fff;
  font-size: 1rem;
  color: #333;
  appearance: none; /* Remove default OS styling for a cleaner look */
  cursor: pointer;
  background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-down"><polyline points="6 9 12 15 18 9"></polyline></svg>');
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.owner-dropdown:focus {
  border-color: #ff9800; /* Darker focus border */
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.2);
}

/* 5. Transfer Button (Assuming you add this next to the select) */
.transfer-button {
  padding: 12px 20px;
  margin-top: 10px;
  background-color: #e53935; /* Red color for a destructive/critical action */
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.transfer-button:hover:not(:disabled) {
  background-color: #c62828;
}

.transfer-button:disabled {
  background-color: #ffad99; /* Lighter red when disabled (no owner selected) */
  cursor: not-allowed;
}

.text-project {
  margin: 0;
  padding: 30px;
}
</style>
