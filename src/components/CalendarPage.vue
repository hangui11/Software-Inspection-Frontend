<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
// Assuming these paths are correct in your project
import { userInformationStore } from '@/store/searchStore'
import {
  getUserProjectById,
  saveCalendarInformation,
  saveCalendarProjectInformation,
  changeUserCalendarReminded,
} from '@/lib/appwrite'

const props = defineProps({
  loadUserCalendar: {
    type: Function,
    required: true,
  },
  loadMessages: {
    type: Function,
    required: true,
  },
})

// --- Store & Data Fetching ---
const userInfoStore = userInformationStore()
const {
  projects: projects_stored,
  userid: userid_stored,
  user_calendar: user_calendar_stored,
} = storeToRefs(userInfoStore)

const projects_info_moderator = ref([])
const projects_info = ref([])
const selectedDate = ref(new Date())
const selectedProject = ref('')
const reminders = ref(user_calendar_stored)

onMounted(async () => {
  if (!projects_stored.value || projects_stored.value.length === 0) return

  const fetchPromises = projects_stored.value.map((project) =>
    getUserProjectById(project.$id, userid_stored.value).then((user_project_info) => ({
      user_project_info,
      project_name: project.project_name,
      project_id: project.$id,
    })),
  )

  const results = await Promise.all(fetchPromises)
  results.forEach((result) => {
    const { user_project_info, project_name, project_id } = result
    if (user_project_info.user_role === 'moderator') {
      projects_info_moderator.value.push({
        project_id: project_id,
        project_name: project_name,
      })
    }
    projects_info.value.push({
      project_id: project_id,
      project_name: project_name,
    })
  })
})

// --- Form State ---
const activeFormType = ref('event') // 'event', 'meeting', or null
const eventContent = ref('')
const range = ref({ start: new Date(), end: new Date() }) // For the custom input picker

// Time inputs
const startTime = ref('09:00')
const endTime = ref('10:00')

// --- Methods ---
const toggleForm = (type) => {
  activeFormType.value = type

  if (activeFormType.value === type) {
    selectedProject.value = ''
    eventContent.value = ''
    range.value = { start: new Date(), end: new Date() }
    startTime.value = '09:00'
    endTime.value = '10:00'
  }
}

