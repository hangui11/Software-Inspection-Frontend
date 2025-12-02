<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted, computed, onBeforeUnmount, onUnmounted } from 'vue' // Added computed, onBeforeUnmount
import { storeToRefs } from 'pinia'
import { userInformationStore } from '@/store/searchStore'
import share_icon from '@/assets/icons/share.png'
import ShareWindow from './ShareWindow.vue'
// --- ROUTER PARAMS & INITIAL DATA FETCH ---

const props = defineProps({
  loadProjects: {
    type: Function, // If it's a function
    required: false,
    // Add default value if not required
  },
})

const route = useRoute()
const userInfoStore = userInformationStore()

const projectId = ref(null)
const {
  recent_projects: recent_projects_stored,
  projects: projects_stored,
  avatar: avatar_stored,
  username: username_stored,
  userid: user_id_stored,
} = storeToRefs(userInfoStore)

const current_project = ref('')
const copyStatus = ref('initial')

const isModalOpen = ref(false)

const showShareWindow = () => {
  isModalOpen.value = true
  console.log('Modal state updated to:', isModalOpen.value)
}

onMounted(() => {
  const idFromRoute = route.params.project_id
  console.log(idFromRoute)

  if (idFromRoute) {
    projectId.value = idFromRoute

    // 🔑 FIX: Use .find() to return the single project object
    current_project.value = projects_stored.value.find((p) => p.$id === projectId.value)

    // Check if the project was actually found for debugging
    if (!current_project.value) {
      console.error('Project not found with ID:', projectId.value)
    }
  }
})

onUnmounted(() => {})

// 🔑 Computed property for the text on the button/tooltip
const copyMessage = computed(() => {
  if (copyStatus.value === 'copied') return 'Copied!'
  if (copyStatus.value === 'failed') return 'Failed to copy.'
  return 'Click to copy Project ID'
})

// 🔑 NEW FUNCTION: Copies text to the clipboard
const copyIdToClipboard = async () => {
  if (!projectId.value) return

  try {
    await navigator.clipboard.writeText(projectId.value)
    copyStatus.value = 'copied'

    // Reset status after a delay
    setTimeout(() => {
      copyStatus.value = 'initial'
    }, 2500) // Slightly longer visibility
  } catch (err) {
    console.error('Failed to copy text: ', err)
    copyStatus.value = 'failed'
    setTimeout(() => {
      copyStatus.value = 'initial'
    }, 2500)
  }
}

// --- STATE (Data) ---

// --- LAYOUT STATE ---
const isDraggingX = ref(false)
const isDraggingY = ref(false)
const leftWidth = ref(40)
const topHeight = ref(50)

// --- SIDEBAR DATA (Products) ---
const products = ref([{ id: 101, name: 'Example_No_File', type: 'none', content: null }])
const activeProductId = ref(101)

// --- BOTTOM VIEW (TABS) ---
const checklistTabs = ref([
  {
    id: 1,
    name: 'Daily Setup',
    isShared: true,
    items: [{ text: 'Check Power', done: false }],
  },
])
const activeTabId = ref(1)
const newChecklistInput = ref('')

// --- POPUP & TABLES ---
const showAddPopup = ref(false)
const newDefect = ref({ no: '', desc: '', type: 'Major' })
const engineers = ref([
  { name: 'DB', major: 7, minor: 3, size: 360, time: 65, rate: 266, yield: 56.3 },
  { name: 'BP', major: 9, minor: 2, size: 380, time: 97, rate: 235, yield: 75.0 },
  { name: 'PA', major: 5, minor: 4, size: 380, time: 68, rate: 335, yield: 41.7 },
])
const defects = ref([
  { no: '1', desc: 'Scratch on Surface', maj: 1, min: '', db: 1, bp: '', pa: '' },
])

// --- COMPUTED PROPERTIES ---

// Get the full object of the currently selected product
const currentProduct = computed(() => {
  return products.value.find((p) => p.id === activeProductId.value)
})

// Helper for Tabs
const currentTabObj = computed(() => {
  return checklistTabs.value.find((t) => t.id === activeTabId.value)
})

// Math for Tables
const defectTotals = computed(() => {
  const keys = ['maj', 'min', 'db', 'bp', 'pa']
  const totals = {}
  keys.forEach((key) => {
    // Access defects array using .value
    totals[key] = defects.value.reduce((s, i) => s + (Number(i[key]) || 0), 0)
  })
  return totals
})

