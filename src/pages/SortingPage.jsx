import React, { useState } from "react";
import SortingTable from "../components/SortingTable";
import { Play, Square } from "lucide-react";
import { useTableMode } from "../contexts/TableModeContext";

const SortingLinenPage = ({ rfidHook }) => {
  const { sortingTags, startSorting, stopSorting } = rfidHook;
  const [isRunning, setIsRunning] = useState(false);
  const { tableMode, handleTableModeChange } = useTableMode();

  // Pisahkan data berdasarkan antenna
  const antenna1Tags = sortingTags?.filter((tag) => tag.antenna === 1) || [];
  const antenna2Tags = sortingTags?.filter((tag) => tag.antenna === 2) || [];

  // Gabungkan semua tags untuk mode single
  const allTags = sortingTags || [];

  const handleToggle = () => {
    if (isRunning) {
      stopSorting();
    } else {
      startSorting();
    }
    setIsRunning(!isRunning);
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h1 className="text-2xl font-semibold text-primary">Sorting Linen</h1>
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
            <label className="text-gray-600 w-24">RFID</label>
            <span className="mx-3">:</span>
            <span className="text-gray-400">−</span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Linen</label>
            <span className="mx-3">:</span>
            <span className="text-gray-400">−</span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Customer</label>
            <span className="mx-3">:</span>
            <span className="text-gray-400">−</span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Ruangan</label>
            <span className="mx-3">:</span>
            <span className="text-gray-400">−</span>
          </div>
        </div>
      </div>

      {/* Conditional rendering berdasarkan tableMode */}
      {tableMode === "single" ? (
        // Single Table Mode
        <div>
          <div className="bg-blue-50 rounded-t-lg p-3 border-b border-blue-200">
            <h3 className="text-lg font-semibold text-primary">
              Semua Data ({allTags.length} items)
            </h3>
          </div>
          <SortingTable sortingTags={allTags} antennaNumber="all" />
        </div>
      ) : (
        // Double Table Mode
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabel Antenna 1 */}
          <div>
            <div className="bg-blue-50 rounded-t-lg p-3 border-b border-blue-200">
              <h3 className="text-lg font-semibold text-primary">
                Meja Kiri ({antenna1Tags.length} items)
              </h3>
            </div>
            <SortingTable sortingTags={antenna1Tags} antennaNumber={1} />
          </div>

          {/* Tabel Antenna 2 */}
          <div>
            <div className="bg-green-50 rounded-t-lg p-3 border-b border-green-200">
              <h3 className="text-lg font-semibold text-primary">
                Meja Kanan ({antenna2Tags.length} items)
              </h3>
            </div>
            <SortingTable sortingTags={antenna2Tags} antennaNumber={2} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SortingLinenPage;
