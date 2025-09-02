const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { Worker } = require("worker_threads");
const Store = require("electron-store"); // npm install electron-store

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Initialize electron-store
const store = new Store();

// Function to get correct DLL path
function getDllPath() {
  let dllPath;

  if (isDev) {
    // Development mode
    dllPath = path.join(__dirname, "lib", "ZebraLib.dll");
  } else {
    // Production mode - check multiple possible locations
    const possiblePaths = [
      // From executable directory (extraFiles)
      path.join(path.dirname(process.execPath), "ZebraLib.dll"),
      // From extraResources
      path.join(process.resourcesPath, "lib", "ZebraLib.dll"),
      // From app directory
      path.join(__dirname, "lib", "ZebraLib.dll"),
      // From parent directory
      path.join(path.dirname(__dirname), "lib", "ZebraLib.dll"),
      // From resources directory
      path.join(
        path.dirname(process.execPath),
        "resources",
        "lib",
        "ZebraLib.dll"
      ),
    ];

    for (const possiblePath of possiblePaths) {
      console.log("Checking path:", possiblePath);
      if (fs.existsSync(possiblePath)) {
        dllPath = possiblePath;
        console.log("Found DLL at:", dllPath);
        break;
      }
    }

    if (!dllPath) {
      // Debug info
      console.error("=== DLL Path Debug Info ===");
      console.error("__dirname:", __dirname);
      console.error("process.execPath:", process.execPath);
      console.error("process.resourcesPath:", process.resourcesPath);
      console.error("app.getAppPath():", app.getAppPath());

      // List files in resource directory
      try {
        console.error(
          "Files in resourcesPath:",
          fs.readdirSync(process.resourcesPath)
        );
        const libDir = path.join(process.resourcesPath, "lib");
        if (fs.existsSync(libDir)) {
          console.error("Files in lib directory:", fs.readdirSync(libDir));
        }
      } catch (err) {
        console.error("Error listing files:", err);
      }

      throw new Error("ZebraLib.dll not found in any expected location");
    }
  }

  console.log("Using DLL path:", dllPath);
  console.log("DLL exists:", fs.existsSync(dllPath));

  return dllPath;
}

// Initialize DLL path and edge functions
let dllPath;
let connect,
  startInventory,
  stopInventory,
  disconnect,
  getTags,
  clearTags,
  setPower;

function initializeRfidFunctions() {
  try {
    dllPath = getDllPath();
    const edge = require("electron-edge-js");

    // Set .NET Framework version untuk edge-js
    process.env.EDGE_USE_CORECLR = "0"; // Force menggunakan .NET Framework, bukan .NET Core

    // Edge functions untuk RFID dengan explicit .NET Framework config
    connect = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "Connect",
      sync: false, // Pastikan async
    });

    startInventory = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "StartInventory",
      sync: false,
    });

    stopInventory = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "StopInventory",
      sync: false,
    });

    disconnect = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "Disconnect",
      sync: false,
    });

    getTags = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "GetTags",
      sync: false,
    });

    clearTags = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "ClearTags",
      sync: false,
    });

    setPower = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "SetPower",
      sync: false,
    });

    console.log("RFID functions initialized successfully");
  } catch (error) {
    console.error("Error initializing RFID functions:", error);
    throw error;
  }
}

// RFID State management
let isConnected = false;
let isInventoryRunning = false;
let mainWindow = null;
let rfidInitialized = false;

function createWindow() {
  const win = new BrowserWindow({
    title: "RFID Dashboard - Choralith",
    icon: path.join(__dirname, "assets", "icon.png"),
    width: 1200,
    height: 800,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Store reference for RFID events
  mainWindow = win;

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    win.loadFile(indexPath);
  }

  // Original audio functionality
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) return [];

    const folder = result.filePaths[0];

    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, "scanner-worker.js"), {
        workerData: { folder },
      });

      worker.on("message", (message) => {
        if (message.type === "progress") {
          win.webContents.send("scan-progress", {
            current: message.current,
            total: message.total,
          });
        } else if (message.type === "done") {
          resolve(message.tracks);
        }
      });

      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  });

  ipcMain.on("open-folder", (event, filePath) => {
    shell.showItemInFolder(filePath);
  });

  return win;
}

