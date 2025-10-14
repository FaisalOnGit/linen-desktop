import { useState, useRef, useCallback, useEffect } from "react";

export const useRfid = () => {
  const [ip, setIp] = useState("192.168.100.10"); // default fallback
  const [port, setPort] = useState(5084); // default fallback
  const [power, setPower] = useState(20);
  const [logs, setLogs] = useState("");
  const [tags, setTags] = useState([]);
  const [registerTags, setRegisterTags] = useState([]);
  const [groupingTags, setGroupingTags] = useState([]);
  const [sortingTags, setSortingTags] = useState([]);
  const [deliveryTags, setDeliveryTags] = useState([]);
  const [linenBersihTags, setLinenBersihTags] = useState([]);
  const [isGroupingActive, setIsGroupingActive] = useState(false);
  const [isSortingActive, setIsSortingActive] = useState(false);
  const [isRegisterActive, setIsRegisterActive] = useState(false);
  const [isDeliveryActive, setIsDeliveryActive] = useState(false);
  const [isLinenBersihActive, setIsLinenBersihActive] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Centralized connection state
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    connecting: false,
    error: null,
  });

  const logRef = useRef(null);
  const intervalRefs = useRef({
    grouping: null,
    sorting: null,
    register: null,
    delivery: null,
    linenBersih: null,
  });

  // Cleanup all intervals function
  const clearAllIntervals = useCallback(() => {
    Object.values(intervalRefs.current).forEach((intervalRef) => {
      if (intervalRef) {
        clearInterval(intervalRef);
      }
    });

    // Reset all interval refs
    intervalRefs.current = {
      grouping: null,
      sorting: null,
      register: null,
      delivery: null,
      linenBersih: null,
    };
  }, []);

  // Clear all data function (resets both intervals and tag data)
  const clearAllData = useCallback(() => {
    // Clear all intervals first
    clearAllIntervals();

    // Reset all tag data
    setTags([]);
    setRegisterTags([]);
    setGroupingTags([]);
    setSortingTags([]);
    setDeliveryTags([]);
    setLinenBersihTags([]);

    // Reset all active states
    setIsGroupingActive(false);
    setIsSortingActive(false);
    setIsRegisterActive(false);
    setIsDeliveryActive(false);
    setIsLinenBersihActive(false);

    // Clear logs
    setLogs("");

    console.log("🧹 All RFID data cleared");
  }, [clearAllIntervals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllData();
    };
  }, [clearAllData]);

  // Load config on hook initialization
  useEffect(() => {
    const loadConfig = async () => {
      try {
        if (typeof window !== "undefined" && window.electronAPI) {
          const config = await window.electronAPI.getConfig();
          if (config && config.ip && config.port) {
            setIp(config.ip);
            setPort(config.port);
            log(`📋 Config loaded: IP=${config.ip}, Port=${config.port}`);
          } else {
            log("⚠️ No valid config found, using defaults");
          }

          // Load power settings
          const powerSettings = await window.electronAPI.getPowerSettings();
          if (powerSettings) {
            log(`⚡ Power settings loaded: ${JSON.stringify(powerSettings)}`);
            // Store power settings for use in components
            if (typeof window !== "undefined") {
              window.powerSettings = powerSettings;
            }
          }
        } else {
          log("⚠️ Electron API not available, using default config");
        }
      } catch (err) {
        log("❌ Error loading config: " + err.message);
      } finally {
        setConfigLoaded(true);
      }
    };

    loadConfig();
  }, []);

  const log = useCallback((msg) => {
    setLogs((prev) => prev + msg + "\n");
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  const isRfidAvailable = typeof window !== "undefined" && window.rfidAPI;

  // Save config when IP or port changes
  const saveConfig = async (newIp, newPort) => {
    try {
      if (typeof window !== "undefined" && window.electronAPI) {
        const config = { ip: newIp, port: newPort };
        await window.electronAPI.saveConfig(config);
        log(`💾 Config saved: IP=${newIp}, Port=${newPort}`);
      }
    } catch (err) {
      log("❌ Error saving config: " + err.message);
    }
  };

  // Enhanced setIp that also saves to config
  const updateIp = async (newIp) => {
    setIp(newIp);
    if (configLoaded) {
      await saveConfig(newIp, port);
    }
  };

  // Enhanced setPort that also saves to config
  const updatePort = async (newPort) => {
    setPort(newPort);
    if (configLoaded) {
      await saveConfig(ip, newPort);
    }
  };

  // Reload config manually
  const reloadConfig = async () => {
    try {
      if (typeof window !== "undefined" && window.electronAPI) {
        const config = await window.electronAPI.getConfig();
        if (config && config.ip && config.port) {
          setIp(config.ip);
          setPort(config.port);
          log(`🔄 Config reloaded: IP=${config.ip}, Port=${config.port}`);
          return true;
        } else {
          log("⚠️ No valid config found");
          return false;
        }
      }
      return false;
    } catch (err) {
      log("❌ Error reloading config: " + err.message);
      return false;
    }
  };

  const connect = async (ipAddress, portNumber) => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      setConnectionStatus({
        connected: false,
        connecting: false,
        error: "RFID API not available",
      });
      return false;
    }

    // Use provided parameters or current state values
    const targetIp = ipAddress || ip;
    const targetPort = portNumber || port;

    setConnectionStatus((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const res = await window.rfidAPI.connect({
        ip: targetIp,
        port: targetPort,
      });
      log("✅ Connected: " + JSON.stringify(res));
      setConnectionStatus({ connected: true, connecting: false, error: null });

      // Auto-apply saved power settings after successful connection
      await applySavedPowerSettings();

      return true;
    } catch (err) {
      log("❌ Connect Error: " + err.message);
      setConnectionStatus({
        connected: false,
        connecting: false,
        error: err.message,
      });
      return false;
    }
  };

  const applySavedPowerSettings = async () => {
    try {
      if (typeof window !== "undefined" && window.powerSettings) {
        const { powerSettings, antennaEnabled } = window.powerSettings;

        log("⚡ Applying saved power settings...");

        // Apply power settings for enabled antennas
        for (let antennaId = 1; antennaId <= 4; antennaId++) {
          if (antennaEnabled[antennaId.toString()]) {
            const power = powerSettings[antennaId.toString()];
            const scaledPower = parseInt(power) * 10; // Convert to 0.1 dBm

            try {
              await setPowerLevel(antennaId, scaledPower);
              log(`⚡ Antenna ${antennaId}: Power set to ${power} dBm`);

              // Small delay between antenna settings to avoid overwhelming the reader
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
              log(`❌ Failed to set power for antenna ${antennaId}: ${err.message}`);
            }
          }
        }

        log("✅ Power settings application completed");
      }
    } catch (err) {
      log("❌ Error applying power settings: " + err.message);
    }
  };

  const disconnect = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      setConnectionStatus({
        connected: false,
        connecting: false,
        error: "RFID API not available",
      });
      return false;
    }

    try {
      const res = await window.rfidAPI.disconnect();
      log("🔌 Disconnected: " + JSON.stringify(res));
      setConnectionStatus({ connected: false, connecting: false, error: null });
      return true;
    } catch (err) {
      log("❌ Disconnect Error: " + err.message);
      setConnectionStatus({
        connected: false,
        connecting: false,
        error: err.message,
      });
      return false;
    }
  };

  const startInventory = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return false;
    }

    try {
      const res = await window.rfidAPI.startInventory();
      log("▶️ Start Inventory: " + JSON.stringify(res));
      return true;
    } catch (err) {
      log("❌ Start Error: " + err.message);
      return false;
    }
  };

  const stopInventory = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return false;
    }

    try {
      const res = await window.rfidAPI.stopInventory();
      log("⏹ Stop Inventory: " + JSON.stringify(res));
      return true;
    } catch (err) {
      log("❌ Stop Error: " + err.message);
      return false;
    }
  };

  const getTags = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const tagsData = await window.rfidAPI.getTags();
      setTags(tagsData);
      setRegisterTags(tagsData);
    } catch (err) {
      log("❌ GetTags Error: " + err.message);
    }
  };

  const clearTags = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const res = await window.rfidAPI.clearTags();
      log("🧹 Clear Tags: " + JSON.stringify(res));
    } catch (err) {
      // Don't log error if RFID is not initialized - this is expected on app start
      if (err.message && err.message.includes("RFID not initialized")) {
        console.log("ℹ️ RFID not initialized, skipping clearTags");
      } else {
        log("❌ ClearTags Error: " + err.message);
      }
    }
  };

  const getStatus = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const status = await window.rfidAPI.getStatus();
      log("📡 Status: " + JSON.stringify(status));
    } catch (err) {
      log("❌ Status Error: " + err.message);
    }
  };

  const setPowerLevel = async (antennaId, powerLevel) => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      // Convert antennaId to integer to ensure it's sent as ushort
      const antennaIdInt = parseInt(antennaId);
      const powerLevelInt = parseInt(powerLevel);

      // Debug log to check values before sending
      log(`🔧 Setting Antenna ${antennaIdInt} to ${powerLevelInt} dBm`);

      const res = await window.rfidAPI.setPower({
        antennaId: antennaIdInt,
        power: powerLevelInt,
      });
      log(`⚡ Set Power Result: ` + JSON.stringify(res));
    } catch (err) {
      log("❌ SetPower Error: " + err.message);
    }
  };

  const getPowerLevel = async (antennaId) => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      // Convert antennaId to integer to ensure it's sent as ushort
      const antennaIdInt = parseInt(antennaId);

      const res = await window.rfidAPI.getPower({
        antennaId: antennaIdInt,
      });
      log(`📊 Get Power Result: ` + JSON.stringify(res));
      return res;
    } catch (err) {
      log("❌ GetPower Error: " + err.message);
      return null;
    }
  };

  // ==================
  // Register
  // ==================

  const startRegister = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    // Clear existing interval if any
    if (intervalRefs.current.register) {
      clearInterval(intervalRefs.current.register);
      intervalRefs.current.register = null;
    }

    try {
      await window.rfidAPI.startInventory();
      setIsRegisterActive(true);

      intervalRefs.current.register = setInterval(async () => {
        try {
          const tagsData = await window.rfidAPI.getTags();

          // Only add new tags that don't exist in current registerTags
          setRegisterTags(prevTags => {
            const existingEpcSet = new Set(prevTags.map(tag => tag.EPC));
            const newTags = tagsData.filter(tag => !existingEpcSet.has(tag.EPC));
            return [...prevTags, ...newTags];
          });
        } catch (err) {
          console.error("Error fetching register tags:", err);
        }
      }, 1000); // Increased from 500ms to 1 second
    } catch (err) {
      console.error("Error starting register:", err);
    }
  };

  const stopRegister = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    try {
      await window.rfidAPI.stopInventory();
      setIsRegisterActive(false);
      if (intervalRefs.current.register) {
        clearInterval(intervalRefs.current.register);
        intervalRefs.current.register = null;
      }
    } catch (err) {
      console.error("Error stopping register:", err);
    }
  };

  // ==================
  // Grouping
  // ==================

  const startGrouping = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    // Clear existing interval if any
    if (intervalRefs.current.grouping) {
      clearInterval(intervalRefs.current.grouping);
      intervalRefs.current.grouping = null;
    }

    try {
      await window.rfidAPI.startInventory();
      setIsGroupingActive(true);

      intervalRefs.current.grouping = setInterval(async () => {
        try {
          const tagsData = await window.rfidAPI.getTags();
          const enrichedTags = tagsData.map((tag) => ({
            ...tag,
            linenName: "Selimut",
            customerName: "RS NCI",
            room: "IGD",
            status: "Sewa",
          }));
          setGroupingTags(enrichedTags);
        } catch (err) {
          console.error("Error fetching tags:", err);
        }
      }, 500);
    } catch (err) {
      console.error("Error starting grouping:", err);
    }
  };

  const stopGrouping = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    try {
      await window.rfidAPI.stopInventory();
      setIsGroupingActive(false);
      if (intervalRefs.current.grouping) {
        clearInterval(intervalRefs.current.grouping);
        intervalRefs.current.grouping = null;
      }
    } catch (err) {
      console.error("Error stopping grouping:", err);
    }
  };

  // ==================
  // Sorting
  // ==================
  const startSorting = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    // Clear existing interval if any
    if (intervalRefs.current.sorting) {
      clearInterval(intervalRefs.current.sorting);
      intervalRefs.current.sorting = null;
    }

    try {
      await window.rfidAPI.startInventory();
      setIsSortingActive(true);

      intervalRefs.current.sorting = setInterval(async () => {
        try {
          const tagsData = await window.rfidAPI.getTags();
          // bedakan by antennaId
          const enrichedTags = tagsData.map((tag) => ({
            ...tag,
            linenName: "Handuk",
            customerName: "RS NCI",
            room: tag.antenna === 1 ? "Meja Kiri" : "Meja Kanan",
            status: "Sorting",
          }));
          setSortingTags(enrichedTags);
        } catch (err) {
          console.error("Error fetching sorting tags:", err);
        }
      }, 500);
    } catch (err) {
      console.error("Error starting sorting:", err);
    }
  };

  const stopSorting = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    try {
      await window.rfidAPI.stopInventory();
      setIsSortingActive(false);
      if (intervalRefs.current.sorting) {
        clearInterval(intervalRefs.current.sorting);
        intervalRefs.current.sorting = null;
      }
    } catch (err) {
      console.error("Error stopping sorting:", err);
    }
  };

  // ==================
  // Delivery
  // ==================

  const startDelivery = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    // Clear existing interval if any
    if (intervalRefs.current.delivery) {
      clearInterval(intervalRefs.current.delivery);
      intervalRefs.current.delivery = null;
    }

    try {
      await window.rfidAPI.startInventory();
      setIsDeliveryActive(true);

      intervalRefs.current.delivery = setInterval(async () => {
        try {
          const tagsData = await window.rfidAPI.getTags();

          // Only add new tags that don't exist in current deliveryTags
          setDeliveryTags(prevTags => {
            const existingEpcSet = new Set(prevTags.map(tag => tag.EPC));
            const newTags = tagsData.filter(tag => !existingEpcSet.has(tag.EPC));

            const enrichedTags = newTags.map((tag) => ({
              ...tag,
              linenName: "Sprei",
              customerName: "RS NCI",
              room: "Delivery Area",
              status: "Siap Kirim",
              deliveryDate: new Date().toISOString().split("T")[0],
            }));

            return [...prevTags, ...enrichedTags];
          });
        } catch (err) {
          console.error("Error fetching delivery tags:", err);
        }
      }, 500);
    } catch (err) {
      console.error("Error starting delivery:", err);
    }
  };

  const stopDelivery = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    try {
      await window.rfidAPI.stopInventory();
      setIsDeliveryActive(false);
      if (intervalRefs.current.delivery) {
        clearInterval(intervalRefs.current.delivery);
        intervalRefs.current.delivery = null;
      }
    } catch (err) {
      console.error("Error stopping delivery:", err);
    }
  };

  // ==================
  // Linen Bersih
  // ==================

  const startLinenBersih = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    // Clear existing interval if any
    if (intervalRefs.current.linenBersih) {
      clearInterval(intervalRefs.current.linenBersih);
      intervalRefs.current.linenBersih = null;
    }

    try {
      await window.rfidAPI.startInventory();
      setIsLinenBersihActive(true);

      intervalRefs.current.linenBersih = setInterval(async () => {
        try {
          const tagsData = await window.rfidAPI.getTags();
          const enrichedTags = tagsData.map((tag) => ({
            ...tag,
            linenName: "Sarung Bantal",
            customerName: "RS NCI",
            room: "Storage Bersih",
            status: "Bersih",
            washDate: new Date().toISOString().split("T")[0],
            qualityCheck: "Passed",
          }));
          setLinenBersihTags(enrichedTags);
        } catch (err) {
          console.error("Error fetching linen bersih tags:", err);
        }
      }, 500);
    } catch (err) {
      console.error("Error starting linen bersih:", err);
    }
  };

  const stopLinenBersih = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    try {
      await window.rfidAPI.stopInventory();
      setIsLinenBersihActive(false);
      if (intervalRefs.current.linenBersih) {
        clearInterval(intervalRefs.current.linenBersih);
        intervalRefs.current.linenBersih = null;
      }
    } catch (err) {
      console.error("Error stopping linen bersih:", err);
    }
  };

  return {
    // State
    ip,
    setIp: updateIp, // Enhanced version that saves to config
    port,
    setPort: updatePort, // Enhanced version that saves to config
    power,
    setPower,
    logs,
    tags,
    registerTags,
    groupingTags,
    sortingTags,
    deliveryTags,
    linenBersihTags,
    isGroupingActive,
    isSortingActive,
    isRegisterActive,
    isDeliveryActive,
    isLinenBersihActive,
    configLoaded, // New state to track if config is loaded

    // Centralized connection state
    isConnected: connectionStatus.connected,
    isConnecting: connectionStatus.connecting,
    connectionError: connectionStatus.error,

    // Refs
    logRef,
    intervalRefs,

    // Methods
    connect,
    disconnect,
    startInventory,
    stopInventory,
    getTags,
    clearTags,
    getStatus,
    setPowerLevel,
    getPowerLevel,
    startRegister,
    stopRegister,
    startGrouping,
    stopGrouping,
    startSorting,
    stopSorting,
    startDelivery,
    stopDelivery,
    startLinenBersih,
    stopLinenBersih,
    isRfidAvailable,
    reloadConfig,
    saveConfig,
    clearAllIntervals,
    clearAllData,
    // Expose tag states for components to clear their local state
    clearTagStates: () => {
      setTags([]);
      setRegisterTags([]);
      setGroupingTags([]);
      setSortingTags([]);
      setDeliveryTags([]);
      setLinenBersihTags([]);
    },
  };
};