const defectUniques = computed(() => {
  const keys = ['maj', 'min', 'db', 'bp', 'pa']
  const uniques = {}
  keys.forEach((key) => {
    // Access defects array using .value
    const v = defects.value.map((i) => Number(i[key])).filter((x) => x !== 0 && !isNaN(x))
    uniques[key] = new Set(v).size
  })
  return uniques
})

// --- METHODS (Functions) ---

// --- FILE UPLOAD & VIEWING LOGIC ---
const fileInput = ref(null)

const triggerUpload = () => {
  // 3. Access the HTML element using .value and call its native .click() method
  if (fileInput.value) {
    fileInput.value.click()
    console.log('File upload dialog triggered.')
  } else {
    console.error('Error: fileInput reference is not bound to an element.')
  }
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const newProduct = {
    id: Date.now(),
    name: file.name,
    type: 'unknown',
    content: null, // Will hold URL for PDF or String for Text
  }

  // 1. Handle PDF
  if (file.type === 'application/pdf') {
    newProduct.type = 'pdf'
    newProduct.content = URL.createObjectURL(file)
    finishUpload(newProduct)
  }
  // 2. Handle Text (txt, json, js, css, etc)
  else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
    newProduct.type = 'text'
    const reader = new FileReader()
    reader.onload = (e) => {
      newProduct.content = e.target.result // The actual text string
      finishUpload(newProduct)
    }
    reader.readAsText(file)
  }
  // 3. Fallback
  else {
    newProduct.type = 'unsupported'
    finishUpload(newProduct)
  }

  event.target.value = '' // Reset input
}

const finishUpload = (product) => {
  products.value.push(product) // Use .value for mutation
  activeProductId.value = product.id // Use .value for assignment
}

const selectProduct = (id) => {
  activeProductId.value = id
}

// --- TABS LOGIC ---
const setActiveTab = (id) => {
  activeTabId.value = id
}

const addNewTab = () => {
  const name = prompt('Name:')
  if (name) {
    const id = Date.now()
    checklistTabs.value.push({ id, name, isShared: false, items: [] })
    activeTabId.value = id
  }
}

const deleteCurrentTab = () => {
  if (confirm('Delete list?')) {
    const idx = checklistTabs.value.findIndex((t) => t.id === activeTabId.value)
    checklistTabs.value.splice(idx, 1)
    activeTabId.value = checklistTabs.value.length ? checklistTabs.value[0].id : null
  }
}

const addChecklistItem = () => {
  if (newChecklistInput.value.trim()) {
    // currentTabObj is a computed property, use its value to mutate the array item
    currentTabObj.value.items.push({ text: newChecklistInput.value, done: false })
    newChecklistInput.value = ''
  }
}

const removeChecklistItem = (i) => {
  currentTabObj.value.items.splice(i, 1)
}

// --- DRAG LOGIC ---
const startDragX = () => {
  isDraggingX.value = true
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}
const startDragY = () => {
  isDraggingY.value = true
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

// NOTE: onDrag uses this.$refs, which requires a template ref setup.
// Assuming splitContainer is a ref defined as: const splitContainer = ref(null)
// For this script, we'll keep the logic but remember you need to attach ref="splitContainer" in the template.
const splitContainer = ref(null) // Define the template ref

const onDrag = (e) => {
  if (isDraggingX.value) {
    const rect = splitContainer.value.getBoundingClientRect() // Use .value
    let p = ((e.clientX - rect.left) / rect.width) * 100
    if (p > 15 && p < 85) leftWidth.value = p
  }
  if (isDraggingY.value) {
    const rect = splitContainer.value.getBoundingClientRect() // Use .value
    let p = ((e.clientY - rect.top) / rect.height) * 100
    if (p > 10 && p < 90) topHeight.value = p
  }
}

const stopDrag = () => {
  isDraggingX.value = false
  isDraggingY.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

// 🔑 Cleanup event listeners when the component unmounts
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})

// --- TABLE LOGIC ---
const addDefect = () => {
  const m = newDefect.value.type === 'Major' // Use .value
  defects.value.push({
    // Use .value
    no: newDefect.value.no,
    desc: newDefect.value.desc,
    maj: m ? 1 : '',
    min: !m ? 1 : '',
    db: '',
    bp: '',
    pa: '',
  })
  showAddPopup.value = false
  newDefect.value = { no: '', desc: '', type: 'Major' } // Use .value
}

// 🔑 EXPOSE all reactive properties and functions for the template
// With <script setup>, this step is automatic!
</script>

