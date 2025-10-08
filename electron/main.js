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
const { loadConfig, saveConfig, savePowerSettings, getPowerSettings } = require("./config");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Function to get correct DLL path
function getDllPath() {
  let dllPath;

  if (isDev) {
    // Development mode
    dllPath = path.join(__dirname, "lib", "ZebraLib.dll");
  } else {
    const possiblePaths = [
      path.join(path.dirname(process.execPath), "ZebraLib.dll"),

      path.join(process.resourcesPath, "lib", "ZebraLib.dll"),

      path.join(__dirname, "lib", "ZebraLib.dll"),

      path.join(path.dirname(__dirname), "lib", "ZebraLib.dll"),

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
      console.error("=== DLL Path Debug Info ===");
      console.error("__dirname:", __dirname);
      console.error("process.execPath:", process.execPath);
      console.error("process.resourcesPath:", process.resourcesPath);
      console.error("app.getAppPath():", app.getAppPath());

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

let dllPath;
let connect,
  startInventory,
  stopInventory,
  disconnect,
  getTags,
  clearTags,
  setPower,
  getPower;

function initializeRfidFunctions() {
  try {
    dllPath = getDllPath();
    const edge = require("electron-edge-js");

    process.env.EDGE_USE_CORECLR = "0";

    connect = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "Connect",
      sync: false,
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

    getPower = edge.func({
      assemblyFile: dllPath,
      typeName: "ZebraLib.RfidWrapper",
      methodName: "GetPower",
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
    title: "RFID Dashboard",
    icon: path.join(__dirname, "..", "assets", "icons", "electron-icon.ico"),
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
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

ipcMain.handle("get-config", () => {
  return loadConfig();
});

ipcMain.handle("save-config", (event, config) => {
  saveConfig(config);
  return true;
});

ipcMain.handle("save-power-settings", (event, { powerSettings, antennaEnabled }) => {
  savePowerSettings(powerSettings, antennaEnabled);
  return true;
});

ipcMain.handle("get-power-settings", () => {
  return getPowerSettings();
});

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

    // Clear tags before starting new inventory to prevent old tag contamination
    clearTags(null, (clearErr, clearRes) => {
      if (clearErr) {
        console.error("Failed to clear tags before inventory:", clearErr);
      }
    });

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

ipcMain.handle("rfid-get-power", async (event, { antennaId }) => {
  if (!rfidInitialized) {
    throw new Error("RFID not initialized");
  }

  return new Promise((resolve, reject) => {
    if (!isConnected) {
      reject(new Error("Not connected to RFID reader"));
      return;
    }

    getPower({ antennaId }, (err, res) => {
      if (err) {
        console.error("RFID GetPower Error:", err);
        reject(err);
        return;
      }

      console.log("RFID GetPower Result:", res);
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

// Printer IPC Handlers using Windows raw printing
ipcMain.handle("print-label", async (event, printData) => {
  try {
    const { zpl, printer: printerConfig } = printData;
    console.log("Printer config:", printerConfig);

    // Get the printer name
    const printerName =
      printerConfig.printerName || "ZDesigner ZD888-203dpi ZPL (Copy 1)";

    // Create temporary file for ZPL data
    const tempFile = path.join(
      require("os").tmpdir(),
      `print_${Date.now()}.zpl`
    );
    fs.writeFileSync(tempFile, zpl, "utf8");

    console.log("Printing to:", printerName);
    console.log("ZPL data:", zpl);
    console.log("Temp file:", tempFile);

    // Use the method that was printing (even with format issues)
    try {
      // Use PowerShell Out-Printer method
      const psCommand = `Get-Content "${tempFile}" | Out-Printer -Name "${printerName}"`;

      await execPromise(`powershell -Command "${psCommand}"`);
      console.log("Print job sent successfully via PowerShell");
    } catch (error) {
      console.error("Print error:", error);
      throw new Error(`Print failed: ${error.message}`);
    }

    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch (cleanupError) {
      console.warn("Failed to clean up temp file:", cleanupError.message);
    }

    return true;
  } catch (error) {
    console.error("Print error:", error);
    throw new Error(`Print failed: ${error.message}`);
  }
});

ipcMain.handle("get-printers", async () => {
  try {
    // Get list of printers using PowerShell
    const psCommand =
      "Get-WmiObject -Class Win32_Printer | Select-Object Name, Status | ConvertTo-Json";

    try {
      const { stdout } = await execPromise(
        `powershell -Command "${psCommand}"`
      );
      const printersData = JSON.parse(stdout);

      // Handle single printer (PowerShell returns object, not array for single item)
      const printers = Array.isArray(printersData)
        ? printersData
        : [printersData];

      return printers.map((p) => ({
        name: p.Name,
        status: p.Status || "Ready",
        isDefault: false, // We'll check default separately if needed
      }));
    } catch (psError) {
      console.log("PowerShell method failed, using fallback list...");

      // Fallback to common Windows printer names
      const commonPrinters = [
        "ZDesigner ZD888-203dpi ZPL (Copy 1)",
        "ZDesigner ZD888-203dpi ZPL",
        "Microsoft Print to PDF",
        "Fax",
        "Microsoft XPS Document Writer",
      ];
      return commonPrinters.map((name) => ({ name, status: "unknown" }));
    }
  } catch (error) {
    console.error("Get printers error:", error);
    return [];
  }
});

ipcMain.handle("test-printer-connection", async (event, printerConfig) => {
  try {
    const { printerName } = printerConfig;

    if (!printerName) {
      throw new Error("Printer name is required");
    }

    // Check if printer exists in the system
    const psCommand = `Get-WmiObject -Class Win32_Printer -Filter "Name='${printerName}'" | Select-Object Name`;

    try {
      const { stdout } = await execPromise(
        `powershell -Command "${psCommand}"`
      );
      return stdout.includes(printerName);
    } catch (psError) {
      console.log("PowerShell check failed, assuming printer exists...");
      return true; // Assume printer exists if we can't check
    }
  } catch (error) {
    console.error("Test connection error:", error);
    return false;
  }
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
