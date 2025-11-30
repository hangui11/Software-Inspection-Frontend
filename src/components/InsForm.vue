<script>
export default {
  name: "SplitLayoutFinal",
  data() {
    return {
      // --- LAYOUT STATE ---
      isDraggingX: false,
      isDraggingY: false,
      leftWidth: 40,
      topHeight: 50,

      // --- SIDEBAR DATA (Products) ---
      // We start empty or with placeholders.
      // Note: Placeholders won't have real files attached unless we fetch them.
      products: [
        { id: 101, name: "Example_No_File", type: 'none', content: null },
      ],
      activeProductId: 101,

      // --- BOTTOM VIEW (TABS) ---
      checklistTabs: [
        { id: 1, name: "Daily Setup", isShared: true, items: [{ text: "Check Power", done: false }] }
      ],
      activeTabId: 1,
      newChecklistInput: '',

      // --- POPUP & TABLES ---
      showAddPopup: false,
      newDefect: { no: '', desc: '', type: 'Major' },
      engineers: [
        { name: 'DB', major: 7, minor: 3, size: 360, time: 65, rate: 266, yield: 56.3 },
        { name: 'BP', major: 9, minor: 2, size: 380, time: 97, rate: 235, yield: 75.0 },
        { name: 'PA', major: 5, minor: 4, size: 380, time: 68, rate: 335, yield: 41.7 }
      ],
      defects: [
        { no: '1', desc: 'Scratch on Surface', maj: 1, min: '', db: 1, bp: '', pa: '' }
      ]
    }
  },
  computed: {
    // Get the full object of the currently selected product
    currentProduct() {
      return this.products.find(p => p.id === this.activeProductId);
    },
    // Helper for Tabs
    currentTabObj() {
      return this.checklistTabs.find(t => t.id === this.activeTabId);
    },
    // Math for Tables
    defectTotals() {
      const keys = ['maj', 'min', 'db', 'bp', 'pa'];
      const totals = {};
      keys.forEach(key => totals[key] = this.defects.reduce((s, i) => s + (Number(i[key])||0), 0));
      return totals;
    },
    defectUniques() {
      const keys = ['maj', 'min', 'db', 'bp', 'pa'];
      const uniques = {};
      keys.forEach(key => {
        const v = this.defects.map(i => Number(i[key])).filter(x => x!==0 && !isNaN(x));
        uniques[key] = new Set(v).size;
      });
      return uniques;
    }
  },
  methods: {
    // --- FILE UPLOAD & VIEWING LOGIC (NEW) ---
    triggerUpload() { this.$refs.fileInput.click(); },

    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const newProduct = {
        id: Date.now(),
        name: file.name,
        type: 'unknown',
        content: null // Will hold URL for PDF or String for Text
      };

      // 1. Handle PDF
      if (file.type === 'application/pdf') {
        newProduct.type = 'pdf';
        newProduct.content = URL.createObjectURL(file);
        this.finishUpload(newProduct);
      }
      // 2. Handle Text (txt, json, js, css, etc)
      else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        newProduct.type = 'text';
        const reader = new FileReader();
        reader.onload = (e) => {
          newProduct.content = e.target.result; // The actual text string
          this.finishUpload(newProduct);
        };
        reader.readAsText(file);
      }
      // 3. Fallback
      else {
        newProduct.type = 'unsupported';
        this.finishUpload(newProduct);
      }

      event.target.value = ''; // Reset input
    },

    finishUpload(product) {
      this.products.push(product);
      this.activeProductId = product.id; // Auto-select new file
    },

    selectProduct(id) { this.activeProductId = id; },

    // --- TABS LOGIC ---
    setActiveTab(id) { this.activeTabId = id; },
    addNewTab() {
      const name = prompt("Name:");
      if (name) {
        const id = Date.now();
        this.checklistTabs.push({ id, name, isShared: false, items: [] });
        this.activeTabId = id;
      }
    },
    deleteCurrentTab() {
      if(confirm("Delete list?")) {
        const idx = this.checklistTabs.findIndex(t => t.id === this.activeTabId);
        this.checklistTabs.splice(idx, 1);
        this.activeTabId = this.checklistTabs.length ? this.checklistTabs[0].id : null;
      }
    },
    addChecklistItem() {
      if(this.newChecklistInput.trim()){
        this.currentTabObj.items.push({ text: this.newChecklistInput, done: false });
        this.newChecklistInput = '';
      }
    },
    removeChecklistItem(i) { this.currentTabObj.items.splice(i, 1); },

    // --- DRAG LOGIC ---
    startDragX() { this.isDraggingX=true; window.addEventListener('mousemove',this.onDrag); window.addEventListener('mouseup',this.stopDrag); },
    startDragY() { this.isDraggingY=true; window.addEventListener('mousemove',this.onDrag); window.addEventListener('mouseup',this.stopDrag); },
    onDrag(e) {
      if(this.isDraggingX) {
        const rect = this.$refs.splitContainer.getBoundingClientRect();
        let p = ((e.clientX - rect.left)/rect.width)*100;
        if(p>15 && p<85) this.leftWidth = p;
      }
      if(this.isDraggingY) {
        const rect = this.$refs.splitContainer.getBoundingClientRect();
        let p = ((e.clientY - rect.top)/rect.height)*100;
        if(p>10 && p<90) this.topHeight = p;
      }
    },
    stopDrag() { this.isDraggingX=false; this.isDraggingY=false; window.removeEventListener('mousemove',this.onDrag); window.removeEventListener('mouseup',this.stopDrag); },

    // --- TABLE LOGIC ---
    addDefect() {
      const m = this.newDefect.type==='Major';
      this.defects.push({ no: this.newDefect.no, desc: this.newDefect.desc, maj: m?1:'', min: !m?1:'', db:'', bp:'', pa:'' });
      this.showAddPopup = false;
      this.newDefect = { no:'', desc:'', type:'Major' };
    }
  }
}
</script>

