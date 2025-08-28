import React, { useState, useEffect, useRef } from "react";

const App = () => {
  const [activePage, setActivePage] = useState("reader");
  const [ip, setIp] = useState("192.168.100.10");
  const [port, setPort] = useState(5084);
  const [power, setPower] = useState(20);
  const [logs, setLogs] = useState("");
  const [tags, setTags] = useState([]);
  const [groupingTags, setGroupingTags] = useState([]);
  const [registerTags, setRegisterTags] = useState([]);
  const [isGroupingActive, setIsGroupingActive] = useState(false);

  const logRef = useRef(null);
  const groupingIntervalRef = useRef(null);

  const log = (msg) => {
    setLogs((prev) => prev + msg + "\n");
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  const handleNavigation = (page) => {
    setActivePage(page);
  };

  // Check if RFID API is available
  const isRfidAvailable = typeof window !== "undefined" && window.rfidAPI;

  const renderTags = (tagsData) => {
    if (!tagsData || tagsData.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="text-center py-8 text-gray-500">
            No tags detected
          </td>
        </tr>
      );
    }

    return tagsData.map((tag, index) => (
      <tr key={index}>
        <td className="px-4 py-2 border-b">{index + 1}</td>
        <td className="px-4 py-2 border-b font-mono text-sm">
          {tag.EPC || "-"}
        </td>
        <td className="px-4 py-2 border-b">{tag.AntennaID || "-"}</td>
        <td className="px-4 py-2 border-b">{tag.RSSI || "-"} dBm</td>
        <td className="px-4 py-2 border-b">
          {new Date().toLocaleTimeString()}
        </td>
      </tr>
    ));
  };

  const renderRegisterTags = (tagsData, antennaId) => {
    const filteredTags = tagsData.filter((tag) => tag.AntennaID === antennaId);

    if (filteredTags.length === 0) {
      return (
        <tr>
          <td colSpan="2" className="text-center py-4 text-gray-500">
            No tags detected
          </td>
        </tr>
      );
    }

    return filteredTags.map((tag, index) => (
      <tr key={index}>
        <td className="px-4 py-2 border-b font-mono text-sm">
          {tag.EPC || "-"}
        </td>
        <td className="px-4 py-2 border-b">{tag.AntennaID || "-"}</td>
      </tr>
    ));
  };

  const handleConnect = async () => {
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

  const handleStart = async () => {
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

  const handleStop = async () => {
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

  const handleDisconnect = async () => {
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

  const handleGetTags = async () => {
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

  const handleClearTags = async () => {
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

  const handleStatus = async () => {
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

  const handleSetPower = async () => {
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

  const handleStartGrouping = async () => {
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

  const handleStopGrouping = async () => {
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

  useEffect(() => {
    return () => {
      if (groupingIntervalRef.current) {
        clearInterval(groupingIntervalRef.current);
      }
    };
  }, []);

  const navItems = [
    { id: "reader", label: "Setting Reader" },
    { id: "sorting", label: "Register Linen" },
    { id: "register", label: "Sorting Linen" },
    { id: "grouping", label: "Grouping Linen" },
  ];

  return (
    <div className="font-sans bg-gray-100 min-h-screen">
      {/* Navbar */}
      <nav className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-16 w-auto flex items-center">
                <span className="text-xl font-bold">OSLA Dashboard</span>
              </div>
            </div>
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activePage === item.id
                      ? "bg-blue-400 text-white font-medium"
                      : "text-gray-300 hover:bg-blue-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Reader Setting Page */}
        {activePage === "reader" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              RFID Reader Settings
            </h2>

            {/* Connection Settings */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Connection Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Power Settings */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Power Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Power Level (dBm)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={power}
                    onChange={(e) => setPower(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <button
                    onClick={handleSetPower}
                    className="w-full bg-blue-800 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Set Power
                  </button>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Reader Control
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <button
                  onClick={handleConnect}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Connect
                </button>
                <button
                  onClick={handleStart}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Start
                </button>
                <button
                  onClick={handleStop}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Stop
                </button>
                <button
                  onClick={handleDisconnect}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={handleGetTags}
                  className="bg-blue-800 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Get Tags
                </button>
                <button
                  onClick={handleClearTags}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Tags
                </button>
                <button
                  onClick={handleStatus}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Status
                </button>
              </div>
            </div>

            {/* Log Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Activity Log
              </h3>
              <div
                ref={logRef}
                className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-sm h-48 overflow-y-auto font-mono whitespace-pre-wrap"
              >
                {logs}
              </div>
            </div>

            {/* Tags Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Detected Tags
              </h3>
              <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
                <table className="min-w-full">
                  <thead className="bg-blue-800 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        EPC
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Antenna
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        RSSI
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {renderTags(tags)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Register Linen Page */}
        {activePage === "sorting" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Register Linen
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                  Linen Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      EPC Tag ID
                    </label>
                    <input
                      type="text"
                      placeholder="Scan or enter EPC tag"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Linen Type
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                      <option>Bed Sheet</option>
                      <option>Pillow Case</option>
                      <option>Towel</option>
                      <option>Blanket</option>
                      <option>Patient Gown</option>
                      <option>Surgical Drape</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                      <option>Small</option>
                      <option>Medium</option>
                      <option>Large</option>
                      <option>Extra Large</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <input
                      type="text"
                      placeholder="Enter color"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                      <option>General Ward</option>
                      <option>ICU</option>
                      <option>Surgery</option>
                      <option>Emergency</option>
                      <option>Maternity</option>
                      <option>Pediatric</option>
                    </select>
                  </div>
                  <button className="w-full bg-blue-800 hover:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium transition-colors">
                    Register Linen
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                  Quick Actions
                </h3>
                <div className="space-y-3 mb-6">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Scan New Tag
                  </button>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Bulk Register
                  </button>
                  <button className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Import from CSV
                  </button>
                </div>

                <h3 className="text-lg font-semibold mb-4 text-gray-700">
                  Recent Registrations
                </h3>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium">EPC123456</span>
                        <span className="text-sm text-gray-600 ml-2">
                          Bed Sheet
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">2 min ago</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium">EPC789012</span>
                        <span className="text-sm text-gray-600 ml-2">
                          Towel
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">5 min ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sorting Linen Page */}
        {activePage === "register" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Sorting Linen
            </h2>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Connection
              </h3>
              <button
                onClick={handleConnect}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Connect
              </button>
              <button
                onClick={handleStart}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-2"
              >
                Start (Register)
              </button>
              <button
                onClick={handleStop}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-2"
              >
                Stop
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Antena 1
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="py-2 px-4 border-b">EPC</th>
                        <th className="py-2 px-4 border-b">Antena</th>
                      </tr>
                    </thead>
                    <tbody>{renderRegisterTags(registerTags, 1)}</tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Antena 2
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="py-2 px-4 border-b">EPC</th>
                        <th className="py-2 px-4 border-b">Antena</th>
                      </tr>
                    </thead>
                    <tbody>{renderRegisterTags(registerTags, 2)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grouping Linen Page */}
        {activePage === "grouping" && (
          <div>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h1 className="text-2xl font-semibold text-blue-700">Grouping</h1>
            </div>
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={handleStartGrouping}
                className="bg-blue-700 hover:bg-blue-800 text-white px-12 py-2 rounded-lg font-medium transition-colors"
              >
                Start
              </button>
              <button
                onClick={handleStopGrouping}
                className="bg-red-600 text-white px-12 py-2 rounded-lg font-medium transition-colors"
              >
                Stop
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 gap-y-2 font-bold">
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">RFID</label>
                  <span className="mx-3">:</span>
                  <span className="text-gray-400">−</span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Linen</label>
                  <span className="mx-3">:</span>
                  <span className="text-gray-400">−</span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-24">Customer</label>
                  <span className="mx-3">:</span>
                  <span className="text-gray-400">−</span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Ruangan</label>
                  <span className="mx-3">:</span>
                  <span className="text-gray-400">−</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-200 border-b">
                    <th className="text-left py-4 px-4 font-medium text-gray-700">
                      No Seri RFID
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">
                      Nama Linen
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">
                      Nama Customer
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">
                      Ruangan
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">
                      Status Linen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupingTags.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-4 px-4 text-center text-gray-500"
                      >
                        Tidak ada tag terdeteksi
                      </td>
                    </tr>
                  ) : (
                    groupingTags.map((tag, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 text-gray-800">{tag.EPC}</td>
                        <td className="py-4 px-4 text-gray-800">
                          {tag.linenName}
                        </td>
                        <td className="py-4 px-4 text-gray-800">
                          {tag.customerName}
                        </td>
                        <td className="py-4 px-4 text-gray-800">{tag.room}</td>
                        <td className="py-4 px-4">
                          <span className="text-blue-700 font-medium">
                            {tag.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