const submitForm = async () => {
  if (!range.value.start || !range.value.end) {
    alert('Please select a valid date range.')
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const selectedStart = range.value.start
  const selectedStartPureDate = new Date(selectedStart)
  selectedStartPureDate.setHours(0, 0, 0, 0)
  if (selectedStartPureDate.getTime() < today.getTime()) {
    alert('📅 The start date cannot be a date in the past. Please select today or a future date.')
    return
  }

  if (selectedProject.value == '') {
    alert('Select a project name')
    return
  }

  if (endTime.value <= startTime.value) {
    alert('The end time cannot be before than the start time')
    return
  }

  const start_date = new Date(range.value.start)
  const end_date = new Date(range.value.end)
  if (activeFormType.value === 'event') {
    try {
      await saveCalendarInformation(
        userid_stored.value,
        selectedProject.value.project_id,
        start_date,
        end_date,
        startTime.value,
        endTime.value,
        eventContent.value,
        activeFormType.value,
      )
      await props.loadUserCalendar()
    } catch (error) {
      alert(error)
    }
  } else {
    try {
      await saveCalendarProjectInformation(
        selectedProject.value.project_id,
        start_date,
        end_date,
        startTime.value,
        endTime.value,
        eventContent.value,
        activeFormType.value,
      )
      await props.loadUserCalendar()
    } catch (error) {
      alert(error)
    }
  }
  toggleForm('event')
}

// --- Computed Properties ---
const filteredReminders = computed(() => {
  if (!selectedDate.value) return []

  const selectedDayStart = new Date(selectedDate.value)
  selectedDayStart.setHours(0, 0, 0, 0)

  const selectedDayEnd = new Date(selectedDayStart)
  selectedDayEnd.setDate(selectedDayStart.getDate() + 1) // Moves to the next day

  // Convert to timestamps for reliable comparison
  const selectedStartTimestamp = selectedDayStart.getTime()
  const selectedEndTimestamp = selectedDayEnd.getTime()

  return reminders.value.filter((reminder) => {
    // Ensure the dates properties exist before trying to access their time
    if (!reminder.dates || !reminder.dates.start || !reminder.dates.end) return false

    const eventStartTimestamp = new Date(reminder.dates.start).getTime()
    const eventEndTimestamp = new Date(reminder.dates.end).getTime()

    return eventEndTimestamp >= selectedStartTimestamp && eventStartTimestamp < selectedEndTimestamp
  })
})

const formattedSelectedDate = computed(() => {
  return selectedDate.value.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
})

const attributes = computed(() => {
  // 1. Process the dynamic events from the reminders array
  const reminderAttributes = reminders.value.map((event) => {
    // Define the base attribute object
    const attribute = {
      key: event.id,
      dates: event.dates,
    }

    // 🛑 FIX: Inject the custom class and CSS variable style at the root level
    //        only if the event requires a custom solid highlight.
    if (event.highlight) {
      attribute.highlight = {
        color: event.color,
        fillMode: 'solid',
      }
    } else if (event.dot) {
      attribute.dot = event.color
    }

    return attribute
  })

  // 4. Define the static "today" highlight attribute
  const todayAttribute = {
    key: 'today',
    dates: new Date(),
    // Use a less aggressive style (e.g., a dot or low-opacity highlight)
    // so it doesn't conflict with existing events.
    highlight: {
      color: 'blue',
      fillMode: 'light', // Use a subtle fill mode
    },
    // Optional: Ensure it's always placed in the background
    order: 10,
  }

  // 🛑 FIX: Combine the two arrays for the final result.
  // The computed property must return the final array of attributes.
  // console.log(reminderAttributes)
  return [...reminderAttributes, todayAttribute]
})

const changeReminderState = async (item) => {
  const reminderToUpdate = reminders.value.find((reminder) => reminder.id === item.id)

  if (reminderToUpdate) {
    reminderToUpdate.reminded = !reminderToUpdate.reminded
    console.log(`Status updated! New 'enabled' state: ${reminderToUpdate.reminded}`)
    await changeUserCalendarReminded(item.id, reminderToUpdate.reminded)
    await props.loadMessages(userid_stored.value)
  } else {
    console.error(`Reminder with ID ${item.id} not found.`)
  }
}
</script>

<template>
  <div class="dashboard-container">
    <div class="sidebar-container">
      <div class="button-sidebar">
        <div class="button-group">
          <div class="sidebar-item">
            <button
              class="action-button primary"
              :class="{ active: activeFormType === 'event' }"
              @click="toggleForm('event')"
            >
              Event
            </button>
          </div>

          <div class="sidebar-item">
            <button
              class="action-button secondary"
              :class="{ active: activeFormType === 'meeting' }"
              :disabled="projects_info_moderator.length <= 0"
              @click="toggleForm('meeting')"
            >
              Meeting
            </button>
          </div>
        </div>

        <div v-if="activeFormType" class="inline-form-container">
          <h3 class="form-title">
            New {{ activeFormType === 'event' ? 'Event' : 'Project Meeting' }}
          </h3>
          <select v-if="activeFormType != 'event'" v-model="selectedProject" required>
            <option value="" disabled>-- Select a Project Name --</option>

            <option
              v-for="project in projects_info_moderator"
              :key="project.project_id"
              :value="project"
            >
              {{ project.project_name }}
            </option>
          </select>

          <select v-else v-model="selectedProject" required>
            <option value="" disabled>-- Select a Project Name --</option>

            <option v-for="project in projects_info" :key="project.project_id" :value="project">
              {{ project.project_name }}
            </option>
          </select>

          <form @submit.prevent="submitForm" class="event-form">
            <label>Select Date Range:</label>

            <VDatePicker v-model="range" is-range>
              <template #default="{ inputValue, inputEvents }">
                <div class="custom-range-inputs">
                  <input
                    :value="inputValue.start"
                    v-on="inputEvents.start"
                    class="custom-input"
                    placeholder="Start Date"
                    readonly
                  />
                  <span class="arrow-icon">➝</span>
                  <input
                    :value="inputValue.end"
                    v-on="inputEvents.end"
                    class="custom-input"
                    placeholder="End Date"
                    readonly
                  />
                </div>
              </template>
            </VDatePicker>

            <div class="time-inputs">
              <div class="time-input-group">
                <label for="start-time">Start Time</label>
                <input type="time" id="start-time" v-model="startTime" required />
              </div>
              <div class="time-input-group">
                <label for="end-time">End Time</label>
                <input type="time" id="end-time" v-model="endTime" required />
              </div>
            </div>

            <label for="content">Description:</label>
            <textarea
              id="content"
              v-model="eventContent"
              required
              rows="3"
              placeholder="Details..."
            ></textarea>

            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="activeFormType = null">
                Cancel
              </button>
              <button type="submit" class="submit-btn">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="calendar-sidebar">
      <div class="calendar-picker-wrapper">
        <VDatePicker
          v-model="selectedDate"
          :attributes="attributes"
          is-inline
          hide-header
          :first-day-of-week="2"
        />
      </div>

      <hr class="separator" />

      <div class="reminders-section">
        <div class="reminders-header">
          <h3>Reminders</h3>
          <span class="bell-icon">🔔</span>
        </div>

        <div class="reminders-list">
          <div v-if="filteredReminders.length === 0" class="no-reminders">
            No reminders for {{ formattedSelectedDate }}.
          </div>

          <div v-for="item in filteredReminders" :key="item.id" class="reminder-item">
            <div class="reminder-icon-box" :style="{ backgroundColor: item.color }">
              {{ item.icon }}
            </div>
            <div class="reminder-details">
              <p class="reminder-title">{{ item.title }}</p>
              <span class="reminder-time">{{ item.start_time }} - {{ item.end_time }}</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" :checked="item.reminded" @click="changeReminderState(item)" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- MAIN LAYOUT --- */
.dashboard-container {
  display: flex;
  flex-direction: row; /* Puts Sidebar and Calendar side-by-side */
  gap: 20px;
  align-items: flex-start; /* Aligns top */
  width: 100%;
  max-width: 900px;
  margin: 50px auto;
}

/* --- LEFT COLUMN: Sidebar --- */
.sidebar-container {
  width: 400px; /* Fixed width for the form area */
  flex-shrink: 0;
}

.button-sidebar {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  background-color: #f7f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

/* BUTTONS PARALLEL (Side-by-Side) */
.button-group {
  display: flex;
  flex-direction: row; /* Horizontal alignment */
  gap: 10px;
  margin-bottom: 15px;
}

.sidebar-item {
  flex: 1; /* Each button takes equal width */
}

.action-button {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.primary {
  background-color: #096dd9;
  color: white;
}

.action-button.secondary {
  background-color: white;
  color: #096dd9;
  border: 1px solid #096dd9;
}

/* In your component's <style> block or main stylesheet */

.action-button.secondary:disabled {
  background-color: #ccc !important;
  color: #666 !important;
  cursor: not-allowed;
  box-shadow: none;
}

.action-button.active {
  /* x-offset | y-offset | blur | spread | color */
  box-shadow: 0 0 0 3px rgba(9, 109, 217, 0.5); /* A blue shadow/ring */
}

/* --- INLINE FORM --- */
.inline-form-container {
  padding: 15px;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  margin-bottom: 25px;
}

.form-title {
  font-size: 1rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 10px;
}

/* Custom Input Slot Styles */
.custom-range-inputs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  margin-bottom: 10px;
}

.custom-input {
  width: 45%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
  background: white;
  cursor: pointer;
}

.arrow-icon {
  color: #888;
  font-weight: bold;
}

/* Time Inputs */
.time-inputs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.time-input-group {
  flex: 1;
}

.event-form label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 4px;
}

input[type='time'],
textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.cancel-btn {
  padding: 6px 12px;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  padding: 6px 12px;
  background: #096dd9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* --- RIGHT COLUMN: Calendar --- */
.calendar-sidebar {
  flex-grow: 1; /* Takes remaining space */
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 500px;
}

/* V-CALENDAR STYLE OVERRIDES */

/* Layout Cleanups */
.calendar-picker-wrapper :deep(.vc-container) {
  border: none !important;
  width: 500px;
}
.calendar-picker-wrapper :deep(.vc-nav-header) {
  display: none !important;
}
.calendar-picker-wrapper :deep(.vc-header) {
  /* display: flex; */
  /* justify-content: flex-end; */
  /* margin-top: -30px; */
  padding: 0;
}

/* --- REMINDERS --- */
.separator {
  border: 0;
  border-top: 1px solid #eee;
  margin: 15px 0;
}

.reminders-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.reminders-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.reminder-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f9f9f9;
}

.reminder-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.reminder-details {
  flex-grow: 1;
}
.reminder-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}
.reminder-time {
  font-size: 0.8rem;
  color: #888;
}