<template>
  <div class="app-container">

    <aside class="sidebar">
      <div class="sidebar-header"><h3>Files</h3></div>
      <div class="upload-section">
        <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" accept=".pdf, .txt, text/plain" />
        <button class="upload-btn" @click="triggerUpload"><span class="icon">☁️</span> Upload File</button>
      </div>
      <div class="product-list">
        <ul>
          <li v-for="p in products" :key="p.id" :class="{ active: activeProductId === p.id }" @click="selectProduct(p.id)">
            <span class="file-icon">{{ p.type === 'pdf' ? '📕' : (p.type === 'text' ? '📝' : '📄') }}</span> {{ p.name }}
          </li>
        </ul>
      </div>
    </aside>

    <div class="split-layout" ref="splitContainer" :class="{ 'noselect': isDraggingX || isDraggingY }">

      <div class="middle-pane" :style="{ width: leftWidth + '%' }">

        <div class="top-box" :style="{ height: topHeight + '%' }">

           <div v-if="currentProduct && currentProduct.type === 'pdf'" class="file-viewer-container">
             <iframe :src="currentProduct.content" class="pdf-frame"></iframe>
           </div>

           <div v-else-if="currentProduct && currentProduct.type === 'text'" class="file-viewer-container text-viewer">
             <pre><code>{{ currentProduct.content }}</code></pre>
           </div>

           <div v-else class="empty-file-state">
             <div v-if="currentProduct && currentProduct.type === 'unsupported'">File format not supported for preview.</div>
             <div v-else>Select a .txt or .pdf file to view content.</div>
           </div>

        </div>

        <div class="resizer-horizontal" @mousedown.prevent="startDragY"><div class="handle-icon">···</div></div>

        <div class="bottom-box" :style="{ height: (100 - topHeight) + '%' }">
           <div class="tabs-header">
             <div v-for="tab in checklistTabs" :key="tab.id" class="tab-item" :class="{ active: activeTabId === tab.id }" @click="setActiveTab(tab.id)">
               {{ tab.name }} <span v-if="tab.isShared" class="shared-icon">👥</span>
             </div>
             <button class="add-tab-btn" @click="addNewTab">+</button>
           </div>
           <div class="tab-content" v-if="currentTabObj">
             <div class="list-controls">
                <label class="share-toggle"><input type="checkbox" v-model="currentTabObj.isShared"> Share Team</label>
                <button class="delete-list-btn" @click="deleteCurrentTab">Delete</button>
             </div>
             <div class="checklist-items">
                <div v-for="(item, idx) in currentTabObj.items" :key="idx" class="check-item">
                  <input type="checkbox" v-model="item.done" />
                  <span :class="{ 'strikethrough': item.done }">{{ item.text }}</span>
                  <button class="delete-item-btn" @click="removeChecklistItem(idx)">×</button>
                </div>
             </div>
             <div class="add-item-box">
                <input v-model="newChecklistInput" @keyup.enter="addChecklistItem" placeholder="New reminder..." />
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
            <thead><tr><th>Name</th><th>Major</th><th>Minor</th><th>Size</th><th>Time</th><th>Rate</th><th>Yield</th></tr></thead>
            <tbody>
              <tr v-for="(e, i) in engineers" :key="i"><td>{{ e.name }}</td><td>{{ e.major }}</td><td>{{ e.minor }}</td><td>{{ e.size }}</td><td>{{ e.time }}</td><td>{{ e.rate }}</td><td>{{ e.yield }}%</td></tr>
            </tbody>
          </table>
        </div>

        <div class="defect-panel">
          <h2 class="panel-title">Defect List</h2>
          <table class="styled-table">
            <thead><tr><th class="col-xs">No.</th><th class="col-xl">Desc</th><th>Maj</th><th>Min</th><th>DB</th><th>BP</th><th>PA</th></tr></thead>
            <tbody>
              <tr v-for="(d, i) in defects" :key="i">
                <td class="text-center">{{ d.no }}</td><td>{{ d.desc }}</td>
                <td class="text-center bg-light">{{ d.maj }}</td><td class="text-center bg-light">{{ d.min }}</td>
                <td class="text-center">{{ d.db }}</td><td class="text-center">{{ d.bp }}</td><td class="text-center">{{ d.pa }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="summary-row total-row">
                <td colspan="2" class="text-right label-cell">Total</td>
                <td class="text-center">{{ defectTotals.maj }}</td><td class="text-center">{{ defectTotals.min }}</td>
                <td class="text-center">{{ defectTotals.db }}</td><td class="text-center">{{ defectTotals.bp }}</td><td class="text-center">{{ defectTotals.pa }}</td>
              </tr>
              <tr class="summary-row unique-row">
                <td colspan="2" class="text-right label-cell">Unique</td>
                <td class="text-center">{{ defectUniques.maj }}</td><td class="text-center">{{ defectUniques.min }}</td>
                <td class="text-center">{{ defectUniques.db }}</td><td class="text-center">{{ defectUniques.bp }}</td><td class="text-center">{{ defectUniques.pa }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button class="add-defect-btn" @click="showAddPopup = true">+ Add Defect</button>

        <div v-if="showAddPopup" class="popup-overlay">
          <div class="popup">
            <h3>Add New Defect</h3>
            <div class="form-group"><label>No.</label><input v-model="newDefect.no" class="input-field" /></div>
            <div class="form-group"><label>Description</label><input v-model="newDefect.desc" class="input-field" /></div>
            <div class="form-group radio-group">
              <label>Severity:</label>
              <label class="radio-option"><input type="radio" value="Major" v-model="newDefect.type"> Major</label>
              <label class="radio-option"><input type="radio" value="Minor" v-model="newDefect.type"> Minor</label>
            </div>
            <div class="popup-buttons">
              <button @click="addDefect" class="add-btn">Save</button>
              <button @click="showAddPopup=false" class="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- APP GLOBAL --- */
.app-container { display: flex; width: 100vw; height: 100vh; overflow: hidden; font-family: 'Segoe UI', sans-serif; }

/* --- SIDEBAR --- */
.sidebar { width: 250px; background-color: #2c3e50; color: #ecf0f1; display: flex; flex-direction: column; border-right: 1px solid #1a252f; flex-shrink: 0; }
.sidebar-header { padding: 20px; background-color: #1a252f; text-align: center; } .sidebar-header h3 { margin: 0; }
.upload-section { padding: 20px; border-bottom: 1px solid #34495e; }
.upload-btn { width: 100%; padding: 10px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; justify-content: center; gap: 8px; }
.product-list { flex: 1; padding: 20px 0; overflow-y: auto; }
.sidebar ul { list-style: none; padding: 0; margin: 0; }
.sidebar li { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-left: 4px solid transparent; }
.sidebar li:hover { background-color: #34495e; }
.sidebar li.active { background-color: #34495e; border-left-color: #3498db; font-weight: bold; }

/* --- LAYOUT PANES --- */
.split-layout { flex-grow: 1; display: flex; position: relative; overflow: hidden; }
.middle-pane { display: flex; flex-direction: column; background-color: #f8f8f8; overflow: hidden; }
.right-pane { background-color: #fff; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; align-items: center; }
.noselect { user-select: none; cursor: grabbing; }

/* --- TOP BOX (FILE VIEWER) --- */
.top-box { background-color: #e9ecef; overflow: hidden; display: flex; flex-direction: column; }
.file-viewer-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
.pdf-frame { width: 100%; height: 100%; border: none; }
.text-viewer { padding: 20px; overflow: auto; background-color: white; }
.text-viewer pre { margin: 0; font-family: Consolas, monospace; white-space: pre-wrap; font-size: 0.9rem; color: #333; }
.empty-file-state { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; color: #888; font-style: italic; }

/* --- RESIZERS --- */
.resizer-vertical { width: 6px; background-color: #ccc; cursor: col-resize; z-index: 10; border-left: 1px solid #bbb; border-right: 1px solid #bbb; }
.resizer-horizontal { height: 6px; background-color: #ccc; cursor: row-resize; z-index: 10; display: flex; justify-content: center; align-items: center; border-top: 1px solid #bbb; border-bottom: 1px solid #bbb; }

/* --- BOTTOM BOX (TABS) --- */
.bottom-box { background-color: #fcfcfc; overflow: hidden; display: flex; flex-direction: column; }
.tabs-header { display: flex; background-color: #e0e0e0; border-bottom: 1px solid #ccc; padding-left: 5px; flex-shrink: 0; }
.tab-item { padding: 8px 16px; cursor: pointer; background-color: #e0e0e0; border-right: 1px solid #d0d0d0; font-size: 0.9rem; display: flex; gap: 5px; }
.tab-item:hover { background-color: #d6d6d6; }
.tab-item.active { background-color: #fcfcfc; font-weight: bold; border-bottom: 2px solid transparent; }
.add-tab-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 0 15px; }
.tab-content { padding: 15px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
.list-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.delete-list-btn { background-color: transparent; color: #dc3545; border: 1px solid #dc3545; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.checklist-items { flex: 1; overflow-y: auto; margin-bottom: 10px; }
.check-item { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f0f0f0; }
.strikethrough { text-decoration: line-through; color: #999; }
.delete-item-btn { margin-left: auto; background: none; border: none; color: #999; cursor: pointer; }
.add-item-box { display: flex; gap: 5px; margin-top: auto; }
.add-item-box input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.add-item-box button { padding: 8px 15px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; }

/* --- TABLES & POPUP --- */
.ins-panel, .defect-panel { background-color: white; border: 1px solid #ddd; width: 95%; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.panel-title { background-color: #2c3e50; color: white; padding: 10px; margin: 0; text-align: center; }
.styled-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.styled-table th { background-color: #f2f2f2; border: 1px solid #ccc; padding: 8px; }
.styled-table td { border: 1px solid #ccc; padding: 6px; }
.col-xs { width: 40px; } .col-xl { width: auto; } .text-center { text-align: center; } .text-right { text-align: right; } .bg-light { background-color: #f9f9f9; }
.summary-row td { border-top: 2px solid #333; font-weight: bold; }
.total-row { background-color: #e8f5e9; } .unique-row { background-color: #e3f2fd; } .label-cell { padding-right: 15px; text-transform: uppercase; font-size: 0.8rem; }
.popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 9999; }
.popup { background: white; padding: 25px; border-radius: 8px; width: 300px; display: flex; flex-direction: column; gap: 10px; }
.form-group { display: flex; flex-direction: column; }
.input-field { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.radio-group { flex-direction: row; gap: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px; }
.popup-buttons { display: flex; justify-content: space-between; margin-top: 15px; }
.add-defect-btn { background-color: #3498db; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; }
.add-btn { background-color: #27ae60; color: white; padding: 8px 16px; border: none; cursor: pointer; border-radius: 4px; }
.cancel-btn { background-color: #7f8c8d; color: white; padding: 8px 16px; border: none; cursor: pointer; border-radius: 4px; }
</style>
