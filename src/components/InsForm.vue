<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted, computed, onBeforeUnmount, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { userInformationStore } from '@/store/searchStore'
import share_icon from '@/assets/icons/share.png'
import ShareWindow from './ShareWindow.vue'

// Import API functions
import {
  getProjectProducts,
  getProductData,
  createProductDocument,
  addDefectTransaction,
  updateEngineerInfo,
  getUsernameById,
  uploadFileToStorage,
  getFileView,
  getFileDownload,
  getProductChecklists,
  createChecklist,
  deleteChecklist,
  updateChecklistShare,
  addChecklistItemDB,
  updateChecklistItemStatus,
  deleteChecklistItemDB,
} from '@/lib/appwrite.js'

const props = defineProps({
  loadProjects: {
    type: Function, // If it's a function
    required: false,
    // Add default value if not required
  },
})

// --- SETUP & ROUTE ---
const route = useRoute()
const userInfoStore = userInformationStore()

// 🔴 FIX: Use 'userid' matching your store definition
const {
  projects: projects_stored,
  username: currentUsername,
  userid: currentUserId,
} = storeToRefs(userInfoStore)

const projectId = ref(null)
const activeProductId = ref(null)

// --- DATA STATE ---
const products = ref([])
const currentProduct = ref(null)
const engineers = ref([])
const defects = ref([])
const resolvedEngineerNames = ref({})
const fileContentUrl = ref(null)

// --- POPUP STATE ---
const showAddPopup = ref(false)
const showEngineerPopup = ref(false)
const newDefect = ref({ id: '', desc: '', type: 'Major' })
const engineerForm = ref({ size: 0, time: 0 })
const fileInput = ref(null)

// --- SHARE LOGIC ---
const current_project = ref('')
const copyStatus = ref('initial')
const isModalOpen = ref(false)

const showShareWindow = () => {
  isModalOpen.value = true
  console.log('Modal state updated to:', isModalOpen.value)
}

// --- COMPUTED ---
const engineerColumns = computed(() => {
  return engineers.value.map((eng) => ({
    userId: eng.userId,
    name: resolvedEngineerNames.value[eng.userId] || 'Loading...',
  }))
})

const defectTotals = computed(() => {
  const totals = { maj: 0, min: 0, A: 0, B: 0 }
  engineerColumns.value.forEach((col) => (totals[col.userId] = 0))
  defects.value.forEach((d) => {
    if (d.severity === 'Major') totals.maj++
    else totals.min++
    if (totals[d.userId] !== undefined) totals[d.userId]++
  })
  return totals
})

// --- LIFECYCLE ---
onMounted(async () => {
  const idFromRoute = route.params.project_id
  if (idFromRoute) {
    projectId.value = idFromRoute
    // Load existing products for this project
    current_project.value = projects_stored.value.find((p) => p.$id === projectId.value)

    products.value = await getProjectProducts(projectId.value)

    if (!current_project.value) {
      console.error('Project not found with ID:', projectId.value)
    }
  }
})

onUnmounted(() => {})

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

// --- METHODS ---

// 1. SELECT PRODUCT
const selectProduct = async (prod) => {
  activeProductId.value = prod.$id
  currentProduct.value = prod

  // A. Load File View
  if (prod.mimeType === 'application/pdf') {
    fileContentUrl.value = getFileView(prod.fileId)
  } else {
    const url = getFileDownload(prod.fileId)
    if (url) {
      try {
        const resp = await fetch(url)
        fileContentUrl.value = await resp.text()
      } catch (e) {
        fileContentUrl.value = 'Error loading text file.'
      }
    }
  }

  // B. Load Data (Defects & Engineers)
  await loadProductData()
  await loadChecklists()
}

const loadProductData = async () => {
  if (!activeProductId.value) return

  const data = await getProductData(projectId.value, activeProductId.value)
  engineers.value = data.engineers
  defects.value = data.defects

  // Resolve Names
  for (const eng of engineers.value) {
    if (!resolvedEngineerNames.value[eng.userId]) {
      if (eng.userId === currentUserId.value) {
        resolvedEngineerNames.value[eng.userId] = currentUsername.value
      } else {
        const name = await getUsernameById(eng.userId)
        resolvedEngineerNames.value[eng.userId] = name
      }
    }
  }
}

