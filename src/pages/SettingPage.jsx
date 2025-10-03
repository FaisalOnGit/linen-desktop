import React, { useState } from "react";
import {
  Play,
  CircleStop,
  Wifi,
  WifiOff,
  Activity,
  Monitor,
} from "lucide-react";
import LogViewer from "../components/LogViewer";
import { useTableMode } from "../contexts/TableModeContext";

const SettingPage = ({ rfidHook }) => {
  const {
    ip,
    setIp,
    port,
    setPort,
    connect,
    disconnect,
    startInventory,
    stopInventory,
    setPowerLevel,
    getStatus,
    logs,
    logRef,
    isConnected,
    isConnecting,
    connectionError,
  } = rfidHook;

  const { tableMode, handleTableModeChange } = useTableMode();

  const [antennas, setAntennas] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [powers, setPowers] = useState({
    1: 15,
    2: 15,
    3: 15,
    4: 15,
  });
  const [isApplying, setIsApplying] = useState(false);
  const [isInventoryActive, setIsInventoryActive] = useState(false);

  const handleAntennaChange = (antennaId) => {
    setAntennas((prev) => ({
      ...prev,
      [antennaId]: !prev[antennaId],
    }));
  };

  const handlePowerChange = (powerId, value) => {
    setPowers((prev) => ({
      ...prev,
      [powerId]: parseInt(value),
    }));
  };

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect();
      setIsInventoryActive(false);
    } else {
      await connect(ip, port);
    }
  };

  const handleStartInventory = async () => {
    if (isInventoryActive) {
      await stopInventory();
      setIsInventoryActive(false);
    } else {
      const success = await startInventory();
      if (success !== false) {
        setIsInventoryActive(true);
      }
    }
  };

  const handleCheckStatus = () => {
    getStatus();
  };

  const handleApplySettings = () => {
    Object.entries(powers).forEach(([antennaId, value]) => {
      if (antennas[antennaId]) {
        const scaledValue = parseInt(value) * 10; // convert ke 0.1 dBm
        console.log(`Setting antenna ${antennaId} to ${scaledValue}`);
        setPowerLevel(parseInt(antennaId), scaledValue);
      } else {
        console.log(`Antenna ${antennaId} disabled, skip power setting`);
      }
    });

    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
    }, 2000);
  };

  const PowerSlider = ({ id, label, value, onChange, enabled }) => {
    const percentage = (value / 30) * 100;

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <input
              type="range"
              min="0"
              max="30"
              value={value}
              onChange={(e) => onChange(id, e.target.value)}
              disabled={!enabled}
              className={`w-full h-2 rounded-lg appearance-none slider ${
                enabled
                  ? "cursor-pointer bg-gray-200"
                  : "cursor-not-allowed bg-gray-100"
              }`}
              style={{
                background: enabled
                  ? `linear-gradient(to right, #4A72A5 0%, #4A72A5 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
                  : "#e5e7eb",
              }}
            />
          </div>
          <div className="flex items-center space-x-1">
            <span
              className={`px-2 py-1 rounded text-sm font-medium min-w-[32px] text-center ${
                enabled ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"
              }`}
            >
              {value}
            </span>
            <span className="text-sm text-gray-500">dBm</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Table Mode Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">Mode Tabel:</span>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleTableModeChange("single")}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  tableMode === "single"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Single
              </button>
              <button
                onClick={() => handleTableModeChange("double")}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                  tableMode === "double"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Double
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* IP Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IP Address
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              disabled={isConnected}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200 ${
                isConnected ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* Port */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Port
            </label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isConnected}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200 ${
                isConnected ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`px-6 py-2 border rounded-lg font-medium flex items-center space-x-2 transition-colors duration-200 ${
                isConnected
                  ? "border-red-300 text-red-700 hover:bg-red-50"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              } ${
                isConnecting
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              {isConnecting ? (
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              ) : isConnected ? (
                <WifiOff size={16} />
              ) : (
                <Wifi size={16} />
              )}
              <span>
                {isConnecting
                  ? "Connecting..."
                  : isConnected
                  ? "Disconnect"
                  : "Connect"}
              </span>
            </button>
            <button
              onClick={handleStartInventory}
              disabled={!isConnected}
              className={`px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors duration-200 ${
                !isConnected
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : isInventoryActive
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isInventoryActive ? (
                <CircleStop size={16} />
              ) : (
                <Play size={16} />
              )}
              <span>
                {isInventoryActive ? "Stop Inventory" : "Start Inventory"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Antenna Selector */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Antenna</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((antennaId) => (
            <label
              key={antennaId}
              className="flex items-center space-x-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={antennas[antennaId]}
                onChange={() => handleAntennaChange(antennaId)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-600"
              />
              <span className="text-gray-700 font-medium">
                Antenna {antennaId}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Power Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-6">Output Power</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((powerId) => (
            <PowerSlider
              key={powerId}
              id={powerId}
              label={`Antenna ${powerId}`}
              value={powers[powerId]}
              onChange={handlePowerChange}
              enabled={antennas[powerId]}
            />
          ))}
        </div>
        {/* Apply Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleApplySettings}
            disabled={isApplying}
            className={`px-8 py-3 rounded-lg font-medium shadow-sm transition-all duration-200 ${
              isApplying
                ? "bg-green-500 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isApplying ? "Applied!" : "Apply Setting"}
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Logs</h2>
          <button
            onClick={handleCheckStatus}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium flex items-center space-x-2"
          >
            <Activity size={16} />
            <span>Status</span>
          </button>
        </div>

        <LogViewer logs={logs} logRef={logRef} />
      </div>
    </div>
  );
};

export default SettingPage;
