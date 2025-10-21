import React, { useState, useEffect } from "react";
import { Play, Square } from "lucide-react";
import toast from "react-hot-toast";
import { useLinenData } from "../hooks/useLinenData";
import { useCustomers } from "../hooks/useCustomers";

const ScanningPage = ({ rfidHook }) => {
  const {
    scanningTags,
    startScanning,
    stopScanning,
    isScanningActive = false,
    isRfidAvailable,
  } = rfidHook || {};

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // State untuk customer selection
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
  });

  // Use useLinenData untuk EPC processing dan caching
  const {
    linens,
    processedTags,
    processScannedEPC,
    clearAllEPCs,
    getValidLinenCount,
    getInvalidLinenCount,
  } = useLinenData(baseUrl, formData.customerId);

  // Use useCustomers untuk customer dropdown
  const { customers, loadingCustomers, fetchCustomers, getCustomerById } = useCustomers(baseUrl);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle customer change
  const handleCustomerChange = (selected) => {
    const newFormData = {
      ...formData,
      customerId: selected?.customerId || "",
      customerName: selected?.customerName || "",
    };
    setFormData(newFormData);

    // Revalidate existing linens when customer changes
    const customerLinens = linens.filter(linen =>
      linen.customerId === selected?.customerId
    );

    // Update linen validation status
    const updatedLinens = linens.map(linen => {
      const isValidCustomer = linen.customerId === selected?.customerId;
      const isNonExist = !linen.epc?.trim();

      return {
        ...linen,
        isValidCustomer,
        isNonExist,
        errorMessage: !isValidCustomer && linen.epc?.trim()
          ? `Tag milik ${linen.customerName || 'Unknown'} (${linen.customerId})`
          : !isValidCustomer && linen.epc?.trim()
          ? `Tag tidak sesuai customer yang dipilih`
          : null,
      };
    });

    // Trigger revalidation in hook
    console.log(`🔄 Revalidating ${customerLinens.length} linens for customer ${selected?.customerId}`);
    customerLinens.forEach((linen, index) => {
      if (linen.epc?.trim()) {
        // Use a timeout to ensure state updates are applied
        setTimeout(() => {
          processScannedEPC(linen.epc);
        }, index * 10); // Small delay between processing
      }
    });
  };

  // Process scanned EPCs
  useEffect(() => {
    if (!isScanningActive) return;

    if (scanningTags && scanningTags.length > 0) {
      const latestTag = scanningTags[scanningTags.length - 1];

      if (latestTag && latestTag.EPC && !processedTags.has(latestTag.EPC)) {
        console.log(`🔄 Processing scanned EPC: ${latestTag.EPC}`);
        processScannedEPC(latestTag.EPC);
      }
    }
  }, [scanningTags, isScanningActive, processedTags, processScannedEPC]);

  const handleToggle = () => {
    if (!isRfidAvailable) {
      toast.error("Device belum terkoneksi!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    try {
      if (isScanningActive) {
        stopScanning();
        toast.success("Scanning dihentikan", {
          duration: 2000,
          icon: "✅",
        });
      } else {
        // Clear data sebelum mulai scan baru
        clearAllEPCs();
        startScanning();
        toast.success("Scanning dimulai", {
          duration: 2000,
          icon: "✅",
        });

        // Show success toast if we have valid EPCs
        setTimeout(() => {
          if (getValidLinenCount() > 0) {
            toast.success(`${getValidLinenCount()} EPC berhasil dipindai!`, {
              duration: 3000,
              icon: "✅",
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error toggling scan:", error);
      toast.error("Gagal mengontrol scan!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  const handleClearAll = () => {
    try {
      // Stop scanning dulu
      if (isScanningActive) {
        stopScanning();
      }

      // Clear all EPC data
      clearAllEPCs();

      toast.success("Semua data berhasil dibersihkan!", {
        duration: 2000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Gagal membersihkan data!", {
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
    if (linen.epc) {
      return "bg-green-50";
    }
    return "hover:bg-gray-50";
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          {/* Header with Customer Selection */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              RFID Scanner
            </h1>
          </div>

          {/* Customer Selection */}
          <div className="mb-6">
            <div className="flex justify-center items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Customer
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => {
                    const selected = customers.find(cust => cust.customerId === e.target.value);
                    handleCustomerChange(selected);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                >
                  <option value="">Pilih Customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.customerId} value={customer.customerId}>
                      {customer.customerName} ({customer.customerCity})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={handleToggle}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
                !isRfidAvailable
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : isScanningActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              disabled={!isRfidAvailable}
            >
              {isScanningActive ? (
                <>
                  <Square size={20} />
                  Stop Scan
                </>
              ) : (
                <>
                  <Play size={20} />
                  Start Scan
                </>
              )}
            </button>

            <button
              onClick={handleClearAll}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
            >
              Clear All
            </button>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">
                Total Dipindai
              </h3>
              <p className="text-3xl font-bold text-blue-800">
                {getValidLinenCount()}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Valid EPC
              </h3>
              <p className="text-3xl font-bold text-green-800">
                {getValidLinenCount()}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Invalid EPC
              </h3>
              <p className="text-3xl font-bold text-red-800">
                {getInvalidLinenCount()}
              </p>
            </div>
          </div>

          {/* Scanning Results Table */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">
                Hasil Pemindaian
              </h2>
            </div>

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
                      Nama Linen
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Jenis Linen
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Customer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linens
                    .filter((linen) => linen.epc?.trim()) // Only show rows with EPC data
                    .map((linen, index) => {
                      return (
                        <tr
                          key={linen.epc}
                          className={`${getRowColor(
                            linen
                          )} transition-colors duration-200`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 border-b">
                            {index + 1}
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
                            {linen.linenName ? (
                              <div className="text-xs text-gray-800 font-medium">
                                {linen.linenName}
                              </div>
                            ) : linen.loading ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                <span className="ml-1 text-xs text-gray-500">
                                  Loading...
                                </span>
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
        </div>
      </div>
    </div>
  );
};

export default ScanningPage;