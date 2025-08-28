const { contextBridge, ipcRenderer } = require("electron");

// Your existing API
contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  onScanProgress: (callback) => ipcRenderer.on("scan-progress", callback),
  openFolder: (filePath) => ipcRenderer.send("open-folder", filePath),
});

// Add RFID API
contextBridge.exposeInMainWorld("rfidAPI", {
  connect: (config) => ipcRenderer.invoke("rfid-connect", config),
  startInventory: () => ipcRenderer.invoke("rfid-start-inventory"),
  stopInventory: () => ipcRenderer.invoke("rfid-stop-inventory"),
  disconnect: () => ipcRenderer.invoke("rfid-disconnect"),
  getTags: () => ipcRenderer.invoke("rfid-get-tags"),
  clearTags: () => ipcRenderer.invoke("rfid-clear-tags"),
  setPower: (config) => ipcRenderer.invoke("rfid-set-power", config),
  getStatus: () => ipcRenderer.invoke("rfid-status"),
  onInventoryStarted: (callback) =>
    ipcRenderer.on("rfid-inventory-started", callback),
});
