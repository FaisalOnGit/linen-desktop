import React, { useState, useEffect } from "react";
import { Play, Trash2, Square, Truck, Printer } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";
import { useLinenData } from "../hooks/useLinenData";
import { useCustomers } from "../hooks/useCustomers";
import { useRooms } from "../hooks/useRooms";
import usePrint from "../hooks/usePrint";
import useDateShift from "../hooks/useDateShift";

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

  // Form state
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    qty: 0,
    driverName: "",
    plateNumber: "-",
    roomId: "",
    shift: "",
    dateShift: "",
  });

  // UI state
  const [deliverySubmitted, setDeliverySubmitted] = useState(false);
  const [lastDeliveryData, setLastDeliveryData] = useState(null);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Use custom dateShift hook
  const { dateShift, dateShiftWithTime, updateDateShift } = useDateShift(
    formData.shift
  );

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load persistent data from localStorage on mount
  useEffect(() => {
    const loadPersistentData = () => {
      try {
        const persistentData = localStorage.getItem("deliveryPersistentData");
        const savedData = persistentData ? JSON.parse(persistentData) : {};

        const getUserFullName = async () => {
          try {
            const fullName = await window.authAPI.getFullName();
            return fullName || "";
          } catch (error) {
            return "";
          }
        };

        getUserFullName().then((fullName) => {
          setFormData({
            customerId: "",
            customerName: "",
            qty: 0,
            driverName: savedData.driverName || fullName,
            plateNumber: "-",
            roomId: "",
            shift: savedData.shift || "",
            dateShift: "", // Will be set by custom hook
          });
        });
      } catch (error) {
        setFormData({
          customerId: "",
          customerName: "",
          qty: 0,
          driverName: "",
          plateNumber: "-",
          roomId: "",
          shift: "",
          dateShift: "", // Will be set by custom hook
        });
      }
    };

    loadPersistentData();
  }, []);

  // Update form data with custom hook dateShift
  useEffect(() => {
    if (dateShift && formData.dateShift !== dateShift) {
      setFormData((prev) => ({
        ...prev,
        dateShift: dateShift,
      }));
    }
  }, [dateShift, formData.dateShift]);

  // Save persistent data to localStorage
  const saveToLocalStorage = () => {
    const persistentFields = {
      shift: formData.shift,
      dateShift: formData.dateShift,
      driverName: formData.driverName,
    };

    try {
      localStorage.setItem(
        "deliveryPersistentData",
        JSON.stringify(persistentFields)
      );
    } catch (error) {
      // Silent error handling
    }
  };

  // Custom hooks
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

  const { rooms, loadingRooms, fetchRooms, getRoomById } = useRooms(baseUrl);

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

  // Effects
  useEffect(() => {
    if (formData.customerId) {
      revalidateLinens(formData.customerId, formData.roomId);
    }
  }, [formData.customerId, formData.roomId, revalidateLinens]);

  useEffect(() => {
    if (formData.customerId) {
      fetchRooms(formData.customerId);
    }
  }, [formData.customerId, fetchRooms]);

  useEffect(() => {
    if (!isDeliveryActive) return;

    if (deliveryTags && deliveryTags.length > 0) {
      try {
        deliveryTags.forEach((tag) => {
          if (tag && tag.EPC) {
            processScannedEPC(tag.EPC, formData.customerId, formData.roomId);
          }
        });
      } catch (error) {
        toast.error("Gagal memproses tag RFID!", {
          duration: 3000,
          icon: "❌",
        });
      }
    }
  }, [deliveryTags, isDeliveryActive, processScannedEPC, formData.customerId]);

  useEffect(() => {
    const validLinens = linens.filter((linen) => linen.epc?.trim());
    setFormData((prev) => ({
      ...prev,
      qty: validLinens.length,
    }));
  }, [linens]);

  useEffect(() => {
    // Load persistent data and reset form data when delivery type changes
    try {
      const persistentData = localStorage.getItem("deliveryPersistentData");
      const savedData = persistentData ? JSON.parse(persistentData) : {};

      const getCurrentDriverName = async () => {
        try {
          const fullName = await window.authAPI.getFullName();
          return fullName || "";
        } catch (error) {
          return "";
        }
      };

      getCurrentDriverName().then((driverName) => {
        setFormData({
          customerId: "",
          customerName: "",
          qty: 0,
          roomId: "",
          driverName: savedData.driverName || driverName,
          plateNumber: "-",
          shift: savedData.shift || "",
          dateShift: "", // Will be set by custom hook
        });
      });
    } catch (error) {
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        qty: 0,
        roomId: "",
        shift: "",
        dateShift: "", // Will be set by custom hook
      }));
    }

    // Stop RFID scanning if active
    if (isDeliveryActive) {
      stopDelivery();
    }

    clearAllEPCs();
    setDeliverySubmitted(false);
    setLastDeliveryData(null);
    setSubmitDisabled(false);
  }, [deliveryType]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    const processedValue = name === "plateNumber" ? value.toUpperCase() : value;

    setFormData({ ...formData, [name]: processedValue });

    // Update dateShift using custom hook when shift changes
    if (name === "shift") {
      updateDateShift(value);
    }

    // Save to localStorage when shift or dateShift is manually changed
    if (name === "shift" || name === "dateShift") {
      setTimeout(() => {
        saveToLocalStorage();
      }, 100);
    }
  };

  const handleCustomerChange = (selected) => {
    const newFormData = {
      ...formData,
      customerId: selected?.customerId || "",
      customerName: selected?.customerName || "",
      roomId: "",
    };
    setFormData(newFormData);
    revalidateLinens(selected?.customerId || "", formData.roomId);
  };

  const handleClearAll = () => {
    try {
      if (isDeliveryActive) {
        stopDelivery();
      }

      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      clearAllEPCs();

      setFormData((prev) => ({
        ...prev,
        qty: 0,
        shift: prev.shift,
        dateShift: prev.dateShift,
        driverName: prev.driverName,
        plateNumber: prev.plateNumber,
      }));

      setDeliverySubmitted(false);
      setLastDeliveryData(null);
      setSubmitDisabled(false);

      setTimeout(() => {
        clearAllEPCs();
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }
        setDeliverySubmitted(false);
        setLastDeliveryData(null);
        setSubmitDisabled(false);
      }, 50);

      setTimeout(() => {
        clearAllEPCs();
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }
        setDeliverySubmitted(false);
        setLastDeliveryData(null);
        setSubmitDisabled(false);
      }, 200);
    } catch (error) {
      toast.error("Gagal membersihkan data!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
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

    if (!formData.shift) {
      toast.error("Pilih shift terlebih dahulu!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    if (!formData.dateShift) {
      toast.error("Tanggal tidak boleh kosong!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

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
      const token = await window.authAPI.getToken();

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
        deliveryTypeId: deliveryType,
        customerId: formData.customerId,
        qty: validLinens.length,
        driverName: formData.driverName,
        plateNumber: formData.plateNumber,
        shift: formData.shift,
        dateShift: dateShiftWithTime || formData.dateShift, // Use ISO format with time
        linens: validLinens.map((linen) => ({
          epc: linen.epc,
          status_id: linen.statusId || 1,
        })),
      };

      const response = await fetch(`${baseUrl}/Process/delivery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.message || `Request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      const successMessage = result.message || "Proses delivery berhasil!";
      const deliveryNumber = result.data?.deliveryNumber || "";

      // Get linen types for printing
      let linenTypes = "Berbagai Jenis";
      let linenItems = [];

      try {
        const linenCounts = {};
        validLinens.forEach((linen) => {
          const linenName = linen.linenName || linen.linenTypeName || "Unknown";
          if (linenName && linenName.trim()) {
            linenCounts[linenName] = (linenCounts[linenName] || 0) + 1;
          }
        });

        linenItems = Object.entries(linenCounts).map(([name, quantity]) => ({
          name: name,
          quantity: quantity.toString(),
        }));

        const uniqueLinenNames = Object.keys(linenCounts);
        if (uniqueLinenNames.length > 0) {
          linenTypes = uniqueLinenNames.join(", ");
        }
      } catch (error) {
        // Keep default values if extraction fails
      }

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
        linenItems: linenItems,
      };

      setLastDeliveryData(deliveryData);
      setDeliverySubmitted(true);
      setSubmitDisabled(true);

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });

      // Auto-print after successful delivery
      setTimeout(async () => {
        if (deliveryData) {
          try {
            await handlePrint(deliveryData);
          } catch (printError) {
            toast.error("Gagal print otomatis, silakan print manual!", {
              duration: 3000,
              icon: "⚠️",
            });
          }
        }
      }, 200);
    } catch (error) {
      const errorMessage = error.message || "Gagal proses delivery, coba lagi!";
      toast.error(errorMessage, {
        duration: 4000,
        icon: "❌",
      });
    }
  };

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
        stopDelivery();
      } else {
        startDelivery();
      }
    } catch (error) {
      toast.error("Gagal mengontrol scan RFID!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  const handlePrint = async (deliveryDataToPrint = null) => {
    try {
      const dataToPrint = deliveryDataToPrint || lastDeliveryData;
      await printDeliveryLabel(dataToPrint);
      toast.success("Print berhasil!", {
        duration: 3000,
        icon: "✅",
      });
    } catch (error) {
      toast.error("Gagal print, coba lagi!", {
        duration: 4000,
        icon: "❌",
      });
    }
  };

  const handlePrintDirect = async (deliveryData) => {
    if (!deliveryData) return;

    try {
      await printDeliveryLabel(deliveryData);
      toast.success("Print ulang berhasil!", {
        duration: 3000,
        icon: "✅",
      });
    } catch (error) {
      toast.error("Gagal print ulang, coba lagi!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  // Utility functions
  const getStatusColor = (status) => {
    if (!status) return "bg-gray-50 border-gray-300 text-gray-700";

    switch (status.toLowerCase()) {
      case "bersih":
        return "bg-green-50 border-green-300 text-green-700";
      case "kotor":
        return "bg-yellow-50 border-yellow-300 text-yellow-700";
      case "rusak":
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
      <div className="bg-white rounded-lg shadow-lg px-6 pt-2 pb-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-start">
            <h1 className="text-xl font-bold text-gray-800">
              {currentDeliveryType.title}
            </h1>
            <div className="border-b-2 border-gray-300 mt-2"></div>
          </div>

          {/* Shift, Tanggal, Nama Customer Service, dan Tombol Set */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shift <span className="text-red-500">*</span>
              </label>
              <select
                name="shift"
                value={formData.shift}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Pilih Shift</option>
                <option value="1">Shift 1</option>
                <option value="2">Shift 2</option>
                <option value="3">Shift 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="dateShift"
                  value={formData.dateShift}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 font-medium bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                  {currentTime.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </div>
              </div>
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
                &nbsp;
              </label>
              <button
                type="button"
                onClick={() => {
                  setTimeout(() => {
                    saveToLocalStorage();
                  }, 100);

                  const message = formData.shift
                    ? `Shift ${formData.shift} berhasil disimpan!`
                    : "Pilih shift terlebih dahulu!";
                  toast.success(message, {
                    duration: 2000,
                    icon: "✅",
                  });
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                title="Simpan shift yang dipilih ke localStorage"
              >
                Set
              </button>
            </div>
          </div>

          {/* Customer dan Room */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
                placeholder={
                  formData.shift
                    ? "Cari customer..."
                    : "Pilih shift terlebih dahulu"
                }
                isClearable
                isSearchable
                isLoading={loadingCustomers}
                noOptionsMessage={() => "Customer tidak ditemukan"}
                isDisabled={!formData.shift}
                className="w-full"
                classNamePrefix="react-select"
                styles={{
                  control: (baseStyles, state) => ({
                    ...baseStyles,
                    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
                    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                    fontSize: "14px",
                    minHeight: "38px",
                    backgroundColor: !formData.shift ? "#f9fafb" : "white",
                    cursor: !formData.shift ? "not-allowed" : "default",
                  }),
                  option: (baseStyles) => ({
                    ...baseStyles,
                    fontSize: "14px",
                  }),
                }}
              />
              {!formData.shift && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Pilih shift terlebih dahulu
                </p>
              )}
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
                placeholder={
                  formData.shift
                    ? "Pilih room..."
                    : "Pilih shift terlebih dahulu"
                }
                isClearable
                isSearchable
                isLoading={loadingRooms}
                noOptionsMessage={() => "Room tidak ditemukan"}
                isDisabled={!formData.shift}
                className="w-full"
                classNamePrefix="react-select"
                styles={{
                  control: (baseStyles, state) => ({
                    ...baseStyles,
                    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
                    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                    fontSize: "14px",
                    minHeight: "38px",
                    backgroundColor: !formData.shift ? "#f9fafb" : "white",
                    cursor: !formData.shift ? "not-allowed" : "default",
                  }),
                  option: (baseStyles) => ({
                    ...baseStyles,
                    fontSize: "14px",
                  }),
                }}
              />
              {!formData.shift && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Pilih shift terlebih dahulu
                </p>
              )}
            </div>
          </div>

          {/* Linen Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <button
                  type="button"
                  onClick={handleToggleScan}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
                    !isRfidAvailable || !formData.shift
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isDeliveryActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-primary hover:bg-blue-700"
                  }`}
                  disabled={!isRfidAvailable || !formData.shift}
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

            {/* Warning messages */}
            {formData.customerId && getInvalidLinenCount() > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  ⚠️ Terdapat {getInvalidLinenCount()} tag yang tidak sesuai
                  dengan customer yang dipilih.
                </p>
              </div>
            )}

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
                      RFID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Customer Info
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Nama Linen
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Ruangan
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linens
                    .filter((linen) => linen.epc?.trim())
                    .map((linen, filteredIndex) => (
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
                          {linen.linenName || linen.linenTypeName ? (
                            <div className="text-sm text-gray-700">
                              {linen.linenName || linen.linenTypeName}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">-</div>
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
                    ))}
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
                !formData.shift ||
                !formData.dateShift ||
                getValidLinenCount() === 0 ||
                (getInvalidRoomLinenCount && getInvalidRoomLinenCount() > 0) ||
                submitDisabled
              }
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                !formData.customerId ||
                !formData.driverName.trim() ||
                !formData.shift ||
                !formData.dateShift ||
                getValidLinenCount() === 0 ||
                (getInvalidRoomLinenCount && getInvalidRoomLinenCount() > 0) ||
                submitDisabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-blue-400 text-white"
              }`}
            >
              <Truck size={16} />
              {submitDisabled
                ? `✅ ${
                    currentDeliveryType.title
                  } Berhasil (${getValidLinenCount()} items)`
                : `Proses ${
                    currentDeliveryType.title
                  } (${getValidLinenCount()} valid items)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPage;
