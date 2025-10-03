import React, { useState, useEffect } from "react";
import GroupingTable from "../components/GroupingTable";
import { Play, Square } from "lucide-react";
import { useTableMode } from "../contexts/TableModeContext";

const GroupingPage = ({ rfidHook }) => {
  const {
    groupingTags,
    startGrouping,
    stopGrouping,
    isGroupingActive = false,
    isRfidAvailable,
  } = rfidHook || {};
  const { tableMode, handleTableModeChange } = useTableMode();
  const [currentLinenInfo, setCurrentLinenInfo] = useState({
    epc: "",
    customerName: "",
    linenName: "",
    roomName: "",
  });
  const [antenna1Info, setAntenna1Info] = useState({
    epc: "",
    customerName: "",
    linenName: "",
    roomName: "",
  });
  const [antenna2Info, setAntenna2Info] = useState({
    epc: "",
    customerName: "",
    linenName: "",
    roomName: "",
  });
  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());
  const baseUrl = import.meta.env.VITE_BASE_URL;

  const fetchLinenData = async (epc, antenna = null) => {
    if (!epc.trim()) return;

    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/linen_rfid?epc=${encodeURIComponent(epc)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          const linenData = result.data[0];
          const linenInfo = {
            epc: linenData.epc,
            customerName: linenData.customerName || "-",
            linenName: linenData.linenName || "-",
            roomName: linenData.roomName || "-",
          };

          // Add to valid EPCs set
          setValidEpcs((prev) => new Set([...prev, epc]));

          if (antenna === 1) {
            setAntenna1Info(linenInfo);
          } else if (antenna === 2) {
            setAntenna2Info(linenInfo);
          } else {
            setCurrentLinenInfo(linenInfo);
          }
        } else {
          // No data found - clear info and don't add to valid EPCs
          const emptyInfo = {
            epc: "",
            customerName: "-",
            linenName: "-",
            roomName: "-",
          };

          if (antenna === 1) {
            setAntenna1Info(emptyInfo);
          } else if (antenna === 2) {
            setAntenna2Info(emptyInfo);
          } else {
            setCurrentLinenInfo(emptyInfo);
          }
        }
      } else {
        console.error("Failed to fetch linen data for EPC:", epc);
        const errorInfo = {
          epc: "",
          customerName: "Belum Teregister",
          linenName: "Belum Teregister",
          roomName: "Belum Teregister",
        };

        if (antenna === 1) {
          setAntenna1Info(errorInfo);
        } else if (antenna === 2) {
          setAntenna2Info(errorInfo);
        } else {
          setCurrentLinenInfo(errorInfo);
        }
      }
    } catch (error) {
      console.error("Error fetching linen data:", error);
      const errorInfo = {
        epc: "",
        customerName: "Belum Teregister",
        linenName: "Belum Teregister",
        roomName: "Belum Teregister",
      };

      if (antenna === 1) {
        setAntenna1Info(errorInfo);
      } else if (antenna === 2) {
        setAntenna2Info(errorInfo);
      } else {
        setCurrentLinenInfo(errorInfo);
      }
    }
  };

  // Pisahkan data berdasarkan antenna dan filter hanya EPC yang valid
  const antenna1Tags =
    groupingTags?.filter(
      (tag) => tag.antenna === 1 && validEpcs.has(tag.EPC)
    ) || [];
  const antenna2Tags =
    groupingTags?.filter(
      (tag) => tag.antenna === 2 && validEpcs.has(tag.EPC)
    ) || [];

  // Gabungkan semua tags untuk mode single, filter hanya EPC yang valid
  const allTags = groupingTags?.filter((tag) => validEpcs.has(tag.EPC)) || [];

  useEffect(() => {
    if (groupingTags && groupingTags.length > 0) {
      const latestTag = groupingTags[groupingTags.length - 1];

      if (latestTag && latestTag.EPC && !processedTags.has(latestTag.EPC)) {
        setProcessedTags((prev) => new Set([...prev, latestTag.EPC]));

        // Fetch data based on antenna
        if (latestTag.antenna === 1) {
          fetchLinenData(latestTag.EPC, 1);
        } else if (latestTag.antenna === 2) {
          fetchLinenData(latestTag.EPC, 2);
        } else {
          fetchLinenData(latestTag.EPC);
        }
      }
    }
  }, [groupingTags]);

  const handleToggle = () => {
    if (!isRfidAvailable) {
      alert("Device belum terkoneksi!");
      return;
    }

    if (isGroupingActive) {
      stopGrouping();
    } else {
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

        {/* Conditional Info Grid berdasarkan tableMode */}
        {tableMode === "single" ? (
          // Single Table Mode - Single Info Grid
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
        ) : (
          // Double Table Mode - Dual Info Grid
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Info Grid untuk Meja Kiri (Antenna 1) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-md font-semibold text-gray-700 mb-3">
                Meja Kiri
              </h3>
              <div className="grid grid-cols-1 gap-y-2 font-bold text-sm">
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">RFID</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna1Info.epc || "−"}
                  </span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Linen</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna1Info.linenName}
                  </span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Customer</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna1Info.customerName}
                  </span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Ruangan</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna1Info.roomName}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid untuk Meja Kanan (Antenna 2) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-md font-semibold text-gray-700 mb-3">
                Meja Kanan
              </h3>
              <div className="grid grid-cols-1 gap-y-2 font-bold text-sm">
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">RFID</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna2Info.epc || "−"}
                  </span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Linen</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna2Info.linenName}
                  </span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Customer</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna2Info.customerName}
                  </span>
                </div>
                <div className="flex items-center">
                  <label className="text-gray-600 w-20">Ruangan</label>
                  <span className="mx-2">:</span>
                  <span className="text-gray-800 text-sm">
                    {antenna2Info.roomName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conditional rendering berdasarkan tableMode */}
      {tableMode === "single" ? (
        // Single Table Mode
        <div>
          <GroupingTable groupingTags={allTags} />
        </div>
      ) : (
        // Double Table Mode
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabel Antenna 1 */}
          <div>
            <GroupingTable groupingTags={antenna1Tags} isCompact={true} />
          </div>

          {/* Tabel Antenna 2 */}
          <div>
            <GroupingTable groupingTags={antenna2Tags} isCompact={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupingPage;