<template>
  <div v-if="isModalOpen" class="share-modal" @click.self="isModalOpen = false">
    <div>
      <ShareWindow :projectId="projectId" :userId="user_id_stored" @close="isModalOpen = false" />
    </div>
  </div>

  <div class="app-container">
    <aside class="sidebar">
      <div class="header-container">
        <h3>{{ current_project?.project_name }}</h3>

        <div
          v-if="projectId"
          class="project-id-display"
          @click="copyIdToClipboard"
          :title="copyMessage"
        >
          <template v-if="copyStatus === 'copied'">
            <svg
              class="copy-icon"
              style="color: #52c41a"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </template>
          <template v-else>
            <svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path
                d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
              />
            </svg>
          </template>
        </div>

        <span v-if="copyStatus !== 'initial'" class="copy-feedback">
          {{ copyStatus === 'copied' ? 'ID Copied!' : 'Copy Error' }}
        </span>
      </div>
      <div class="sidebar-header"><h3>Files</h3></div>
      <div class="upload-section">
        <input
          type="file"
          ref="fileInput"
          @change="handleFileUpload"
          style="display: none"
          accept=".pdf, .txt, text/plain"
        />
        <button class="upload-btn" @click="triggerUpload">
          <span class="icon">☁️</span> Upload File
        </button>
      </div>
      <div class="product-list">
        <ul>
          <li
            v-for="p in products"
            :key="p.id"
            :class="{ active: activeProductId === p.id }"
            @click="selectProduct(p.id)"
          >
            <span class="file-icon">{{
              p.type === 'pdf' ? '📕' : p.type === 'text' ? '📝' : '📄'
            }}</span>
            {{ p.name }}
          </li>
        </ul>
      </div>

      <div class="share-component" @click="showShareWindow">
        <h3 class="share-text-label">Share</h3>
        <img class="share-icon" :src="share_icon" alt="Share Icon" width="30" height="30" />
      </div>
    </aside>

    <div
      class="split-layout"
      ref="splitContainer"
      :class="{ noselect: isDraggingX || isDraggingY }"
    >
      <div class="middle-pane" :style="{ width: leftWidth + '%' }">
        <div class="top-box" :style="{ height: topHeight + '%' }">
          <div v-if="currentProduct && currentProduct.type === 'pdf'" class="file-viewer-container">
            <iframe :src="currentProduct.content" class="pdf-frame"></iframe>
          </div>

          <div
            v-else-if="currentProduct && currentProduct.type === 'text'"
            class="file-viewer-container text-viewer"
          >
            <pre><code>{{ currentProduct.content }}</code></pre>
          </div>

          <div v-else class="empty-file-state">
            <div v-if="currentProduct && currentProduct.type === 'unsupported'">
              File format not supported for preview.
            </div>
            <div v-else>Select a .txt or .pdf file to view content.</div>
          </div>
        </div>

        <div class="resizer-horizontal" @mousedown.prevent="startDragY">
          <div class="handle-icon">···</div>
        </div>

        <div class="bottom-box" :style="{ height: 100 - topHeight + '%' }">
          <div class="tabs-header">
            <div
              v-for="tab in checklistTabs"
              :key="tab.id"
              class="tab-item"
              :class="{ active: activeTabId === tab.id }"
              @click="setActiveTab(tab.id)"
            >
              {{ tab.name }} <span v-if="tab.isShared" class="shared-icon">👥</span>
            </div>
            <button class="add-tab-btn" @click="addNewTab">+</button>
          </div>
          <div class="tab-content" v-if="currentTabObj">
            <div class="list-controls">
              <label class="share-toggle"
                ><input type="checkbox" v-model="currentTabObj.isShared" /> Share Team</label
              >
              <button class="delete-list-btn" @click="deleteCurrentTab">Delete</button>
            </div>
            <div class="checklist-items">
              <div v-for="(item, idx) in currentTabObj.items" :key="idx" class="check-item">
                <input type="checkbox" v-model="item.done" />
                <span :class="{ strikethrough: item.done }">{{ item.text }}</span>
                <button class="delete-item-btn" @click="removeChecklistItem(idx)">×</button>
              </div>
            </div>
            <div class="add-item-box">
              <input
                v-model="newChecklistInput"
                @keyup.enter="addChecklistItem"
                placeholder="New reminder..."
              />
              <button @click="addChecklistItem">Add</button>
            </div>
          </div>
        </div>
      </div>

      <div class="resizer-vertical" @mousedown.prevent="startDragX"></div>

      <div class="right-pane" :style="{ width: 100 - leftWidth + '%' }">
        <div class="ins-panel">
          <h2 class="panel-title">Engineer Data</h2>
          <table class="styled-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Major</th>
                <th>Minor</th>
                <th>Size</th>
                <th>Time</th>
                <th>Rate</th>
                <th>Yield</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in engineers" :key="i">
                <td>{{ e.name }}</td>
                <td>{{ e.major }}</td>
                <td>{{ e.minor }}</td>
                <td>{{ e.size }}</td>
                <td>{{ e.time }}</td>
                <td>{{ e.rate }}</td>
                <td>{{ e.yield }}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="defect-panel">
          <h2 class="panel-title">Defect List</h2>
          <table class="styled-table">
            <thead>
              <tr>
                <th class="col-xs">No.</th>
                <th class="col-xl">Desc</th>
                <th>Maj</th>
                <th>Min</th>
                <th>DB</th>
                <th>BP</th>
                <th>PA</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in defects" :key="i">
                <td class="text-center">{{ d.no }}</td>
                <td>{{ d.desc }}</td>
                <td class="text-center bg-light">{{ d.maj }}</td>
                <td class="text-center bg-light">{{ d.min }}</td>
                <td class="text-center">{{ d.db }}</td>
                <td class="text-center">{{ d.bp }}</td>
                <td class="text-center">{{ d.pa }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="summary-row total-row">
                <td colspan="2" class="text-right label-cell">Total</td>
                <td class="text-center">{{ defectTotals.maj }}</td>
                <td class="text-center">{{ defectTotals.min }}</td>
                <td class="text-center">{{ defectTotals.db }}</td>
                <td class="text-center">{{ defectTotals.bp }}</td>
                <td class="text-center">{{ defectTotals.pa }}</td>
              </tr>
              <tr class="summary-row unique-row">
                <td colspan="2" class="text-right label-cell">Unique</td>
                <td class="text-center">{{ defectUniques.maj }}</td>
                <td class="text-center">{{ defectUniques.min }}</td>
                <td class="text-center">{{ defectUniques.db }}</td>
                <td class="text-center">{{ defectUniques.bp }}</td>
                <td class="text-center">{{ defectUniques.pa }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button class="add-defect-btn" @click="showAddPopup = true">+ Add Defect</button>

        <div v-if="showAddPopup" class="popup-overlay">
          <div class="popup">
            <h3>Add New Defect</h3>
            <div class="form-group">
              <label>No.</label><input v-model="newDefect.no" class="input-field" />
            </div>
            <div class="form-group">
              <label>Description</label><input v-model="newDefect.desc" class="input-field" />
            </div>
            <div class="form-group radio-group">
              <label>Severity:</label>
              <label class="radio-option"
                ><input type="radio" value="Major" v-model="newDefect.type" /> Major</label
              >
              <label class="radio-option"
                ><input type="radio" value="Minor" v-model="newDefect.type" /> Minor</label
              >
            </div>
            <div class="popup-buttons">
              <button @click="addDefect" class="add-btn">Save</button>
              <button @click="showAddPopup = false" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-modal {
  height: 100%;
  width: 100%;
  position: fixed;
  display: flex;
  z-index: 9999;
  top: 0;
  left: 0;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6);
}

.header-container {
  margin: 0% 3%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px; /* Increase spacing */
  margin-bottom: 20px;
}

/* The clickable ID block container */
.project-id-display {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background-color: #f7f7f7; /* Very light gray background */
  border: 1px solid #ddd; /* Subtle border */
  border-radius: 8px; /* Softer rounded corners */
  font-family: monospace;
  font-size: 0.85em;
  color: #555;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

/* Hover effect */
.project-id-display:hover {
  background-color: #eee;
  border-color: #bbb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* Soft shadow on hover */
}

/* Text display */
.project-id-text {
  margin-right: 10px;
}

/* Icon styling */
.copy-icon {
  width: 16px;
  height: 16px;
  color: #777; /* Default subtle color */
  transition: color 0.2s;
}

/* Icon color change on hover */
.project-id-display:hover .copy-icon {
  color: #4a90e2; /* Bright blue on hover */
}

/* 🟢 Feedback styling */
.copy-feedback {
  background-color: #e6f7ff; /* Light blue background */
  color: #096dd9; /* Darker blue text */
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: bold;
  margin-left: 10px;
  font-size: 10px;
}
/* --- APP GLOBAL --- */
.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
}

/* --- SIDEBAR --- */
.sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #1a252f;
  flex-shrink: 0;
}
.sidebar-header {
  padding: 20px;
  background-color: #1a252f;
  text-align: center;
}
.sidebar-header h3 {
  margin: 0;
}
.upload-section {
  padding: 20px;
  border-bottom: 1px solid #34495e;
}
.upload-btn {
  width: 100%;
  padding: 10px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  gap: 8px;
}
.product-list {
  /* flex: 1; */
  padding: 20px 0;
  overflow-y: auto;
}
.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar li {
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  border-left: 4px solid transparent;
}
.sidebar li:hover {
  background-color: #34495e;
}
.sidebar li.active {
  background-color: #34495e;
  border-left-color: #3498db;
  font-weight: bold;
}

