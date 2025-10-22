import React, { useState, useEffect } from "react";
import { Play, Trash2, Square, Truck, Printer } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import { useLinenData } from "../hooks/useLinenData";
import { useCustomers } from "../hooks/useCustomers";
import { useRooms } from "../hooks/useRooms";
import usePrint from "../hooks/usePrint";

const DeliveryPage = ({ rfidHook, deliveryType = 1 }) => {
  const {
    deliveryTags = [],
    startDelivery,
    stopDelivery,
    isDeliveryActive = false,
    isRfidAvailable = false,
  } = rfidHook || {};

  // Delivery types configuration
  const deliveryTypes = {
    1: { title: "Pengiriman Baru" },
    2: { title: "Pengiriman Reguler" },
    3: { title: "Pengiriman Rewash" },
    4: { title: "Pengiriman Retur" },
  };

  const currentDeliveryType = deliveryTypes[deliveryType] || deliveryTypes[1];

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    qty: 0,
    driverName: "",
    plateNumber: "-", // Hardcoded value
    roomId: "",
  });

  const [deliverySubmitted, setDeliverySubmitted] = useState(false);
  const [lastDeliveryData, setLastDeliveryData] = useState(null);

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Get user full name for driver
  useEffect(() => {
    const getUserFullName = async () => {
      try {
        const fullName = await window.authAPI.getFullName();
        if (fullName) {
          setFormData((prev) => ({
            ...prev,
            driverName: fullName,
          }));
        }
      } catch (error) {
        console.error("Error getting user full name:", error);
      }
    };

    getUserFullName();
  }, []); // Empty dependency array - only run once on mount

  // Use custom hooks for data management
  const { customers, loadingCustomers, fetchCustomers, getCustomerById } =
    useCustomers(baseUrl);

  const {
    linens,
    getValidLinenCount,
    getInvalidLinenCount,
    getInvalidRoomLinenCount,
    processScannedEPC,
    revalidateLinens,
    clearAllEPCs,
    updateLinenField,
  } = useLinenData(baseUrl, formData.customerId, formData.roomId);

  // Effect to reinitialize useLinenData when customerId or roomId changes
  useEffect(() => {
    if (formData.customerId) {
      revalidateLinens(formData.customerId, formData.roomId);
    }
  }, [formData.customerId, formData.roomId, revalidateLinens]);

  const { rooms, loadingRooms, fetchRooms, getRoomById } = useRooms(baseUrl);

  // Effect untuk fetch rooms ketika customerId berubah
  useEffect(() => {
    if (formData.customerId) {
      fetchRooms(formData.customerId);
    }
  }, [formData.customerId, fetchRooms]);

  // Print functionality
  const {
    selectedDevice,
    devices,
    printStatus,
    isBrowserPrintLoaded,
    printDeliveryLabel,
    handleDeviceChange,
    refreshDevices,
    checkBrowserPrint,
  } = usePrint();

  // Handle RFID tag scanning
  useEffect(() => {
    // Skip if RFID is not active
    if (!isDeliveryActive) return;

    if (deliveryTags && deliveryTags.length > 0) {
      console.log(
        `📡 DeliveryPage: Processing ${deliveryTags.length} tags from RFID`
      );

      try {
        // Process each tag using processScannedEPC
        // Let the hook handle duplicate detection internally
        deliveryTags.forEach((tag, index) => {
          if (tag && tag.EPC) {
            console.log(`🔍 Processing EPC ${tag.EPC} (index ${index})`);
            processScannedEPC(tag.EPC, formData.customerId);
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
  }, [deliveryTags, isDeliveryActive, processScannedEPC, formData.customerId]);

  // Update linen count when linens change
  useEffect(() => {
    const validLinens = linens.filter((linen) => linen.epc?.trim());
    setFormData((prev) => ({
      ...prev,
      qty: validLinens.length,
    }));
  }, [linens]);

  // Clear all state when delivery type changes
  useEffect(() => {
    console.log("🔄 Delivery type changed, clearing all state");

    // Stop RFID scanning if active
    if (isDeliveryActive) {
      stopDelivery();
    }

    // Clear all EPC data
    clearAllEPCs();

    // Get current driver name before resetting form
    const getCurrentDriverName = async () => {
      try {
        const fullName = await window.authAPI.getFullName();
        return fullName || "";
      } catch (error) {
        console.error("Error getting user full name:", error);
        return "";
      }
    };

    // Reset form data but keep driver name
    getCurrentDriverName().then((driverName) => {
      setFormData({
        customerId: "",
        customerName: "",
        qty: 0,
        driverName: driverName, // Keep current driver name
        plateNumber: "-", // Keep hardcoded value
        roomId: "", // Reset room selection
      });
    });

    // Reset delivery submission state
    setDeliverySubmitted(false);
    setLastDeliveryData(null);
  }, [deliveryType]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Convert plate number to uppercase
    const processedValue = name === "plateNumber" ? value.toUpperCase() : value;
    setFormData({ ...formData, [name]: processedValue });
  };

  const handleCustomerChange = (selected) => {
    const newFormData = {
      ...formData,
      customerId: selected?.customerId || "",
      customerName: selected?.customerName || "",
      roomId: "", // Reset room when customer changes
    };
    setFormData(newFormData);

    // Re-validate all existing linens when customer changes
    revalidateLinens(selected?.customerId || "", formData.roomId);
  };

  const handleClearAll = () => {
    console.log(
      "🔘 Clear All button clicked - Complete state reset with rfidHook.clearAllData()"
    );

    try {
      // Stop RFID scanning first to prevent immediate re-population
      if (isDeliveryActive) {
        console.log("🛑 Stopping RFID scan to prevent re-population");
        stopDelivery();
      }

      // Use rfidHook.clearAllData() like tab switching for complete state reset
      console.log("🗑️ Clearing all RFID data using rfidHook.clearAllData()...");
      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      // Clear all EPC data using the hook
      console.log("🗑️ Clearing all EPC data...");
      clearAllEPCs();

      // Reset form data completely (like tab switching) - keep customer, driver, plate
      console.log("🔄 Resetting form data completely...");
      setFormData((prev) => ({
        ...prev,
        qty: 0,
        roomId: "", // Reset room selection
      }));

      // Reset delivery submission state
      setDeliverySubmitted(false);
      setLastDeliveryData(null);

      // Force multiple state updates to ensure complete clearing
      setTimeout(() => {
        console.log("🔄 Double-checking and clearing any remaining state...");
        clearAllEPCs(); // Call again to be sure

        // Double-check rfidHook data clearing
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }

        // Reset delivery submission state again
        setDeliverySubmitted(false);
        setLastDeliveryData(null);
      }, 50);

      setTimeout(() => {
        console.log("🔄 Final state cleanup...");
        clearAllEPCs();

        // Final rfidHook data clearing
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }

        // Final delivery submission state reset
        setDeliverySubmitted(false);
        setLastDeliveryData(null);
      }, 200);
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

    if (!formData.driverName.trim()) {
      toast.error("Nama driver tidak boleh kosong!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    // Plate number validation removed (hardcoded value)

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

    // Check for invalid room tags
    const invalidRoomLinenCount = getInvalidRoomLinenCount();
    if (invalidRoomLinenCount > 0) {
      toast.error(
        `Tidak dapat memproses! Ada ${invalidRoomLinenCount} tag yang tidak sesuai dengan ruangan yang dipilih.`,
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

      // Filter valid linens
      const validLinens = linens.filter(
        (linen) =>
          linen.epc?.trim() &&
          linen.isValidCustomer !== false &&
          linen.isValidRoom !== false
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
        deliveryTypeId: deliveryType, // <-- Hardcode deliveryTypeId based on menu (1=Baru, 2=Reguler, 3=Rewash, 4=Retur)
        customerId: formData.customerId,
        qty: validLinens.length,
        driverName: formData.driverName,
        plateNumber: formData.plateNumber,
        linens: validLinens.map((linen) => ({
          epc: linen.epc,
          status_id: linen.statusId || 1,
        })),
      };

      console.log("Payload dikirim:", payload);

      // Send POST request
      const response = await fetch(`${baseUrl}/Process/delivery`, {
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

      const successMessage = result.message || "Proses delivery berhasil!";

      // Extract delivery number from API response
      const deliveryNumber = result.data?.deliveryNumber || "";

      // Get linen types and create linen items for dynamic display
      let linenTypes = "Berbagai Jenis";
      let linenItems = [];

      try {
        // Group linens by type and count quantities
        const linenCounts = {};
        validLinens.forEach((linen) => {
          const linenName = linen.linenName || linen.linenTypeName || "Unknown";
          if (linenName && linenName.trim()) {
            linenCounts[linenName] = (linenCounts[linenName] || 0) + 1;
          }
        });

        // Create linen items array
        linenItems = Object.entries(linenCounts).map(([name, quantity]) => ({
          name: name,
          quantity: quantity.toString()
        }));

        // Fallback to linenTypes string if needed
        const uniqueLinenNames = Object.keys(linenCounts);
        if (uniqueLinenNames.length > 0) {
          linenTypes = uniqueLinenNames.join(", ");
        }

        console.log("📋 Extracted linen items for printing:", linenItems);
      } catch (error) {
        console.error("Error extracting linen items:", error);
        // Keep default values if extraction fails
      }

      // Store delivery data for printing with dynamic linen items
      const deliveryData = {
        deliveryNumber: deliveryNumber,
        customer: formData.customerName,
        room: rooms.find((r) => r.roomId === formData.roomId)?.roomName || "-",
        totalLinen: validLinens.length.toString(),
        plateNumber: formData.plateNumber,
        deliveryType: currentDeliveryType.title,
        driverLabel: "Operator",
        driverName: formData.driverName,
        linenTypes: linenTypes,
        linenItems: linenItems, // Add dynamic linen items array
      };

      // Set the state first
      setLastDeliveryData(deliveryData);
      setDeliverySubmitted(true);

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });

      // Auto-print immediately after successful delivery with direct data
      setTimeout(async () => {
        if (deliveryData) {
          console.log("🖨️ Auto-printing after successful delivery...");
          try {
            await handlePrint(deliveryData);
          } catch (printError) {
            console.error("❌ Auto-print error:", printError);
            toast.error("Gagal print otomatis, silakan print manual!", {
              duration: 3000,
              icon: "⚠️",
            });
          }
        } else {
          console.error("❌ Delivery data not available for printing");
        }
      }, 200); // Reduced delay since we're passing data directly

      // Commented out automatic state clear after successful delivery
      // Keep state so user can print again with same data
      // setTimeout(() => {
      //   console.log("🗑️ Clearing all RFID data after successful delivery...");
      //   if (rfidHook && rfidHook.clearAllData) {
      //     rfidHook.clearAllData();
      //   }
      //   // Stop scanning if active
      //   if (isDeliveryActive) {
      //     stopDelivery();
      //   }
      // }, 500);
    } catch (error) {
      console.error("Error submit:", error);
      const errorMessage = error.message || "Gagal proses delivery, coba lagi!";
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
      if (isDeliveryActive) {
        console.log("🛑 Stopping RFID scan");
        stopDelivery();
      } else {
        console.log("▶️ Starting RFID scan");
        startDelivery();
      }
    } catch (error) {
      console.error("❌ Error toggling RFID scan:", error);
      toast.error("Gagal mengontrol scan RFID!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  // Print handler
  const handlePrint = async (deliveryDataToPrint = null) => {
    try {
      // Use provided data or fall back to state
      const dataToPrint = deliveryDataToPrint || lastDeliveryData;

      await printDeliveryLabel(dataToPrint);
      toast.success("Print berhasil!", {
        duration: 3000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Gagal print, coba lagi!", {
        duration: 4000,
        icon: "❌",
      });
    }
  };

  // Enhanced print handler for manual printing after successful delivery
  const handlePrintDirect = async (deliveryData) => {
    if (!deliveryData) {
      console.error("❌ No delivery data provided for direct printing");
      return;
    }

    try {
      await printDeliveryLabel(deliveryData);
      console.log("🖨️ Direct print successful!");
      toast.success("Print ulang berhasil!", {
        duration: 3000,
        icon: "✅",
      });
    } catch (error) {
      console.error("❌ Direct print error:", error);
      toast.error("Gagal print ulang, coba lagi!", {
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
      case "siap kirim":
        return "bg-blue-50 border-blue-300 text-blue-700";
      default:
        return "bg-gray-50 border-gray-300 text-gray-700";
    }
  };

  const getRowColor = (linen) => {
    if (linen.isValidCustomer === false || linen.isValidRoom === false) {
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
          {/* Header with Delivery Type */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800">
              {currentDeliveryType.title}
            </h1>
          </div>
          {/* Customer, Driver and Room Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                Nama Customer Service <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="driverName"
                value={formData.driverName}
                onChange={handleChange}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                placeholder="Nama driver otomatis dari user login"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Room
              </label>
              <Select
                value={formData.roomId ? getRoomById(formData.roomId) : null}
                onChange={(selected) => {
                  setFormData((prev) => ({
                    ...prev,
                    roomId: selected?.roomId || "",
                  }));
                }}
                options={rooms}
                getOptionLabel={(room) => `${room.roomName} (${room.roomId})`}
                getOptionValue={(room) => room.roomId}
                placeholder="Pilih room..."
                isClearable
                isSearchable
                isLoading={loadingRooms}
                noOptionsMessage={() => "Room tidak ditemukan"}
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
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
                  title="Hapus semua EPC untuk scan ulang"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (deliverySubmitted && lastDeliveryData) {
                      handlePrintDirect(lastDeliveryData);
                    } else {
                      toast.error("Submit delivery terlebih dahulu!", {
                        duration: 3000,
                        icon: "⚠️",
                      });
                    }
                  }}
                  disabled={!isBrowserPrintLoaded || !deliverySubmitted}
                  className={`bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm ${
                    !isBrowserPrintLoaded || !deliverySubmitted
                      ? "bg-gray-400 cursor-not-allowed"
                      : ""
                  }`}
                  title={
                    deliverySubmitted
                      ? "Print label delivery"
                      : "Submit delivery first to enable printing"
                  }
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                {/* Printer Selection */}
                {devices.length > 0 && (
                  <select
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    defaultValue={selectedDevice?.uid}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {devices.map((device, index) => (
                      <option key={index} value={device.uid}>
                        {device.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={handleToggleScan}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
                  !isRfidAvailable
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isDeliveryActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-blue-700"
                }`}
                disabled={!isRfidAvailable}
              >
                {isDeliveryActive ? (
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
                  dengan customer yang dipilih.
                </p>
              </div>
            )}

            {/* Warning message for invalid rooms */}
            {formData.roomId &&
              getInvalidRoomLinenCount &&
              getInvalidRoomLinenCount() > 0 && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700">
                    ⚠️ Terdapat {getInvalidRoomLinenCount()} tag yang tidak
                    sesuai dengan ruangan yang dipilih.
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
                      Customer Info
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Room
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Status
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
                            {linen.isValidRoom === false && (
                              <span className="ml-2 text-xs text-red-600">
                                ✗ Wrong Room
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
                                linen.isValidCustomer === false ||
                                linen.isValidRoom === false
                                  ? "border-red-300 bg-red-50"
                                  : linen.epc
                                  ? "bg-green-50 border-green-300"
                                  : "border-gray-300"
                              }`}
                            />
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
                          <td className="px-4 py-3 border-b">
                            {linen.roomName ? (
                              <div className="text-xs text-gray-700">
                                {linen.roomName}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">-</div>
                            )}
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
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              onClick={handleSubmit}
              disabled={
                !formData.customerId ||
                !formData.driverName.trim() ||
                getValidLinenCount() === 0 ||
                (getInvalidRoomLinenCount && getInvalidRoomLinenCount() > 0)
              }
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                !formData.customerId ||
                !formData.driverName.trim() ||
                getValidLinenCount() === 0 ||
                (getInvalidRoomLinenCount && getInvalidRoomLinenCount() > 0)
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-400 text-white"
              }`}
            >
              <Truck size={16} />
              Proses {currentDeliveryType.title} ({getValidLinenCount()} valid
              items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPage;
