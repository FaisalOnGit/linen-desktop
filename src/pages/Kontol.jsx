import React, { useState } from "react";
import { Wifi, Play } from "lucide-react";

const SettingPage = () => {
  const [ipAddress, setIpAddress] = useState("192.168.1.100");
  const [port, setPort] = useState("5084");
  const [antennas, setAntennas] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [powers, setPowers] = useState({
    1: 10,
    2: 3,
    3: 5,
    4: 3,
  });
  const [isApplying, setIsApplying] = useState(false);

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

  const handleConnect = () => {
    console.log("Connecting to:", { ipAddress, port });
  };

  const handleStartInventory = () => {
    console.log("Starting inventory...");
  };

  const handleApplySettings = () => {
    const settings = {
      ipAddress,
      port,
      antennas,
      powers,
    };

    console.log("Applied Settings:", settings);
    setIsApplying(true);

    setTimeout(() => {
      setIsApplying(false);
    }, 2000);
  };

  const PowerSlider = ({ id, label, value, onChange }) => {
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #4A72A5 0%, #4A72A5 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
              }}
            />
          </div>
          <div className="flex items-center space-x-1">
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium min-w-[32px] text-center">
              {value}
            </span>
            <span className="text-sm text-gray-500">dBm</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 font-sans min-h-screen">
      {/* Top Navigation Bar */}

      {/* Main Content */}
      <div className="h-[calc(100vh-56px)] overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Title */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-xl font-semibold text-blue-600 flex items-center space-x-2">
              <Wifi size={24} />
              <span>RFID Reader Setting</span>
            </h1>
          </div>

          {/* Connection Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* IP Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address
                </label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleConnect}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium flex items-center space-x-2"
                >
                  <Wifi size={16} />
                  <span>Connect</span>
                </button>
                <button
                  onClick={handleStartInventory}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center space-x-2"
                >
                  <Play size={16} />
                  <span>Start Inventory</span>
                </button>
              </div>
            </div>
          </div>

          {/* Antenna Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
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

          {/* Output Power Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-6">
              Output Power
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((powerId) => (
                <PowerSlider
                  key={powerId}
                  id={powerId}
                  label={`Power ${powerId}`}
                  value={powers[powerId]}
                  onChange={handlePowerChange}
                />
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end">
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
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default SettingPage;
