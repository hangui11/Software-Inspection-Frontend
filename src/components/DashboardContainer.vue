<script setup>
import { useRouter } from 'vue-router'
import { ref, onBeforeUnmount, onMounted, nextTick, watch } from 'vue'
import { useSearchStore, userInformationStore } from '@/store/searchStore'
import search from '@/assets/icons/search.png'
import signout from '@/assets/icons/signout.svg'
import lucky_coin from '@/assets/icons/lucky-coin.svg'
import calendar from '@/assets/icons/calendar.svg'
import message_icon from '@/assets/icons/message.svg'
import { logOut, readAllMessages, joinProject, updateInvitationStatus } from '@/lib/appwrite'
import { storeToRefs } from 'pinia'

const router = useRouter()
const searchStore = useSearchStore()
const userInfoStore = userInformationStore()
const hasNewMessage = ref(false)
const { calendar_messages: userCalendaMessages } = storeToRefs(userInfoStore)

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
  user_id: {
    type: String,
    required: true,
  },
  loadProjects: {
    type: Function,
    required: true,
  },
  invitationMessages: {
    type: Array,
    required: true,
  },
  requestMessages: {
    type: Array,
    required: true,
  },
})

const input = ref('')
const inputRef = ref(null)
const displayMessageBox = ref(false)

const dashboard = () => {
  window.location.href = '/dashboard'
}

