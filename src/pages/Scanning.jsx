import React, { useState, useEffect } from "react";
import { Play, Trash2, Square } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import { useLinenData } from "../hooks/useLinenData";
import { useCustomers } from "../hooks/useCustomers";

const Scanning = ({ rfidHook }) => {
  const {
    linenBersihTags = [],
    startLinenBersih,
    stopLinenBersih,
    isLinenBersihActive = false,
    isRfidAvailable = false,
  } = rfidHook || {};

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    linenQty: 0,
  });

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Use custom hooks for data management
  const {
    linens,
    processedTags,
    setProcessedTags,
    processScannedEPC,
    validateManualEPC,
    addLinenRow,
    removeLinenRow,
    clearAllEPCs,
    updateLinenField,
    revalidateLinens,
    getValidLinenCount,
    getInvalidLinenCount,
  } = useLinenData(baseUrl, formData.customerId);

  // Track EPCs that have been processed by the API to prevent duplicate calls
  const [apiProcessedEPCs, setApiProcessedEPCs] = useState(new Set());

  const { customers, loadingCustomers, fetchCustomers, getCustomerById } =
    useCustomers(baseUrl);

  // Function to change status to pending via API
  const changeStatusToPending = async (epc) => {
    try {
      // Get token from authAPI
      const token = await window.authAPI.getToken();

      if (!token) {
        console.error("No authentication token found");
        return false;
      }

      const response = await fetch(
        `${baseUrl}/Process/change_status_pending/${epc}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error(
          `Failed to change status for EPC ${epc}:`,
          response.statusText
        );
        return false;
      }

      console.log(`Successfully changed status to pending for EPC: ${epc}`);
      return true;
    } catch (error) {
      console.error(`Error changing status for EPC ${epc}:`, error);
      return false;
    }
  };

  // Handle RFID tag scanning
  useEffect(() => {
    // Skip if RFID is not active
    if (!isLinenBersihActive) return;

    if (linenBersihTags && linenBersihTags.length > 0) {
      try {
        // Get current EPCs in table to prevent duplicates
        const currentEpcs = new Set(
          linens.filter((l) => l.epc?.trim()).map((l) => l.epc)
        );

        // Process each tag using processScannedEPC
        linenBersihTags.forEach((tag) => {
          if (tag && tag.EPC) {
            // Enhanced validation - multiple checks
            const epc = tag.EPC.trim();

            // Skip if EPC already exists in table
            if (currentEpcs.has(epc)) {
              return;
            }

            // Skip if EPC is in processed tags
            if (processedTags.has(epc)) {
              return;
            }

            // Additional safety check: only process if we have less than 1000 items (prevent memory issues)
            if (processedTags.size > 1000) {
              setProcessedTags(new Set());
              return;
            }

            processScannedEPC(epc);
          }
        });
      } catch (error) {
        toast.error("Gagal memproses tag RFID!", {
          duration: 3000,
          icon: "❌",
        });
      }
    }
  }, [
    linenBersihTags,
    isLinenBersihActive,
    processScannedEPC,
    linens,
    processedTags,
  ]);

  // Update linen count when linens change
  useEffect(() => {
    const validLinens = linens.filter((linen) => linen.epc?.trim());
    setFormData((prev) => ({
      ...prev,
      linenQty: validLinens.length,
    }));
  }, [linens]);

  // Effect to process EPCs in the table via API
  useEffect(() => {
    const processEPCs = async () => {
      console.log("🔄 Processing EPCs in table...");

      // Get all valid EPCs from the table
      const validLinens = linens.filter((linen) => linen.epc?.trim());
      const epcList = validLinens.map((linen) => linen.epc.trim());

      console.log("📊 Total EPCs in table:", validLinens.length);
      console.log("📋 EPCs in table:", epcList);
      console.log("🚫 Already processed EPCs:", Array.from(apiProcessedEPCs));

      // Process each EPC that hasn't been processed by the API yet
      const epcsToProcess = epcList.filter((epc) => !apiProcessedEPCs.has(epc));

      console.log("⏳ EPCs to process:", epcsToProcess);

      if (epcsToProcess.length > 0) {
        const newProcessedEPCs = new Set(apiProcessedEPCs);

        // Process each EPC individually to avoid overwhelming the API
        for (const epc of epcsToProcess) {
          console.log("🚀 Processing EPC:", epc);
          try {
            const success = await changeStatusToPending(epc);
            // Mark EPC as processed regardless of success or failure to prevent retry
            newProcessedEPCs.add(epc);

            if (!success) {
              console.warn(`❌ EPC ${epc} failed to process, will not retry`);
            } else {
              console.log(`✅ EPC ${epc} processed successfully`);
            }
          } catch (error) {
            console.error(`💥 Failed to process EPC ${epc}:`, error);
            // Still mark as processed to prevent retry on error
            newProcessedEPCs.add(epc);
          }
        }

        // Update the processed EPCs set
        setApiProcessedEPCs(newProcessedEPCs);
        console.log(
          "✨ Updated processed EPCs set:",
          Array.from(newProcessedEPCs)
        );
      } else {
        console.log("ℹ️ No new EPCs to process");
      }
    };

    // Only process if we have valid linens
    if (linens.some((linen) => linen.epc?.trim())) {
      console.log("🎯 Triggering EPC processing...");
      processEPCs();
    } else {
      console.log("📭 No valid linens to process");
    }
  }, [linens, apiProcessedEPCs, baseUrl]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLinenChange = (index, field, value) => {
    if (field === "epc") {
      updateLinenField(index, field, value);

      if (value.trim()) {
        validateManualEPC(value.trim(), index);
      }
    } else {
      updateLinenField(index, field, value);
    }
  };

  const handleCustomerChange = (selected) => {
    const newFormData = {
      ...formData,
      customerId: selected?.customerId || "",
      customerName: selected?.customerName || "",
    };
    setFormData(newFormData);

    // Re-validate all existing linens when customer changes
    revalidateLinens(selected?.customerId || "");
  };

  const handleClearAll = () => {
    try {
      // Stop RFID scanning first to prevent immediate re-population
      if (isLinenBersihActive) {
        stopLinenBersih();
      }

      // Use rfidHook.clearAllData() like tab switching for complete state reset
      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      // Clear all EPC data using the hook
      clearAllEPCs();

      // Clear processed tags to prevent re-appearance
      setProcessedTags(new Set());

      // Clear API processed EPCs tracking
      setApiProcessedEPCs(new Set());

      // Reset form data completely (like tab switching)
      setFormData({
        customerId: formData.customerId, // Keep customer selection
        customerName: formData.customerName, // Keep customer name
        linenQty: 0,
      });

      // Force multiple state updates to ensure complete clearing
      setTimeout(() => {
        setProcessedTags(new Set());
        setApiProcessedEPCs(new Set());
        clearAllEPCs(); // Call again to be sure

        // Double-check rfidHook data clearing
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }
      }, 50);

      setTimeout(() => {
        setProcessedTags(new Set());
        setApiProcessedEPCs(new Set());

        // Final rfidHook data clearing
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }
      }, 200);

      toast.success("Semua data linen berhasil dibersihkan!", {
        duration: 2000,
        icon: "✅",
      });
    } catch (error) {
      toast.error("Gagal membersihkan data!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  // RFID scan toggle handler
  const handleToggleScan = () => {
    if (!isRfidAvailable) {
      toast.error("Device belum terkoneksi!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    try {
      if (isLinenBersihActive) {
        stopLinenBersih();
      } else {
        startLinenBersih();
      }
    } catch (error) {
      toast.error("Gagal mengontrol scan!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  // Utility functions for styling
  const getStatusColor = (status) => {
    if (!status) return "bg-gray-50 border-gray-300 text-gray-700";

    switch (status.toLowerCase()) {
      case "bersih":
        return "bg-green-50 border-green-300 text-green-700";
      case "kotor":
        return "bg-yellow-50 border-yellow-300 text-yellow-700";
      case "rusak":
        return "bg-red-50 border-red-300 text-red-700";
      case "hilang":
        return "bg-red-50 border-red-300 text-red-700";
      case "rewash":
        return "bg-orange-50 border-orange-300 text-orange-700";
      case "retur":
        return "bg-purple-50 border-purple-300 text-purple-700";
      default:
        return "bg-gray-50 border-gray-300 text-gray-700";
    }
  };

  const getRowColor = (linen) => {
    return "hover:bg-gray-50";
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          {/* Info Section with button top-right */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-semibold text-gray-700">
                Detail Info
              </h2>
              <button
                onClick={handleToggleScan}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
                  !isRfidAvailable
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isLinenBersihActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-blue-700"
                }`}
                disabled={!isRfidAvailable}
              >
                {isLinenBersihActive ? (
                  <>
                    <Square size={16} />
                    Stop Scan
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Start Scan
                  </>
                )}
              </button>
            </div>

            {/* Info Grid - Show latest scanned item details */}
            <div className="grid grid-cols-1 gap-y-1 font-bold">
              <div className="flex items-center">
                <label className="text-gray-600 w-20">RFID</label>
                <span className="mx-3">:</span>
                <span className="text-gray-800">
                  {linens.filter((l) => l.epc?.trim()).reverse()[0]?.epc || "−"}
                </span>
              </div>
              <div className="flex items-center">
                <label className="text-gray-600 w-20">Linen</label>
                <span className="mx-3">:</span>
                <span className="text-gray-800">
                  {linens.filter((l) => l.epc?.trim()).reverse()[0]
                    ?.linenName || "−"}
                </span>
              </div>
              <div className="flex items-center">
                <label className="text-gray-600 w-20">Customer</label>
                <span className="mx-3">:</span>
                <span className="text-gray-800">
                  {linens.filter((l) => l.epc?.trim()).reverse()[0]
                    ?.customerName || "−"}
                </span>
              </div>
              <div className="flex items-center">
                <label className="text-gray-600 w-20">Ruangan</label>
                <span className="mx-3">:</span>
                <span className="text-gray-800">
                  {linens.filter((l) => l.epc?.trim()).reverse()[0]?.roomName ||
                    "−"}
                </span>
              </div>
            </div>
          </div>

          {/* Linen Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Data Linen (EPC)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-700 border-b">
                      RFID
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-700 border-b">
                      Nama Linen
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-700 border-b">
                      Nama Customer
                    </th>
                    <th className="px-3 py-2 text-left text-base font-medium text-gray-700 border-b">
                      Ruangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linens
                    .filter((linen) => linen.epc?.trim()) // Only show rows with EPC data
                    .reverse() // Reverse order so latest scan appears first
                    .map((linen, reversedIndex) => {
                      // Use the reversed index for row numbering (latest scan = No 1)
                      return (
                        <tr
                          key={linen.epc}
                          className={`${getRowColor(
                            linen
                          )} transition-colors duration-200`}
                        >
                          <td className="px-3 py-1 border-b">
                            <span className="text-base text-gray-800 font-medium">
                              {linen.epc}
                            </span>
                          </td>
                          <td className="px-3 py-1 border-b">
                            {linen.linenName ? (
                              <div className="text-base text-gray-800 font-medium">
                                {linen.linenName}
                              </div>
                            ) : (
                              <div className="text-base text-gray-400">-</div>
                            )}
                          </td>
                          <td className="px-3 py-1 border-b">
                            {linen.customerName ? (
                              <div className="text-base text-gray-800">
                                {linen.customerName}
                              </div>
                            ) : (
                              <div className="text-base text-gray-400">-</div>
                            )}
                          </td>
                          <td className="px-3 py-1 border-b">
                            {linen.roomName ? (
                              <div className="text-base text-gray-800">
                                {linen.roomName}
                              </div>
                            ) : (
                              <div className="text-base text-gray-400">-</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanning;
