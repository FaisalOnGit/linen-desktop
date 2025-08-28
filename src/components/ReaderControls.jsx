import React from "react";

const ReaderControls = ({
  ip,
  setIp,
  port,
  setPort,
  power,
  setPower,
  onConnect,
  onStart,
  onStop,
  onDisconnect,
  onGetTags,
  onClearTags,
  onStatus,
  onSetPower,
}) => {
  return (
    <>
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
              onClick={onSetPower}
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
            onClick={onConnect}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Connect
          </button>
          <button
            onClick={onStart}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Start
          </button>
          <button
            onClick={onStop}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Stop
          </button>
          <button
            onClick={onDisconnect}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Disconnect
          </button>
          <button
            onClick={onGetTags}
            className="bg-blue-800 hover:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Get Tags
          </button>
          <button
            onClick={onClearTags}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Clear Tags
          </button>
          <button
            onClick={onStatus}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Status
          </button>
        </div>
      </div>
    </>
  );
};

export default ReaderControls;
