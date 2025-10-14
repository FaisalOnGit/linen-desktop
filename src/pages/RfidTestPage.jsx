import React, { useState, useEffect } from "react";
import { useRfid } from "../hooks/useRfid";
import toast from "react-hot-toast";

const RfidTestPage = ({ rfidHook }) => {
  const [testResults, setTestResults] = useState([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  // Form inputs for testing
  const [connectIp, setConnectIp] = useState("192.168.100.10");
  const [connectPort, setConnectPort] = useState(5084);
  const [powerAntennaId, setPowerAntennaId] = useState(1);
  const [powerLevel, setPowerLevel] = useState(200);
  const [selectedAntennaId, setSelectedAntennaId] = useState(1);

  const {
    ip,
    port,
    logs,
    tags,
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    startInventory,
    stopInventory,
    getTags,
    clearTags,
    getStatus,
    setPowerLevel: setPowerLevelHook,
    getPowerLevel,
    isRfidAvailable,
  } = rfidHook;

  // Add test result to log
  const addTestResult = (testName, success, message, data = null) => {
    const result = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      testName,
      success,
      message,
      data,
    };
    setTestResults(prev => [result, ...prev]);
  };

  // Clear test results
  const clearTestResults = () => {
    setTestResults([]);
  };

  // Test function wrapper with error handling
  const runTest = async (testName, testFunction) => {
    try {
      addTestResult(testName, true, "Starting test...");
      const result = await testFunction();
      addTestResult(testName, true, "Success", result);
      toast.success(`${testName} - Success`);
      return result;
    } catch (error) {
      addTestResult(testName, false, error.message);
      toast.error(`${testName} - ${error.message}`);
      throw error;
    }
  };

  // Test 1: Connect
  const testConnect = async () => {
    return runTest("Connect", () => connect(connectIp, connectPort));
  };

  // Test 2: Disconnect
  const testDisconnect = async () => {
    return runTest("Disconnect", () => disconnect());
  };

  // Test 3: Start Inventory
  const testStartInventory = async () => {
    return runTest("Start Inventory", () => startInventory());
  };

  // Test 4: Stop Inventory
  const testStopInventory = async () => {
    return runTest("Stop Inventory", () => stopInventory());
  };

  // Test 5: Get Tags
  const testGetTags = async () => {
    return runTest("Get Tags", () => getTags());
  };

  // Test 6: Clear Tags
  const testClearTags = async () => {
    return runTest("Clear Tags", () => clearTags());
  };

  // Test 7: Get Status
  const testGetStatus = async () => {
    return runTest("Get Status", () => getStatus());
  };

  // Test 8: Set Power Level
  const testSetPower = async () => {
    return runTest("Set Power", () => setPowerLevelHook(powerAntennaId, powerLevel));
  };

  // Test 9: Get Power Level
  const testGetPower = async () => {
    return runTest("Get Power", () => getPowerLevel(selectedAntennaId));
  };

  // Test 10: Get Tags by Antenna (simulated)
  const testGetTagsByAntenna = async () => {
    return runTest("Get Tags by Antenna", async () => {
      const allTags = await getTags();
      const filteredTags = allTags.filter(tag => tag.AntennaID === selectedAntennaId);
      return {
        antennaId: selectedAntennaId,
        totalTags: filteredTags.length,
        tags: filteredTags
      };
    });
  };

  // Test 11: Get All Antenna Tags (simulated)
  const testGetAllAntennaTags = async () => {
    return runTest("Get All Antenna Tags", async () => {
      const allTags = await getTags();
      const antennaGroups = {};

      // Group tags by antenna
      for (let i = 1; i <= 4; i++) {
        antennaGroups[i] = allTags.filter(tag => tag.AntennaID === i);
      }

      return {
        totalUniqueTags: allTags.length,
        antennaGroups
      };
    });
  };

  // Run all tests sequentially
  const runAllTests = async () => {
    setIsTestRunning(true);
    clearTestResults();

    try {
      // Test connection first
      await testConnect();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test power settings
      await testSetPower();
      await new Promise(resolve => setTimeout(resolve, 500));
      await testGetPower();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test inventory operations
      await testStartInventory();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for tags

      await testGetTags();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testGetTagsByAntenna();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testGetAllAntennaTags();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testGetStatus();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testStopInventory();
      await new Promise(resolve => setTimeout(resolve, 500));

      await testClearTags();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test disconnection
      await testDisconnect();

      toast.success("All tests completed!");
    } catch (error) {
      console.error("Test sequence failed:", error);
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">RFID Wrapper Test Page</h1>
        <p className="text-gray-600">Comprehensive testing for all RfidWrapper functions</p>

        {/* Connection Status */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">IP:</span> {ip}
            </div>
            <div>
              <span className="font-medium">Port:</span> {port}
            </div>
            <div>
              <span className="font-medium">Connected:</span>{" "}
              <span className={`font-bold ${isConnected ? "text-green-600" : "text-red-600"}`}>
                {isConnected ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="font-medium">RFID Available:</span>{" "}
              <span className={`font-bold ${isRfidAvailable ? "text-green-600" : "text-red-600"}`}>
                {isRfidAvailable ? "Yes" : "No"}
              </span>
            </div>
            {connectionError && (
              <div className="col-span-2 text-red-600">
                <span className="font-medium">Error:</span> {connectionError}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Test Controls</h2>

          {/* Connection Tests */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Connection Tests</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="IP Address"
                  value={connectIp}
                  onChange={(e) => setConnectIp(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Port"
                  value={connectPort}
                  onChange={(e) => setConnectPort(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={testConnect}
                  disabled={isTestRunning}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  Test Connect
                </button>
                <button
                  onClick={testDisconnect}
                  disabled={isTestRunning}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  Test Disconnect
                </button>
              </div>
            </div>
          </div>

          {/* Power Tests */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Power Tests</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Antenna ID</label>
                  <select
                    value={powerAntennaId}
                    onChange={(e) => setPowerAntennaId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4].map(id => (
                      <option key={id} value={id}>Antenna {id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Power Level</label>
                  <input
                    type="number"
                    value={powerLevel}
                    onChange={(e) => setPowerLevel(parseInt(e.target.value))}
                    min="0"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={testSetPower}
                  disabled={isTestRunning}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
                >
                  Set Power
                </button>
                <div>
                  <select
                    value={selectedAntennaId}
                    onChange={(e) => setSelectedAntennaId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  >
                    {[1, 2, 3, 4].map(id => (
                      <option key={id} value={id}>Antenna {id}</option>
                    ))}
                  </select>
                  <button
                    onClick={testGetPower}
                    disabled={isTestRunning}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Get Power
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Tests */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Inventory Tests</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testStartInventory}
                disabled={isTestRunning}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                Start Inventory
              </button>
              <button
                onClick={testStopInventory}
                disabled={isTestRunning}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                Stop Inventory
              </button>
              <button
                onClick={testGetTags}
                disabled={isTestRunning}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Get Tags
              </button>
              <button
                onClick={testClearTags}
                disabled={isTestRunning}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400"
              >
                Clear Tags
              </button>
              <button
                onClick={testGetStatus}
                disabled={isTestRunning}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                Get Status
              </button>
              <button
                onClick={testGetTagsByAntenna}
                disabled={isTestRunning}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                Tags by Antenna
              </button>
            </div>
          </div>

          {/* Advanced Tests */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Advanced Tests</h3>
            <div className="space-y-2">
              <button
                onClick={testGetAllAntennaTags}
                disabled={isTestRunning}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400"
              >
                Get All Antenna Tags
              </button>
              <button
                onClick={runAllTests}
                disabled={isTestRunning}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 font-bold"
              >
                {isTestRunning ? "Running All Tests..." : "Run All Tests"}
              </button>
              <button
                onClick={clearTestResults}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear Results
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Test Results</h2>
          <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center">No tests run yet</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            result.success ? "text-green-700" : "text-red-700"
                          }`}>
                            {result.testName}
                          </span>
                          <span className="text-xs text-gray-500">{result.timestamp}</span>
                        </div>
                        <p className={`text-sm mt-1 ${
                          result.success ? "text-green-600" : "text-red-600"
                        }`}>
                          {result.message}
                        </p>
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer">View Data</summary>
                            <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        result.success ? "bg-green-500" : "bg-red-500"
                      }`}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Tags Display */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Current Tags ({tags.length})
        </h2>
        {tags.length === 0 ? (
          <p className="text-gray-500">No tags detected</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EPC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Antenna ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Antenna Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Seen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Read Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signal (dBm)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Peak RSSI (dBm)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tags.map((tag, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 max-w-xs truncate">
                      {tag.EPC}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tag.AntennaID}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {tag.AntennaName || `Antenna ${tag.AntennaID}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {tag.FirstSeen ? new Date(tag.FirstSeen).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {tag.Timestamp ? new Date(tag.Timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {tag.ReadCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {tag.SignalStrength !== undefined ? tag.SignalStrength.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {tag.PeakRSSI !== undefined ? tag.PeakRSSI.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Logs Display */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">System Logs</h2>
        <div className="h-48 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <pre>{logs || "No logs..."}</pre>
        </div>
      </div>
    </div>
  );
};

export default RfidTestPage;