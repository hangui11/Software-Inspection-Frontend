<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
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
  deleteChecklistItemDB
} from '@/lib/appwrite.js'

// --- SETUP & ROUTE ---
const route = useRoute()
const userInfoStore = userInformationStore()

// 🔴 FIX: Use 'userid' matching your store definition
const { username: currentUsername, userid: currentUserId } = storeToRefs(userInfoStore)

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
const isModalOpen = ref(false)
const showShareWindow = () => { isModalOpen.value = true }

// --- COMPUTED ---
const engineerColumns = computed(() => {
  return engineers.value.map(eng => ({
    userId: eng.userId,
    name: resolvedEngineerNames.value[eng.userId] || 'Loading...'
  }))
})

const defectTotals = computed(() => {
  const totals = { maj: 0, min: 0, A: 0, B: 0 }
  engineerColumns.value.forEach(col => totals[col.userId] = 0)
  defects.value.forEach(d => {
    if(d.severity === 'Major') totals.maj++
    else totals.min++
    if(totals[d.userId] !== undefined) totals[d.userId]++
  })
  return totals
})

// --- LIFECYCLE ---
onMounted(async () => {
  const idFromRoute = route.params.project_id
  if (idFromRoute) {
    projectId.value = idFromRoute
    // Load existing products for this project
    products.value = await getProjectProducts(projectId.value)
  }
})

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
     if(url) {
        try {
            const resp = await fetch(url)
            fileContentUrl.value = await resp.text()
        } catch(e) { fileContentUrl.value = "Error loading text file." }
     }
  }

  // B. Load Data (Defects & Engineers)
  await loadProductData()
  await loadChecklists()
}

const loadProductData = async () => {
  if(!activeProductId.value) return

  const data = await getProductData(projectId.value, activeProductId.value)
  engineers.value = data.engineers
  defects.value = data.defects

  // Resolve Names
  for(const eng of engineers.value) {
    if(!resolvedEngineerNames.value[eng.userId]) {
       if(eng.userId === currentUserId.value) {
         resolvedEngineerNames.value[eng.userId] = currentUsername.value
       } else {
         const name = await getUsernameById(eng.userId)
         resolvedEngineerNames.value[eng.userId] = name
       }
    }
  }
}

// 2. UPLOAD FILE -> CREATE PRODUCT
const triggerUpload = () => { fileInput.value.click() }

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    // A. Upload to Appwrite Storage
    const uploadedFile = await uploadFileToStorage(file)

    // B. Create Product Document in DB
    // 🔴 FIX: ensure projectId.value and currentUserId.value are valid
    if (!projectId.value || !currentUserId.value) {
        throw new Error("Missing Project ID or User ID")
    }

    const newProd = await createProductDocument(
        projectId.value,
        currentUserId.value,
        file.name,
        uploadedFile.$id,
        file.type
    )

    // C. Update Local State
    products.value.push(newProd)

    // D. Auto-select
    selectProduct(newProd)

  } catch (error) {
    alert("Error uploading file: " + error.message)
    console.error(error)
  }

  event.target.value = ''
}

// 3. ADD DEFECT
const addDefect = async () => {
  if(!newDefect.value.id) return alert("Enter Defect ID")
  if(!activeProductId.value) return alert("Select a product first")

  try {
    const defectPayload = {
      defectId: Number(newDefect.value.id),
      description: newDefect.value.desc,
      severity: newDefect.value.type,
      userId: currentUserId.value,
      projectId: projectId.value,
      productId: activeProductId.value
    }

    const engineerPayload = {
      projectId: projectId.value,
      userId: currentUserId.value,
      productId: activeProductId.value
    }

    await addDefectTransaction(defectPayload, engineerPayload)

    showAddPopup.value = false
    newDefect.value = { id: '', desc: '', type: 'Major' }
    await loadProductData()

  } catch (e) {
    console.error(e)
    alert("Failed to save defect")
  }
}

// 4. UPDATE ENGINEER INFO
const openEngineerPopup = () => {
  // Find record for current user + current product
  const myData = engineers.value.find(e => e.userId === currentUserId.value)
  if(myData) {
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
      engineerForm.value.time
    )
    showEngineerPopup.value = false
    await loadProductData()
  } catch(e) {
    alert("Error updating info")
  }
}

