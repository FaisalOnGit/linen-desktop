// hooks/useRfid.js
import { useState, useRef, useCallback } from "react";

export const useRfid = () => {
  const [ip, setIp] = useState("192.168.100.10");
  const [port, setPort] = useState(5084);
  const [power, setPower] = useState(20);
  const [logs, setLogs] = useState("");
  const [tags, setTags] = useState([]);
  const [registerTags, setRegisterTags] = useState([]);
  const [groupingTags, setGroupingTags] = useState([]);
  const [sortingTags, setSortingTags] = useState([]);
  const [isGroupingActive, setIsGroupingActive] = useState(false);
  const [isSortingActive, setIsSortingActive] = useState(false);

  const logRef = useRef(null);
  const groupingIntervalRef = useRef(null);
  const sortingIntervalRef = useRef(null);

  const log = useCallback((msg) => {
    setLogs((prev) => prev + msg + "\n");
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 0);
  }, []);

  const isRfidAvailable = typeof window !== "undefined" && window.rfidAPI;

  const connect = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const res = await window.rfidAPI.connect({ ip, port });
      log("✅ Connected: " + JSON.stringify(res));
    } catch (err) {
      log("❌ Connect Error: " + err.message);
    }
  };

  const startInventory = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const res = await window.rfidAPI.startInventory();
      log("▶️ Start Inventory: " + JSON.stringify(res));
    } catch (err) {
      log("❌ Start Error: " + err.message);
    }
  };

  const stopInventory = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const res = await window.rfidAPI.stopInventory();
      log("⏹ Stop Inventory: " + JSON.stringify(res));
    } catch (err) {
      log("❌ Stop Error: " + err.message);
    }
  };

  const disconnect = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const res = await window.rfidAPI.disconnect();
      log("🔌 Disconnected: " + JSON.stringify(res));
    } catch (err) {
      log("❌ Disconnect Error: " + err.message);
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

  const setPowerLevel = async () => {
    if (!isRfidAvailable) {
      log("❌ RFID API not available");
      return;
    }

    try {
      const res = await window.rfidAPI.setPower({ antennaId: 1, power });
      log("⚡ Set Power: " + JSON.stringify(res));
    } catch (err) {
      log("❌ SetPower Error: " + err.message);
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

  return {
    // State
    ip,
    setIp,
    port,
    setPort,
    power,
    setPower,
    logs,
    tags,
    registerTags,
    groupingTags,
    sortingTags,
    isGroupingActive,
    isSortingActive,
    logRef,
    groupingIntervalRef,
    sortingIntervalRef,

    // Methods
    connect,
    startInventory,
    stopInventory,
    disconnect,
    getTags,
    clearTags,
    getStatus,
    setPowerLevel,
    startGrouping,
    stopGrouping,
    startSorting, // ⬅️ expose
    stopSorting,
    isRfidAvailable,
  };
};