.share-component {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgb(9, 109, 217);
  /* border-radius: 6px; */
  cursor: pointer;
}

.share-component:hover {
  background-color: rgba(9, 109, 217, 0.5);
}

.share-component .share-text-label {
  margin: 0;
  font-weight: 600;
  line-height: 1;
}

.share-icon {
  filter: brightness(0) invert(1);
}

/* --- LAYOUT PANES --- */
.split-layout {
  flex-grow: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}
.middle-pane {
  display: flex;
  flex-direction: column;
  background-color: #f8f8f8;
  overflow: hidden;
}
.right-pane {
  background-color: #fff;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.noselect {
  user-select: none;
  cursor: grabbing;
}

/* --- TOP BOX (FILE VIEWER) --- */
.top-box {
  background-color: #e9ecef;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.file-viewer-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
}
.text-viewer {
  padding: 20px;
  overflow: auto;
  background-color: white;
}
.text-viewer pre {
  margin: 0;
  font-family: Consolas, monospace;
  white-space: pre-wrap;
  font-size: 0.9rem;
  color: #333;
}
.empty-file-state {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #888;
  font-style: italic;
}

/* --- RESIZERS --- */
.resizer-vertical {
  width: 6px;
  background-color: #ccc;
  cursor: col-resize;
  z-index: 10;
  border-left: 1px solid #bbb;
  border-right: 1px solid #bbb;
}
.resizer-horizontal {
  height: 6px;
  background-color: #ccc;
  cursor: row-resize;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  border-top: 1px solid #bbb;
  border-bottom: 1px solid #bbb;
}

