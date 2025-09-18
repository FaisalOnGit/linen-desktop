const { contextBridge, ipcRenderer } = require("electron");

// Global token storage
let globalToken = null;

// Your existing API
contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  onScanProgress: (callback) => ipcRenderer.on("scan-progress", callback),
  openFolder: (filePath) => ipcRenderer.send("open-folder", filePath),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
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

// Add Authentication API for token management
contextBridge.exposeInMainWorld("authAPI", {
  // Store token in global variable
  setToken: async (token) => {
    globalToken = token;
    console.log(
      "Token stored in global variable:",
      token ? "****" + token.slice(-4) : null
    );
    return Promise.resolve(true);
  },

  // Get stored token
  getToken: async () => {
    return Promise.resolve(globalToken);
  },

  // Clear stored token
  clearToken: async () => {
    globalToken = null;
    console.log("Token cleared from global variable");
    return Promise.resolve(true);
  },

  // Check if token exists
  hasToken: async () => {
    return Promise.resolve(!!globalToken);
  },
});