const log_out = async () => {
  try {
    const session = await logOut()
    console.log(session)
    searchStore.clearSearch()
    userInfoStore.clearUserInfo()
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
const invitationMessagesContainer = ref(props.invitationMessages)
const requestMessagesContainer = ref(props.requestMessages)
const userCalendaMessagesContainer = ref(userCalendaMessages)

watch(
  userCalendaMessages,
  (newValue, oldValue) => {
    // This code runs every time userCalendaMessages changes
    console.log('🔔 Calendar Messages Updated!')

    // Optional: Log the new count or content for debugging
    console.log(`Old count: ${oldValue ? oldValue.length : 0}`)
    console.log(`New count: ${newValue ? newValue.length : 0}`)
    checkNewMessage()
  },
  { deep: true },
) // Optional: Use { deep: true } if the array contents change but the array reference doesn't.

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
  filterProjects()
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

const showMessageBox = async () => {
  hasNewMessage.value = false
  displayMessageBox.value = !displayMessageBox.value
  await readAllMessages(
    invitationMessagesContainer.value,
    requestMessagesContainer.value,
    userCalendaMessagesContainer.value,
  )
}

const checkNewMessage = () => {
  const unreadInvitationExists = invitationMessagesContainer.value.some((p) => !p.isRead)
  const unreadRequestExists = requestMessagesContainer.value.some((p) => !p.isRead)
  const unreadCalendarExists = userCalendaMessagesContainer.value.some((p) => !p.isRead)

  hasNewMessage.value = unreadInvitationExists || unreadRequestExists || unreadCalendarExists
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  try {
    // console.log(invitationMessagesContainer.value)
    // console.log(requestMessagesContainer.value)
    // console.log(userCalendaMessagesContainer.value)

    checkNewMessage()
  } catch (error) {
    console.log(error)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const acceptInvitation = async (invitation_id, project_id, role, invited_user_id) => {
  invitationMessagesContainer.value = invitationMessagesContainer.value.filter(
    (message) => message.invitation_id !== invitation_id,
  )
  await joinProject(project_id, invited_user_id, role)
  await updateInvitationStatus(invitation_id, 'accepted')
  await props.loadProjects()
}

const rejectInvitation = async (invitation_id) => {
  invitationMessagesContainer.value = invitationMessagesContainer.value.filter(
    (message) => message.invitation_id !== invitation_id,
  )
  await updateInvitationStatus(invitation_id, 'rejected')
}

const showCalendar = () => {
  router.push('/dashboard/calendar')
}
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

      <div class="icon-bar">
        <div class="message-icon-wrapper" @click="showMessageBox">
          <img class="icons" :src="message_icon" alt="Messages" />
          <span v-if="hasNewMessage" class="notification-badge"></span>
        </div>
        <div class="messagebox" v-if="displayMessageBox">
          <div class="messages-list-container">
            <div
              v-for="message in invitationMessagesContainer"
              :key="message.invitation_id"
              class="message-item invitation-item"
            >
              <p>
                User <strong>{{ message.inviter_user.name }}</strong> with email
                <span class="email">{{ message.inviter_user.email }}</span> invites you to join the
                project <strong>{{ message.project_name }}</strong
                >.
              </p>

              <div class="invitation-actions">
                <button
                  class="action-btn accept-btn"
                  @click="
                    acceptInvitation(
                      message.invitation_id,
                      message.project_id,
                      message.role,
                      props.user_id,
                    )
                  "
                >
                  ✔️ Accept
                </button>
                <button
                  class="action-btn reject-btn"
                  @click="rejectInvitation(message.invitation_id)"
                >
                  ❌ Reject
                </button>
              </div>
            </div>

            <div
              v-for="message in requestMessagesContainer"
              :key="message.request_id"
              class="message-item request-item"
              :class="{
                'status-exited': message.status === 'exited',
                'status-joined': message.status === 'joined',
                /* Add other status classes here if they should override the base request-item styles */
              }"
            >
              <p v-if="message.status == 'exited'">
                User <strong>{{ message.invited_user.name }}</strong> (<span class="email">{{
                  message.invited_user.email
                }}</span
                >) has left the project <strong>{{ message.project_name }}</strong
                >.
              </p>

              <p v-else-if="message.status == 'joined'">
                User <strong>{{ message.invited_user.name }}</strong> (<span class="email">{{
                  message.invited_user.email
                }}</span
                >) has successfully joined the project <strong>{{ message.project_name }}</strong
                >.
              </p>

              <p v-else>
                The invitation for user <strong>{{ message.invited_user.name }}</strong> (<span
                  class="email"
                  >{{ message.invited_user.email }}</span
                >) to join project <strong>{{ message.project_name }}</strong> is currently
                <strong
                  :class="{
                    'status-rejected': message.status === 'rejected',
                    'status-pending': message.status === 'pending',
                    'status-accepted': message.status === 'accepted',
                  }"
                >
                  {{ message.status }}
                </strong>
              </p>
            </div>

            <div
              v-for="message in userCalendaMessagesContainer"
              :key="message.id"
              class="message-item calendar-item"
            >
              <p class="calendar-text-message">
                🔔 Reminder: Your
                <strong class="event-type">{{ message.type }}</strong>
                for project
                <strong class="project-name">{{ message.project_name }}</strong>
                (Topic: {{ message.content }}) is scheduled on
                <span class="date-range"
                  >{{ message.start_date }}
                  <span v-if="message.start_date !== message.end_date">
                    to {{ message.end_date }}
                  </span>
                </span>
                from
                <span class="time-range">{{ message.start_time }} to {{ message.end_time }}</span
                >.
              </p>
            </div>
          </div>
        </div>
        <img class="icons" :src="calendar" @click="showCalendar" />
        <img class="signout-icon" :src="signout" @click="log_out" />
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

.icon-bar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.message-icon-wrapper {
  position: relative;
  height: 2.7rem;
  width: 2.7rem;
}

.icons {
  width: 2.7rem;
  cursor: pointer;
  /* If using 'gap' on the parent, REMOVE this margin: */
  margin-left: 1.5rem;
}

.message-icon-wrapper img {
  display: block;
}

.signout-icon {
  width: 2.7rem;
  cursor: pointer;
  margin-left: 3.5rem;
}

.notification-badge {
  position: absolute;
  top: 0px;
  right: -25px;
  width: 12px;
  height: 12px;
  background-color: #f70000;
  border-radius: 50%;
  border: 1.5px solid white;
}

.messagebox {
  position: fixed;
  width: 400px;
  height: 200px;
  border: solid 2px #ccc;
  top: 70px;
  right: 235px;
  z-index: 1000;
  background-color: white;
  border-radius: 10px;
  overflow-y: auto;
}

/* Container for all messages (if you wrap the v-for loops) */
.messages-list-container {
  padding: 10px;
  /* Assumes .messagebox already has overflow-y: auto for scrolling */
}

/* Style for individual invitation and request blocks */
.message-item {
  background-color: #f7f7f7; /* Light background for separation */
  border: 1px solid #eee;
  padding: 10px 12px;
  margin-bottom: 10px; /* Space between messages */
  border-radius: 6px;
  font-size: 0.95rem;
  line-height: 1.4;
  word-wrap: break-word; /* Ensure long emails wrap */
}

.message-item p {
  margin: 0; /* Remove default paragraph margin */
  color: #333; /* Dark text color */
  font-size: small;
}

/* Highlight the key user and project names */
.message-item p strong {
  font-weight: 600;
  color: #007bff; /* Use primary color for main subjects */
}

/* Style for emails (often slightly muted) */
.message-item p span.email {
  font-size: 0.9em;
  color: #6c757d;
}

.request-item {
  /* Base style for the request item (e.g., pending invitations) */
  border-left: 5px solid #ffc107; /* Yellow/Orange bar */
  background-color: #fff9e6; /* Very light yellow background */
}
.request-item.status-exited {
  background-color: #fcebeb; /* Light Red Override */
  border-left: 5px solid #dc3545; /* Red accent Override */
}

/* Ensure the text inside also gets the red color treatment */
.request-item.status-exited p strong {
  color: #dc3545;
}

.request-item.status-joined {
  background-color: #e9fbe9; /* Light Green Override */
  border-left: 5px solid #28a745; /* Green accent Override */
}

/* Ensure the text inside also gets the green color treatment */
.request-item.status-joined p strong {
  color: #28a745;
}

/* Common badge styling */
.message-item strong.status-accepted,
.message-item strong.status-rejected,
.message-item strong.status-pending {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 700;
  text-transform: uppercase;
}

/* --- Green for Success/Acceptance --- */
.message-item strong.status-accepted {
  color: #155724;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

/* --- Red for Rejection/Failure --- */
.message-item strong.status-rejected {
  color: #721c24;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

/* --- Yellow/Orange for Pending/Warning --- */
.message-item strong.status-pending {
  color: #856404; /* Dark yellow/brown text */
  background-color: #fff3cd; /* Light yellow background */
  border: 1px solid #ffeeba;
}

/* Style for pending invitations (Action Required by current user) */
.invitation-item {
  border-left: 5px solid #28a745; /* Green bar for a positive/actionable item */
  background-color: #e6ffed; /* Very light green background */
}

.invitation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

/* --- CALENDAR ITEM STYLING (TEXT-FOCUSED) --- */

.message-item.calendar-item {
  /* Basic container styling */
  background-color: #f7f9fc;
  border-left: 5px solid #007bff;
  padding: 10px 15px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.calendar-text-message {
  /* Base font size and line height */
  margin: 0;
  font-size: 0.95em;
  line-height: 1.5;
}

.calendar-text-message strong {
  font-weight: 700;
}

/* Specific text styling for quick scanning */
.event-type {
  color: #007bff; /* Primary color for event type */
  text-transform: capitalize;
}

.project-name {
  color: #333;
}

.date-range,
.time-range {
  font-weight: 600;
  color: #555; /* Slightly darker color for date/time */
}

/* Optional: Improve the visual look of the bold reminder icon/text */
.calendar-text-message > strong:first-child {
  color: #e6a23c; /* A warning color for the 'Reminder' tag */
  margin-right: 5px;
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
