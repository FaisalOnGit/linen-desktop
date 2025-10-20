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
  savePowerSettings: (powerSettings, antennaEnabled) =>
    ipcRenderer.invoke("save-power-settings", {
      powerSettings,
      antennaEnabled,
    }),
  getPowerSettings: () => ipcRenderer.invoke("get-power-settings"),
});

// Add RFID API
contextBridge.exposeInMainWorld("rfidAPI", {
  connect: (config) => ipcRenderer.invoke("rfid-connect", config),
  startInventory: () => ipcRenderer.invoke("rfid-start-inventory"),
  stopInventory: () => ipcRenderer.invoke("rfid-stop-inventory"),
  disconnect: () => ipcRenderer.invoke("rfid-disconnect"),
  getTags: () => ipcRenderer.invoke("rfid-get-tags"),
  getTagsByAntenna: (antennaId) =>
    ipcRenderer.invoke("rfid-get-tags-by-antenna", { antennaId }),
  getAllAntennaTags: () => ipcRenderer.invoke("rfid-get-all-antenna-tags"),
  clearTags: () => ipcRenderer.invoke("rfid-clear-tags"),
  setPower: (config) => ipcRenderer.invoke("rfid-set-power", config),
  getPower: (config) => ipcRenderer.invoke("rfid-get-power", config),
  getInventoryStatus: () => ipcRenderer.invoke("rfid-get-inventory-status"),
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

  // Store user data in global variable
  setUser: async (userData) => {
    globalUserData = userData;
    console.log(
      "User data stored in global variable:",
      userData ? `${userData.firstName} ${userData.lastName}` : null
    );
    return Promise.resolve(true);
  },

  // Get stored user data
  getUser: async () => {
    return Promise.resolve(globalUserData);
  },

  // Get user first name
  getFirstName: async () => {
    return Promise.resolve(globalUserData?.firstName || null);
  },

  // Get user last name
  getLastName: async () => {
    return Promise.resolve(globalUserData?.lastName || null);
  },

  // Get full name
  getFullName: async () => {
    if (globalUserData?.firstName && globalUserData?.lastName) {
      return Promise.resolve(
        `${globalUserData.firstName} ${globalUserData.lastName}`
      );
    }
    return Promise.resolve(
      globalUserData?.firstName || globalUserData?.lastName || null
    );
  },

  // Clear stored token
  clearToken: async () => {
    globalToken = null;
    globalUserData = null;
    console.log("Token and user data cleared from global variable");
    return Promise.resolve(true);
  },

  // Check if token exists
  hasToken: async () => {
    return Promise.resolve(!!globalToken);
  },

  // Check if user data exists
  hasUser: async () => {
    return Promise.resolve(!!globalUserData);
  },
});

// Add Printer API
contextBridge.exposeInMainWorld("printerAPI", {
  // Print label with ZPL data
  printLabel: (printData) => ipcRenderer.invoke("print-label", printData),

  // Get available printers
  getPrinters: () => ipcRenderer.invoke("get-printers"),

  // Test printer connection
  testConnection: (printerConfig) =>
    ipcRenderer.invoke("test-printer-connection", printerConfig),
});

// Add Zebra BrowserPrint API
contextBridge.exposeInMainWorld("zebraAPI", {
  // Get default device
  getDefaultDevice: (type) => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.BrowserPrint) {
        window.BrowserPrint.getDefaultDevice(
          type,
          (device) => resolve(device),
          (error) => reject(error)
        );
      } else {
        reject(new Error("BrowserPrint not available"));
      }
    });
  },

  // Get local devices
  getLocalDevices: (type) => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.BrowserPrint) {
        window.BrowserPrint.getLocalDevices(
          (devices) => resolve(devices),
          (error) => reject(error),
          type
        );
      } else {
        reject(new Error("BrowserPrint not available"));
      }
    });
  },

  // Send ZPL to device
  sendToDevice: (device, zpl) => {
    return new Promise((resolve, reject) => {
      if (device && device.send) {
        device.send(
          zpl,
          () => resolve(),
          (error) => reject(error)
        );
      } else {
        reject(new Error("Invalid device or send method not available"));
      }
    });
  },
});