/* Toggle */
.toggle-switch {
  position: relative;
  width: 34px;
  height: 20px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 34px;
  transition: 0.4s;
}
.slider:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}
input:checked + .slider {
  background-color: #096dd9;
}
input:checked + .slider:before {
  transform: translateX(14px);
}

/* --- Custom Selector Styles --- */

/* Base styling for the select element */
select {
  /* Box model */
  display: block;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 15px; /* Space below the selector */

  /* Appearance */
  border: 1px solid #ccc;
  border-radius: 6px;
  background-color: white;
  color: #333;
  font-size: 0.95rem;
  font-family: inherit; /* Inherit font from the body/container */
  line-height: 1.5;

  /* Remove default system arrow on modern browsers and add a custom arrow */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath fill='%23666' d='M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 14px;
}

/* Style when the selector is focused/active */
select:focus {
  border-color: #096dd9; /* Highlight color on focus */
  outline: none; /* Remove default focus outline */
  box-shadow: 0 0 0 3px rgba(9, 109, 217, 0.2); /* Soft blue shadow */
}

/* Style for the disabled placeholder option */
select option:disabled {
  color: #999;
  font-weight: 500;
  /* Make sure the placeholder is not selectable/clickable */
  cursor: not-allowed;
}

/* Style for the active project options */
select option {
  padding: 10px;
  color: #333;
  background-color: white;
}
</style>
