import React, { useState, useEffect } from "react";
import { Play, Trash2, Square } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import { useLinenData } from "../hooks/useLinenData";
import { useCustomers } from "../hooks/useCustomers";

const LinenCleanPage = ({ rfidHook }) => {
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

  const { customers, loadingCustomers, fetchCustomers, getCustomerById } =
    useCustomers(baseUrl);

  // Handle RFID tag scanning
  useEffect(() => {
    // Skip if RFID is not active
    if (!isLinenBersihActive) return;

    if (linenBersihTags && linenBersihTags.length > 0) {
      console.log(`📡 LinenBersihPage: Processing ${linenBersihTags.length} tags from RFID`);
      console.log("🔍 Current processedTags:", Array.from(processedTags));
      console.log("🔍 Current linens in table:", linens.length);

      try {
        // Get current EPCs in table to prevent duplicates
        const currentEpcs = new Set(linens.filter(l => l.epc?.trim()).map(l => l.epc));
        console.log("🔍 Current EPCs in table:", Array.from(currentEpcs));

        // Process each tag using processScannedEPC
        linenBersihTags.forEach((tag, index) => {
          if (tag && tag.EPC) {
            // Enhanced validation - multiple checks
            const epc = tag.EPC.trim();

            // Skip if EPC already exists in table
            if (currentEpcs.has(epc)) {
              console.log(`⚠️ Skipping duplicate EPC ${epc} (already in table)`);
              return;
            }

            // Skip if EPC is in processed tags
            if (processedTags.has(epc)) {
              console.log(`⚠️ Skipping already processed EPC ${epc} (in processedTags)`);
              return;
            }

            // Additional safety check: only process if we have less than 1000 items (prevent memory issues)
            if (processedTags.size > 1000) {
              console.warn("⚠️ Processed tags size too large, clearing...");
              setProcessedTags(new Set());
              return;
            }

            console.log(`🔍 Processing new EPC ${epc} (index ${index})`);
            processScannedEPC(epc);
          }
        });
      } catch (error) {
        console.error("❌ Error processing RFID tags:", error);
        toast.error("Gagal memproses tag RFID!", {
          duration: 3000,
          icon: "❌",
        });
      }
    }
  }, [linenBersihTags, isLinenBersihActive, processScannedEPC, linens, processedTags]);

  // Update linen count when linens change
  useEffect(() => {
    const validLinens = linens.filter((linen) => linen.epc?.trim());
    setFormData((prev) => ({
      ...prev,
      linenQty: validLinens.length,
    }));
  }, [linens]);

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
    console.log("🔘 Clear All button clicked - Complete state reset with rfidHook.clearAllData()");

    try {
      // Stop RFID scanning first to prevent immediate re-population
      if (isLinenBersihActive) {
        console.log("🛑 Stopping RFID scan to prevent re-population");
        stopLinenBersih();
      }

      // Use rfidHook.clearAllData() like tab switching for complete state reset
      console.log("🗑️ Clearing all RFID data using rfidHook.clearAllData()...");
      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      // Clear all EPC data using the hook
      console.log("🗑️ Clearing all EPC data...");
      clearAllEPCs();

      // Clear processed tags to prevent re-appearance
      console.log("🗑️ Clearing processed tags...");
      setProcessedTags(new Set());

      // Reset form data completely (like tab switching)
      console.log("🔄 Resetting form data completely...");
      setFormData({
        customerId: formData.customerId, // Keep customer selection
        customerName: formData.customerName, // Keep customer name
        linenQty: 0,
      });

      // Force multiple state updates to ensure complete clearing
      setTimeout(() => {
        console.log("🔄 Double-checking and clearing any remaining state...");
        setProcessedTags(new Set());
        clearAllEPCs(); // Call again to be sure

        // Double-check rfidHook data clearing
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }
      }, 50);

      setTimeout(() => {
        console.log("🔄 Final state cleanup...");
        setProcessedTags(new Set());

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
      console.error("❌ Error clearing all data:", error);
      toast.error("Gagal membersihkan data!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Pilih customer terlebih dahulu!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    // Check for invalid customer tags
    const invalidLinenCount = getInvalidLinenCount();
    if (invalidLinenCount > 0) {
      toast.error(
        `Tidak dapat memproses! Ada ${invalidLinenCount} tag yang tidak sesuai dengan customer yang dipilih.`,
        {
          duration: 4000,
          icon: "❌",
        }
      );
      return;
    }

    try {
      // Get authentication token
      const token = await window.authAPI.getToken();

      // Filter valid linens (must have EPC and valid customer)
      const validLinens = linens.filter(
        (linen) => linen.epc?.trim() && linen.isValidCustomer !== false
      );

      if (validLinens.length === 0) {
        toast.error("Minimal harus ada 1 EPC linen yang valid!", {
          duration: 3000,
          icon: "⚠️",
        });
        return;
      }

      // Create payload
      const payload = {
        customerId: formData.customerId,
        linenQty: validLinens.length,
        linens: validLinens.map((linen) => ({
          epc: linen.epc,
          status_id: linen.statusId || 1,
        })),
      };

      console.log("Payload dikirim:", payload);

      // Send POST request
      const response = await fetch(`${baseUrl}/Process/linen_clean`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("Response dari API:", result);

      if (!response.ok) {
        const errorMessage =
          result.message || `Request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      const successMessage = result.message || "Proses linen bersih berhasil!";

      // Reset form after success
      setFormData({
        customerId: "",
        customerName: "",
        linenQty: 0,
      });

      // Use rfidHook.clearAllData() for complete state reset
      console.log("🗑️ Clearing all RFID data after successful submit...");
      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      // Clear all EPC data using the hook
      clearAllEPCs();

      // Also clear processed tags to prevent re-appearance
      setProcessedTags(new Set());

      // Stop scanning if active
      if (isLinenBersihActive) {
        stopLinenBersih();
      }

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Error submit:", error);
      const errorMessage =
        error.message || "Gagal proses linen bersih, coba lagi!";
      toast.error(errorMessage, {
        duration: 4000,
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
        console.log("🛑 Stopping linen bersih scan");
        stopLinenBersih();
      } else {
        console.log("▶️ Starting linen bersih scan");
        startLinenBersih();
      }
    } catch (error) {
      console.error("❌ Error toggling linen bersih scan:", error);
      toast.error("Gagal mengontrol scan linen bersih!", {
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
      default:
        return "bg-gray-50 border-gray-300 text-gray-700";
    }
  };

  const getRowColor = (linen) => {
    if (linen.isValidCustomer === false) {
      return "bg-red-50 border-red-200";
    }
    if (linen.epc) {
      return "bg-green-50";
    }
    return "hover:bg-gray-50";
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Customer <span className="text-red-500">*</span>
              </label>
              <Select
                value={
                  formData.customerId
                    ? getCustomerById(formData.customerId)
                    : null
                }
                onChange={handleCustomerChange}
                options={customers}
                getOptionLabel={(customer) =>
                  `${customer.customerName} (${customer.customerCity})`
                }
                getOptionValue={(customer) => customer.customerId}
                placeholder="Cari customer..."
                isClearable
                isSearchable
                isLoading={loadingCustomers}
                noOptionsMessage={() => "Customer tidak ditemukan"}
                className="w-full"
                classNamePrefix="react-select"
                styles={{
                  control: (baseStyles, state) => ({
                    ...baseStyles,
                    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
                    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                    fontSize: "14px",
                    minHeight: "38px",
                  }),
                  option: (baseStyles) => ({
                    ...baseStyles,
                    fontSize: "14px",
                  }),
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Linen
              </label>
              <input
                type="number"
                name="linenQty"
                value={formData.linenQty}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          {/* Linen Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Data Linen (EPC & Status)
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

            <div className="mb-4">
              <button
                type="button"
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

            {/* Warning message for invalid customers */}
            {formData.customerId && getInvalidLinenCount() > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  ⚠️ Terdapat {getInvalidLinenCount()} tag yang tidak sesuai
                  dengan customer yang dipilih. Tag tersebut tidak akan diproses
                  saat submit.
                </p>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      EPC
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Customer Info
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linens
                    .filter((linen) => linen.epc?.trim()) // Only show rows with EPC data
                    .map((linen, filteredIndex) => {
                      // Use the filtered index for row numbering
                      return (
                        <tr
                          key={linen.epc}
                          className={`${getRowColor(
                            linen
                          )} transition-colors duration-200`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 border-b">
                            {filteredIndex + 1}
                            {linen.epc && (
                              <span className="ml-2 text-xs text-green-600">
                                ✓ Scanned
                              </span>
                            )}
                            {linen.isValidCustomer === false && (
                              <span className="ml-2 text-xs text-red-600">
                                ✗ Invalid
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b">
                            <input
                              type="text"
                              value={linen.epc}
                              readOnly
                              placeholder="Auto-filled dari scan RFID"
                              className={`w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-gray-50 ${
                                linen.isValidCustomer === false
                                  ? "border-red-300 bg-red-50"
                                  : linen.epc
                                  ? "bg-green-50 border-green-300"
                                  : "border-gray-300"
                              }`}
                            />
                          </td>
                          <td className="px-4 py-3 border-b">
                            {linen.loading ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-xs text-gray-500">
                                  Loading...
                                </span>
                              </div>
                            ) : (
                              <div
                                className={`px-2 py-1 rounded text-xs font-medium text-center ${getStatusColor(
                                  linen.status
                                )}`}
                              >
                                {linen.status || "Unknown"}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b">
                            {linen.isValidCustomer === false &&
                            linen.errorMessage ? (
                              <div className="text-xs text-red-600">
                                {linen.errorMessage}
                              </div>
                            ) : linen.customerName ? (
                              <div className="text-xs text-green-600">
                                {linen.customerName}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">-</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={!formData.customerId || getValidLinenCount() === 0}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                !formData.customerId || getValidLinenCount() === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-blue-400 text-white"
              }`}
            >
              Proses Linen Bersih ({getValidLinenCount()} valid items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinenCleanPage;
