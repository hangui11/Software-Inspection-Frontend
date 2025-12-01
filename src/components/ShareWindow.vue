<script setup>
import { ref, computed, onMounted } from 'vue'
import { getUserEmail } from '@/lib/appwrite'
import user_icon from '@/assets/icons/user.svg'
import { getProjectAllUsers } from '@/lib/appwrite'
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
})

// --- State for Invitation Form ---
const newInvite = ref({
  email: '',
  role: 'reviewer', // Default role
})

// List of users staged to be invited
const inviteList = ref([
  // Example structure:
  // { email: 'user1@example.com', role: 'editor', pending: true }
])

const projectUsers = ref([])

// Available roles for assignment
const availableRoles = [
  { id: 'reviewer', name: 'Reviewer (Modify Content)' },
  { id: 'moderator', name: 'Moderator (Organize Meetings)' },
]

const user_email = ref('')

onMounted(async () => {
  user_email.value = await getUserEmail(props.userId)
  projectUsers.value = await getProjectAllUsers(props.projectId)
})

// --- Computed & Validation ---

// Checks if the current input is valid to be added to the invite list
const isNewInviteValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const email = newInvite.value.email.trim()

  // 1. Check basic email format
  if (!emailRegex.test(email)) return false

  // 2. Check if the email is already staged
  if (inviteList.value.some((user) => user.email === email)) return false

  return true
})

// --- Methods ---

const addInvite = () => {
  if (!isNewInviteValid.value) return

  if (newInvite.value.email == user_email.value) {
    alert('Do not enter the current user email address')
    return
  }
  // Add the new user to the list
  inviteList.value.push({
    ...newInvite.value,
    pending: true, // Status: Invitation staged
  })

  // Reset the form inputs
  newInvite.value.email = ''
  newInvite.value.role = 'reviewer'
}

const removeInvite = (emailToRemove) => {
  inviteList.value = inviteList.value.filter((invite) => invite.email !== emailToRemove)
}

const sendInvitations = async () => {
  if (inviteList.value.length === 0) {
    alert('Please add at least one user to invite.')
    return
  }

  // 🔑 Placeholder for Appwrite or API call to send invitations
  console.log('Sending invitations for Project ID:', props.projectId)
  console.log('Inviting users:', inviteList.value)

  // Simulating API call success
  alert(`Sent ${inviteList.value.length} invitations successfully!`)

  // Clear the list after sending
  inviteList.value = []

  // You would typically emit an event here to close the modal:
  // emit('close')
}
</script>

<template>
  <div class="share-container">
    <h3 class="modal-title">Share Project</h3>

    <div class="invite-form-box">
      <p class="form-label">Email Address:</p>
      <div class="input-group">
        <input
          v-model="newInvite.email"
          placeholder="user@example.com"
          type="email"
          class="email-input"
        />

        <select v-model="newInvite.role" class="role-select">
          <option v-for="role in availableRoles" :key="role.id" :value="role.id">
            {{ role.name }}
          </option>
        </select>

        <button
          @click="addInvite"
          :disabled="!isNewInviteValid"
          class="add-btn"
          :class="{ disabled: !isNewInviteValid }"
        >
          Add
        </button>
      </div>
    </div>

    <div v-if="inviteList.length" class="invite-list-container">
      <h4>Invite List ({{ inviteList.length }} users)</h4>
      <ul class="invite-list">
        <li v-for="user in inviteList" :key="user.email" class="invite-item">
          <span class="invite-email">{{ user.email }}</span>
          <span class="invite-role">{{
            user.role.charAt(0).toUpperCase() + user.role.slice(1)
          }}</span>
          <button @click="removeInvite(user.email)" class="remove-btn">&times;</button>
        </li>
      </ul>
    </div>

    <p v-else class="empty-list-message">No users staged for invitation.</p>

    <div class="modal-invite">
      <button
        @click="sendInvitations"
        :disabled="inviteList.length === 0"
        class="invite-all-btn"
        :class="{ disabled: inviteList.length === 0 }"
      >
        Send {{ inviteList.length || '' }} Invitations
      </button>
    </div>

    <ul class="modal-users-list">
      <li v-for="user in projectUsers" :key="user.id" class="user-item">
        <!-- 1. User Icon (Left Side) -->
        <img :src="user_icon" alt="User Avatar" class="user-avatar" />

        <!-- 2. User Email (Main Content Area) -->
        <div class="user-email">{{ user.email }}</div>

        <!-- 3. Role Selector (Editable Area) -->
        <div class="user-role-control">
          <!-- 🔑 Use a <select> element bound to the user's role -->
          <!-- Assume 'availableRoles' is defined in your script -->
          <select
            v-if="user.role != 'owner'"
            v-model="user.role"
            @change="$emit('update-user-role', user.id, user.role)"
            class="role-select"
          >
            <option value="reviewer">Reviewer</option>
            <option value="moderator">Moderator</option>
          </select>

          <!-- Display "Owner" text if the user is the project owner -->
          <span v-else class="owner-tag">Owner</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.share-container {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);

  /* max-width: 90vw; */
  font-family: Arial, sans-serif;
}