// --- DRAG & LAYOUT LOGIC ---
const leftWidth = ref(40)
const topHeight = ref(50)
const isDraggingX = ref(false)
const isDraggingY = ref(false)
const splitContainer = ref(null)
const startDragX = () => { isDraggingX.value = true; window.addEventListener('mousemove', onDrag); window.addEventListener('mouseup', stopDrag) }
const startDragY = () => { isDraggingY.value = true; window.addEventListener('mousemove', onDrag); window.addEventListener('mouseup', stopDrag) }
const onDrag = (e) => {
  if (isDraggingX.value) {
    const rect = splitContainer.value.getBoundingClientRect(); leftWidth.value = ((e.clientX - rect.left) / rect.width) * 100
  }
  if (isDraggingY.value) {
    const rect = splitContainer.value.getBoundingClientRect(); topHeight.value = ((e.clientY - rect.top) / rect.height) * 100
  }
}
const stopDrag = () => { isDraggingX.value = false; isDraggingY.value = false; window.removeEventListener('mousemove', onDrag); window.removeEventListener('mouseup', stopDrag) }

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
        name
      )
      checklistTabs.value.push(newList)
      activeTabId.value = newList.id
    } catch (e) {
      alert("Error creating list")
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
      alert("Error deleting list")
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
      } catch (e) { console.error("Share sync failed") }
    }
  }
)

const setActiveTab = (id) => { activeTabId.value = id }

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
      console.error("Error adding item")
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
    console.error("Error deleting item")
  }
}

// 7. Toggle Item Status (New helper)
const updateItemStatus = async (item) => {
  try {
    await updateChecklistItemStatus(item.id, item.done)
  } catch (e) {
    console.error("Error updating status")
    // Revert UI on error if needed
    item.done = !item.done
  }
}

</script>

<template>
  <div class="app-container">

    <aside class="sidebar">
      <div class="header-container">
        <h3>Project Files</h3>
        <button class="share-btn" @click="showShareWindow">
           <img :src="share_icon" alt="Share" width="16" />
        </button>
      </div>

      <div class="upload-section">
        <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" accept=".pdf, .txt, text/plain" />
        <button class="upload-btn" @click="triggerUpload">
          <span>☁️</span> Upload Product
        </button>
      </div>

      <div class="product-list">
        <ul>
          <li v-for="p in products" :key="p.$id" :class="{ active: activeProductId === p.$id }" @click="selectProduct(p)">
            <span class="file-icon">{{ p.mimeType === 'application/pdf' ? '📕' : '📝' }}</span>
            {{ p.name }}
          </li>
        </ul>
        <div v-if="products.length === 0" class="no-products">
           No products yet. Upload one!
        </div>
      </div>
    </aside>

    <div class="split-layout" ref="splitContainer" :class="{ 'noselect': isDraggingX || isDraggingY }">
      <div class="middle-pane" :style="{ width: leftWidth + '%' }">
        <div class="top-box" :style="{ height: topHeight + '%' }">
           <div v-if="currentProduct && currentProduct.mimeType === 'application/pdf'" class="file-viewer-container">
             <iframe :src="fileContentUrl" class="pdf-frame"></iframe>
           </div>
           <div v-else-if="currentProduct" class="file-viewer-container text-viewer">
             <pre><code>{{ fileContentUrl }}</code></pre>
           </div>
           <div v-else class="empty-file-state">
             <div>Select a product to start inspection.</div>
           </div>
        </div>
        <div class="resizer-horizontal" @mousedown.prevent="startDragY"><div class="handle-icon">···</div></div>
       <div class="bottom-box" :style="{ height: (100 - topHeight) + '%' }">

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
              <div v-for="(item, idx) in currentTabObj.items" :key="item.id || idx" class="check-item">
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

      <div class="right-pane" :style="{ width: (100 - leftWidth) + '%' }">
        <div class="ins-panel">
          <h2 class="panel-title">Engineer Data</h2>
          <table class="styled-table">
            <thead>
              <tr><th>Name</th><th>Major</th><th>Minor</th><th>Size</th><th>Time</th><th>Rate</th><th>Yield</th></tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in engineers" :key="i">
                <td>{{ resolvedEngineerNames[e.userId] || '...' }}</td>
                <td>{{ e.major }}</td>
                <td>{{ e.minor }}</td>
                <td>{{ e.size }}</td>
                <td>{{ e.time }}</td>
                <td>{{ e.rate }}</td>
                <td>{{ e.est_yield }}%</td>
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
                <td></td> <td></td>
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
                <td>0</td> <td>0</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="action-buttons" v-if="activeProductId">
          <button class="add-defect-btn" @click="showAddPopup = true">+ Add Defect</button>
          <button class="complete-info-btn" @click="openEngineerPopup">Complete Engineer Info</button>
        </div>

        <div v-if="showAddPopup" class="popup-overlay">
          <div class="popup">
            <h3>Add New Defect</h3>
            <div class="form-group"><label>Defect No.</label><input v-model="newDefect.id" type="number" class="input-field" /></div>
            <div class="form-group"><label>Description</label><input v-model="newDefect.desc" class="input-field" /></div>
            <div class="form-group radio-group">
              <label><input type="radio" value="Major" v-model="newDefect.type"> Major</label>
              <label><input type="radio" value="Minor" v-model="newDefect.type"> Minor</label>
            </div>
            <div class="popup-buttons">
              <button @click="addDefect" class="add-btn">Save</button>
              <button @click="showAddPopup=false" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>

        <div v-if="showEngineerPopup" class="popup-overlay">
          <div class="popup">
            <h3>Complete Engineer Info</h3>
            <div class="form-group"><label>Size</label><input type="number" v-model="engineerForm.size" class="input-field" /></div>
            <div class="form-group"><label>Time (min)</label><input type="number" v-model="engineerForm.time" class="input-field" /></div>
            <div class="popup-buttons">
              <button @click="saveEngineerInfo" class="add-btn">Update</button>
              <button @click="showEngineerPopup=false" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* Keeping your existing CSS */