// 2. UPLOAD FILE -> CREATE PRODUCT
const triggerUpload = () => {
  fileInput.value.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    // A. Upload to Appwrite Storage
    const uploadedFile = await uploadFileToStorage(file)

    // B. Create Product Document in DB
    // 🔴 FIX: ensure projectId.value and currentUserId.value are valid
    if (!projectId.value || !currentUserId.value) {
      throw new Error('Missing Project ID or User ID')
    }

    const newProd = await createProductDocument(
      projectId.value,
      currentUserId.value,
      file.name,
      uploadedFile.$id,
      file.type,
    )

    // C. Update Local State
    products.value.push(newProd)

    // D. Auto-select
    selectProduct(newProd)
  } catch (error) {
    alert('Error uploading file: ' + error.message)
    console.error(error)
  }

  event.target.value = ''
}

// 3. ADD DEFECT
const addDefect = async () => {
  if (!newDefect.value.id) return alert('Enter Defect ID')
  if (!activeProductId.value) return alert('Select a product first')

  try {
    const defectPayload = {
      defectId: Number(newDefect.value.id),
      description: newDefect.value.desc,
      severity: newDefect.value.type,
      userId: currentUserId.value,
      projectId: projectId.value,
      productId: activeProductId.value,
    }

    const engineerPayload = {
      projectId: projectId.value,
      userId: currentUserId.value,
      productId: activeProductId.value,
    }

    await addDefectTransaction(defectPayload, engineerPayload)

    showAddPopup.value = false
    newDefect.value = { id: '', desc: '', type: 'Major' }
    await loadProductData()
  } catch (e) {
    console.error(e)
    alert('Failed to save defect')
  }
}

// 4. UPDATE ENGINEER INFO
const openEngineerPopup = () => {
  // Find record for current user + current product
  const myData = engineers.value.find((e) => e.userId === currentUserId.value)
  if (myData) {
    engineerForm.value.size = myData.size
    engineerForm.value.time = myData.time
  }
  showEngineerPopup.value = true
}

const saveEngineerInfo = async () => {
  try {
    await updateEngineerInfo(
      projectId.value,
      activeProductId.value,
      currentUserId.value,
      engineerForm.value.size,
      engineerForm.value.time,
    )
    showEngineerPopup.value = false
    await loadProductData()
  } catch (e) {
    alert('Error updating info: ', e)
  }
}

// --- DRAG & LAYOUT LOGIC ---
const leftWidth = ref(40)
const topHeight = ref(50)
const isDraggingX = ref(false)
const isDraggingY = ref(false)
const splitContainer = ref(null)
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
const onDrag = (e) => {
  if (isDraggingX.value) {
    const rect = splitContainer.value.getBoundingClientRect()
    leftWidth.value = ((e.clientX - rect.left) / rect.width) * 100
  }
  if (isDraggingY.value) {
    const rect = splitContainer.value.getBoundingClientRect()
    topHeight.value = ((e.clientY - rect.top) / rect.height) * 100
  }
}
const stopDrag = () => {
  isDraggingX.value = false
  isDraggingY.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})

// --- TABS / CHECKLIST STATE ---
const checklistTabs = ref([])
const activeTabId = ref(null)
const newChecklistInput = ref('')

// Computed to find current object
const currentTabObj = computed(() => {
  return checklistTabs.value.find((t) => t.id === activeTabId.value)
})

// --- CHECKLIST LOGIC ---

// 1. Load Checklists (Call this inside selectProduct or onMounted)
const loadChecklists = async () => {
  if (!activeProductId.value) return

  const lists = await getProductChecklists(projectId.value, activeProductId.value)
  checklistTabs.value = lists

  // Set active tab to first one if exists
  if (lists.length > 0 && !activeTabId.value) {
    activeTabId.value = lists[0].id
  }
}

// 2. Add New Tab
const addNewTab = async () => {
  const name = prompt('Name for new list:')
  if (name) {
    try {
      const newList = await createChecklist(
        projectId.value,
        activeProductId.value,
        currentUserId.value,
        name,
      )
      checklistTabs.value.push(newList)
      activeTabId.value = newList.id
    } catch (e) {
      alert('Error creating list: ', e)
    }
  }
}

// 3. Delete Tab
const deleteCurrentTab = async () => {
  if (!currentTabObj.value) return
  if (confirm('Delete this list and all its items?')) {
    try {
      const idToDelete = currentTabObj.value.id
      await deleteChecklist(idToDelete)

      // Remove from UI
      const idx = checklistTabs.value.findIndex((t) => t.id === idToDelete)
      checklistTabs.value.splice(idx, 1)

      // Reset Active Tab
      activeTabId.value = checklistTabs.value.length ? checklistTabs.value[0].id : null
    } catch (e) {
      alert('Error deleting list: ', e)
    }
  }
}