.modal-title {
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-top: 0;
  color: #333;
}

/* --- Form Box --- */
.invite-form-box {
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.email-input {
  flex-grow: 2;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.role-select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  flex-grow: 1;
}

.add-btn {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-btn:hover:not(.disabled) {
  background-color: #0056b3;
}

.disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* --- Invite List --- */
.invite-list-container h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 1em;
  color: #555;
}

.invite-list {
  list-style: none;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.invite-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.invite-item:last-child {
  border-bottom: none;
}

.invite-email {
  font-size: medium;
  font-weight: 500;
  flex-grow: 1;
}

.invite-role {
  font-style: italic;
  font-size: 0.9em;
  color: #888;
  margin-right: 15px;
}

.remove-btn {
  background: none;
  border: none;
  color: red;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.2em;
}

/* --- Footer and Send Button --- */
.modal-invite {
  text-align: right;
  padding-top: 15px;
  margin-top: 20px;
}

.invite-all-btn {
  padding: 10px 20px;
  background-color: #28a745; /* Green color */
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.invite-all-btn:hover:not(.disabled) {
  background-color: #1e7e34;
}

.modal-users-list {
  list-style: none;
  padding: 0;
  margin: 15px 0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden; /* Ensures borders/shadows are clean */
  max-height: 300px;
  overflow-y: auto;
}

.user-item {
  /* Use Flexbox for horizontal layout */
  display: flex;
  align-items: center;

  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
  background-color: white;
  transition: background-color 0.15s ease-in-out;
}

.user-item:hover {
  background-color: #fafafa;
}

.user-item:last-child {
  border-bottom: none;
}

/* --- Avatar/Icon Styling --- */
.user-avatar {
  width: 24px;
  height: 24px;
  margin-right: 15px;
  border-radius: 50%; /* Make it circular */
  object-fit: cover;
  flex-shrink: 0; /* Prevents icon from shrinking */
}

/* --- Email (Main Content) Styling --- */
.user-email {
  flex-grow: 1; /* Allows email to take up all available space */
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Role Control Styling (The Editable Part) --- */
.user-role-control {
  flex-shrink: 0; /* Ensures role control stays on the right */
  margin-left: 15px;
}

.role-select {
  /* Style the <select> to look like a button or tag */
  appearance: none; /* Hide default dropdown arrow */
  -webkit-appearance: none;
  -moz-appearance: none;

  padding: 6px 10px;
  padding-right: 25px; /* Add space for a custom arrow/icon if needed */
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f7f7f7;
  font-size: 0.85em;
  font-weight: 600;
  color: #007bff; /* Highlight the editable role */
  cursor: pointer;
  transition: border-color 0.2s;

  /* Optional: Add a custom dropdown arrow (using background image or SVG) */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
}

.role-select:focus {
  border-color: #007bff;
  outline: none;
}

.owner-tag {
  /* Style for the non-editable owner tag */
  padding: 6px 10px;
  border: 1px solid #28a745;
  border-radius: 4px;
  background-color: #e6ffed;
  color: #28a745;
  font-size: 0.85em;
  font-weight: 600;
}
</style>
