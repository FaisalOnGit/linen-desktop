import React, {
  useState,
  useEffect,
  useMemo,
} from "react";
import GroupingTable from "../components/GroupingTable";
import { Play, Square } from "lucide-react";
import { useTableMode } from "../contexts/TableModeContext";
import { useGroupingData } from "../hooks/useGroupingData";

const GroupingPage = ({ rfidHook }) => {
  const {
    groupingTags,
    startGrouping,
    stopGrouping,
    isGroupingActive = false,
    isRfidAvailable,
  } = rfidHook || {};
  const { tableMode, handleTableModeChange } = useTableMode();
  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Use custom hook for data management
  const {
    processedTags,
    validEpcs,
    currentLinenInfo,
    clearAllData,
    processScannedEPC,
    getFilteredTags,
  } = useGroupingData(baseUrl);

  // Get all filtered tags (simplified - no antenna complexity)
  const filteredTags = useMemo(() => {
    return getFilteredTags(groupingTags);
  }, [groupingTags, getFilteredTags]);

  // Process the latest tag only with duplicate check
  useEffect(() => {
    if (groupingTags && groupingTags.length > 0) {
      const latestTag = groupingTags[groupingTags.length - 1];

      if (latestTag && latestTag.EPC) {
        // Check if this EPC already exists in filtered tags (table)
        const existingTag = filteredTags.find((tag) => tag.EPC === latestTag.EPC);

        if (existingTag) {
          console.warn(`⚠️ EPC ${latestTag.EPC} already exists in table, skipping`);
          return;
        }

        // Process the scanned EPC only if not duplicate
        processScannedEPC(latestTag.EPC);
      }
    }
  }, [groupingTags, processScannedEPC, filteredTags]);

  const handleToggle = () => {
    if (!isRfidAvailable) {
      alert("Device belum terkoneksi!");
      return;
    }

    if (isGroupingActive) {
      stopGrouping();
    } else {
      // Clear all data when starting new grouping session
      clearAllData();
      startGrouping();
    }
  };

  return (
    <div className="font-poppins">
      {/* Header */}

      {/* Info Section with button top-right */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Detail Info</h2>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
              !isRfidAvailable
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : isGroupingActive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-blue-800"
            }`}
            disabled={!isRfidAvailable}
          >
            {isGroupingActive ? (
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

        {/* Simplified Info Grid - Single reader like DeliveryPage */}
        <div className="grid grid-cols-1 gap-y-2 font-bold">
          <div className="flex items-center">
            <label className="text-gray-600 w-24">RFID</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {currentLinenInfo.epc || "−"}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Linen</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {currentLinenInfo.linenName}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Customer</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {currentLinenInfo.customerName}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Ruangan</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">{currentLinenInfo.roomName}</span>
          </div>
        </div>
      </div>

      {/* Simplified Table Rendering - Single table like DeliveryPage */}
      <div>
        <GroupingTable groupingTags={filteredTags} />
      </div>
    </div>
  );
};

export default GroupingPage;
