import React, { useState, useEffect } from "react";
import GroupingTable from "../components/GroupingTable";
import { Play, Square } from "lucide-react";

const GroupingPage = ({ rfidHook }) => {
  const { groupingTags, startGrouping, stopGrouping } = rfidHook;
  const [isRunning, setIsRunning] = useState(false);
  const [lastTagData, setLastTagData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLinenData = async (epc) => {
    if (!epc) return null;

    setLoading(true);
    try {
      const response = await fetch(
        `https://app.nci.co.id/base_linen/api/Process/linen_rfid?epc=${epc}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        return result.data[0];
      }

      return null;
    } catch (error) {
      console.error("Error fetching linen data:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (isRunning) {
      stopGrouping();
    } else {
      startGrouping();
    }
    setIsRunning(!isRunning);
  };

  const lastTag =
    groupingTags && groupingTags.length > 0
      ? groupingTags[groupingTags.length - 1]
      : null;

  useEffect(() => {
    const fetchData = async () => {
      if (lastTag && lastTag.EPC) {
        const apiData = await fetchLinenData(lastTag.EPC);
        if (apiData) {
          const mergedData = {
            ...lastTag,
            ...apiData,
            linenName: apiData.linenName,
            customerName: apiData.customerName,
            room: apiData.roomName,
            status: apiData.status,
            linenTypeName: apiData.linenTypeName,
            customerId: apiData.customerId,
            linenId: apiData.linenId,
            roomId: apiData.roomId,
            statusId: apiData.statusId,
          };
          setLastTagData(mergedData);
        } else {
          setLastTagData(lastTag);
        }
      } else {
        setLastTagData(null);
      }
    };

    fetchData();
  }, [lastTag]);

  const displayData = lastTagData || lastTag;

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h1 className="text-2xl font-semibold text-primary">Grouping</h1>
      </div>

      {/* Info Section with button top-right */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Detail Info</h2>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
              isRunning
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-blue-800"
            }`}
            disabled={loading}
          >
            {isRunning ? (
              <>
                <Square className="w-5 h-5" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start
              </>
            )}
          </button>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mb-4 text-blue-600 text-sm">
            Loading linen data...
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-y-2 font-bold">
          <div className="flex items-center">
            <label className="text-gray-600 w-24">RFID</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {displayData ? displayData.EPC || displayData.epc || "?" : "−"}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Linen</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {displayData ? displayData.linenName || "-" : "−"}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Customer</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {displayData ? displayData.customerName || "-" : "−"}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Ruangan</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {displayData
                ? displayData.room || displayData.roomName || "-"
                : "−"}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Status</label>
            <span className="mx-3">:</span>
            <span
              className={`px-2 py-1 rounded text-sm ${
                displayData?.status === "Bersih"
                  ? "bg-green-100 text-green-800"
                  : displayData?.status
                  ? "bg-gray-100 text-gray-800"
                  : ""
              }`}
            >
              {displayData ? displayData.status || "-" : "−"}
            </span>
          </div>
        </div>
      </div>
      <GroupingTable groupingTags={groupingTags} />
    </div>
  );
};

export default GroupingPage;