.app-container { display: flex; width: 100vw; height: 100vh; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
.sidebar { width: 250px; background-color: #2c3e50; color: #ecf0f1; display: flex; flex-direction: column; border-right: 1px solid #1a252f; flex-shrink: 0; padding: 0; }
.header-container { display: flex; justify-content: space-between; align-items: center; padding: 20px; background-color: #1a252f; }
.header-container h3 { margin: 0; font-size: 1.1rem; }
.share-btn { background: none; border: none; cursor: pointer; filter: invert(1); }

.upload-section { padding: 20px; border-bottom: 1px solid #34495e; }
.upload-btn { width: 100%; padding: 10px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; justify-content: center; gap: 8px; font-weight: bold; }
.product-list { flex: 1; padding: 10px 0; overflow-y: auto; }
.product-list ul { list-style: none; padding: 0; margin: 0; }
.product-list li { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-left: 4px solid transparent; transition: background 0.2s; }
.product-list li:hover { background-color: #34495e; }
.product-list li.active { background-color: #34495e; border-left-color: #3498db; font-weight: bold; }
.no-products { text-align: center; color: #95a5a6; font-size: 0.9rem; margin-top: 20px; }

.split-layout { flex-grow: 1; display: flex; position: relative; overflow: hidden; }
.middle-pane { display: flex; flex-direction: column; background-color: #f8f8f8; overflow: hidden; }
.right-pane { background-color: #fff; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; align-items: center; }
.noselect { user-select: none; cursor: grabbing; }

.top-box { background-color: #e9ecef; overflow: auto; display: flex; flex-direction: column; }
.file-viewer-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
.pdf-frame { width: 100%; height: 100%; border: none; }
.text-viewer { padding: 20px; overflow: auto; background-color: white; height: 100%; }
.text-viewer pre { margin: 0; font-family: Consolas, monospace; white-space: pre-wrap; font-size: 0.9rem; color: #333; }
.empty-file-state { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; color: #888; font-style: italic; }

.resizer-vertical { width: 6px; background-color: #ccc; cursor: col-resize; z-index: 10; border-left: 1px solid #bbb; border-right: 1px solid #bbb; }
.resizer-horizontal { height: 6px; background-color: #ccc; cursor: row-resize; z-index: 10; display:flex; justify-content:center; align-items:center; border-top: 1px solid #bbb; border-bottom: 1px solid #bbb; }

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

.ins-panel, .defect-panel { background-color: white; border: 1px solid #ddd; width: 95%; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.panel-title { background-color: #2c3e50; color: white; padding: 10px; margin: 0; text-align: center; }
.styled-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.styled-table th { background-color: #f2f2f2; border: 1px solid #ccc; padding: 8px; }
.styled-table td { border: 1px solid #ccc; padding: 6px; }
.col-xs { width: 40px; } .col-xl { width: auto; } .text-center { text-align: center; } .bg-light { background-color: #f9f9f9; }
.total-row { background-color: #e8f5e9; font-weight: bold; }

.action-buttons { display: flex; gap: 10px; margin-top: 15px; }
.add-defect-btn { background-color: #3498db; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; }
.complete-info-btn { background-color: #f39c12; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }

.popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.popup { background: white; padding: 25px; border-radius: 8px; width: 300px; display: flex; flex-direction: column; gap: 10px; }
.form-group { display: flex; flex-direction: column; }
.input-field { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.radio-group { flex-direction: row; gap: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px; }
.popup-buttons { display: flex; justify-content: space-between; margin-top: 15px; }
.add-btn { background-color: #27ae60; color: white; padding: 8px 16px; border: none; cursor: pointer; border-radius: 4px; }
.cancel-btn { background-color: #7f8c8d; color: white; padding: 8px 16px; border: none; cursor: pointer; border-radius: 4px; }
</style>