/* --- BOTTOM BOX (TABS) --- */
.bottom-box {
  background-color: #fcfcfc;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.tabs-header {
  display: flex;
  background-color: #e0e0e0;
  border-bottom: 1px solid #ccc;
  padding-left: 5px;
  flex-shrink: 0;
}
.tab-item {
  padding: 8px 16px;
  cursor: pointer;
  background-color: #e0e0e0;
  border-right: 1px solid #d0d0d0;
  font-size: 0.9rem;
  display: flex;
  gap: 5px;
}
.tab-item:hover {
  background-color: #d6d6d6;
}
.tab-item.active {
  background-color: #fcfcfc;
  font-weight: bold;
  border-bottom: 2px solid transparent;
}
.add-tab-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 15px;
}
.tab-content {
  padding: 15px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}
.delete-list-btn {
  background-color: transparent;
  color: #dc3545;
  border: 1px solid #dc3545;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}
.checklist-items {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
}
.strikethrough {
  text-decoration: line-through;
  color: #999;
}
.delete-item-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
}
.add-item-box {
  display: flex;
  gap: 5px;
  margin-top: auto;
}
.add-item-box input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.add-item-box button {
  padding: 8px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* --- TABLES & POPUP --- */
.ins-panel,
.defect-panel {
  background-color: white;
  border: 1px solid #ddd;
  width: 95%;
  margin-bottom: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.panel-title {
  background-color: #2c3e50;
  color: white;
  padding: 10px;
  margin: 0;
  text-align: center;
}
.styled-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.styled-table th {
  background-color: #f2f2f2;
  border: 1px solid #ccc;
  padding: 8px;
}
.styled-table td {
  border: 1px solid #ccc;
  padding: 6px;
}
.col-xs {
  width: 40px;
}
.col-xl {
  width: auto;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
.bg-light {
  background-color: #f9f9f9;
}
.summary-row td {
  border-top: 2px solid #333;
  font-weight: bold;
}
.total-row {
  background-color: #e8f5e9;
}
.unique-row {
  background-color: #e3f2fd;
}
.label-cell {
  padding-right: 15px;
  text-transform: uppercase;
  font-size: 0.8rem;
}
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.popup {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.input-field {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.radio-group {
  flex-direction: row;
  gap: 15px;
  padding: 10px;
  background: #f0f0f0;
  border-radius: 4px;
}
.popup-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}
.add-defect-btn {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
}
.add-btn {
  background-color: #27ae60;
  color: white;
  padding: 8px 16px;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
.cancel-btn {
  background-color: #7f8c8d;
  color: white;
  padding: 8px 16px;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
</style>
