const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  shell,
} = require("electron");
const path = require("path");
const { Worker } = require("worker_threads");
const edge = require("electron-edge-js");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Path ke DLL RFID
const dllPath = path.join(__dirname, "lib", "ZebraLib.dll");

// Edge functions untuk RFID
const connect = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "Connect",
});

const startInventory = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "StartInventory",
});

const stopInventory = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "StopInventory",
});

const disconnect = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "Disconnect",
});

const getTags = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "GetTags",
});

const clearTags = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "ClearTags",
});

const setPower = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "SetPower",
});

// RFID State management
let isConnected = false;
let isInventoryRunning = false;
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    title: "RFID Dashboard - Choralith",
    icon: path.join(__dirname, "assets", "icon.png"),
    width: 1200,
    height: 800,
    webPreferences: {
      sandbox: false,
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

// RFID IPC Handlers
ipcMain.handle("rfid-connect", async (event, config) => {
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
  if (isConnected) {
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
  if (isConnected) {
    try {
      disconnect(null, () => {
        console.log("Force disconnect RFID on app quit");
      });
    } catch (error) {
      console.error("Error during force RFID disconnect:", error);
    }
  }
});
