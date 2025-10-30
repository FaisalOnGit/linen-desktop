import React, { useState, useEffect } from "react";
import { Printer, Calendar, FileText } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import { useCustomers } from "../hooks/useCustomers";
import usePrintCetak from "../hooks/usePrintCetak";

const Cetak = () => {
  // Helper function to format date as YYYY-MM-DD
  const formatDateYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    startDate: formatDateYYYYMMDD(new Date()), // Today's date in YYYY-MM-DD format
    endDate: formatDateYYYYMMDD(new Date()), // Today's date in YYYY-MM-DD format
  });

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printDisabled, setPrintDisabled] = useState(true);

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Use customers hook
  const { customers, loadingCustomers, fetchCustomers, getCustomerById } =
    useCustomers(baseUrl);

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
  } = usePrintCetak();

  // Fetch report data from real API
  const fetchReportData = async () => {
    if (!formData.customerId || !formData.startDate || !formData.endDate) {
      toast.error("Pilih customer dan periode tanggal terlebih dahulu!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    setLoading(true);
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/print_delivery?customerId=${formData.customerId}&deliveryDate=${formData.startDate}&deliveryDateEnd=${formData.endDate}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      console.log("API response:", result);

      if (response.ok && result.success) {
        // Process the API response to create flat report data
        const reportData = [];

        if (result.data && result.data.dataDeliveries) {
          result.data.dataDeliveries.forEach((room) => {
            if (room.deliveryDetails && Array.isArray(room.deliveryDetails)) {
              room.deliveryDetails.forEach((item) => {
                // Create individual items for each quantity
                for (let i = 0; i < item.qty; i++) {
                  reportData.push({
                    linenName: item.linenName || item.linen_name || "Unknown",
                    roomName: room.room_name || room.roomName || "Unknown",
                    // Generate dummy EPC if not provided
                    epc: `E2022F75100CA6A9AAA5C2${reportData.length + 1001}`,
                  });
                }
              });
            }
          });
        }

        setReportData(reportData);
        setPrintDisabled(reportData.length === 0);

        if (reportData.length > 0) {
          toast.success(`Data dimuat: ${reportData.length} item`, {
            duration: 3000,
            icon: "✅",
          });
        } else {
          toast.warning(
            "Tidak ada data untuk customer dan tanggal yang dipilih",
            {
              duration: 3000,
              icon: "⚠️",
            }
          );
        }
      } else {
        const errorMessage = result.message || "Gagal mengambil data";
        toast.error(errorMessage, {
          duration: 4000,
          icon: "❌",
        });
        setReportData([]);
        setPrintDisabled(true);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Gagal mengambil data, coba lagi!", {
        duration: 4000,
        icon: "❌",
      });
      setReportData([]);
      setPrintDisabled(true);
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleCustomerChange = (selected) => {
    const newFormData = {
      ...formData,
      customerId: selected?.customerId || "",
      customerName: selected?.customerName || "",
    };
    setFormData(newFormData);
    setReportData([]);
    setPrintDisabled(true);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value,
    };
    setFormData(newFormData);
    setReportData([]);
    setPrintDisabled(true);
  };

  // Print handler
  const handlePrint = async () => {
    if (reportData.length === 0) {
      toast.error("Tidak ada data untuk di-print!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    try {
      // Group linens by room first, then by type
      const roomsData = {};
      reportData.forEach((item) => {
        const roomName = item.roomName || "Umum";
        const linenName = item.linenName || item.linenTypeName || "Unknown";

        if (!roomsData[roomName]) {
          roomsData[roomName] = {};
        }

        if (linenName && linenName.trim()) {
          roomsData[roomName][linenName] =
            (roomsData[roomName][linenName] || 0) + 1;
        }
      });

      // Create linen items array with room information
      const linenItems = [];
      Object.entries(roomsData).forEach(([roomName, linenCounts]) => {
        Object.entries(linenCounts).forEach(([linenName, quantity]) => {
          linenItems.push({
            name: linenName,
            quantity: quantity.toString(),
            room: roomName,
          });
        });
      });

      // Create print data
      const printData = {
        deliveryNumber: `LAPORAN-${formData.startDate} s/d ${formData.endDate}`,
        customer: formData.customerName,
        room: "Berbagai Ruangan", // Will be overridden by room grouping in print
        totalLinen: reportData.length.toString(),
        deliveryType: "DO LINEN BARU",
        driverLabel: "Periode",
        driverName: `${formData.startDate} s/d ${formData.endDate}`, // Show the date range
        linenItems: linenItems,
      };

      await printDeliveryLabel(printData);
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

  // Utility function for styling
  const getRowColor = (index) => {
    return index % 2 === 0 ? "bg-gray-50" : "bg-white";
  };

  return (
    <div className="font-poppins bg-white rounded-lg shadow-lg p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <FileText size={24} />
            Cetak Final DO
          </h1>
        </div>

        {/* Customer and Date Info */}
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
              Tanggal Mulai <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleDateChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Akhir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleDateChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-4">
          <button
            type="button"
            onClick={fetchReportData}
            disabled={
              loading ||
              !formData.customerId ||
              !formData.startDate ||
              !formData.endDate
            }
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
              loading ||
              !formData.customerId ||
              !formData.startDate ||
              !formData.endDate
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-blue-700"
            }`}
          >
            <Calendar size={16} />
            {loading ? "Memuat Data..." : "Ambil Data"}
          </button>

          <div className="flex gap-2">
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={printDisabled || !isBrowserPrintLoaded}
              className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 ${
                printDisabled || !isBrowserPrintLoaded
                  ? "bg-gray-400 cursor-not-allowed"
                  : ""
              }`}
              title={
                printDisabled
                  ? "Ambil data terlebih dahulu untuk print"
                  : "Print laporan linen"
              }
            >
              <Printer size={16} />
              <span>Print</span>
            </button>

            {/* Printer Selection */}
            {devices.length > 0 && (
              <select
                onChange={(e) => handleDeviceChange(e.target.value)}
                defaultValue={selectedDevice?.uid}
                className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

        {/* Report Data Table */}
        <div>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300 rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                    QTY
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                    Nama Linen
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                    Ruangan
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-8 text-center text-gray-500 border-b"
                    >
                      {loading
                        ? "Memuat data..."
                        : "Tidak ada data. Pilih customer dan periode tanggal, lalu klik 'Ambil Data'."}
                    </td>
                  </tr>
                ) : (
                  // Group and count items
                  (() => {
                    const groupedData = {};
                    reportData.forEach((item) => {
                      const key = `${
                        item.linenName || item.linenTypeName || "Unknown"
                      }|${item.roomName || "-"}`;
                      if (!groupedData[key]) {
                        groupedData[key] = {
                          linenName:
                            item.linenName || item.linenTypeName || "Unknown",
                          roomName: item.roomName || "-",
                          count: 0,
                        };
                      }
                      groupedData[key].count++;
                    });

                    return Object.values(groupedData).map((item, index) => (
                      <tr
                        key={`${item.linenName}-${item.roomName}`}
                        className={`${getRowColor(
                          index
                        )} transition-colors duration-200`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-700 border-b font-medium">
                          {item.count}
                        </td>
                        <td className="px-4 py-3 border-b">
                          <div className="text-sm text-gray-700">
                            {item.linenName}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-b">
                          <div className="text-sm text-gray-700">
                            {item.roomName}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {reportData.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">
                Total Item:
              </span>
              <span className="text-lg font-bold text-blue-900">
                {reportData.length} linen
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cetak;
