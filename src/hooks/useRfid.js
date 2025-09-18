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

  const logRef = useRef(null);
  const groupingIntervalRef = useRef(null);
  const sortingIntervalRef = useRef(null);
  const registerIntervalRef = useRef(null);
  const deliveryIntervalRef = useRef(null);
  const linenBersihIntervalRef = useRef(null);

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
      return false;
    }

    // Use provided parameters or current state values
    const targetIp = ipAddress || ip;
    const targetPort = portNumber || port;

    try {
      const res = await window.rfidAPI.connect({
        ip: targetIp,
        port: targetPort,
      });
      log("✅ Connected: " + JSON.stringify(res));
      return true;
    } catch (err) {
      log("❌ Connect Error: " + err.message);
      return false;
    }
  };

  const disconnect = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return false;
    }

    try {
      const res = await window.rfidAPI.disconnect();
      log("🔌 Disconnected: " + JSON.stringify(res));
      return true;
    } catch (err) {
      log("❌ Disconnect Error: " + err.message);
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
      log("❌ ClearTags Error: " + err.message);
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

  // ==================
  // Register
  // ==================

  const startRegister = async () => {
    if (!isRfidAvailable) {
      console.error("RFID API not available");
      return;
    }

    try {
      await window.rfidAPI.startInventory();
      setIsRegisterActive(true);

      registerIntervalRef.current = setInterval(async () => {
        try {
          const tagsData = await window.rfidAPI.getTags();
          setRegisterTags(tagsData);
        } catch (err) {
          console.error("Error fetching register tags:", err);
        }
      }, 500);
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
      if (registerIntervalRef.current) {
        clearInterval(registerIntervalRef.current);
        registerIntervalRef.current = null;
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

    try {
      await window.rfidAPI.startInventory();
      setIsGroupingActive(true);

      groupingIntervalRef.current = setInterval(async () => {
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
      if (groupingIntervalRef.current) {
        clearInterval(groupingIntervalRef.current);
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

    try {
      await window.rfidAPI.startInventory();
      setIsSortingActive(true);

      sortingIntervalRef.current = setInterval(async () => {
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
      if (sortingIntervalRef.current) {
        clearInterval(sortingIntervalRef.current);
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

    try {
      await window.rfidAPI.startInventory();
      setIsDeliveryActive(true);

      deliveryIntervalRef.current = setInterval(async () => {
        try {
          const tagsData = await window.rfidAPI.getTags();
          const enrichedTags = tagsData.map((tag) => ({
            ...tag,
            linenName: "Sprei",
            customerName: "RS NCI",
            room: "Delivery Area",
            status: "Siap Kirim",
            deliveryDate: new Date().toISOString().split("T")[0],
          }));
          setDeliveryTags(enrichedTags);
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
      if (deliveryIntervalRef.current) {
        clearInterval(deliveryIntervalRef.current);
        deliveryIntervalRef.current = null;
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

    try {
      await window.rfidAPI.startInventory();
      setIsLinenBersihActive(true);

      linenBersihIntervalRef.current = setInterval(async () => {
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
      if (linenBersihIntervalRef.current) {
        clearInterval(linenBersihIntervalRef.current);
        linenBersihIntervalRef.current = null;
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
    logRef,
    groupingIntervalRef,
    sortingIntervalRef,
    registerIntervalRef,
    deliveryIntervalRef,
    linenBersihIntervalRef,

    // Methods
    connect,
    disconnect,
    startInventory,
    stopInventory,
    getTags,
    clearTags,
    getStatus,
    setPowerLevel,
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
  };
};
