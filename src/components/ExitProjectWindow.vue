<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getUserEmail } from '@/lib/appwrite'
import user_icon from '@/assets/icons/user.svg'
import { getProjectAllUsers, updateUserRoles, sendUserInvitations } from '@/lib/appwrite'
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
})

const current_user_role = ref('')

const projectUsers = ref([])

const user_email = ref('')

onMounted(async () => {
  user_email.value = await getUserEmail(props.userId)
  projectUsers.value = await getProjectAllUsers(props.projectId)
  current_user_role.value = projectUsers.value.find((p) => p.id === props.userId).role
  console.log(current_user_role.value)
})

onUnmounted(async () => {
  await updateUserRoles(props.projectId, projectUsers.value)
  // console.log(projectUsers.value)
})

// --- Methods ---

const closeWindow = () => {
  console.log('Closed')
  emit('close')
}
</script>

<template>
  <div class="exit-container">
    <div class="header-container">
      <h3>Exit Project</h3>
      <div class="close-emoji" @click="closeWindow">❌</div>
    </div>

    <p>Are you sure to exit the project?</p>
    <div v-if="current_user_role != 'owner'"></div>

    <div class="btn-container">
      <button class="close-btn" @click="closeWindow">Close</button>
    </div>
  </div>
</template>

<style scoped>
.exit-container {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);

  /* max-width: 90vw; */
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

.close-container {
  text-align: right;
  padding-top: 15px;
  margin-top: 10px;
}

.close-btn {
  padding: 10px 20px;
  background-color: rgba(158, 156, 156, 1);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.close-btn:hover {
  background-color: rgba(158, 156, 156, 0.5);
}
</style>
