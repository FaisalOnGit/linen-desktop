import React, { useState } from "react";
import GroupingTable from "../components/GroupingTable";
import { Play, Square } from "lucide-react";

const GroupingPage = ({ rfidHook }) => {
  const { groupingTags, startGrouping, stopGrouping } = rfidHook;
  const [isRunning, setIsRunning] = useState(false);

  const handleToggle = () => {
    if (isRunning) {
      stopGrouping();
    } else {
      startGrouping();
    }
    setIsRunning(!isRunning);
  };

  return (
    <div>
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

        {/* Info Grid */}
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

      <GroupingTable groupingTags={groupingTags} />
    </div>
  );
};

export default GroupingPage;