// 4. Update Share Status (Watch Logic)
// We watch the computed currentTabObj's isShared property
import { watch } from 'vue'
watch(
  () => currentTabObj.value?.isShared,
  async (newVal, oldVal) => {
    if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
      try {
        await updateChecklistShare(currentTabObj.value.id, newVal)
      } catch (e) {
        console.error('Share sync failed: ', e)
      }
    }
  },
)

const setActiveTab = (id) => {
  activeTabId.value = id
}

// --- ITEM LOGIC ---

// 5. Add Item
const addChecklistItem = async () => {
  if (newChecklistInput.value.trim() && currentTabObj.value) {
    try {
      const newItem = await addChecklistItemDB(currentTabObj.value.id, newChecklistInput.value)
      // Push returned DB item to UI
      currentTabObj.value.items.push(newItem)
      newChecklistInput.value = ''
    } catch (e) {
      console.error('Error adding item: ', e)
    }
  }
}

// 6. Remove Item
const removeChecklistItem = async (idx) => {
  const item = currentTabObj.value.items[idx]
  try {
    await deleteChecklistItemDB(item.id)
    currentTabObj.value.items.splice(idx, 1)
  } catch (e) {
    console.error('Error deleting item: ', e)
  }
}

// 7. Toggle Item Status (New helper)
const updateItemStatus = async (item) => {
  try {
    await updateChecklistItemStatus(item.id, item.done)
  } catch (e) {
    console.error('Error updating status: ', e)
    // Revert UI on error if needed
    item.done = !item.done
  }
}

const uniqueDefects = computed(() => {
  const uniqueMap = {}

  // Group defects by their ID (defectId)
  defects.value.forEach((d) => {
    const id = d.defectId

    if (!uniqueMap[id]) {
      // If we haven't seen this defect ID before, use this entry as the main one.
      uniqueMap[id] = {
        ...d,
        foundBy: new Set([d.userId]), // Keep track of who found it
        defectCount: 1,
      }
    } else {
      // If we have seen it, just add the user ID to the list.
      uniqueMap[id].foundBy.add(d.userId)
      uniqueMap[id].defectCount++
    }
  })

  // Convert the map back to an array
  return Object.values(uniqueMap)
    .map((d) => {
      // Determine the user(s) who found it for display purposes
      if (d.foundBy.size > 1) {
        d.foundByNames = 'Multiple Engineers' // Or you could resolve all names
      } else {
        // Find the name of the single user who found it
        const userId = Array.from(d.foundBy)[0]
        d.foundByNames = resolvedEngineerNames.value[userId] || 'Unknown User'
      }
      return d
    })
    .sort((a, b) => a.defectId - b.defectId) // Sort by defect ID
})

const meetingDuration = ref(0) // Duration of the meeting in minutes

const inspectionSummary = computed(() => {
  // 1. Group defects by their logical ID (defectId) to find overlaps
  const defectMap = {}

  defects.value.forEach((d) => {
    const id = d.defectId
    if (!defectMap[id]) defectMap[id] = { me: false, others: false }

    if (d.userId === currentUserId.value) {
      defectMap[id].me = true
    } else {
      defectMap[id].others = true
    }
  })

  // 2. Calculate A, B, C
  let A = 0
  let B = 0
  let C = 0

  Object.values(defectMap).forEach((status) => {
    if (status.me) A++ // Defects found by you (A)
    if (status.others) B++ // Defects found by others (B)
    if (status.me && status.others) C++ // Found by both (C)
  })

  // 3. Calculate Estimates
  const numberFound = A + B - C // Unique defects found

  let estimatedTotal = 0
  if (C > 0) {
    // Estimated Total = (A * B) / C
    estimatedTotal = Math.round((A * B) / C)
  } else {
    // If C=0, we can't use the capture-recapture model, so we default to the number found.
    estimatedTotal = numberFound
  }

  const numberLeft = Math.max(0, estimatedTotal - numberFound) // Defects left

  // 4. Time & Size Metrics
  // Total Size: Sum of size from engineer entries (e.g., total pages/LOC reviewed)
  const totalSize = engineers.value.reduce((sum, eng) => sum + (eng.size || 0), 0)

  // Total Prep Time (minutes): Sum of 'time' property from all engineer entries
  const totalPrepMinutes = engineers.value.reduce((sum, eng) => sum + (eng.time || 0), 0)

  // Total Minutes = Prep Time + Meeting Time
  const totalMinutes = totalPrepMinutes + (parseFloat(meetingDuration.value) || 0)
  const totalHours = totalMinutes / 60

  // Overall Rate = Size / Hours
  const rate = totalHours > 0 ? (totalSize / totalHours).toFixed(2) : 0

  return {
    A,
    B,
    C,
    numberFound,
    estimatedTotal,
    numberLeft,
    totalSize,
    totalHours: totalHours.toFixed(2),
    rate,
  }
})
</script>