// ========== TOKEN STORAGE IPC HANDLERS ==========
ipcMain.handle("set-token", async (event, token) => {
  try {
    store.set("authToken", token);
    console.log("Token stored successfully");
    return { success: true };
  } catch (error) {
    console.error("Failed to store token:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-token", async () => {
  try {
    const token = store.get("authToken");
    console.log("Token retrieved:", token ? "exists" : "not found");
    return { success: true, token };
  } catch (error) {
    console.error("Failed to retrieve token:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("remove-token", async () => {
  try {
    store.delete("authToken");
    console.log("Token removed successfully");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove token:", error);
    return { success: false, error: error.message };
  }
});

// Check if token exists (useful for auto-login)
ipcMain.handle("has-token", async () => {
  try {
    const hasToken = store.has("authToken");
    console.log("Token exists:", hasToken);
    return { success: true, hasToken };
  } catch (error) {
    console.error("Failed to check token:", error);
    return { success: false, error: error.message };
  }
});

// Store user data (optional - untuk menyimpan data user lainnya)
ipcMain.handle("set-user-data", async (event, userData) => {
  try {
    store.set("userData", userData);
    console.log("User data stored successfully");
    return { success: true };
  } catch (error) {
    console.error("Failed to store user data:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-user-data", async () => {
  try {
    const userData = store.get("userData");
    console.log("User data retrieved:", userData ? "exists" : "not found");
    return { success: true, userData };
  } catch (error) {
    console.error("Failed to retrieve user data:", error);
    return { success: false, error: error.message };
  }
});

// Clear all stored auth data
ipcMain.handle("clear-auth-data", async () => {
  try {
    store.delete("authToken");
    store.delete("userData");
    console.log("All auth data cleared");
    return { success: true };
  } catch (error) {
    console.error("Failed to clear auth data:", error);
    return { success: false, error: error.message };
  }
});

// ========== RFID IPC HANDLERS ==========
ipcMain.handle("rfid-connect", async (event, config) => {
  if (!rfidInitialized) {
    try {
      initializeRfidFunctions();
      rfidInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize RFID: ${error.message}`);
    }
  }

  return new Promise((resolve, reject) => {
    const { ip, port } = config;

    connect({ ip, port }, (error, result) => {
      if (error) {
        console.error("RFID Connect Error:", error);
        isConnected = false;
        reject(error);
        return;
      }

      console.log("RFID Connect Result:", result);
      isConnected = true;
      resolve(result);
    });
  });
});

ipcMain.handle("rfid-start-inventory", async () => {
  if (!rfidInitialized) {
    throw new Error("RFID not initialized");
  }

  return new Promise((resolve, reject) => {
    if (!isConnected) {
      reject(new Error("Not connected to RFID reader"));
      return;
    }

    startInventory(null, (err, res) => {
      if (err) {
        console.error("RFID Start Error:", err);
        reject(err);
        return;
      }

      console.log("RFID Start Result:", res);
      isInventoryRunning = true;

      // Notify renderer
      if (mainWindow) {
        mainWindow.webContents.send("rfid-inventory-started", res);
      }

      resolve(res);
    });
  });
});

ipcMain.handle("rfid-stop-inventory", async () => {
  if (!rfidInitialized) {
    throw new Error("RFID not initialized");
  }

  return new Promise((resolve, reject) => {
    if (!isInventoryRunning) {
      resolve("Inventory not running");
      return;
    }

    stopInventory(null, (err, res) => {
      if (err) {
        console.error("RFID Stop Error:", err);
        reject(err);
        return;
      }

      console.log("RFID Stop Result:", res);
      isInventoryRunning = false;
      resolve(res);
    });
  });
});

ipcMain.handle("rfid-disconnect", async () => {
  if (!rfidInitialized) {
    return "RFID not initialized";
  }

  return new Promise((resolve, reject) => {
    if (!isConnected) {
      resolve("Not connected");
      return;
    }

    disconnect(null, (err, res) => {
      if (err) {
        console.error("RFID Disconnect Error:", err);
        reject(err);
        return;
      }

      console.log("RFID Disconnect Result:", res);
      isConnected = false;
      isInventoryRunning = false;
      resolve(res);
    });
  });
});

ipcMain.handle("rfid-get-tags", async () => {
  if (!rfidInitialized) {
    throw new Error("RFID not initialized");
  }

  return new Promise((resolve, reject) => {
    getTags(null, (err, res) => {
      if (err) {
        console.error("RFID GetTags Error:", err);
        reject(err);
        return;
      }
      resolve(res);
    });
  });
});

ipcMain.handle("rfid-clear-tags", async () => {
  if (!rfidInitialized) {
    throw new Error("RFID not initialized");
  }

  return new Promise((resolve, reject) => {
    clearTags(null, (err, res) => {
      if (err) {
        console.error("RFID ClearTags Error:", err);
        reject(err);
        return;
      }
      resolve(res);
    });
  });
});

ipcMain.handle("rfid-set-power", async (event, { antennaId = 1, power }) => {
  if (!rfidInitialized) {
    throw new Error("RFID not initialized");
  }

  return new Promise((resolve, reject) => {
    if (!isConnected) {
      reject(new Error("Not connected to RFID reader"));
      return;
    }

    setPower({ antennaId, power }, (err, res) => {
      if (err) {
        console.error("RFID SetPower Error:", err);
        reject(err);
        return;
      }

      console.log("RFID SetPower Result:", res);
      resolve(res);
    });
  });
});

ipcMain.handle("rfid-status", async () => {
  return {
    connected: isConnected,
    inventoryRunning: isInventoryRunning,
    initialized: rfidInitialized,
  };
});

app.whenReady().then(() => {
  protocol.registerFileProtocol("localfile", (request, callback) => {
    const url = request.url.replace("localfile://", "");
    callback(decodeURIComponent(url));
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Clean disconnect RFID before closing
  if (isConnected && rfidInitialized) {
    disconnect(null, (err, res) => {
      console.log("App closing - RFID disconnected");
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  } else {
    if (process.platform !== "darwin") {
      app.quit();
    }
  }
});

app.on("before-quit", () => {
  if (isConnected && rfidInitialized) {
    try {
      disconnect(null, () => {
        console.log("Force disconnect RFID on app quit");
      });
    } catch (error) {
      console.error("Error during force RFID disconnect:", error);
    }
  }
});
