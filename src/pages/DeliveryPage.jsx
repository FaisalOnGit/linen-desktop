import React, { useState, useEffect } from "react";
import { Play, Trash2, Square, Truck } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import { useDeliveryData } from "../hooks/useDeliveryData";

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
    plateNumber: "",
  });

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Use custom hooks for data management
  const {
    linens,
    customers,
    loadingCustomers,
    isDataValid,
    getValidLinenCount,
    getInvalidLinenCount,
    processScannedEPC,
    validateAllLinens,
    clearAllEPCs,
    updateLinenField,
    fetchCustomers,
    getCustomerById,
  } = useDeliveryData(baseUrl);

  // Handle RFID tag scanning
  useEffect(() => {
    // Skip if RFID is not active
    if (!isDeliveryActive) return;

    if (deliveryTags && deliveryTags.length > 0) {
      console.log(
        `📡 DeliveryPage: Processing ${deliveryTags.length} tags from RFID`
      );

      // Process each tag using processScannedEPC
      // Let the hook handle duplicate detection internally
      deliveryTags.forEach((tag, index) => {
        if (tag && tag.EPC) {
          console.log(`🔍 Processing EPC ${tag.EPC} (index ${index})`);
          processScannedEPC(tag.EPC, formData.customerId);
        }
      });
    }
  }, [
    deliveryTags,
    isDeliveryActive,
    processScannedEPC,
    formData.customerId,
  ]);

  // Update linen count when linens change
  useEffect(() => {
    const validLinens = linens.filter((linen) => linen.epc?.trim());
    setFormData((prev) => ({
      ...prev,
      qty: validLinens.length,
    }));
  }, [linens]);

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
    };
    setFormData(newFormData);

    // Re-validate all existing linens when customer changes
    validateAllLinens(selected?.customerId || "");
  };

  const handleClearAll = () => {
    console.log("🔘 Clear All button clicked");

    // Stop RFID scanning first to prevent immediate re-population
    if (isDeliveryActive) {
      console.log("🛑 Stopping RFID scan to prevent re-population");
      stopDelivery();
    }

    clearAllEPCs();
    // Only reset the quantity
    setFormData((prev) => ({
      ...prev,
      qty: 0,
    }));
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

    if (!formData.plateNumber.trim()) {
      toast.error("Nomor plat tidak boleh kosong!", {
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

      // Filter valid linens
      const validLinens = linens.filter(
        (linen) =>
          linen.epc?.trim() &&
          !linen.isNonExist &&
          !linen.isDuplicate &&
          linen.isValidCustomer !== false
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

      // Reset form after success
      setFormData({
        customerId: "",
        customerName: "",
        qty: 0,
        driverName: "",
        plateNumber: "",
      });

      // Clear all EPC data using the hook
      clearAllEPCs();

      // Stop scanning if active
      if (isDeliveryActive) {
        stopDelivery();
      }

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });
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

    if (isDeliveryActive) {
      stopDelivery();
    } else {
      startDelivery();
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
    if (linen.isValidCustomer === false) {
      return "bg-red-50 border-red-200";
    }
    if (linen.isNonExist || linen.isDuplicate) {
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
          {/* Customer and Delivery Info */}
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
                name="qty"
                value={formData.qty}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          {/* Driver Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Driver <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="driverName"
                value={formData.driverName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Masukkan nama driver"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Polisi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Masukkan nomor plat kendaraan"
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
                    : "bg-blue-600 hover:bg-blue-700"
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
                            {linen.isNonExist && (
                              <span className="ml-2 text-xs text-red-600">
                                ✗ Not Found
                              </span>
                            )}
                            {linen.isDuplicate && (
                              <span className="ml-2 text-xs text-red-600">
                                ✗ Duplicate
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
                                linen.isNonExist ||
                                linen.isDuplicate
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

          {/* Submit Button */}
          <div>
            <button
              onClick={handleSubmit}
              disabled={
                !formData.customerId ||
                !formData.driverName.trim() ||
                !formData.plateNumber.trim() ||
                getValidLinenCount() === 0
              }
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                !formData.customerId ||
                !formData.driverName.trim() ||
                !formData.plateNumber.trim() ||
                getValidLinenCount() === 0
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