<template>
  <div v-if="isModalOpen" class="share-modal" @click.self="isModalOpen = false">
    <div>
      <ShareWindow :projectId="projectId" :userId="currentUserId" @close="isModalOpen = false" />
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
        <button class="upload-btn" @click="triggerUpload"><span>☁️</span> Upload Product</button>
      </div>

      <div class="product-list">
        <ul>
          <li
            v-for="p in products"
            :key="p.$id"
            :class="{ active: activeProductId === p.$id }"
            @click="selectProduct(p)"
          >
            <span class="file-icon">{{ p.mimeType === 'application/pdf' ? '📕' : '📝' }}</span>
            {{ p.name }}
          </li>
        </ul>
        <div v-if="products.length === 0" class="no-products">No products yet. Upload one!</div>
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
          <div
            v-if="currentProduct && currentProduct.mimeType === 'application/pdf'"
            class="file-viewer-container"
          >
            <iframe :src="fileContentUrl" class="pdf-frame"></iframe>
          </div>
          <div v-else-if="currentProduct" class="file-viewer-container text-viewer">
            <pre><code>{{ fileContentUrl }}</code></pre>
          </div>
          <div v-else class="empty-file-state">
            <div>Select a product to start inspection.</div>
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
              {{ tab.name }}

              [Image of collaborative team icon]
              <span v-if="tab.isShared" class="shared-icon">👥</span>
            </div>
            <button class="add-tab-btn" @click="addNewTab">+</button>
          </div>

          <div class="tab-content" v-if="currentTabObj">
            <div class="list-controls">
              <label class="share-toggle">
                <input type="checkbox" v-model="currentTabObj.isShared" /> Share Team
              </label>
              <button class="delete-list-btn" @click="deleteCurrentTab">Delete</button>
            </div>

            <div class="checklist-items">
              <div
                v-for="(item, idx) in currentTabObj.items"
                :key="item.id || idx"
                class="check-item"
              >
                <input type="checkbox" v-model="item.done" @change="updateItemStatus(item)" />
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
                <td class="text-center">{{ resolvedEngineerNames[e.userId] || '...' }}</td>
                <td class="text-center">{{ e.major }}</td>
                <td class="text-center">{{ e.minor }}</td>
                <td class="text-center">{{ e.size }}</td>
                <td class="text-center">{{ e.time }}</td>
                <td class="text-center">{{ e.rate }}</td>
                <td class="text-center">{{ e.est_yield }}%</td>
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
                <th v-for="col in engineerColumns" :key="col.userId">{{ col.name }}</th>
                <th>A</th>
                <th>B</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in defects" :key="i">
                <td class="text-center">{{ d.defectId }}</td>
                <td>{{ d.description }}</td>
                <td class="text-center bg-light">{{ d.severity === 'Major' ? 1 : '' }}</td>
                <td class="text-center bg-light">{{ d.severity === 'Minor' ? 1 : '' }}</td>
                <td v-for="col in engineerColumns" :key="col.userId" class="text-center">
                  {{ d.userId === col.userId ? '1' : '' }}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="summary-row total-row">
                <td colspan="2" class="text-right label-cell">Total</td>
                <td class="text-center">{{ defectTotals.maj }}</td>
                <td class="text-center">{{ defectTotals.min }}</td>
                <td v-for="col in engineerColumns" :key="col.userId" class="text-center">
                  {{ defectTotals[col.userId] }}
                </td>
                <td>0</td>
                <td>0</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="action-buttons" v-if="activeProductId">
          <button class="add-defect-btn" @click="showAddPopup = true">+ Add Defect</button>
          <button class="complete-info-btn" @click="openEngineerPopup">
            Complete Engineer Info
          </button>
        </div>

        <div class="summary-panel" v-if="activeProductId">
          <h2 class="panel-title">Inspection Summary</h2>

          <div class="summary-controls">
            <label>Meeting Duration (min): </label>
            <input type="number" v-model="meetingDuration" class="small-input" placeholder="0" />
          </div>

          <table class="styled-table summary-table">
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Defects (A)</td>
                <td>{{ inspectionSummary.A }}</td>
              </tr>
              <tr>
                <td>Total Defects (B)</td>
                <td>{{ inspectionSummary.B }}</td>
              </tr>
              <tr>
                <td>C (Common)</td>
                <td>{{ inspectionSummary.C }}</td>
              </tr>
              <tr class="highlight-row">
                <td>**Unique Defects Found**</td>
                <td>**{{ inspectionSummary.numberFound }}**</td>
              </tr>
              <tr>
                <td>Estimated Total Defects (AB/C)</td>
                <td>{{ inspectionSummary.estimatedTotal }}</td>
              </tr>
              <tr>
                <td>**Number Left**</td>
                <td>**{{ inspectionSummary.numberLeft }}**</td>
              </tr>
              <tr>
                <td>Product Size (LOC/Pages)</td>
                <td>{{ inspectionSummary.totalSize }}</td>
              </tr>
              <tr>
                <td>Total Inspection Hours</td>
                <td>{{ inspectionSummary.totalHours }}</td>
              </tr>
              <tr class="highlight-row">
                <td>**Overall Rate** (Size ÷ Hours)</td>
                <td>**{{ inspectionSummary.rate }}**</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="showAddPopup" class="popup-overlay">
          <div class="popup">
            <h3>Add New Defect</h3>
            <div class="form-group">
              <label>Defect No.</label
              ><input v-model="newDefect.id" type="number" class="input-field" />
            </div>
            <div class="form-group">
              <label>Description</label><input v-model="newDefect.desc" class="input-field" />
            </div>
            <div class="form-group radio-group">
              <label><input type="radio" value="Major" v-model="newDefect.type" /> Major</label>
              <label><input type="radio" value="Minor" v-model="newDefect.type" /> Minor</label>
            </div>
            <div class="popup-buttons">
              <button @click="addDefect" class="add-btn">Save</button>
              <button @click="showAddPopup = false" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>

        <div v-if="showEngineerPopup" class="popup-overlay">
          <div class="popup">
            <h3>Complete Engineer Info</h3>
            <div class="form-group">
              <label>Size</label
              ><input type="number" v-model="engineerForm.size" class="input-field" />
            </div>
            <div class="form-group">
              <label>Time (min)</label
              ><input type="number" v-model="engineerForm.time" class="input-field" />
            </div>
            <div class="popup-buttons">
              <button @click="saveEngineerInfo" class="add-btn">Update</button>
              <button @click="showEngineerPopup = false" class="cancel-btn">Cancel</button>
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

/* Keeping your existing CSS */
.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
}
.sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #1a252f;
  flex-shrink: 0;
  padding: 0;
}
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #1a252f;
  background-color: #096dd9;
}
.header-container h3 {
  margin: 0;
  font-size: 1.1rem;
}

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
  font-weight: bold;
}
.product-list {
  /* flex: 1; */
  padding: 10px 0;
  overflow-y: auto;
}
.product-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.product-list li {
  padding: 12px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  border-left: 4px solid transparent;
  transition: background 0.2s;
}
.product-list li:hover {
  background-color: #34495e;
}
.product-list li.active {
  background-color: #34495e;
  border-left-color: #3498db;
  font-weight: bold;
}
.no-products {
  text-align: center;
  color: #95a5a6;
  font-size: 0.9rem;
  margin-top: 20px;
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
  margin-top: 30px;
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

.top-box {
  background-color: #e9ecef;
  overflow: auto;
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
  height: 100%;
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
.bg-light {
  background-color: #f9f9f9;
}
.total-row {
  background-color: #e8f5e9;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 10px;
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
.complete-info-btn {
  background-color: #f39c12;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
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

.summary-panel {
  background-color: white;
  border: 1px solid #ddd;
  width: 95%;
  margin-top: 25px;
  margin-bottom: 50px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.summary-controls {
  padding: 15px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.small-input {
  padding: 5px;
  width: 80px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.summary-table td:nth-child(2) {
  font-weight: bold;
  text-align: center;
  color: #2c3e50;
}

.highlight-row {
  background-color: #e3f2fd; /* Light blue highlight for key metrics */
}
</style>
